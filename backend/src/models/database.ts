import fs from 'fs';
import path from 'path';

let db: DatabaseAdapter | undefined;
let dbReady = false;

type SyncMysqlConnection = {
  query: (sql: string, params?: unknown[]) => any;
};

type SqliteConnection = {
  pragma: (sql: string) => unknown;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
    run: (...params: unknown[]) => { changes?: number; lastInsertRowid?: number };
  };
};

type DatabaseAdapter = {
  exec: (sql: string) => void;
  prepare: (sql: string) => PreparedStatementAdapter;
};

type PreparedStatementAdapter = {
  get: (...params: unknown[]) => unknown | undefined;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number };
};

class MySqlDb implements DatabaseAdapter {
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

  prepare(sql: string): PreparedStatementAdapter {
    return new MySqlPreparedStatement(this._connection, sql);
  }
}

class MySqlPreparedStatement implements PreparedStatementAdapter {
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

class SqliteDb implements DatabaseAdapter {
  private _connection: SqliteConnection;

  constructor(connection: SqliteConnection) {
    this._connection = connection;
  }

  exec(sql: string): void {
    this._connection.exec(sql);
  }

  prepare(sql: string): PreparedStatementAdapter {
    return new SqlitePreparedStatement(this._connection, sql);
  }
}

class SqlitePreparedStatement implements PreparedStatementAdapter {
  private _connection: SqliteConnection;
  private _sql: string;

  constructor(connection: SqliteConnection, sql: string) {
    this._connection = connection;
    this._sql = sql;
  }

  get(...params: unknown[]): unknown | undefined {
    const flatParams = this._flattenParams(params);
    return this._connection.prepare(this._sql).get(...flatParams);
  }

  all(...params: unknown[]): unknown[] {
    const flatParams = this._flattenParams(params);
    return this._connection.prepare(this._sql).all(...flatParams);
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const flatParams = this._flattenParams(params);
    const result = this._connection.prepare(this._sql).run(...flatParams) || {};
    return {
      changes: result.changes || 0,
      lastInsertRowid: toSafeRowId(result.lastInsertRowid)
    };
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

function transformSchemaStatementForSqlite(sql: string): string {
  return sql
    .replace(/\)\s*(?:ENGINE=InnoDB\s*)?(?:DEFAULT\s+CHARSET=utf8mb4\s*)?(?:ENGINE=InnoDB\s*)?$/i, ')')
    .replace(/\bLONGTEXT\b/gi, 'TEXT')
    .replace(/\bTINYINT\b/gi, 'INTEGER')
    .replace(/\bBIGINT\b/gi, 'INTEGER')
    .replace(/\bDECIMAL\((\d+),(\d+)\)\b/gi, 'REAL')
    .replace(/DATETIME\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')
    .replace(/,\s*INDEX\s+[^(]+\(.+?\)\s*(?=,|\))/gis, '')
    .replace(/,\s*\)/g, '\n)');
}

function toSafeRowId(rowId: unknown): number {
  if (typeof rowId === 'bigint') {
    if (rowId > BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Number(rowId);
  }
  return Number(rowId || 0);
}

export function getDatabase(): DatabaseAdapter {
  if (!db || !dbReady) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const databaseClient = (process.env.DATABASE_CLIENT || 'mysql').toLowerCase();

  if (databaseClient === 'sqlite') {
    initializeSqliteDatabase();
    return;
  }

  if (!process.env.MYSQL_HOST) {
    console.warn('⚠️ MYSQL_HOST not set. Falling back to SQLite backup database.');
    initializeSqliteDatabase();
    return;
  }

  try {
    initializeMySqlDatabase();
  } catch {
    console.warn('⚠️ MySQL unavailable. Falling back to SQLite backup database.');
    initializeSqliteDatabase();
  }
}

function initializeMySqlDatabase(): void {
  const SyncMysql = require('sync-mysql');
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'fera_shopkeeper';

  const connection = new SyncMysql({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database,
    charset: 'utf8mb4'
  }) as SyncMysqlConnection;

  db = new MySqlDb(connection);
  dbReady = true;

  for (const sql of getSchemaStatements()) {
    try {
      db.exec(sql);
    } catch (err: any) {
      console.warn(`MySQL schema statement failed: ${err.message}`);
    }
  }

  console.log(`✅ MySQL database initialized successfully (${database})`);
}

function initializeSqliteDatabase(): void {
  const BetterSqlite = require('better-sqlite3');
  const configuredPath = process.env.DATABASE_PATH || './data/fera_shopkeeper.db';
  const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const connection = new BetterSqlite(databasePath) as SqliteConnection;
  connection.pragma('foreign_keys = ON');

  db = new SqliteDb(connection);
  dbReady = true;

  for (const sql of getSchemaStatements()) {
    try {
      db.exec(transformSchemaStatementForSqlite(sql));
    } catch (err: any) {
      console.warn(`SQLite schema statement failed: ${err.message}`);
    }
  }

  console.log(`✅ SQLite backup database initialized successfully (${databasePath})`);
}

function getSchemaStatements(): string[] {
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
