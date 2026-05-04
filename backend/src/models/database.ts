import initSqlJs, { Database as SqlJsDatabase, QueryExecResult } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: SqlJsDb | MySqlDb;
let sqlJsReady = false;
let mysqlReady = false;

type SyncMysqlConnection = {
  query: (sql: string, params?: unknown[]) => any;
};

function useMysql(): boolean {
  return process.env.DATABASE_CLIENT === 'mysql' || (!!process.env.MYSQL_HOST && process.env.NODE_ENV === 'production');
}

class MySqlDb {
  private _connection: SyncMysqlConnection;

  constructor(connection: SyncMysqlConnection) {
    this._connection = connection;
  }

  pragma(_statement: string): void {
    // SQLite-only. MySQL has equivalent behavior through table definitions.
  }

  exec(sql: string): void {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const statement of statements) {
      this._connection.query(transformSqlForMysql(statement));
    }
  }

  prepare(sql: string): MySqlPreparedStatement {
    return new MySqlPreparedStatement(this._connection, sql);
  }
}

class MySqlPreparedStatement {
  private _connection: SyncMysqlConnection;
  private _sql: string;

  constructor(connection: SyncMysqlConnection, sql: string) {
    this._connection = connection;
    this._sql = sql;
  }

  get(...params: unknown[]): unknown | undefined {
    const rows = this.all(...params);
    return rows[0];
  }

  all(...params: unknown[]): unknown[] {
    const flatParams = this._flattenParams(params);
    const result = this._connection.query(transformSqlForMysql(this._sql), flatParams);
    return Array.isArray(result) ? result : [];
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const flatParams = this._flattenParams(params);
    const result = this._connection.query(transformSqlForMysql(this._sql), flatParams) || {};
    return { changes: result.affectedRows || 0, lastInsertRowid: result.insertId || 0 };
  }

  private _flattenParams(params: unknown[]): unknown[] {
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
  }
}

function transformSqlForMysql(sql: string): string {
  return sql
    .replace(/datetime\('now',\s*'\+(\d+) days'\)/gi, 'DATE_ADD(NOW(), INTERVAL $1 DAY)')
    .replace(/datetime\('now',\s*'-(\d+) days'\)/gi, 'DATE_SUB(NOW(), INTERVAL $1 DAY)')
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/strftime\(\?,\s*created_at\)/gi, 'DATE_FORMAT(created_at, ?)')
    .replace(/json_array_length\(([^)]+)\)/gi, 'JSON_LENGTH($1)')
    .replace(/ON CONFLICT\(flag_key\) DO UPDATE SET\s*description = excluded\.description,\s*is_enabled = excluded\.is_enabled,\s*rules_json = excluded\.rules_json,\s*updated_at = NOW\(\)/gis,
      'ON DUPLICATE KEY UPDATE description = VALUES(description), is_enabled = VALUES(is_enabled), rules_json = VALUES(rules_json), updated_at = NOW()');
}

// Thin wrapper to provide a better-sqlite3-like API over sql.js
class SqlJsDb {
  private _db: SqlJsDatabase;
  private _path: string;

  constructor(sqlDb: SqlJsDatabase, dbPath: string) {
    this._db = sqlDb;
    this._path = dbPath;
  }

  pragma(statement: string): void {
    this._db.run(`PRAGMA ${statement}`);
  }

  exec(sql: string): void {
    try {
      this._db.exec(sql);
      this._persist();
    } catch (err: any) {
      console.error('SQL Execution Error:', err);
      console.error('SQL Statement:', sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));
      throw err;
    }
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this._db, sql, this._path);
  }

  private _persist(): void {
    try {
      const data = this._db.export();
      const dir = path.dirname(this._path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._path, Buffer.from(data));
    } catch {
      // Non-fatal in development
    }
  }
}

class PreparedStatement {
  private _db: SqlJsDatabase;
  private _sql: string;
  private _dbPath: string;

  constructor(db: SqlJsDatabase, sql: string, dbPath: string) {
    this._db = db;
    this._sql = sql;
    this._dbPath = dbPath;
  }

  get(...params: unknown[]): unknown | undefined {
    const results = this._execQuery(params);
    if (!results || results.length === 0) return undefined;
    const { columns, values } = results[0];
    if (!values || values.length === 0) return undefined;
    return this._rowToObject(columns, values[0]);
  }

  all(...params: unknown[]): unknown[] {
    const results = this._execQuery(params);
    if (!results || results.length === 0) return [];
    const { columns, values } = results[0];
    return (values || []).map(row => this._rowToObject(columns, row));
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const flatParams = this._flattenParams(params);
    this._db.run(this._sql, flatParams as any[]);
    this._persist();
    const changes = (this._db.exec('SELECT changes()')[0]?.values[0]?.[0] as number) || 0;
    const lastId = (this._db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number) || 0;
    return { changes, lastInsertRowid: lastId };
  }

  private _execQuery(params: unknown[]): QueryExecResult[] {
    const flatParams = this._flattenParams(params);
    return this._db.exec(this._sql, flatParams as any[]);
  }

  private _flattenParams(params: unknown[]): unknown[] {
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
  }

  private _rowToObject(columns: string[], row: unknown[]): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  }

  private _persist(): void {
    try {
      const data = this._db.export();
      const dir = path.dirname(this._dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._dbPath, Buffer.from(data));
    } catch {
      // Non-fatal in development
    }
  }
}

export function getDatabase(): SqlJsDb {
  if (!db || (!sqlJsReady && !mysqlReady)) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db as SqlJsDb;
}

function initializeMySqlDatabase(): void {
  const SyncMysql = require('sync-mysql');
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'fera_shopkeeper';

  const connection = new SyncMysql({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database,
    charset: 'utf8mb4'
  }) as SyncMysqlConnection;

  db = new MySqlDb(connection);
  mysqlReady = true;

  for (const sql of getMySqlSchemaStatements()) {
    try {
      db.exec(sql);
    } catch (err: any) {
      console.warn(`MySQL schema statement failed: ${err.message}`);
    }
  }

  console.log(`✅ MySQL database initialized successfully (${database})`);
}

function getMySqlSchemaStatements(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(40),
      business_name VARCHAR(255),
      logo_url TEXT,
      plan VARCHAR(32) NOT NULL DEFAULT 'trial',
      plan_expires_at DATETIME,
      preferred_language VARCHAR(16) NOT NULL DEFAULT 'en',
      subdomain VARCHAR(120) UNIQUE,
      custom_domain VARCHAR(255) UNIQUE,
      is_blocked TINYINT NOT NULL DEFAULT 0,
      is_verified TINYINT NOT NULL DEFAULT 0,
      ai_credits_balance INT NOT NULL DEFAULT 20,
      ai_credits_monthly_limit INT NOT NULL DEFAULT 20,
      ai_credits_used_month INT NOT NULL DEFAULT 0,
      ai_credits_reset_at DATETIME,
      storage_used_bytes BIGINT NOT NULL DEFAULT 0,
      storage_limit_bytes BIGINT NOT NULL DEFAULT 52428800,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS websites (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      template VARCHAR(120) NOT NULL DEFAULT 'default',
      config LONGTEXT,
      sections LONGTEXT,
      is_published TINYINT NOT NULL DEFAULT 0,
      theme LONGTEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      cost_price DECIMAL(12,2),
      price DECIMAL(12,2) NOT NULL,
      sale_price DECIMAL(12,2),
      category VARCHAR(160),
      stock_quantity INT NOT NULL DEFAULT 0,
      image_url TEXT,
      image_file_id VARCHAR(128),
      image_size_bytes BIGINT NOT NULL DEFAULT 0,
      is_active TINYINT NOT NULL DEFAULT 1,
      metadata LONGTEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_products_user (user_id),
      INDEX idx_products_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(40) NOT NULL,
      delivery_address TEXT,
      delivery_type VARCHAR(32) NOT NULL DEFAULT 'pickup',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
      items LONGTEXT NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
      total DECIMAL(12,2) NOT NULL,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_orders_user (user_id),
      INDEX idx_orders_user_created (user_id, created_at),
      INDEX idx_orders_phone_shop (customer_phone, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      invoice_number VARCHAR(120) UNIQUE NOT NULL,
      items LONGTEXT NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      tax DECIMAL(12,2) NOT NULL DEFAULT 0,
      total DECIMAL(12,2) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      provider_order_id VARCHAR(160) UNIQUE,
      provider_payment_id VARCHAR(160) UNIQUE,
      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'INR',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      plan VARCHAR(32) NOT NULL,
      metadata LONGTEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_transactions_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      role VARCHAR(32) NOT NULL,
      content LONGTEXT NOT NULL,
      language VARCHAR(16) NOT NULL DEFAULT 'en',
      model_used VARCHAR(120),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_ai_conversations_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      model VARCHAR(120) NOT NULL,
      prompt_tokens INT NOT NULL DEFAULT 0,
      completion_tokens INT NOT NULL DEFAULT 0,
      cost DECIMAL(12,6) NOT NULL DEFAULT 0,
      credits_used INT NOT NULL DEFAULT 1,
      usage_type VARCHAR(48) NOT NULL DEFAULT 'shopkeeper_assistant',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_ai_usage_user (user_id),
      INDEX idx_ai_usage_type (usage_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS ai_credit_purchases (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      credits INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      usage_scope VARCHAR(48) NOT NULL DEFAULT 'shared',
      status VARCHAR(32) NOT NULL DEFAULT 'completed',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS storage_purchases (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      gb_added INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'completed',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'open',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tickets_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS ticket_replies (
      id VARCHAR(64) PRIMARY KEY,
      ticket_id VARCHAR(64) NOT NULL,
      sender_role VARCHAR(32) NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS otp_codes (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_otp_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      target_plan VARCHAR(32) NOT NULL DEFAULT 'all',
      is_active TINYINT NOT NULL DEFAULT 1,
      expires_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS feature_flags (
      id VARCHAR(64) PRIMARY KEY,
      flag_key VARCHAR(160) UNIQUE NOT NULL,
      description TEXT,
      is_enabled TINYINT NOT NULL DEFAULT 0,
      rules_json LONGTEXT,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      admin_email VARCHAR(255) NOT NULL,
      action VARCHAR(120) NOT NULL,
      target_type VARCHAR(80),
      target_id VARCHAR(120),
      metadata LONGTEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS analytics_events (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      event_type VARCHAR(120) NOT NULL,
      event_data LONGTEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_analytics_user_date (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];
}

export async function initializeDatabase(): Promise<void> {
  if (useMysql()) {
    initializeMySqlDatabase();
    return;
  }

  const dbPath = process.env.DATABASE_PATH || './data/fera_shopkeeper.db';
  const SQL = await initSqlJs();

  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new SqlJsDb(sqlDb, dbPath);
  sqlJsReady = true;

  db.pragma('foreign_keys = ON');

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      business_name TEXT,
      logo_url TEXT,
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'premium', 'trial', 'basic', 'standard', 'pro')),
      plan_expires_at TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      subdomain TEXT UNIQUE,
      custom_domain TEXT UNIQUE,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      ai_credits_balance INTEGER NOT NULL DEFAULT 20,
      ai_credits_monthly_limit INTEGER NOT NULL DEFAULT 20,
      ai_credits_used_month INTEGER NOT NULL DEFAULT 0,
      ai_credits_reset_at TEXT,
      storage_used_bytes INTEGER NOT NULL DEFAULT 0,
      storage_limit_bytes INTEGER NOT NULL DEFAULT 52428800,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'default',
      config JSON NOT NULL DEFAULT '{}',
      sections JSON NOT NULL DEFAULT '[]',
      is_published INTEGER NOT NULL DEFAULT 0,
      theme JSON NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      cost_price REAL,
      price REAL NOT NULL,
      sale_price REAL,
      category TEXT,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata JSON DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT,
      delivery_type TEXT NOT NULL DEFAULT 'pickup' CHECK(delivery_type IN ('pickup', 'walking', 'bicycle', 'delivery')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid', 'pay_later')),
      items JSON NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      model_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_data JSON DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invoice_number TEXT UNIQUE NOT NULL,
      items JSON NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_order_id TEXT UNIQUE,
      provider_payment_id TEXT UNIQUE,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
      plan TEXT NOT NULL CHECK(plan IN ('trial', 'basic', 'standard', 'pro')),
      metadata JSON DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS ticket_replies (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('admin', 'user')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_plan TEXT NOT NULL DEFAULT 'all',
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS feature_flags (
      id TEXT PRIMARY KEY,
      flag_key TEXT UNIQUE NOT NULL,
      description TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      rules_json JSON NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      credits_used INTEGER NOT NULL DEFAULT 1,
      usage_type TEXT NOT NULL DEFAULT 'shopkeeper_assistant' CHECK(usage_type IN ('shopkeeper_assistant', 'website_ai', 'customer_assistant')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS ai_credit_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credits INTEGER NOT NULL,
      amount REAL NOT NULL,
      usage_scope TEXT NOT NULL DEFAULT 'shared' CHECK(usage_scope IN ('shared', 'website_ai', 'customer_assistant')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS storage_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      gb_added INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata JSON NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events(user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email)`,
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at)`
  ];

  for (const sql of statements) {
    try {
      db.exec(sql);
    } catch (err: any) {
      console.warn(`⚠️ Statement failed (might already exist or be slightly different): ${err.message}`);
    }
  }

  // Migration: Add is_blocked if it doesn't exist AND Fix Plan Constraints
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasBlocked = tableInfo.some(col => col.name === 'is_blocked');
    const hasPlanExpires = tableInfo.some(col => col.name === 'plan_expires_at');
    const hasVerified = tableInfo.some(col => col.name === 'is_verified');
    
    // Run migration if we are missing any of the new columns
    if (!hasBlocked || !hasPlanExpires || !hasVerified) {
      console.log('🔄 Migrating database: Adding new columns to users table...');
      
      if (!hasBlocked) {
        try { db.exec("ALTER TABLE users ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0"); } catch(e) {}
      }
      if (!hasPlanExpires) {
        try { db.exec("ALTER TABLE users ADD COLUMN plan_expires_at TEXT"); } catch(e) {}
      }
      if (!hasVerified) {
        try { db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0"); } catch(e) {}
      }
      
      console.log('✅ Migration complete.');
    }
  } catch (e) {
    console.error("Migration check skipped (table might not exist yet):", e);
  }

  // Migration: Add AI credit columns to users table
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const addColumn = (name: string, sql: string) => {
      if (!tableInfo.some(col => col.name === name)) {
        try { db.exec(sql); } catch(e) {}
      }
    };

    addColumn('ai_credits_balance', "ALTER TABLE users ADD COLUMN ai_credits_balance INTEGER NOT NULL DEFAULT 20");
    addColumn('ai_credits_monthly_limit', "ALTER TABLE users ADD COLUMN ai_credits_monthly_limit INTEGER NOT NULL DEFAULT 20");
    addColumn('ai_credits_used_month', "ALTER TABLE users ADD COLUMN ai_credits_used_month INTEGER NOT NULL DEFAULT 0");
    addColumn('ai_credits_reset_at', "ALTER TABLE users ADD COLUMN ai_credits_reset_at TEXT");
    addColumn('storage_used_bytes', "ALTER TABLE users ADD COLUMN storage_used_bytes INTEGER NOT NULL DEFAULT 0");
    addColumn('storage_limit_bytes', "ALTER TABLE users ADD COLUMN storage_limit_bytes INTEGER NOT NULL DEFAULT 52428800");
  } catch (e) {
    console.error("AI credit users migration check skipped:", e);
  }

  // Migration: Add AI usage attribution columns
  try {
    const tableInfo = db.prepare("PRAGMA table_info(ai_usage_logs)").all() as any[];
    if (!tableInfo.some(col => col.name === 'credits_used')) {
      try { db.exec("ALTER TABLE ai_usage_logs ADD COLUMN credits_used INTEGER NOT NULL DEFAULT 1"); } catch(e) {}
    }
    if (!tableInfo.some(col => col.name === 'usage_type')) {
      try { db.exec("ALTER TABLE ai_usage_logs ADD COLUMN usage_type TEXT NOT NULL DEFAULT 'shopkeeper_assistant'"); } catch(e) {}
    }
  } catch (e) {
    console.error("AI usage migration check skipped:", e);
  }

  // Migration: Add missing columns to products table
  try {
    const tableInfo = db.prepare("PRAGMA table_info(products)").all() as any[];
    const hasCostPrice = tableInfo.some(col => col.name === 'cost_price');
    const hasSalePrice = tableInfo.some(col => col.name === 'sale_price');
    
    if (!hasCostPrice || !hasSalePrice) {
      console.log('🔄 Migrating database: Adding new columns to products table...');
      if (!hasCostPrice) {
        try { db.exec("ALTER TABLE products ADD COLUMN cost_price REAL"); } catch(e) {}
      }
      if (!hasSalePrice) {
        try { db.exec("ALTER TABLE products ADD COLUMN sale_price REAL"); } catch(e) {}
      }
      console.log('✅ Products table migration complete.');
    }
  } catch (e) {
    console.error("Products migration check skipped:", e);
  }

  console.log('✅ Database initialized successfully');
}
