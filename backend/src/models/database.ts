import initSqlJs, { Database as SqlJsDatabase, QueryExecResult } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: SqlJsDb;
let sqlJsReady = false;

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
  if (!db || !sqlJsReady) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events(user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email)`
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
