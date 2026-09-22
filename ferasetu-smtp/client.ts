/**
 * FeraSetu SMTP TypeScript Integration Client
 * Provides strongly typed service-to-service communication between
 * the FeraSetu Node.js / Express backend / Cloudflare Workers and the ferasetu-smtp service on Modal.com.
 *
 * Compatible with Node.js (18+), Cloudflare Workers, and modern fetch runtimes.
 */

export type EmailScope = 'PLATFORM' | 'MERCHANT';
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface SendEmailPayload {
  merchantId?: string;
  tenantId?: string;
  scope?: EmailScope;
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  idempotencyKey?: string;
  priority?: PriorityLevel;
  customHeaders?: Record<string, string> | Array<{ name: string; value: string }>;
}

export type DeliveryStatus =
  | 'ACCEPTED'
  | 'QUEUED'
  | 'POSTFIX_QUEUED'
  | 'DELIVERED'
  | 'DEFERRED'
  | 'FAILED'
  | 'BOUNCED'
  | 'SENT'
  | 'DEAD_LETTER';

export interface SendEmailResponse {
  success: boolean;
  messageId: string;
  status: DeliveryStatus;
  duplicate: boolean;
  details?: string;
}

export interface MessageStatusResponse {
  id: string;
  merchant_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  status: DeliveryStatus;
  retry_count: number;
  last_error?: string;
  created_at: number;
  updated_at: number;
  scope?: EmailScope;
  tenant_id?: string;
  priority?: number;
  priority_name?: PriorityLevel;
}

export interface MerchantReputationResponse {
  merchant_id: string;
  merchant_domain: string;
  status: 'ACTIVE' | 'WARNING' | 'SUSPENDED_ABUSE' | 'SUSPENDED_BOUNCE' | 'UNKNOWN';
  status_reason?: string;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_complaints: number;
  bounce_rate: number;
  spam_rate: number;
}

export interface PlatformReputationResponse {
  tenant_id: string;
  scope: 'PLATFORM';
  status: 'ACTIVE' | 'WARNING' | 'SUSPENDED';
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_complaints: number;
  bounce_rate: number;
  spam_rate: number;
}

export interface RegisterDomainPayload {
  domain: string;
  selector?: string;
}

export interface RegisterDomainResponse {
  success: boolean;
  merchant_id: string;
  domain: string;
  domain_type: 'CANONICAL' | 'CUSTOM';
  verification_status: 'VERIFIED' | 'PENDING_VERIFICATION' | 'FAILED';
  selector: string;
  dkim_public_key: string;
  dns_records: Array<{
    type: string;
    name: string;
    content: string;
    ttl: number;
    purpose: string;
  }>;
}

export interface VerifyDomainPayload {
  domain: string;
  forceVerified?: boolean;
}

export interface VerifyDomainResponse {
  success: boolean;
  merchant_id: string;
  domain: string;
  verification_status: 'VERIFIED' | 'PENDING_VERIFICATION' | 'FAILED';
  details?: string;
}

export interface MerchantDomainInfo {
  domain: string;
  domain_type: 'CANONICAL' | 'CUSTOM';
  verification_status: string;
  is_active: boolean;
  selector: string;
  dkim_public_key: string;
  created_at: number;
}

export interface ProvisionMerchantPayload {
  merchantSlug?: string;
  shopName?: string;
  city?: string;
  district?: string;
  state?: string;
  uniqueId?: string;
}

export interface ProvisionMerchantResponse {
  merchantDomain: string;
  storefrontUrl: string;
  senderEmail: string;
  selector: string;
  dnsRecords: Array<{
    type: string;
    name: string;
    content: string;
    ttl: number;
    purpose: string;
    required_for_outbound?: boolean;
  }>;
  cloudflareProvisioned: boolean;
  verificationStatus: 'VERIFIED' | 'PENDING_PROPAGATION' | 'LOOKUP_FAILED' | string;
  emailActivationStatus: 'ACTIVE' | 'PENDING_DNS' | 'SUSPENDED' | string;
  cloudflareInstructions: string;
}

/**
 * Sanitizes input strings for DNS label safety (lowercase, alphanumeric, single hyphens).
 */
export function sanitizeDnsLabelPart(text?: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Canonical merchant subdomain slug generator.
 * Enforces RFC 1035 label limit (<= 63 characters) and deterministic unique suffix.
 */
export function generateCanonicalMerchantSlug(
  shopName: string,
  city: string,
  district: string,
  state: string,
  uniqueId: string
): string {
  let sShop = sanitizeDnsLabelPart(shopName) || 'shop';
  let sCity = sanitizeDnsLabelPart(city) || 'city';
  let sDist = sanitizeDnsLabelPart(district) || 'dist';
  let sState = sanitizeDnsLabelPart(state) || 'st';
  let sUnique = sanitizeDnsLabelPart(String(uniqueId)) || '1';

  if (sUnique.length > 10) {
    sUnique = sUnique.slice(0, 10).replace(/-+$/, '');
  }
  if (!sUnique) sUnique = '1';

  const MAX_LABEL_LEN = 63;
  const HYPHENS_LEN = 4;

  const fullSlug = `${sShop}-${sCity}-${sDist}-${sState}-${sUnique}`;
  if (fullSlug.length <= MAX_LABEL_LEN) {
    return fullSlug;
  }

  if (sState.length > 4) sState = sState.slice(0, 4).replace(/-+$/, '');
  if (sDist.length > 12) sDist = sDist.slice(0, 12).replace(/-+$/, '');
  if (sCity.length > 12) sCity = sCity.slice(0, 12).replace(/-+$/, '');

  let used = sCity.length + sDist.length + sState.length + sUnique.length + HYPHENS_LEN;
  let shopBudget = MAX_LABEL_LEN - used;

  if (shopBudget < 3) {
    sDist = sDist.slice(0, 6).replace(/-+$/, '');
    sCity = sCity.slice(0, 6).replace(/-+$/, '');
    used = sCity.length + sDist.length + sState.length + sUnique.length + HYPHENS_LEN;
    shopBudget = MAX_LABEL_LEN - used;
  }

  sShop = sShop.slice(0, Math.max(3, shopBudget)).replace(/-+$/, '');
  if (!sShop) sShop = 'shop';

  let slug = `${sShop}-${sCity}-${sDist}-${sState}-${sUnique}`;
  if (slug.length > MAX_LABEL_LEN) {
    slug = slug.slice(0, MAX_LABEL_LEN).replace(/-+$/, '');
  }

  return slug;
}

/**
 * Generates the canonical FQDN for both storefront and merchant transactional email:
 * shopname-city-district-state-uniqueid.ferasetu.com
 */
export function generateCanonicalMerchantDomain(
  shopName: string,
  city: string,
  district: string,
  state: string,
  uniqueId: string,
  rootDomain: string = 'ferasetu.com'
): string {
  const slug = generateCanonicalMerchantSlug(shopName, city, district, state, uniqueId);
  return `${slug}.${rootDomain}`;
}

export class FeraSetuSmtpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options?: { baseUrl?: string; apiKey?: string; timeoutMs?: number }) {
    this.baseUrl = options?.baseUrl || process.env.FERASETU_SMTP_SERVICE_URL || 'https://singhantima203--ferasetu-smtp-web-gateway.modal.run';
    this.apiKey = options?.apiKey || process.env.FERASETU_SMTP_API_KEY || '';
    this.timeoutMs = options?.timeoutMs || 15000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `FeraSetu SMTP Error [${response.status} ${response.statusText}]: ${errorText}`
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Submits a transactional email to the Modal service for Postfix delivery.
   */
  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
    return this.request<SendEmailResponse>('/v1/email/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Retrieves current delivery or queue status for a message with optional tenant isolation.
   */
  async getStatus(messageId: string, tenantId?: string): Promise<MessageStatusResponse> {
    const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return this.request<MessageStatusResponse>(`/v1/email/status/${encodeURIComponent(messageId)}${query}`, {
      method: 'GET',
    });
  }

  /**
   * Checks a merchant's reputation, warm-up status, and deliverability health.
   */
  async getReputation(merchantId: string): Promise<MerchantReputationResponse> {
    return this.request<MerchantReputationResponse>(`/v1/merchants/${encodeURIComponent(merchantId)}/reputation`, {
      method: 'GET',
    });
  }

  /**
   * Retrieves platform-level email delivery health and metrics.
   */
  async getPlatformReputation(): Promise<PlatformReputationResponse> {
    return this.request<PlatformReputationResponse>('/v1/platform/reputation', {
      method: 'GET',
    });
  }

  /**
   * Registers a custom domain for a merchant and returns required DNS TXT records.
   */
  async registerCustomDomain(
    merchantId: string,
    domain: string,
    selector: string = 'fs1'
  ): Promise<RegisterDomainResponse> {
    return this.request<RegisterDomainResponse>(`/v1/merchants/${encodeURIComponent(merchantId)}/domains`, {
      method: 'POST',
      body: JSON.stringify({ domain, selector }),
    });
  }

  /**
   * Verifies DNS propagation for a registered merchant custom domain.
   */
  async verifyCustomDomain(
    merchantId: string,
    domain: string,
    forceVerified: boolean = false
  ): Promise<VerifyDomainResponse> {
    return this.request<VerifyDomainResponse>(`/v1/merchants/${encodeURIComponent(merchantId)}/domains/verify`, {
      method: 'POST',
      body: JSON.stringify({ domain, forceVerified }),
    });
  }

  /**
   * Lists all canonical and custom domains registered to a merchant.
   */
  async listMerchantDomains(merchantId: string): Promise<MerchantDomainInfo[]> {
    return this.request<MerchantDomainInfo[]>(`/v1/merchants/${encodeURIComponent(merchantId)}/domains`, {
      method: 'GET',
    });
  }

  /**
   * Sends an official FeraSetu platform transactional email (e.g. system alerts, invoices, verification codes).
   */
  async sendPlatformEmail(
    payload: {
      from?: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      replyTo?: string;
      idempotencyKey?: string;
      priority?: PriorityLevel;
      customHeaders?: Record<string, string> | Array<{ name: string; value: string }>;
    }
  ): Promise<SendEmailResponse> {
    return this.sendEmail({
      scope: 'PLATFORM',
      tenantId: 'platform',
      from: payload.from || 'no-reply@ferasetu.com',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      idempotencyKey: payload.idempotencyKey,
      priority: payload.priority || 'NORMAL',
      customHeaders: payload.customHeaders,
    });
  }

  /**
   * Helper: Send critical security alert from the platform.
   */
  async sendSecurityAlert(
    recipientEmail: string,
    alertData: { title: string; details: string; timestamp?: string }
  ): Promise<SendEmailResponse> {
    const timestampStr = alertData.timestamp || new Date().toISOString();
    return this.sendPlatformEmail({
      from: 'security@ferasetu.com',
      to: recipientEmail,
      subject: `[CRITICAL] Security Alert: ${alertData.title} - FeraSetu`,
      priority: 'CRITICAL',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 8px; padding: 24px;">
          <h2 style="color: #ef4444; margin-top: 0;">Security Alert: ${alertData.title}</h2>
          <p style="font-size: 15px; line-height: 1.5; color: #1f2937;">${alertData.details}</p>
          <div style="background-color: #fef2f2; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 13px; color: #991b1b;">
            Timestamp: ${timestampStr}
          </div>
          <p style="font-size: 12px; color: #6b7280;">If you did not perform this action, please contact support@ferasetu.com immediately.</p>
        </div>
      `,
      text: `[CRITICAL SECURITY ALERT] ${alertData.title}\n\n${alertData.details}\nTimestamp: ${timestampStr}\nIf you did not perform this action, please contact support@ferasetu.com immediately.`
    });
  }

  /**
   * Helper: Send platform invoice or billing notification.
   */
  async sendPlatformInvoice(
    recipientEmail: string,
    invoiceData: { invoiceNumber: string; amount: string; dueDate: string; downloadUrl?: string }
  ): Promise<SendEmailResponse> {
    return this.sendPlatformEmail({
      from: 'billing@ferasetu.com',
      to: recipientEmail,
      subject: `Invoice #${invoiceData.invoiceNumber} Ready - FeraSetu`,
      priority: 'HIGH',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
          <h2 style="color: #111827; margin-top: 0;">FeraSetu Platform Invoice</h2>
          <p>Your subscription invoice <strong>#${invoiceData.invoiceNumber}</strong> has been generated.</p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Amount Due:</strong> ${invoiceData.amount}</p>
            <p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>
          </div>
          ${invoiceData.downloadUrl ? `<p><a href="${invoiceData.downloadUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Download PDF Invoice</a></p>` : ''}
          <p style="font-size: 12px; color: #6b7280;">Thank you for partnering with FeraSetu.</p>
        </div>
      `,
      text: `FeraSetu Platform Invoice #${invoiceData.invoiceNumber}\nAmount: ${invoiceData.amount}\nDue: ${invoiceData.dueDate}${invoiceData.downloadUrl ? `\nDownload: ${invoiceData.downloadUrl}` : ''}`
    });
  }

  /**
   * Provisions canonical domain, DKIM keypair, and Cloudflare DNS records for a merchant.
   */
  async provisionMerchant(
    merchantId: string,
    payload?: ProvisionMerchantPayload
  ): Promise<ProvisionMerchantResponse> {
    return this.request<ProvisionMerchantResponse>(`/v1/merchants/${encodeURIComponent(merchantId)}/provision`, {
      method: 'POST',
      body: JSON.stringify(payload || { merchantSlug: merchantId }),
    });
  }

  // --- Common Transactional Helper Templates ---

  /**
   * Helper: Send Order Confirmation Email
   */
  async sendOrderConfirmation(
    merchantId: string,
    canonicalDomainOrSubdomain: string,
    customerEmail: string,
    orderData: { orderId: string; totalAmount: string; invoiceNumber: string; itemsSummary: string }
  ): Promise<SendEmailResponse> {
    const domain = canonicalDomainOrSubdomain.includes('.')
      ? canonicalDomainOrSubdomain
      : `${canonicalDomainOrSubdomain}.ferasetu.com`;
    const fromAddress = `noreply@${domain}`;
    const idempotencyKey = `order_confirmation_${merchantId}_${orderData.orderId}`;

    return this.sendEmail({
      merchantId,
      from: fromAddress,
      to: customerEmail,
      subject: `Order Confirmation #${orderData.orderId} - FeraSetu`,
      idempotencyKey,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your order!</h2>
          <p>Your order <strong>#${orderData.orderId}</strong> has been received and is being processed.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${orderData.invoiceNumber}</p>
            <p><strong>Total Amount:</strong> ${orderData.totalAmount}</p>
            <p><strong>Items:</strong> ${orderData.itemsSummary}</p>
          </div>
          <p style="color: #6c757d; font-size: 12px;">This is an automated transactional notification from FeraSetu.</p>
        </div>
      `,
      text: `Thank you for your order #${orderData.orderId}!\nInvoice: ${orderData.invoiceNumber}\nTotal: ${orderData.totalAmount}\nItems: ${orderData.itemsSummary}`,
    });
  }

  /**
   * Helper: Send Password Reset Email
   */
  async sendPasswordReset(
    merchantId: string,
    canonicalDomainOrSubdomain: string,
    userEmail: string,
    resetToken: string
  ): Promise<SendEmailResponse> {
    const domain = canonicalDomainOrSubdomain.includes('.')
      ? canonicalDomainOrSubdomain
      : `${canonicalDomainOrSubdomain}.ferasetu.com`;
    const fromAddress = `noreply@${domain}`;
    const resetUrl = `https://${domain}/reset-password?token=${encodeURIComponent(resetToken)}`;

    return this.sendEmail({
      merchantId,
      from: fromAddress,
      to: userEmail,
      subject: 'Reset your FeraSetu account password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your account. Click the button below to proceed:</p>
          <p><a href="${resetUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
      text: `Reset your password by following this link: ${resetUrl}`,
    });
  }
}
