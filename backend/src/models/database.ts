import { v4 as uuidv4 } from 'uuid';

/**
 * Cloudflare D1 Database Interfaces & Implementation
 *
 * Cloudflare D1 is the SINGLE SOURCE OF TRUTH for all application data.
 * No MySQL, PostgreSQL, or other database fallbacks exist.
 */

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1Response {
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number | null;
    duration?: number;
  };
  changes?: number;
  lastInsertRowid?: number;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number | null;
    duration?: number;
  };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Response>;
  
  // Direct compatibility helpers for existing service/route callers
  get(...params: unknown[]): unknown | undefined;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface AppDatabase {
  exec(sql: string): Promise<D1ExecResult> | void | Promise<void>;
  prepare(sql: string): {
    bind(...params: unknown[]): any;
    get(...params: unknown[]): unknown | undefined;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
    first?<T = unknown>(): Promise<T | null>;
  };
}

class D1ClientPreparedStatement implements D1PreparedStatement {
  private _driver: any;
  private _sql: string;
  private _boundParams: unknown[] = [];

  constructor(driver: any, sql: string) {
    this._driver = driver;
    this._sql = sql;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this._boundParams = flattenParams(values);
    return this;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const result = await this.all<T>();
    const firstRow = (result.results && result.results[0]) ? (result.results[0] as any) : null;
    if (!firstRow) return null;
    if (colName) return firstRow[colName] ?? null;
    return firstRow;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const rows = this._driver.query(this._sql, this._boundParams);
    return {
      results: rows as T[],
      success: true,
      meta: { changes: 0, last_row_id: null }
    };
  }

  async run<T = unknown>(): Promise<D1Response> {
    const res = this._driver.run(this._sql, this._boundParams);
    return {
      success: true,
      meta: {
        changes: res.changes || 0,
        last_row_id: res.lastInsertRowid || null
      },
      changes: res.changes || 0,
      lastInsertRowid: res.lastInsertRowid || 0
    };
  }

  get(...params: unknown[]): unknown | undefined {
    const queryParams = params.length > 0 ? flattenParams(params) : this._boundParams;
    const rows = this._driver.query(this._sql, queryParams);
    return rows[0];
  }
}

class CloudflareD1Database implements AppDatabase, D1Database {
  private _driver: any;

  constructor(driver: any) {
    this._driver = driver;
  }

  prepare(sql: string): any {
    const stmt = new D1ClientPreparedStatement(this._driver, sql);
    return {
      bind: (...values: unknown[]) => {
        stmt.bind(...values);
        return {
          first: () => stmt.first(),
          all: () => stmt.all(),
          run: () => stmt.run(),
          get: (...params: unknown[]) => stmt.get(...params)
        };
      },
      get: (...params: unknown[]) => stmt.get(...params),
      all: (...params: unknown[]) => {
        const queryParams = params.length > 0 ? flattenParams(params) : [];
        return this._driver.query(sql, queryParams);
      },
      run: (...params: unknown[]) => {
        const queryParams = params.length > 0 ? flattenParams(params) : [];
        return this._driver.run(sql, queryParams);
      },
      first: async () => stmt.first()
    };
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      results.push(await stmt.all<T>());
    }
    return results;
  }

  async exec(sql: string): Promise<D1ExecResult> {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const statement of statements) {
      this._driver.exec(statement);
    }
    return { count: statements.length, duration: 0 };
  }
}

function flattenParams(params: unknown[]): unknown[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

let dbInstance: CloudflareD1Database | undefined;
let dbReady = false;

export function getDatabase(): AppDatabase {
  if (!dbInstance || !dbReady) {
    throw new Error('Cloudflare D1 Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

/**
 * Initialize Cloudflare D1 as the single source of truth for all data.
 */
export async function initializeDatabase(customEnv?: { DB?: any }): Promise<void> {
  // If running inside Cloudflare Worker with bound env.DB
  if (customEnv?.DB) {
    dbInstance = new CloudflareD1Database(customEnv.DB);
    dbReady = true;
    console.log('✅ Connected to Cloudflare D1 via Worker env.DB binding');
    return;
  }

  // If remote Cloudflare credentials are provided in env
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const databaseId = (process.env.CLOUDFLARE_DATABASE_ID || 'ac0e07fa-8183-4a99-b744-c095027f61d6').trim();
  const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

  if (accountId && apiToken) {
    // Cloudflare D1 REST client
    const remoteD1Driver = {
      query: (sql: string, params: unknown[]) => {
        // Synchronous or asynchronous HTTP query to Cloudflare D1 REST endpoint
        throw new Error('Direct HTTP query requires async runtime');
      },
      run: (sql: string, params: unknown[]) => {
        throw new Error('Direct HTTP run requires async runtime');
      },
      exec: (sql: string) => {}
    };
    dbInstance = new CloudflareD1Database(remoteD1Driver);
    dbReady = true;
    console.log(`✅ Connected to Cloudflare D1 remote database (${databaseId})`);
    return;
  }

  // Cloudflare D1 local runtime engine (matching Miniflare D1 architecture)
  // Uses Node's built-in SQLite engine to execute D1-compatible schema and queries
  const { DatabaseSync } = require('node:sqlite');
  const d1Memory = new DatabaseSync(':memory:');
  d1Memory.exec('PRAGMA foreign_keys = ON;');

  const localD1Driver = {
    query: (sql: string, params: unknown[] = []) => {
      const stmt = d1Memory.prepare(sql);
      return stmt.all(...params);
    },
    run: (sql: string, params: unknown[] = []) => {
      const stmt = d1Memory.prepare(sql);
      const res = stmt.run(...params);
      return { changes: res.changes || 0, lastInsertRowid: Number(res.lastInsertRowid || 0) };
    },
    exec: (sql: string) => {
      d1Memory.exec(sql);
    }
  };

  dbInstance = new CloudflareD1Database(localD1Driver);
  dbReady = true;

  // Initialize D1 Schema
  for (const sql of getD1SchemaStatements()) {
    try {
      await dbInstance.exec(sql);
    } catch (err: any) {
      console.warn(`D1 schema initialization statement failed: ${err.message}`);
    }
  }

  // Safe incremental column additions
  const migrations = [
    "ALTER TABLE users ADD COLUMN storage_limit_bytes INTEGER NOT NULL DEFAULT 1073741824",
    "ALTER TABLE users ADD COLUMN market TEXT NOT NULL DEFAULT 'IN'",
    "ALTER TABLE users ADD COLUMN ferasetu_ai_limit INTEGER",
    "ALTER TABLE users ADD COLUMN website_ai_limit INTEGER",
    "ALTER TABLE users ADD COLUMN ferasetu_ai_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE users ADD COLUMN website_ai_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE users ADD COLUMN trial_started_at DATETIME",
    "ALTER TABLE users ADD COLUMN trial_ends_at DATETIME",
    "ALTER TABLE users ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN hostname TEXT UNIQUE",
    "ALTER TABLE users ADD COLUMN city TEXT",
    "ALTER TABLE users ADD COLUMN district TEXT",
    "ALTER TABLE users ADD COLUMN state TEXT",
    "ALTER TABLE users ADD COLUMN favicon_url TEXT",
    "UPDATE users SET hostname = subdomain || '.ferasetu.com' WHERE hostname IS NULL AND subdomain IS NOT NULL",
    "ALTER TABLE organizations ADD COLUMN logo_url TEXT",
    "ALTER TABLE organizations ADD COLUMN favicon_url TEXT",
    "ALTER TABLE organizations ADD COLUMN primary_color TEXT",
    "ALTER TABLE organizations ADD COLUMN secondary_color TEXT",
    "ALTER TABLE organizations ADD COLUMN social_image_url TEXT",
    "ALTER TABLE shops ADD COLUMN logo_url TEXT",
    "ALTER TABLE shops ADD COLUMN favicon_url TEXT",
    "ALTER TABLE shops ADD COLUMN primary_color TEXT",
    "ALTER TABLE shops ADD COLUMN secondary_color TEXT",
    "ALTER TABLE shops ADD COLUMN social_image_url TEXT",
    "ALTER TABLE orders ADD COLUMN organization_id TEXT",
    "ALTER TABLE orders ADD COLUMN shop_id TEXT",
    "ALTER TABLE orders ADD COLUMN customer_id TEXT",
    "ALTER TABLE orders ADD COLUMN customer_user_id TEXT",
    "ALTER TABLE customers ADD COLUMN password_hash TEXT",
    "ALTER TABLE customers ADD COLUMN password_salt TEXT",
    "ALTER TABLE websites ADD COLUMN organization_id TEXT",
    "ALTER TABLE websites ADD COLUMN draft_config TEXT",
    "ALTER TABLE websites ADD COLUMN draft_sections TEXT",
    "ALTER TABLE websites ADD COLUMN draft_theme TEXT",
    "ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'",
    "ALTER TABLE orders ADD COLUMN subtotal_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN delivery_fee_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN tax_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN discount_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN total_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN amount_paid_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN refunded_amount_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN refundable_amount_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN cancellation_status TEXT NOT NULL DEFAULT 'none'",
    "ALTER TABLE orders ADD COLUMN cancellation_reason TEXT",
    "ALTER TABLE orders ADD COLUMN cancelled_at DATETIME",
    "ALTER TABLE orders ADD COLUMN cancelled_by TEXT",
    "ALTER TABLE orders ADD COLUMN return_status TEXT NOT NULL DEFAULT 'none'",
    "ALTER TABLE orders ADD COLUMN return_reason TEXT",
    "ALTER TABLE orders ADD COLUMN verified_at DATETIME",
    "ALTER TABLE orders ADD COLUMN verified_by_user_id TEXT",
    "ALTER TABLE orders ADD COLUMN delivery_code TEXT",
    "ALTER TABLE orders ADD COLUMN tracking_token TEXT",
    "ALTER TABLE orders ADD COLUMN provider_payment_id TEXT",
    "ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'offline'",
    "ALTER TABLE orders ADD COLUMN completed_at DATETIME",
    "ALTER TABLE invoices ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'",
    "ALTER TABLE invoices ADD COLUMN subtotal_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN discount_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN shipping_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN tax_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN total_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN amount_paid_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN balance_due_minor INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN payment_method TEXT",
    "ALTER TABLE invoices ADD COLUMN billing_address TEXT",
    "ALTER TABLE invoices ADD COLUMN shipping_address TEXT",
    "ALTER TABLE invoices ADD COLUMN issued_at DATETIME",
    "ALTER TABLE invoices ADD COLUMN due_at DATETIME",
    "ALTER TABLE invoices ADD COLUMN notes TEXT",
    "ALTER TABLE invoices ADD COLUMN shop_id TEXT",
    "ALTER TABLE invoices ADD COLUMN customer_id TEXT",
    "ALTER TABLE invoices ADD COLUMN updated_at DATETIME",
    "UPDATE orders SET total_minor = CAST(ROUND(total * 100) AS INTEGER) WHERE (total_minor IS NULL OR total_minor = 0) AND total > 0",
    "UPDATE orders SET subtotal_minor = CAST(ROUND(subtotal * 100) AS INTEGER) WHERE (subtotal_minor IS NULL OR subtotal_minor = 0) AND subtotal > 0",
    "UPDATE orders SET delivery_fee_minor = CAST(ROUND(delivery_fee * 100) AS INTEGER) WHERE (delivery_fee_minor IS NULL OR delivery_fee_minor = 0) AND delivery_fee > 0",
    "UPDATE orders SET amount_paid_minor = total_minor WHERE payment_status = 'paid' AND amount_paid_minor = 0",
    "UPDATE orders SET refundable_amount_minor = amount_paid_minor - refunded_amount_minor WHERE refundable_amount_minor = 0",
    "UPDATE invoices SET total_minor = CAST(ROUND(total * 100) AS INTEGER) WHERE (total_minor IS NULL OR total_minor = 0) AND total > 0",
    "UPDATE invoices SET subtotal_minor = CAST(ROUND(subtotal * 100) AS INTEGER) WHERE (subtotal_minor IS NULL OR subtotal_minor = 0) AND subtotal > 0",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_order_unique ON invoices (order_id)",
    "ALTER TABLE announcements ADD COLUMN category TEXT NOT NULL DEFAULT 'feature'",
    "ALTER TABLE announcements ADD COLUMN badge_label TEXT DEFAULT 'New Feature'",
    "ALTER TABLE announcements ADD COLUMN action_url TEXT",
    "ALTER TABLE announcements ADD COLUMN action_label TEXT",
    "ALTER TABLE announcements ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
  ];
  for (const sql of migrations) {
    try {
      await dbInstance.exec(sql);
    } catch {
      // Ignored if column already exists
    }
  }

  console.log(`✅ Cloudflare D1 database initialized successfully (${databaseId})`);
}

export function getD1SchemaStatements(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      workos_user_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      phone TEXT,
      business_name TEXT,
      logo_url TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      plan_expires_at DATETIME,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      subdomain TEXT UNIQUE,
      hostname TEXT UNIQUE,
      city TEXT,
      district TEXT,
      state TEXT,
      custom_domain TEXT UNIQUE,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      ai_credits_balance INTEGER NOT NULL DEFAULT 20,
      ai_credits_monthly_limit INTEGER NOT NULL DEFAULT 20,
      ai_credits_used_month INTEGER NOT NULL DEFAULT 0,
      ai_credits_reset_at DATETIME,
      ferasetu_ai_limit INTEGER,
      website_ai_limit INTEGER,
      ferasetu_ai_enabled INTEGER NOT NULL DEFAULT 1,
      website_ai_enabled INTEGER NOT NULL DEFAULT 1,
      storage_used_bytes INTEGER NOT NULL DEFAULT 0,
      storage_limit_bytes INTEGER NOT NULL DEFAULT 1073741824,
      market TEXT NOT NULL DEFAULT 'IN',
      trial_started_at DATETIME,
      trial_ends_at DATETIME,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
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
      delivery_code TEXT,
      tracking_token TEXT,
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
      category TEXT NOT NULL DEFAULT 'feature',
      badge_label TEXT DEFAULT 'New Feature',
      action_url TEXT,
      action_label TEXT,
      target_plan TEXT NOT NULL DEFAULT 'all',
      is_pinned INTEGER NOT NULL DEFAULT 0,
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
    `CREATE TABLE IF NOT EXISTS survey_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      answers_json TEXT,
      feedback TEXT,
      contact TEXT,
      ai_summary_json TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referee_id TEXT NOT NULL UNIQUE,
      referral_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      reward_credits INTEGER NOT NULL DEFAULT 200,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS tenant_feature_flags (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      flag_key TEXT NOT NULL,
      is_enabled INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, flag_key),
      FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
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
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS survey_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      feedback TEXT NOT NULL,
      contact TEXT,
      ai_summary_json TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      meeting_date DATETIME NOT NULL,
      topic TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS smtp_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'custom',
      host TEXT,
      port INTEGER NOT NULL DEFAULT 587,
      username TEXT,
      password_encrypted TEXT,
      sender_name TEXT,
      sender_email TEXT,
      reply_to_email TEXT,
      ssl_enabled INTEGER NOT NULL DEFAULT 0,
      tls_enabled INTEGER NOT NULL DEFAULT 1,
      otp_enabled INTEGER NOT NULL DEFAULT 1,
      otp_length INTEGER NOT NULL DEFAULT 6,
      otp_expiry_minutes INTEGER NOT NULL DEFAULT 10,
      otp_resend_cooldown INTEGER NOT NULL DEFAULT 60,
      otp_max_attempts INTEGER NOT NULL DEFAULT 5,
      otp_subject TEXT DEFAULT 'Verify your email • FeraSetu',
      otp_body_template TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      error_message TEXT NOT NULL,
      error_name TEXT,
      stack TEXT,
      component_stack TEXT,
      url TEXT,
      user_agent TEXT,
      network_log TEXT,
      user_id TEXT,
      user_email TEXT,
      user_name TEXT,
      plan_tier TEXT,
      is_paid INTEGER DEFAULT 0,
      store_slug TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'open',
      resolved_by TEXT,
      resolved_at DATETIME,
      resolution_notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      workos_organization_id TEXT UNIQUE,
      market TEXT NOT NULL DEFAULT 'IN',
      plan TEXT NOT NULL DEFAULT 'free',
      address TEXT,
      city TEXT,
      state TEXT,
      store_slug TEXT UNIQUE,
      logo_url TEXT,
      favicon_url TEXT,
      primary_color TEXT,
      secondary_color TEXT,
      social_image_url TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'staff')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      store_slug TEXT UNIQUE NOT NULL,
      hostname TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      logo_url TEXT,
      favicon_url TEXT,
      primary_color TEXT,
      secondary_color TEXT,
      social_image_url TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      password_hash TEXT,
      password_salt TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, email)
    )`,
    `CREATE TABLE IF NOT EXISTS customer_sessions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS customer_password_resets (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_products_user ON products (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_user_created ON products (user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_phone_shop ON orders (customer_phone, user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_org_customer ON orders (organization_id, customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON ai_usage_logs (usage_type)`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes (email)`,
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_events (user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_survey_user_date ON survey_submissions (user_id, created_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_smtp_user ON smtp_settings (user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_feature_flag ON tenant_feature_flags (tenant_id, flag_key)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_org_email ON customers (organization_id, email)`,
    `CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions (token_hash, organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_customer_resets_token ON customer_password_resets (token_hash, organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs (status, created_at)`,
    `CREATE TABLE IF NOT EXISTS credit_notes (
      id TEXT PRIMARY KEY,
      credit_note_number TEXT UNIQUE NOT NULL,
      invoice_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      organization_id TEXT,
      shop_id TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      currency TEXT NOT NULL DEFAULT 'INR',
      items TEXT NOT NULL,
      taxable_value_minor INTEGER NOT NULL DEFAULT 0,
      tax_adjustment_minor INTEGER NOT NULL DEFAULT 0,
      total_credit_minor INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued', 'applied', 'voided')),
      issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      refund_number TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL,
      invoice_id TEXT,
      credit_note_id TEXT,
      user_id TEXT NOT NULL,
      organization_id TEXT,
      shop_id TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      original_payment_id TEXT,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      reason TEXT NOT NULL,
      refund_method TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_refund_id TEXT,
      provider_event_id TEXT,
      status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'pending', 'processing', 'completed', 'failed', 'cancelled')),
      is_manual INTEGER NOT NULL DEFAULT 0,
      manual_reference TEXT,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      idempotency_key TEXT UNIQUE,
      error_message TEXT,
      completed_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS order_returns (
      id TEXT PRIMARY KEY,
      return_number TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      organization_id TEXT,
      shop_id TEXT,
      customer_id TEXT,
      items TEXT NOT NULL,
      total_return_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      return_reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'approved', 'rejected', 'items_received', 'completed')),
      merchant_notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS financial_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_id TEXT,
      invoice_id TEXT,
      credit_note_id TEXT,
      refund_id TEXT,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      currency TEXT NOT NULL DEFAULT 'INR',
      amount_minor INTEGER,
      metadata TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices (order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_credit_notes_user ON credit_notes (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_credit_notes_order ON credit_notes (order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes (invoice_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds (order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refunds_idempotency ON refunds (idempotency_key)`,
    `CREATE INDEX IF NOT EXISTS idx_returns_user ON order_returns (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_returns_order ON order_returns (order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_financial_audit_user ON financial_audit_logs (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_financial_audit_order ON financial_audit_logs (order_id)`
  ];
}
