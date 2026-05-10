import fs from 'fs';
import path from 'path';

type SyncMysqlConnection = {
  query: (sql: string, params?: unknown[]) => any;
};

type SqlitePreparedStatementLike = {
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number };
};

type SqliteConnection = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqlitePreparedStatementLike;
  pragma: (sql: string) => void;
};

type DbPreparedStatement = {
  get: (...params: unknown[]) => unknown | undefined;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number };
};

type AppDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => DbPreparedStatement;
};

let db: AppDatabase | undefined;
let dbReady = false;

class MySqlDb implements AppDatabase {
  private _connection: SyncMysqlConnection;

  constructor(connection: SyncMysqlConnection) {
    this._connection = connection;
  }

  exec(sql: string): void {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const statement of statements) {
      this._connection.query(transformSqlForMysql(statement));
    }
  }

  prepare(sql: string): DbPreparedStatement {
    return new MySqlPreparedStatement(this._connection, sql);
  }
}

class MySqlPreparedStatement implements DbPreparedStatement {
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
    const flatParams = flattenParams(params);
    const result = this._connection.query(transformSqlForMysql(this._sql), flatParams);
    return Array.isArray(result) ? result : [];
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const flatParams = flattenParams(params);
    const result = this._connection.query(transformSqlForMysql(this._sql), flatParams) || {};
    return { changes: result.affectedRows || 0, lastInsertRowid: result.insertId || 0 };
  }
}

class SqliteDb implements AppDatabase {
  private _connection: SqliteConnection;

  constructor(connection: SqliteConnection) {
    this._connection = connection;
  }

  exec(sql: string): void {
    this._connection.exec(sql);
  }

  prepare(sql: string): DbPreparedStatement {
    return new SqlitePreparedStatement(this._connection.prepare(sql));
  }
}

class SqlitePreparedStatement implements DbPreparedStatement {
  private _statement: SqlitePreparedStatementLike;

  constructor(statement: SqlitePreparedStatementLike) {
    this._statement = statement;
  }

  get(...params: unknown[]): unknown | undefined {
    const flatParams = flattenParams(params);
    return this._statement.get(...flatParams);
  }

  all(...params: unknown[]): unknown[] {
    const flatParams = flattenParams(params);
    const result = this._statement.all(...flatParams);
    return Array.isArray(result) ? result : [];
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const flatParams = flattenParams(params);
    const result = this._statement.run(...flatParams);
    return { changes: result.changes || 0, lastInsertRowid: result.lastInsertRowid || 0 };
  }
}

function flattenParams(params: unknown[]): unknown[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

function transformSqlForMysql(sql: string): string {
  return sql
    .replace(/datetime\('now',\s*'\+(\d+) days'\)/gi, 'DATE_ADD(NOW(), INTERVAL $1 DAY)')
    .replace(/datetime\('now',\s*'-(\d+) days'\)/gi, 'DATE_SUB(NOW(), INTERVAL $1 DAY)')
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/strftime\(\?,\s*created_at\)/gi, 'DATE_FORMAT(created_at, ?)')
    .replace(/json_array_length\(([^)]+)\)/gi, 'JSON_LENGTH($1)')
    .replace(
      /ON CONFLICT\(flag_key\) DO UPDATE SET\s*description = excluded\.description,\s*is_enabled = excluded\.is_enabled,\s*rules_json = excluded\.rules_json,\s*updated_at = NOW\(\)/gis,
      'ON DUPLICATE KEY UPDATE description = VALUES(description), is_enabled = VALUES(is_enabled), rules_json = VALUES(rules_json), updated_at = NOW()'
    );
}

export function getDatabase(): AppDatabase {
  if (!db || !dbReady) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const mysqlHost = (process.env.MYSQL_HOST || '').trim();
  const mysqlUser = (process.env.MYSQL_USER || '').trim();
  const mysqlDatabase = (process.env.MYSQL_DATABASE || process.env.DB_NAME || '').trim();
  const hasMysqlCredentials = Boolean(mysqlHost && mysqlUser && mysqlDatabase);

  if (!hasMysqlCredentials) {
    initializeSqliteDatabase('MySQL credentials are missing.');
    return;
  }

  try {
    initializeMySqlDatabase(mysqlHost, mysqlUser, mysqlDatabase);
  } catch (error: any) {
    const reason = error?.message || 'unknown error';
    console.warn(`⚠️ MySQL initialization failed (${reason}). Falling back to SQLite.`);
    initializeSqliteDatabase('MySQL connection failed.');
  }
}

function initializeMySqlDatabase(host: string, user: string, database: string): void {
  const SyncMysql = require('sync-mysql');

  const connection = new SyncMysql({
    host,
    port: Number(process.env.MYSQL_PORT || 3306),
    user,
    password: process.env.MYSQL_PASSWORD || '',
    database,
    charset: 'utf8mb4'
  }) as SyncMysqlConnection;

  db = new MySqlDb(connection);
  dbReady = true;

  for (const sql of getMySqlSchemaStatements()) {
    try {
      db.exec(sql);
    } catch (err: any) {
      console.warn(`MySQL schema statement failed: ${err.message}`);
    }
  }

  console.log(`✅ MySQL database initialized successfully (${database})`);
}

function initializeSqliteDatabase(reason: string): void {
  const BetterSqlite3 = require('better-sqlite3');
  const configuredPath = process.env.DATABASE_PATH || './data/fera_shopkeeper.db';
  const resolvedPath = path.resolve(process.cwd(), configuredPath);

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const sqliteConnection = new BetterSqlite3(resolvedPath) as SqliteConnection;
  sqliteConnection.pragma('foreign_keys = ON');
  sqliteConnection.pragma('journal_mode = WAL');

  db = new SqliteDb(sqliteConnection);
  dbReady = true;

  for (const sql of getSqliteSchemaStatements()) {
    try {
      db.exec(sql);
    } catch (err: any) {
      console.warn(`SQLite schema statement failed: ${err.message}`);
    }
  }

  console.log(`⚠️ ${reason}`);
  console.log(`✅ SQLite fallback database initialized (${resolvedPath})`);
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

function getSqliteSchemaStatements(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      business_name TEXT,
      logo_url TEXT,
      plan TEXT NOT NULL DEFAULT 'trial',
      plan_expires_at DATETIME,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      subdomain TEXT UNIQUE,
      custom_domain TEXT UNIQUE,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      ai_credits_balance INTEGER NOT NULL DEFAULT 20,
      ai_credits_monthly_limit INTEGER NOT NULL DEFAULT 20,
      ai_credits_used_month INTEGER NOT NULL DEFAULT 0,
      ai_credits_reset_at DATETIME,
      storage_used_bytes INTEGER NOT NULL DEFAULT 0,
      storage_limit_bytes INTEGER NOT NULL DEFAULT 52428800,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'default',
      config TEXT,
      sections TEXT,
      is_published INTEGER NOT NULL DEFAULT 0,
      theme TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cost_price REAL,
      price REAL NOT NULL,
      sale_price REAL,
      category TEXT,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      image_file_id TEXT,
      image_size_bytes INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT,
      delivery_type TEXT NOT NULL DEFAULT 'pickup',
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider_order_id TEXT UNIQUE,
      provider_payment_id TEXT UNIQUE,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'pending',
      plan TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      model_used TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      credits_used INTEGER NOT NULL DEFAULT 1,
      usage_type TEXT NOT NULL DEFAULT 'shopkeeper_assistant',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ai_credit_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credits INTEGER NOT NULL,
      amount REAL NOT NULL,
      usage_scope TEXT NOT NULL DEFAULT 'shared',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS storage_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      gb_added INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ticket_replies (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_plan TEXT NOT NULL DEFAULT 'all',
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS feature_flags (
      id TEXT PRIMARY KEY,
      flag_key TEXT UNIQUE NOT NULL,
      description TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      rules_json TEXT,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      metadata TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_products_user ON products (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_user_created ON products (user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_phone_shop ON orders (customer_phone, user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON ai_usage_logs (usage_type)`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes (email)`,
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events (user_id, created_at)`
  ];
}
