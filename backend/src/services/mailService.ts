import { sendEmailViaBrevo, verifyBrevoConnection } from './brevoService';
import { renderEmailTemplate, validateTemplateVariables, EMAIL_TEMPLATES } from '../../worker/templates/emailTemplates.js';

const BRAND_COLOR = '#FF6B35';
const BRAND_NAME = 'FeraSetu';
const DEFAULT_FROM_EMAIL = 'noreply@ferasetu.com';
const DEFAULT_FROM_NAME = BRAND_NAME;

interface ParsedSender {
  email: string;
  name: string;
}

function parseFromAddress(raw: string): ParsedSender {
  const s = raw.trim();
  const match = s.match(/^"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim() || DEFAULT_FROM_NAME;
    const email = match[2].trim();
    return { email, name };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return { email: s, name: DEFAULT_FROM_NAME };
  }
  return { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };
}

function getFromAddress(): ParsedSender {
  return parseFromAddress(process.env.EMAIL_FROM || `"${BRAND_NAME}" <${DEFAULT_FROM_EMAIL}>`);
}

export async function verifyMailService(): Promise<boolean> {
  return await verifyBrevoConnection();
}

export async function sendOTPEmail(email: string, otp: string) {
  try {
    const rendered = renderEmailTemplate({
      templateKey: 'account.verify_email',
      locale: 'en',
      data: { otp, customer_name: 'Customer', expiry_minutes: 10 },
      branding: {
        storeName: 'FeraSetu',
        primaryColor: BRAND_COLOR,
        storeUrl: 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      },
      isPlatform: true
    });

    const sender = getFromAddress();
    await sendEmailViaBrevo(
      email,
      rendered.subject,
      rendered.html,
      sender.email,
      sender.name
    );
    console.log(`OTP email sent successfully to: ${email}`);
  } catch (error: any) {
    console.error(`Failed to send OTP email to ${email}:`, error.message);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

export async function sendOnboardingEmail(email: string, name: string) {
  try {
    const firstName = name.split(' ')[0];
    const rendered = renderEmailTemplate({
      templateKey: 'merchant.onboarding',
      locale: 'en',
      data: { merchant_name: name, store_url: process.env.FRONTEND_URL || 'https://ferasetu.com/dashboard' },
      branding: {
        storeName: 'FeraSetu',
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      },
      isPlatform: true
    });

    const sender = getFromAddress();
    await sendEmailViaBrevo(
      email,
      rendered.subject,
      rendered.html,
      sender.email,
      sender.name
    );
    console.log(`Onboarding email sent successfully to: ${email}`);
  } catch (error: any) {
    console.error(`Failed to send onboarding email to ${email}:`, error.message);
  }
}

export async function sendInvoiceEmail(email: string, invoiceData: { invoiceNumber: string; storeName: string; totalFormatted: string; orderId: string }): Promise<void> {
  try {
    const rendered = renderEmailTemplate({
      templateKey: 'invoice.created',
      locale: 'en',
      data: {
        invoice_number: invoiceData.invoiceNumber,
        order_id: invoiceData.orderId,
        total: invoiceData.totalFormatted,
        customer_name: 'Customer'
      },
      branding: {
        storeName: invoiceData.storeName,
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    });

    const sender = getFromAddress();
    await sendEmailViaBrevo(email, rendered.subject, rendered.html, sender.email, sender.name);
  } catch (err: any) {
    console.warn(`[mailService] Could not send invoice email to ${email}:`, err.message);
  }
}

export async function sendOrderCancellationEmail(email: string, data: { orderId: string; storeName: string; reason?: string; isRefundable?: boolean }): Promise<void> {
  try {
    const rendered = renderEmailTemplate({
      templateKey: 'order.cancelled',
      locale: 'en',
      data: {
        order_id: data.orderId,
        customer_name: 'Customer',
        reason: data.reason || 'Requested by customer / merchant',
        is_refundable: data.isRefundable || false
      },
      branding: {
        storeName: data.storeName,
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    });

    const sender = getFromAddress();
    await sendEmailViaBrevo(email, rendered.subject, rendered.html, sender.email, sender.name);
  } catch (err: any) {
    console.warn(`[mailService] Could not send cancellation email to ${email}:`, err.message);
  }
}

export async function sendRefundEmail(email: string, data: { refundNumber: string; orderId: string; amountFormatted: string; method: string; isCompleted: boolean }): Promise<void> {
  try {
    const templateKey = data.isCompleted ? 'refund.completed' : 'refund.initiated';
    const rendered = renderEmailTemplate({
      templateKey,
      locale: 'en',
      data: {
        refund_number: data.refundNumber,
        order_id: data.orderId,
        amount: data.amountFormatted,
        customer_name: 'Customer',
        refund_method: data.method
      },
      branding: {
        storeName: 'FeraSetu',
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    });

    const sender = getFromAddress();
    await sendEmailViaBrevo(email, rendered.subject, rendered.html, sender.email, sender.name);
  } catch (err: any) {
    console.warn(`[mailService] Could not send refund email to ${email}:`, err.message);
  }
}

export async function sendCreditNoteEmail(email: string, data: { creditNoteNumber: string; orderId: string; amountFormatted: string; storeName: string }): Promise<void> {
  try {
    const rendered = renderEmailTemplate({
      templateKey: 'credit_note.created',
      locale: 'en',
      data: {
        credit_note_number: data.creditNoteNumber,
        order_id: data.orderId,
        amount: data.amountFormatted,
        customer_name: 'Customer',
        reason: 'Return / Adjustment'
      },
      branding: {
        storeName: data.storeName,
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    });

    const sender = getFromAddress();
    await sendEmailViaBrevo(email, rendered.subject, rendered.html, sender.email, sender.name);
  } catch (err: any) {
    console.warn(`[mailService] Could not send credit note email to ${email}:`, err.message);
  }
}