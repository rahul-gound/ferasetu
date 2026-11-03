import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to escape values safely for CSV (RFC 4180 standard)
export function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// RFC 4180 compliant CSV parser that handles quotes, escaped quotes (""), commas, and CRLF
export function parseCsvText(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter(r => r.some(c => c.length > 0));
}

// Automatically detect column positions for Name, Phone, Email, Address
export function detectColumnIndices(headers: string[]): {
  nameIdx: number;
  phoneIdx: number;
  emailIdx: number;
  addressIdx: number;
} {
  let nameIdx = -1;
  let phoneIdx = -1;
  let emailIdx = -1;
  let addressIdx = -1;

  headers.forEach((h, idx) => {
    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameIdx === -1 && (norm === 'name' || norm === 'customername' || norm === 'fullname' || norm === 'customer' || norm === 'naam' || norm === 'contactname')) {
      nameIdx = idx;
    } else if (phoneIdx === -1 && (norm === 'phone' || norm === 'phonenumber' || norm === 'mobile' || norm === 'mobilenumber' || norm === 'contact' || norm === 'whatsapp' || norm === 'contactnumber' || norm === 'phoneno')) {
      phoneIdx = idx;
    } else if (emailIdx === -1 && (norm === 'email' || norm === 'emailaddress' || norm === 'emailid' || norm === 'customeremail')) {
      emailIdx = idx;
    } else if (addressIdx === -1 && (norm === 'address' || norm === 'deliveryaddress' || norm === 'shippingaddress' || norm === 'fulladdress' || norm === 'city' || norm === 'location' || norm === 'street')) {
      addressIdx = idx;
    }
  });

  // Default sequential fallback if column headers are non-standard
  if (nameIdx === -1 && headers.length > 0) nameIdx = 0;
  if (phoneIdx === -1 && headers.length > 1) phoneIdx = 1;
  if (emailIdx === -1 && headers.length > 2) emailIdx = 2;
  if (addressIdx === -1 && headers.length > 3) addressIdx = 3;

  return { nameIdx, phoneIdx, emailIdx, addressIdx };
}

// Consolidated query to fetch merchant's registered and guest customers with order metrics
export function getMerchantCustomers(userId: string) {
  const db = getDatabase();

  // 1. Get registered customers from `customers` table
  const registeredCustomers = db.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.address, c.created_at, c.updated_at,
           CASE WHEN c.password_hash IS NOT NULL AND c.password_hash != '' THEN 1 ELSE 0 END as has_account
    FROM customers c
    WHERE c.organization_id = ? OR c.organization_id IN (
      SELECT id FROM organizations WHERE id = ?
    )
    ORDER BY c.created_at DESC
  `).all(userId, userId) as any[];

  // 2. Get customer order metrics from `orders` table
  const orderMetrics = db.prepare(`
    SELECT customer_phone, customer_email, customer_name,
           COUNT(id) as total_orders,
           SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) as total_spent,
           MAX(created_at) as last_order_date
    FROM orders
    WHERE user_id = ? OR organization_id = ?
    GROUP BY COALESCE(NULLIF(customer_phone, ''), customer_email, customer_name)
  `).all(userId, userId) as any[];

  // 3. Get customer last login from `customer_sessions`
  const lastLogins = db.prepare(`
    SELECT customer_id, MAX(created_at) as last_login_at
    FROM customer_sessions
    WHERE organization_id = ?
    GROUP BY customer_id
  `).all(userId) as any[];

  const loginMap = new Map<string, string>();
  for (const log of lastLogins) {
    if (log.customer_id) loginMap.set(log.customer_id, log.last_login_at);
  }

  const metricsByPhone = new Map<string, any>();
  const metricsByEmail = new Map<string, any>();

  for (const met of orderMetrics) {
    if (met.customer_phone) metricsByPhone.set(met.customer_phone.replace(/\D/g, ''), met);
    if (met.customer_email) metricsByEmail.set(met.customer_email.toLowerCase(), met);
  }

  const processedCustomerIds = new Set<string>();
  const mergedList: any[] = [];

  // Merge registered customers
  for (const reg of registeredCustomers) {
    processedCustomerIds.add(reg.id);
    const cleanPhone = reg.phone ? reg.phone.replace(/\D/g, '') : '';
    const cleanEmail = reg.email ? reg.email.toLowerCase() : '';

    const matchedMetric = (cleanPhone && metricsByPhone.get(cleanPhone)) || (cleanEmail && metricsByEmail.get(cleanEmail));

    mergedList.push({
      id: reg.id,
      name: reg.name || 'Store Customer',
      email: reg.email,
      phone: reg.phone || '',
      address: reg.address || '',
      account_type: reg.has_account ? 'registered' : 'lead',
      has_password: Boolean(reg.has_account),
      total_orders: matchedMetric ? Number(matchedMetric.total_orders || 0) : 0,
      total_spent: matchedMetric ? Math.round(Number(matchedMetric.total_spent || 0)) : 0,
      last_order_at: matchedMetric?.last_order_date || null,
      last_login_at: loginMap.get(reg.id) || null,
      created_at: reg.created_at,
      source: 'storefront_signup',
    });
  }

  // Also include guest ordering customers who haven't registered an account yet
  for (const ord of orderMetrics) {
    const cleanEmail = ord.customer_email ? ord.customer_email.toLowerCase() : '';
    const cleanPhone = ord.customer_phone ? ord.customer_phone.replace(/\D/g, '') : '';

    const alreadyIncluded = mergedList.some(c =>
      (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail) ||
      (cleanPhone && c.phone && c.phone.replace(/\D/g, '') === cleanPhone)
    );

    if (!alreadyIncluded && (ord.customer_name || ord.customer_phone || ord.customer_email)) {
      mergedList.push({
        id: `guest_${uuidv4().substring(0, 8)}`,
        name: ord.customer_name || 'Guest Shopper',
        email: ord.customer_email || '',
        phone: ord.customer_phone || '',
        address: '',
        account_type: 'guest_buyer',
        has_password: false,
        total_orders: Number(ord.total_orders || 0),
        total_spent: Math.round(Number(ord.total_spent || 0)),
        last_order_at: ord.last_order_date,
        last_login_at: null,
        created_at: ord.last_order_date,
        source: 'order_checkout',
      });
    }
  }

  // Sort by most recently active (last_login or last_order or created_at)
  mergedList.sort((a, b) => {
    const timeA = new Date(a.last_login_at || a.last_order_at || a.created_at).getTime();
    const timeB = new Date(b.last_login_at || b.last_order_at || b.created_at).getTime();
    return timeB - timeA;
  });

  const totalCustomers = mergedList.length;
  const registeredCount = mergedList.filter(c => c.account_type === 'registered').length;
  const repeatBuyers = mergedList.filter(c => c.total_orders > 1).length;
  const totalRevenue = mergedList.reduce((sum, c) => sum + (c.total_spent || 0), 0);

  return {
    customers: mergedList,
    stats: {
      total_customers: totalCustomers,
      registered_accounts: registeredCount,
      repeat_buyers: repeatBuyers,
      total_revenue: totalRevenue,
    }
  };
}

// GET /api/customers — Fetch merchant's customers with login status & order metrics
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  try {
    const result = getMerchantCustomers(userId);
    res.json({
      success: true,
      stats: result.stats,
      customers: result.customers,
    });
  } catch (err: any) {
    console.error('Failed to query customers:', err);
    res.status(500).json({ error: 'Failed to retrieve customers', details: err.message });
  }
});

// GET /api/customers/export/csv and GET /api/customers/export — Export full customer directory to CSV
router.get(['/export/csv', '/export'], authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  try {
    const { customers } = getMerchantCustomers(userId);
    const headers = [
      'Customer ID',
      'Name',
      'Phone',
      'Email',
      'Address',
      'Account Type',
      'Orders Count',
      'Total Spent (INR)',
      'Last Order Date',
      'Last Login Date',
      'Joined Date',
      'Source'
    ];

    const rows = customers.map(c => [
      escapeCsv(c.id),
      escapeCsv(c.name || ''),
      escapeCsv(c.phone || ''),
      escapeCsv(c.email || ''),
      escapeCsv(c.address || ''),
      escapeCsv(c.account_type || ''),
      c.total_orders ?? 0,
      c.total_spent ?? 0,
      escapeCsv(c.last_order_at || ''),
      escapeCsv(c.last_login_at || ''),
      escapeCsv(c.created_at || ''),
      escapeCsv(c.source || '')
    ].join(','));

    const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `FeraSetu_Customers_Export_${dateStr}.csv`;

    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      res.json({
        success: true,
        count: customers.length,
        filename,
        csv: csvContent
      });
      return;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error('Failed to export customers to CSV:', err);
    res.status(500).json({ error: 'Failed to export customers to CSV', details: err.message });
  }
});

// GET /api/customers/template/csv — Download standard CSV template for importing customers
router.get('/template/csv', (req, res: Response): void => {
  const headers = ['Name', 'Phone', 'Email', 'Address'];
  const samples = [
    ['Rajesh Kumar', '+919876543210', 'rajesh@example.com', 'Flat 402, Shanti Vihar, New Delhi'],
    ['Priya Sharma', '+919823456781', 'priya.sharma@gmail.com', 'Shop 12, MG Road, Pune, Maharashtra'],
    ['Vikram Patel', '+919712345678', '', 'Navrangpura, Ahmedabad, Gujarat'],
    ['Anita Roy', '', 'anita.roy@example.com', 'Sector 5, Salt Lake, Kolkata']
  ];

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...samples.map(row => row.map(escapeCsv).join(','))
  ].join('\r\n');

  if (req.query.format === 'json') {
    res.json({
      success: true,
      filename: 'ferasetu_customers_template.csv',
      csv: csvContent
    });
    return;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ferasetu_customers_template.csv"');
  res.send(csvContent);
});

// POST /api/customers/import and POST /api/customers/import/csv — Bulk import customers via CSV
router.post(['/import', '/import/csv'], authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const db = getDatabase();
  const now = new Date().toISOString();

  let itemsToProcess: Array<{ name?: string; phone?: string; email?: string; address?: string }> = [];

  // Support direct JSON array of customers
  if (Array.isArray(req.body.customers)) {
    itemsToProcess = req.body.customers;
  } else {
    // Support raw CSV text or { csv: string }
    let rawCsv = '';
    if (typeof req.body === 'string') {
      rawCsv = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
      rawCsv = req.body.csv;
    }

    if (!rawCsv.trim()) {
      res.status(400).json({ error: 'No CSV content provided for import' });
      return;
    }

    const parsedRows = parseCsvText(rawCsv);
    if (parsedRows.length === 0) {
      res.status(400).json({ error: 'The provided CSV file contains no data rows' });
      return;
    }

    // Inspect first row to see if it is a header row
    const firstRow = parsedRows[0];
    const isHeader = firstRow.some(cell => {
      const norm = cell.toLowerCase().replace(/[^a-z0-9]/g, '');
      return ['name', 'fullname', 'customername', 'phone', 'phonenumber', 'mobile', 'email', 'address', 'customer'].includes(norm);
    });

    const { nameIdx, phoneIdx, emailIdx, addressIdx } = detectColumnIndices(firstRow);
    const dataRows = isHeader ? parsedRows.slice(1) : parsedRows;

    itemsToProcess = dataRows.map(row => ({
      name: nameIdx !== -1 && row[nameIdx] !== undefined ? row[nameIdx].trim() : '',
      phone: phoneIdx !== -1 && row[phoneIdx] !== undefined ? row[phoneIdx].trim() : '',
      email: emailIdx !== -1 && row[emailIdx] !== undefined ? row[emailIdx].trim() : '',
      address: addressIdx !== -1 && row[addressIdx] !== undefined ? row[addressIdx].trim() : '',
    }));
  }

  if (itemsToProcess.length === 0) {
    res.status(400).json({ error: 'No valid customer rows found in file' });
    return;
  }

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  const findByEmailStmt = db.prepare('SELECT id, name, phone, address FROM customers WHERE organization_id = ? AND LOWER(email) = ? LIMIT 1');
  const findByPhoneStmt = db.prepare('SELECT id, name, phone, address, email FROM customers WHERE organization_id = ? AND phone != "" AND phone = ? LIMIT 1');
  const updateCustomerStmt = db.prepare(`
    UPDATE customers
    SET name = COALESCE(NULLIF(?, ''), name),
        phone = COALESCE(NULLIF(?, ''), phone),
        address = COALESCE(NULLIF(?, ''), address),
        updated_at = ?
    WHERE id = ?
  `);
  const insertCustomerStmt = db.prepare(`
    INSERT INTO customers (id, organization_id, name, email, phone, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const runImport = (rows: typeof itemsToProcess) => {
    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const rawName = (row.name || '').trim();
      const rawPhone = (row.phone || '').trim();
      const rawEmail = (row.email || '').trim().toLowerCase();
      const address = (row.address || '').trim();

      // Skip completely empty rows
      if (!rawName && !rawPhone && !rawEmail && !address) {
        skippedCount++;
        return;
      }

      const cleanPhone = rawPhone;
      // Synthesize clean offline email if none provided to ensure unique constraint
      const cleanEmail = rawEmail || (cleanPhone ? `${cleanPhone.replace(/\D/g, '')}@offline.ferasetu.local` : `cust_${uuidv4().substring(0, 8)}@offline.ferasetu.local`);
      const customerName = rawName || (cleanPhone ? `Customer ${cleanPhone}` : (rawEmail ? rawEmail.split('@')[0] : 'Store Customer'));

      try {
        let existing: any = null;
        if (rawEmail) {
          existing = findByEmailStmt.get(userId, rawEmail);
        }
        if (!existing && cleanPhone) {
          existing = findByPhoneStmt.get(userId, cleanPhone);
        }

        if (existing) {
          updateCustomerStmt.run(customerName, cleanPhone || existing.phone, address || existing.address, now, existing.id);
          updatedCount++;
        } else {
          const customerId = `cust_${uuidv4()}`;
          insertCustomerStmt.run(customerId, userId, customerName, cleanEmail, cleanPhone, address, now, now);
          importedCount++;
        }
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || 'Failed to save customer' });
        skippedCount++;
      }
    });
  };

  try {
    runImport(itemsToProcess);
    res.json({
      success: true,
      message: `Successfully processed ${itemsToProcess.length} customers (${importedCount} new, ${updatedCount} updated, ${skippedCount} skipped)`,
      total_processed: itemsToProcess.length,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
    });
  } catch (err: any) {
    console.error('Customer CSV import failed:', err);
    res.status(500).json({ error: 'Failed to complete customer import', details: err.message });
  }
});

// POST /api/customers — Manually add a customer to merchant's shop
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { name, email, phone, address } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(422).json({ error: 'Customer name is required' });
    return;
  }

  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : `${(phone || 'cust').replace(/\D/g, '')}@offline.ferasetu.local`;
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

  const db = getDatabase();
  const customerId = `cust_${uuidv4()}`;
  const now = new Date().toISOString();

  try {
    const existing = db.prepare('SELECT id FROM customers WHERE organization_id = ? AND LOWER(email) = ?').get(userId, cleanEmail) as any;
    if (existing) {
      res.status(409).json({ error: 'A customer with this email already exists' });
      return;
    }

    db.prepare(`
      INSERT INTO customers (id, organization_id, name, email, phone, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, userId, name.trim(), cleanEmail, cleanPhone, address || '', now, now);

    res.status(201).json({
      success: true,
      customer: {
        id: customerId,
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        address: address || '',
        account_type: 'registered',
        created_at: now,
      }
    });
  } catch (err: any) {
    console.error('Failed to create customer:', err);
    res.status(500).json({ error: 'Failed to add customer', details: err.message });
  }
});

// ============================================================================
// CUSTOMER SEGMENTS (Dynamic saved searches that update automatically)
// ============================================================================

export interface SegmentRule {
  field: 'orders_count' | 'total_spent' | 'email_subscribed' | 'account_type' | 'days_since_last_order' | 'city';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains';
  value: any;
}

export const PRESET_SEGMENT_TEMPLATES = [
  {
    id: 'email_subscribers_no_purchase',
    name: "Email subscribers who haven't purchased yet",
    description: "Subscribed to email marketing with 0 orders. Best for welcome discounts and first-purchase encouragement.",
    conjunction: 'AND' as const,
    rules: [
      { field: 'orders_count' as const, operator: 'equals' as const, value: 0 },
      { field: 'email_subscribed' as const, operator: 'equals' as const, value: true }
    ]
  },
  {
    id: 'haven_not_bought',
    name: "Customers who haven't bought",
    description: "All contacts with 0 orders placed. When one buys, they automatically leave the segment.",
    conjunction: 'AND' as const,
    rules: [
      { field: 'orders_count' as const, operator: 'equals' as const, value: 0 }
    ]
  },
  {
    id: 'first_time_buyers',
    name: "First-time buyers",
    description: "Placed exactly 1 order. Perfect for asking for reviews or offering second-order perks.",
    conjunction: 'AND' as const,
    rules: [
      { field: 'orders_count' as const, operator: 'equals' as const, value: 1 }
    ]
  },
  {
    id: 'repeat_buyers',
    name: "Repeat buyers",
    description: "Customers who ordered 2 or more times. Your most loyal regulars.",
    conjunction: 'AND' as const,
    rules: [
      { field: 'orders_count' as const, operator: 'greater_than' as const, value: 1 }
    ]
  },
  {
    id: 'high_spenders',
    name: "High-value spenders (₹5,000+)",
    description: "Customers who have spent ₹5,000 or more in lifetime purchases.",
    conjunction: 'AND' as const,
    rules: [
      { field: 'total_spent' as const, operator: 'greater_than_or_equal' as const, value: 5000 }
    ]
  },
  {
    id: 'lapsed_customers',
    name: "Lapsed past buyers (60+ days)",
    description: "Have bought before but haven't ordered in over 60 days. Prime group for win-back offers.",
    conjunction: 'AND' as const,
    rules: [
      { field: 'orders_count' as const, operator: 'greater_than' as const, value: 0 },
      { field: 'days_since_last_order' as const, operator: 'greater_than_or_equal' as const, value: 60 }
    ]
  }
];

export function evaluateCustomerAgainstRule(customer: any, rule: SegmentRule): boolean {
  if (rule.field === 'orders_count') {
    const customerVal = Number(customer.total_orders || 0);
    const target = Number(rule.value);
    switch (rule.operator) {
      case 'equals': return customerVal === target;
      case 'not_equals': return customerVal !== target;
      case 'greater_than': return customerVal > target;
      case 'less_than': return customerVal < target;
      case 'greater_than_or_equal': return customerVal >= target;
      case 'less_than_or_equal': return customerVal <= target;
      default: return false;
    }
  }

  if (rule.field === 'total_spent') {
    const customerVal = Number(customer.total_spent || 0);
    const target = Number(rule.value);
    switch (rule.operator) {
      case 'equals': return customerVal === target;
      case 'greater_than': return customerVal > target;
      case 'less_than': return customerVal < target;
      case 'greater_than_or_equal': return customerVal >= target;
      case 'less_than_or_equal': return customerVal <= target;
      default: return false;
    }
  }

  if (rule.field === 'email_subscribed') {
    const isSubscribed = Boolean(customer.email && customer.email.trim().length > 3);
    const targetBool = rule.value === true || rule.value === 'true' || rule.value === 'subscribed';
    return isSubscribed === targetBool;
  }

  if (rule.field === 'account_type') {
    const target = String(rule.value).toLowerCase();
    if (target === 'registered') return customer.has_password === true;
    if (target === 'guest' || target === 'guest_buyer') return !customer.has_password;
    return customer.account_type === target;
  }

  if (rule.field === 'days_since_last_order') {
    if (!customer.last_order_at) {
      return rule.operator === 'greater_than' || rule.operator === 'greater_than_or_equal';
    }
    const days = Math.floor((Date.now() - new Date(customer.last_order_at).getTime()) / (1000 * 60 * 60 * 24));
    const target = Number(rule.value);
    switch (rule.operator) {
      case 'greater_than': return days > target;
      case 'less_than': return days < target;
      case 'greater_than_or_equal': return days >= target;
      case 'less_than_or_equal': return days <= target;
      case 'equals': return days === target;
      default: return false;
    }
  }

  if (rule.field === 'city') {
    const addr = String(customer.address || '').toLowerCase();
    const target = String(rule.value).toLowerCase();
    if (rule.operator === 'contains' || rule.operator === 'equals') {
      return addr.includes(target);
    }
    return !addr.includes(target);
  }

  return true;
}

export function filterCustomersBySegment(customers: any[], rules: SegmentRule[], conjunction: 'AND' | 'OR' = 'AND'): any[] {
  if (!rules || rules.length === 0) return customers;

  return customers.filter(customer => {
    if (conjunction === 'OR') {
      return rules.some(r => evaluateCustomerAgainstRule(customer, r));
    }
    return rules.every(r => evaluateCustomerAgainstRule(customer, r));
  });
}

// GET /api/customers/segments — List all customer segments with live dynamic counts
router.get('/segments', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const db = getDatabase();

  try {
    const { customers } = getMerchantCustomers(userId);
    const rows = db.prepare(`
      SELECT * FROM customer_segments WHERE user_id = ? ORDER BY created_at ASC
    `).all(userId) as any[];

    const segmentsWithCounts = rows.map(seg => {
      let rules: SegmentRule[] = [];
      try {
        rules = JSON.parse(seg.rules_json || '[]');
      } catch {
        rules = [];
      }
      const matched = filterCustomersBySegment(customers, rules, seg.conjunction || 'AND');
      return {
        id: seg.id,
        name: seg.name,
        description: seg.description,
        query_type: seg.query_type,
        template_id: seg.template_id,
        rules,
        conjunction: seg.conjunction || 'AND',
        customer_count: matched.length,
        created_at: seg.created_at,
        updated_at: seg.updated_at,
      };
    });

    res.json({
      success: true,
      segments: segmentsWithCounts,
      templates: PRESET_SEGMENT_TEMPLATES,
      total_store_customers: customers.length,
    });
  } catch (err: any) {
    console.error('Failed to list segments:', err);
    res.status(500).json({ error: 'Failed to retrieve segments', details: err.message });
  }
});

// POST /api/customers/segments/preview — Run rules against live customers before saving
router.post('/segments/preview', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { rules = [], conjunction = 'AND' } = req.body;

  try {
    const { customers } = getMerchantCustomers(userId);
    const matched = filterCustomersBySegment(customers, rules, conjunction);

    res.json({
      success: true,
      total_store_customers: customers.length,
      matched_count: matched.length,
      percentage: customers.length > 0 ? Math.round((matched.length / customers.length) * 100) : 0,
      matching_sample: matched.slice(0, 50),
    });
  } catch (err: any) {
    console.error('Failed to preview segment:', err);
    res.status(500).json({ error: 'Failed to preview segment', details: err.message });
  }
});

// POST /api/customers/segments — Create and save a new customer segment
router.post('/segments', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const {
    name,
    description = '',
    query_type = 'custom',
    template_id = null,
    rules = [],
    conjunction = 'AND',
  } = req.body;

  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'Segment name is required' });
    return;
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    res.status(400).json({ error: 'At least one filter rule is required to define a segment' });
    return;
  }

  const db = getDatabase();
  const segmentId = uuidv4();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO customer_segments (
        id, user_id, name, description, query_type, template_id, rules_json, conjunction, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      segmentId,
      userId,
      String(name).trim(),
      description ? String(description).trim() : null,
      query_type || 'custom',
      template_id || null,
      JSON.stringify(rules),
      conjunction === 'OR' ? 'OR' : 'AND',
      now,
      now
    );

    const { customers } = getMerchantCustomers(userId);
    const matched = filterCustomersBySegment(customers, rules, conjunction);

    res.status(201).json({
      success: true,
      message: 'Customer segment saved successfully',
      segment: {
        id: segmentId,
        name: String(name).trim(),
        description,
        query_type,
        template_id,
        rules,
        conjunction,
        customer_count: matched.length,
        created_at: now,
      }
    });
  } catch (err: any) {
    console.error('Failed to create customer segment:', err);
    res.status(500).json({ error: 'Failed to create segment', details: err.message });
  }
});

// GET /api/customers/segments/:id — Get details of a single segment and all currently matching customers
router.get('/segments/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const segmentId = req.params.id;
  const db = getDatabase();

  try {
    const segment = db.prepare(`
      SELECT * FROM customer_segments WHERE id = ? AND user_id = ?
    `).get(segmentId, userId) as any;

    if (!segment) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    let rules: SegmentRule[] = [];
    try {
      rules = JSON.parse(segment.rules_json || '[]');
    } catch {
      rules = [];
    }

    const { customers } = getMerchantCustomers(userId);
    const matched = filterCustomersBySegment(customers, rules, segment.conjunction || 'AND');

    res.json({
      success: true,
      segment: {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        query_type: segment.query_type,
        template_id: segment.template_id,
        rules,
        conjunction: segment.conjunction,
        customer_count: matched.length,
        created_at: segment.created_at,
        updated_at: segment.updated_at,
      },
      matching_customers: matched,
    });
  } catch (err: any) {
    console.error('Failed to get segment detail:', err);
    res.status(500).json({ error: 'Failed to get segment detail', details: err.message });
  }
});

// DELETE /api/customers/segments/:id — Delete a saved customer segment
router.delete('/segments/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const segmentId = req.params.id;
  const db = getDatabase();

  try {
    const result = db.prepare(`
      DELETE FROM customer_segments WHERE id = ? AND user_id = ?
    `).run(segmentId, userId);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Segment not found or unauthorized' });
      return;
    }

    res.json({ success: true, message: 'Segment deleted successfully' });
  } catch (err: any) {
    console.error('Failed to delete segment:', err);
    res.status(500).json({ error: 'Failed to delete segment', details: err.message });
  }
});

// GET /api/customers/:id — Detailed customer orders and timeline
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const customerId = req.params.id;
  const db = getDatabase();

  try {
    const customer = db.prepare(`
      SELECT id, name, email, phone, address, created_at, updated_at,
             CASE WHEN password_hash IS NOT NULL AND password_hash != '' THEN 1 ELSE 0 END as has_account
      FROM customers
      WHERE id = ? AND (organization_id = ? OR organization_id IN (SELECT id FROM organizations WHERE id = ?))
    `).get(customerId, userId, userId) as any;

    let orders: any[] = [];
    if (customer) {
      orders = db.prepare(`
        SELECT id, total, status, payment_status, payment_method, delivery_address, items, created_at
        FROM orders
        WHERE (user_id = ? OR organization_id = ?) AND (customer_id = ? OR customer_phone = ? OR customer_email = ?)
        ORDER BY created_at DESC
      `).all(userId, userId, customer.id, customer.phone, customer.email) as any[];
    }

    const parsedOrders = orders.map(o => {
      let items = [];
      try {
        items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
      } catch {}
      return { ...o, items };
    });

    res.json({
      success: true,
      customer: customer || null,
      orders: parsedOrders,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch customer detail', details: err.message });
  }
});

export default router;
