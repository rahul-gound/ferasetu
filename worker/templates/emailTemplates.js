/**
 * FeraSetu Centralized Transactional Email Template Engine
 * =======================================================
 * Deterministic, locale-aware, accessible email templates.
 * Enforces strict variable schema validation, dual-format output (HTML + Text),
 * and strict separation between Platform and Merchant branding.
 */

export const TEMPLATE_VERSION = "2.0.0";

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format currency in Indian or international notation.
 */
function formatAmount(amount, currency = 'INR') {
  const num = Number(amount || 0);
  if (currency === 'INR') {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${num.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Base Layout Wrappers
// ---------------------------------------------------------------------------

function wrapHtmlLayout({ title, brandName, brandColor, logoUrl, storeUrl, supportEmail, contentHtml, isPlatform = false }) {
  const primaryColor = brandColor || (isPlatform ? '#0052FF' : '#FF6B35');
  const safeBrandName = escapeHtml(brandName || (isPlatform ? 'FeraSetu' : 'Online Store'));
  const safeStoreUrl = escapeHtml(storeUrl || 'https://ferasetu.com');
  const safeSupport = escapeHtml(supportEmail || (isPlatform ? 'support@ferasetu.com' : ''));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: ${primaryColor}; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-content { padding: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 12px;">
        <table class="email-container" width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9; text-align: center;">
              ${logoUrl
                ? `<a href="${safeStoreUrl}" target="_blank"><img src="${escapeHtml(logoUrl)}" alt="${safeBrandName}" style="max-height: 40px; max-width: 180px; margin-bottom: 8px;"></a>`
                : `<a href="${safeStoreUrl}" target="_blank" style="text-decoration: none;"><span style="font-size: 22px; font-weight: 800; color: ${primaryColor}; letter-spacing: -0.5px;">${safeBrandName}</span></a>`}
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="email-content" style="padding: 32px 32px 24px 32px; background-color: #ffffff;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0 0 4px 0;">This is an automated transactional notification regarding your account or order.</p>
              ${safeSupport ? `<p style="margin: 0 0 4px 0;">Need assistance? Reach out to <a href="mailto:${safeSupport}" style="color: #64748b; font-weight: 600;">${safeSupport}</a></p>` : ''}
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">
                ${isPlatform ? '© ' + new Date().getFullYear() + ' FeraSetu Inc. All rights reserved.' : 'Powered by <a href="https://ferasetu.com" target="_blank" style="color: #94a3b8; font-weight: 600;">FeraSetu</a> • Safe and Verified Commerce'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderButton(url, label, brandColor) {
  const color = brandColor || '#0052FF';
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: ${color}; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Template Registry Definitions & Variable Schemas
// ---------------------------------------------------------------------------

export const EMAIL_TEMPLATES = {
  // 1. Account & Auth
  'account.verify_email': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['otp'],
    optionalVariables: ['customer_name', 'merchant_name', 'expiry_minutes'],
    render: (data, branding, isPlatform) => {
      const otp = String(data.otp);
      const name = data.customer_name || 'there';
      const expiry = data.expiry_minutes || 10;
      const brand = branding?.storeName || (isPlatform ? 'FeraSetu' : 'Store');

      const subject = `Your verification code: ${otp} • ${brand}`;
      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Verify your email address</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)},</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Use the single-use verification code below to verify your email address:</p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; border: 1px dashed #cbd5e1;">
          <span style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #0f172a;">${escapeHtml(otp)}</span>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Valid for ${expiry} minutes</p>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">If you did not request this verification code, please disregard this email.</p>
      `;

      const text = `Hello ${name},\n\nYour verification code for ${brand} is: ${otp}\nThis code will expire in ${expiry} minutes.\n\nIf you did not request this, please ignore this email.`;
      return { subject, contentHtml, text };
    }
  },

  'account.password_reset': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['reset_url'],
    optionalVariables: ['customer_name', 'merchant_name'],
    render: (data, branding, isPlatform) => {
      const resetUrl = data.reset_url;
      const name = data.customer_name || 'there';
      const brand = branding?.storeName || (isPlatform ? 'FeraSetu' : 'Store');

      const subject = `Reset your password • ${brand}`;
      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Password Reset Request</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)},</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">We received a request to reset your password for ${escapeHtml(brand)}. Click the button below to choose a new password:</p>
        ${renderButton(resetUrl, 'Reset My Password', branding?.primaryColor)}
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Or copy and paste this secure link into your browser:<br>
          <a href="${escapeHtml(resetUrl)}" style="word-break: break-all; font-size: 12px;">${escapeHtml(resetUrl)}</a>
        </p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">This link will expire in 60 minutes. If you did not request a password reset, no action is needed.</p>
      `;

      const text = `Hello ${name},\n\nWe received a request to reset your password for ${brand}.\nReset your password using this link:\n${resetUrl}\n\nThis link expires in 60 minutes.\nIf you did not request this, ignore this email.`;
      return { subject, contentHtml, text };
    }
  },

  'account.invitation': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['invite_url', 'organization_name', 'role'],
    optionalVariables: ['inviter_name'],
    render: (data, branding, isPlatform) => {
      const orgName = data.organization_name;
      const role = data.role;
      const inviteUrl = data.invite_url;
      const inviter = data.inviter_name ? `${data.inviter_name} has` : 'You have been';

      const subject = `Invitation to join ${orgName} on FeraSetu`;
      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Team Invitation</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">${escapeHtml(inviter)} invited you to collaborate on <strong>${escapeHtml(orgName)}</strong> as a <strong>${escapeHtml(role)}</strong>.</p>
        ${renderButton(inviteUrl, 'Accept Invitation & Access Store', branding?.primaryColor || '#0052FF')}
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Link: <a href="${escapeHtml(inviteUrl)}">${escapeHtml(inviteUrl)}</a></p>
      `;

      const text = `You have been invited to collaborate on ${orgName} as ${role}.\n\nAccept your invitation here:\n${inviteUrl}`;
      return { subject, contentHtml, text };
    }
  },

  'merchant.onboarding': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['merchant_name', 'store_url'],
    optionalVariables: ['subdomain'],
    render: (data) => {
      const name = data.merchant_name;
      const storeUrl = data.store_url;

      const subject = `Welcome to FeraSetu, ${name}! Your store is ready 🚀`;
      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 22px; font-weight: 800; color: #0f172a;">Welcome to FeraSetu, ${escapeHtml(name)}! 🎉</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">Your digital storefront has been successfully provisioned. You are ready to start selling and managing orders with our AI-powered commerce suite.</p>
        
        <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #bfdbfe;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e3a8a; font-weight: 700;">Your Canonical Storefront URL:</p>
          <a href="${escapeHtml(storeUrl)}" target="_blank" style="font-size: 16px; font-weight: 800; color: #0052FF; word-break: break-all;">${escapeHtml(storeUrl)}</a>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 24px 0 12px 0;">Next Quick Steps:</h3>
        <ol style="padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
          <li>Add products with photos and inventory levels in your catalog.</li>
          <li>Configure payment options (UPI, COD, or online cards).</li>
          <li>Share your store link directly on WhatsApp to take your first order!</li>
        </ol>

        ${renderButton('https://ferasetu.com/dashboard', 'Open Merchant Dashboard', '#0052FF')}
      `;

      const text = `Welcome to FeraSetu, ${name}!\n\nYour online store is live at: ${storeUrl}\n\nOpen your dashboard to manage products and orders:\nhttps://ferasetu.com/dashboard`;
      return { subject, contentHtml, text };
    }
  },

  // 2. Orders & Commercial Transactions
  'order.confirmation': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id', 'total'],
    optionalVariables: ['customer_name', 'items', 'otp', 'invoice_number', 'currency', 'delivery_type', 'tracking_url'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const total = formatAmount(data.total, data.currency || 'INR');
      const name = data.customer_name || 'Customer';
      const items = Array.isArray(data.items) ? data.items : [];
      const otp = data.otp ? String(data.otp) : null;
      const brand = branding?.storeName || 'Store';
      const trackingUrl = data.tracking_url;

      const subject = `Order Confirmed #${orderId.slice(0, 8).toUpperCase()} • ${brand}`;

      const itemsHtml = items.map(item => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;">
            <strong>${escapeHtml(item.name || item.title || 'Product')}</strong>
            ${item.quantity ? `<span style="color: #64748b;"> × ${item.quantity}</span>` : ''}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">
            ${formatAmount(item.total || (item.price * (item.quantity || 1)), data.currency || 'INR')}
          </td>
        </tr>
      `).join('');

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Thank you for your order! 🎉</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, your order has been received and confirmed by <strong>${escapeHtml(brand)}</strong>.</p>
        
        ${otp ? `
        <div style="background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Delivery / Pickup Verification Code</p>
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #15803d; font-family: monospace;">${escapeHtml(otp)}</div>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #166534;">Share this code with the shopkeeper or delivery courier upon receiving your order.</p>
        </div>` : ''}

        <div style="margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase;">
          Order Details (#${escapeHtml(orderId.slice(0, 10).toUpperCase())})
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tbody>${itemsHtml}</tbody>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #0f172a; padding-top: 12px;">
          <tr>
            <td style="font-size: 16px; font-weight: 800; color: #0f172a;">Total</td>
            <td style="text-align: right; font-size: 18px; font-weight: 900; color: ${branding?.primaryColor || '#0052FF'};">${total}</td>
          </tr>
        </table>

        ${trackingUrl ? renderButton(trackingUrl, 'Track Your Order', branding?.primaryColor) : ''}
      `;

      const text = `Thank you for your order with ${brand}!\nOrder #${orderId.slice(0, 8).toUpperCase()}\nTotal: ${total}\n${otp ? `Delivery Code: ${otp}\n` : ''}${trackingUrl ? `Track order: ${trackingUrl}\n` : ''}`;
      return { subject, contentHtml, text };
    }
  },

  'order.shipped': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id'],
    optionalVariables: ['customer_name', 'carrier', 'tracking_number', 'tracking_url'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Your order #${orderId.slice(0, 8).toUpperCase()} has shipped 🚚 • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Your order is on its way! 🚚</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, great news! Your order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong> has been shipped by ${escapeHtml(brand)}.</p>
        ${data.carrier ? `<p style="font-size: 14px; color: #64748b;">Carrier: <strong>${escapeHtml(data.carrier)}</strong> ${data.tracking_number ? `| Tracking: <strong>${escapeHtml(data.tracking_number)}</strong>` : ''}</p>` : ''}
        ${data.tracking_url ? renderButton(data.tracking_url, 'Track Shipment', branding?.primaryColor) : ''}
      `;

      const text = `Your order #${orderId.slice(0, 8).toUpperCase()} from ${brand} has shipped!\n${data.tracking_url ? `Track here: ${data.tracking_url}` : ''}`;
      return { subject, contentHtml, text };
    }
  },

  'order.delivered': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id'],
    optionalVariables: ['customer_name', 'delivery_time'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Order Delivered #${orderId.slice(0, 8).toUpperCase()} ✅ • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #166534;">Order Delivered Successfully ✅</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, your order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong> has been delivered.</p>
        <p style="font-size: 14px; color: #64748b;">Thank you for shopping with ${escapeHtml(brand)}. If you have any questions or feedback, feel free to reply to this email.</p>
      `;

      const text = `Your order #${orderId.slice(0, 8).toUpperCase()} from ${brand} was delivered successfully. Thank you for shopping with us!`;
      return { subject, contentHtml, text };
    }
  },

  'order.cancelled': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id'],
    optionalVariables: ['customer_name', 'reason', 'is_refundable'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const reason = data.reason || 'Requested by customer / merchant';
      const subject = `Order #${orderId.slice(0, 8).toUpperCase()} Cancelled • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #dc2626;">Order Cancelled</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong> has been cancelled.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
          ${data.is_refundable ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #7f1d1d;">Any eligible refund has been initiated and will be credited to your original payment method.</p>` : ''}
        </div>
      `;

      const text = `Order #${orderId.slice(0, 8).toUpperCase()} from ${brand} has been cancelled.\nReason: ${reason}`;
      return { subject, contentHtml, text };
    }
  },

  'order.accepted': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id'],
    optionalVariables: ['customer_name'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Order Accepted #${orderId.slice(0, 8).toUpperCase()} • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Order Accepted & Preparing 🛍️</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, ${escapeHtml(brand)} has accepted your order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong> and is currently packing your items.</p>
      `;

      const text = `Your order #${orderId.slice(0, 8).toUpperCase()} has been accepted by ${brand} and is being prepared.`;
      return { subject, contentHtml, text };
    }
  },

  'order.rejected': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id'],
    optionalVariables: ['customer_name', 'reason'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const reason = data.reason || 'Items unavailable or out of stock';
      const subject = `Order #${orderId.slice(0, 8).toUpperCase()} Update • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #dc2626;">Order Notice</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, unfortunately ${escapeHtml(brand)} was unable to accept your order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong>.</p>
        <p style="font-size: 14px; color: #64748b;"><strong>Note from store:</strong> ${escapeHtml(reason)}</p>
      `;

      const text = `Order #${orderId.slice(0, 8).toUpperCase()} was not accepted by ${brand}.\nReason: ${reason}`;
      return { subject, contentHtml, text };
    }
  },

  // 3. Payment & Invoicing
  'payment.received': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id', 'amount'],
    optionalVariables: ['customer_name', 'payment_id', 'currency', 'payment_method'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const amount = formatAmount(data.amount, data.currency || 'INR');
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Payment Received: ${amount} for Order #${orderId.slice(0, 8).toUpperCase()} • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #166534;">Payment Received ✅</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, we have received your payment of <strong>${amount}</strong> for order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong>.</p>
        ${data.payment_id ? `<p style="font-size: 13px; color: #64748b;">Transaction Reference: <code>${escapeHtml(data.payment_id)}</code></p>` : ''}
      `;

      const text = `Payment of ${amount} received for order #${orderId.slice(0, 8).toUpperCase()} at ${brand}.`;
      return { subject, contentHtml, text };
    }
  },

  'payment.failed': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['order_id'],
    optionalVariables: ['customer_name', 'amount', 'currency', 'retry_url'],
    render: (data, branding) => {
      const orderId = String(data.order_id);
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Payment Failed for Order #${orderId.slice(0, 8).toUpperCase()} • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #dc2626;">Payment Failed</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, your payment attempt for order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong> was not successful.</p>
        <p style="font-size: 14px; color: #64748b;">Please check your payment details or try another payment method.</p>
        ${data.retry_url ? renderButton(data.retry_url, 'Retry Payment', branding?.primaryColor) : ''}
      `;

      const text = `Payment failed for order #${orderId.slice(0, 8).toUpperCase()} at ${brand}.\nPlease try again: ${data.retry_url || ''}`;
      return { subject, contentHtml, text };
    }
  },

  'invoice.created': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['invoice_number', 'order_id', 'total'],
    optionalVariables: ['customer_name', 'currency', 'invoice_url'],
    render: (data, branding) => {
      const invNum = String(data.invoice_number);
      const orderId = String(data.order_id);
      const total = formatAmount(data.total, data.currency || 'INR');
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Tax Invoice ${invNum} • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Official Tax Invoice 🧾</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, here is your official tax invoice summary for order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong>.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #64748b; font-size: 14px;">Invoice Number:</span>
            <span style="font-weight: 700; color: #1e293b; font-size: 14px;">${escapeHtml(invNum)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 800; color: #1e293b; font-size: 16px;">Total Amount:</span>
            <span style="font-weight: 900; color: ${branding?.primaryColor || '#0052FF'}; font-size: 18px;">${total}</span>
          </div>
        </div>
        ${data.invoice_url ? renderButton(data.invoice_url, 'Download Full PDF Invoice', branding?.primaryColor) : ''}
      `;

      const text = `Invoice ${invNum} for Order #${orderId.slice(0, 8).toUpperCase()} from ${brand}.\nTotal: ${total}\n${data.invoice_url ? `Download invoice: ${data.invoice_url}` : ''}`;
      return { subject, contentHtml, text };
    }
  },

  'refund.initiated': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['refund_number', 'order_id', 'amount'],
    optionalVariables: ['customer_name', 'currency', 'refund_method'],
    render: (data, branding) => {
      const refNum = String(data.refund_number);
      const orderId = String(data.order_id);
      const amount = formatAmount(data.amount, data.currency || 'INR');
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Refund Initiated: ${amount} for Order #${orderId.slice(0, 8).toUpperCase()} • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Refund Initiated</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, a refund of <strong>${amount}</strong> has been initiated for order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong>.</p>
        <p style="font-size: 14px; color: #64748b;">Reference: <strong>${escapeHtml(refNum)}</strong><br>Method: ${escapeHtml(data.refund_method || 'Original Payment Method')}</p>
        <p style="font-size: 13px; color: #94a3b8;">Funds typically reflect in your account within 5-7 business days.</p>
      `;

      const text = `Refund of ${amount} initiated for Order #${orderId.slice(0, 8).toUpperCase()} from ${brand}.\nRefund Ref: ${refNum}`;
      return { subject, contentHtml, text };
    }
  },

  'refund.completed': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['refund_number', 'order_id', 'amount'],
    optionalVariables: ['customer_name', 'currency'],
    render: (data, branding) => {
      const refNum = String(data.refund_number);
      const orderId = String(data.order_id);
      const amount = formatAmount(data.amount, data.currency || 'INR');
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Refund Completed: ${amount} for Order #${orderId.slice(0, 8).toUpperCase()} • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #166534;">Refund Completed ✅</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, your refund of <strong>${amount}</strong> for order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong> has completed successfully.</p>
        <p style="font-size: 14px; color: #64748b;">Reference Number: <strong>${escapeHtml(refNum)}</strong></p>
      `;

      const text = `Refund of ${amount} completed for Order #${orderId.slice(0, 8).toUpperCase()} from ${brand}.\nRef: ${refNum}`;
      return { subject, contentHtml, text };
    }
  },

  'credit_note.created': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['credit_note_number', 'order_id', 'amount'],
    optionalVariables: ['customer_name', 'currency', 'reason'],
    render: (data, branding) => {
      const cnNum = String(data.credit_note_number);
      const orderId = String(data.order_id);
      const amount = formatAmount(data.amount, data.currency || 'INR');
      const name = data.customer_name || 'Customer';
      const brand = branding?.storeName || 'Store';
      const subject = `Credit Note ${cnNum} Issued • ${brand}`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Credit Note Issued 📄</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, a credit note has been issued for returned goods or adjustment on order <strong>#${escapeHtml(orderId.slice(0, 10).toUpperCase())}</strong>.</p>
        <div style="background: #fff7ed; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #fed7aa;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #9a3412;">Credit Note Reference: <b>${escapeHtml(cnNum)}</b></p>
          <p style="margin: 0; font-size: 18px; font-weight: 900; color: #c2410c;">Total Credit: ${amount}</p>
        </div>
      `;

      const text = `Credit Note ${cnNum} for ${amount} issued on Order #${orderId.slice(0, 8).toUpperCase()} from ${brand}.`;
      return { subject, contentHtml, text };
    }
  },

  // 4. Platform Billing & SaaS Subscriptions
  'billing.subscription_started': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['plan_name'],
    optionalVariables: ['merchant_name', 'expires_at'],
    render: (data) => {
      const plan = data.plan_name;
      const name = data.merchant_name || 'Partner';
      const subject = `Subscription Activated: ${plan} Plan • FeraSetu`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0052FF;">Welcome to FeraSetu ${escapeHtml(plan)}! 🚀</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello ${escapeHtml(name)}, your subscription to the <strong>${escapeHtml(plan)}</strong> plan is now active.</p>
        <p style="font-size: 14px; color: #64748b;">Enjoy higher email sending limits, custom domain verification, and AI growth tools.</p>
        ${renderButton('https://ferasetu.com/dashboard', 'Go to Dashboard', '#0052FF')}
      `;

      const text = `Hello ${name},\nYour subscription to FeraSetu ${plan} plan is now active. Manage your features at https://ferasetu.com/dashboard`;
      return { subject, contentHtml, text };
    }
  },

  'billing.subscription_renewed': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['plan_name', 'next_billing_date'],
    optionalVariables: ['merchant_name'],
    render: (data) => {
      const plan = data.plan_name;
      const nextDate = data.next_billing_date;
      const subject = `Subscription Renewed: ${plan} Plan • FeraSetu`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #166534;">Subscription Renewed ✅</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Your FeraSetu <strong>${escapeHtml(plan)}</strong> subscription has renewed successfully. Next billing date: <strong>${escapeHtml(nextDate)}</strong>.</p>
      `;

      const text = `Your FeraSetu ${plan} subscription renewed successfully. Next billing date: ${nextDate}`;
      return { subject, contentHtml, text };
    }
  },

  'billing.payment_success': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['amount', 'payment_id'],
    optionalVariables: ['merchant_name', 'description'],
    render: (data) => {
      const amount = formatAmount(data.amount, 'INR');
      const payId = String(data.payment_id);
      const subject = `Payment Successful: ${amount} • FeraSetu`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #166534;">Payment Successful ✅</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Thank you! We received your payment of <strong>${amount}</strong>.</p>
        <p style="font-size: 14px; color: #64748b;">Transaction ID: <code>${escapeHtml(payId)}</code></p>
      `;

      const text = `Payment of ${amount} received successfully by FeraSetu. Transaction: ${payId}`;
      return { subject, contentHtml, text };
    }
  },

  'billing.payment_failed': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['amount'],
    optionalVariables: ['merchant_name', 'reason'],
    render: (data) => {
      const amount = formatAmount(data.amount, 'INR');
      const subject = `Payment Failed: ${amount} • FeraSetu`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #dc2626;">Payment Failed ⚠️</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">We were unable to process your payment of <strong>${amount}</strong>.</p>
        <p style="font-size: 14px; color: #64748b;">Please update your payment method to maintain uninterrupted service.</p>
        ${renderButton('https://ferasetu.com/dashboard/billing', 'Update Payment Method', '#0052FF')}
      `;

      const text = `Your payment of ${amount} to FeraSetu could not be processed. Please update your payment method at https://ferasetu.com/dashboard/billing`;
      return { subject, contentHtml, text };
    }
  },

  'billing.cancellation_confirmation': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['plan_name', 'effective_date'],
    optionalVariables: ['merchant_name'],
    render: (data) => {
      const plan = data.plan_name;
      const effectiveDate = data.effective_date;
      const subject = `Subscription Cancellation Confirmation • FeraSetu`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #64748b;">Subscription Cancellation</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Your cancellation request for the <strong>${escapeHtml(plan)}</strong> plan has been processed.</p>
        <p style="font-size: 14px; color: #64748b;">Your plan features will remain active until <strong>${escapeHtml(effectiveDate)}</strong>.</p>
      `;

      const text = `Your FeraSetu ${plan} cancellation is confirmed. Access remains active until ${effectiveDate}.`;
      return { subject, contentHtml, text };
    }
  },

  // 5. Support & System
  'support.reply': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['ticket_id', 'reply_content'],
    optionalVariables: ['customer_name', 'subject'],
    render: (data) => {
      const ticketId = String(data.ticket_id);
      const reply = data.reply_content;
      const subject = `Support Reply: Ticket #${ticketId.slice(0, 8).toUpperCase()} • FeraSetu`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0052FF;">New Support Response 💬</h2>
        <p style="font-size: 14px; color: #64748b;">Ticket: <strong>#${escapeHtml(ticketId.slice(0, 10).toUpperCase())}</strong></p>
        <div style="background: #f8fafc; border-left: 4px solid #0052FF; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 15px; color: #1e293b; white-space: pre-wrap;">${escapeHtml(reply)}</p>
        </div>
        ${renderButton('https://ferasetu.com/dashboard/support', 'View Ticket Conversation', '#0052FF')}
      `;

      const text = `New response on Ticket #${ticketId.slice(0, 8).toUpperCase()}:\n\n${reply}\n\nView ticket: https://ferasetu.com/dashboard/support`;
      return { subject, contentHtml, text };
    }
  },

  'system.test': {
    version: '1.0.0',
    status: 'ACTIVE',
    requiredVariables: ['recipient_email'],
    optionalVariables: ['provider', 'host'],
    render: (data, branding) => {
      const email = data.recipient_email;
      const brand = branding?.storeName || 'FeraSetu';
      const subject = `Test Email from ${brand} ✅`;

      const contentHtml = `
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #166534;">SMTP Connection Verified ✅</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5;">Congratulations! If you received this email, your email delivery pipeline for <strong>${escapeHtml(brand)}</strong> is functioning properly.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #166534;">Recipient: <b>${escapeHtml(email)}</b> | Provider: <b>${escapeHtml(data.provider || 'FeraSetu SMTP')}</b></p>
        </div>
      `;

      const text = `SMTP Connection Verified for ${brand}.\nRecipient: ${email}`;
      return { subject, contentHtml, text };
    }
  }
};

/**
 * Validates data against the template's required schema.
 */
export function validateTemplateVariables(templateKey, data = {}) {
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) {
    return {
      valid: false,
      reason: 'UNKNOWN_TEMPLATE',
      message: `Template '${templateKey}' is not registered in the transactional template catalog.`
    };
  }

  const missing = [];
  for (const field of template.requiredVariables) {
    const val = data[field];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      reason: 'MISSING_TEMPLATE_VARIABLES',
      missing,
      message: `Template '${templateKey}' is missing required variables: ${missing.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Renders an email template into complete HTML and plain-text.
 */
export function renderEmailTemplate({
  templateKey,
  locale = 'en',
  data = {},
  branding = {},
  isPlatform = false
}) {
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Cannot render unknown template: ${templateKey}`);
  }

  const validation = validateTemplateVariables(templateKey, data);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const rendered = template.render(data, branding, isPlatform);

  const fullHtml = wrapHtmlLayout({
    title: rendered.subject,
    brandName: branding.storeName,
    brandColor: branding.primaryColor,
    logoUrl: branding.logoUrl,
    storeUrl: branding.storeUrl,
    supportEmail: branding.supportEmail,
    contentHtml: rendered.contentHtml,
    isPlatform
  });

  return {
    subject: rendered.subject,
    html: fullHtml,
    text: rendered.text
  };
}
