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
    this._db.run(sql);
    this._persist();
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

  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      business_name TEXT,
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'premium')),
      preferred_language TEXT NOT NULL DEFAULT 'en',
      subdomain TEXT UNIQUE,
      custom_domain TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Website configurations
    CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'default',
      config JSON NOT NULL DEFAULT '{}',
      is_published INTEGER NOT NULL DEFAULT 0,
      theme JSON NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      sale_price REAL,
      category TEXT,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata JSON DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT,
      delivery_type TEXT NOT NULL DEFAULT 'pickup' CHECK(delivery_type IN ('pickup', 'walking', 'bicycle', 'delivery')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
      items JSON NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- AI conversation history
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      model_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Analytics events
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_data JSON DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Invoices table
    CREATE TABLE IF NOT EXISTS invoices (
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
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events(user_id, created_at);
  `);

  console.log('✅ Database initialized successfully');
}
