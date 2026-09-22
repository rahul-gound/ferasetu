import { WorkerEmailClient, sendEmailViaWorker } from './workerEmailClient';

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

async function dispatchViaWorker(
  templateKey: string,
  to: string,
  data: Record<string, any>,
  branding: {
    storeName: string;
    primaryColor: string;
    storeUrl: string;
    supportEmail: string;
  },
  isPlatform: boolean = false
): Promise<void> {
  const workerUrl = process.env.WORKER_EMAIL_API_URL || 'https://api.ferasetu.com';
  const apiKey = process.env.WORKER_EMAIL_API_KEY;
  
  if (!apiKey) {
    throw new Error('WORKER_EMAIL_API_KEY not configured');
  }

  const payload = {
    templateKey,
    to,
    templateData: data,
    locale: 'en',
    // Branding passed as custom data, the worker will use its own branding logic
  };

  await sendEmailViaWorker(workerUrl, apiKey, payload);
}

export async function verifyMailService(): Promise<boolean> {
  const workerUrl = process.env.WORKER_EMAIL_API_URL || 'https://api.ferasetu.com';
  const apiKey = process.env.WORKER_EMAIL_API_KEY;
  
  if (!apiKey) {
    console.warn('WORKER_EMAIL_API_KEY not configured');
    return false;
  }

  try {
    const client = new WorkerEmailClient(workerUrl, apiKey);
    return await client.healthCheck();
  } catch (error: any) {
    console.error('Worker email service verification failed:', error.message);
    return false;
  }
}

export async function sendOTPEmail(email: string, otp: string) {
  try {
    await dispatchViaWorker(
      'account.verify_email',
      email,
      { otp, customer_name: 'Customer', expiry_minutes: 10 },
      {
        storeName: 'FeraSetu',
        primaryColor: BRAND_COLOR,
        storeUrl: 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      },
      true // isPlatform
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
    await dispatchViaWorker(
      'merchant.onboarding',
      email,
      { merchant_name: name, store_url: process.env.FRONTEND_URL || 'https://ferasetu.com/dashboard' },
      {
        storeName: 'FeraSetu',
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      },
      true // isPlatform
    );
    console.log(`Onboarding email sent successfully to: ${email}`);
  } catch (error: any) {
    console.error(`Failed to send onboarding email to ${email}:`, error.message);
  }
}

export async function sendInvoiceEmail(email: string, invoiceData: { invoiceNumber: string; storeName: string; totalFormatted: string; orderId: string }): Promise<void> {
  try {
    await dispatchViaWorker(
      'invoice.created',
      email,
      {
        invoice_number: invoiceData.invoiceNumber,
        order_id: invoiceData.orderId,
        total: invoiceData.totalFormatted,
        customer_name: 'Customer'
      },
      {
        storeName: invoiceData.storeName,
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    );
  } catch (err: any) {
    console.warn(`[mailService] Could not send invoice email to ${email}:`, err.message);
  }
}

export async function sendOrderCancellationEmail(email: string, data: { orderId: string; storeName: string; reason?: string; isRefundable?: boolean }): Promise<void> {
  try {
    await dispatchViaWorker(
      'order.cancelled',
      email,
      {
        order_id: data.orderId,
        customer_name: 'Customer',
        reason: data.reason || 'Requested by customer / merchant',
        is_refundable: data.isRefundable || false
      },
      {
        storeName: data.storeName,
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    );
  } catch (err: any) {
    console.warn(`[mailService] Could not send cancellation email to ${email}:`, err.message);
  }
}

export async function sendRefundEmail(email: string, data: { refundNumber: string; orderId: string; amountFormatted: string; method: string; isCompleted: boolean }): Promise<void> {
  try {
    const templateKey = data.isCompleted ? 'refund.completed' : 'refund.initiated';
    await dispatchViaWorker(
      templateKey,
      email,
      {
        refund_number: data.refundNumber,
        order_id: data.orderId,
        amount: data.amountFormatted,
        customer_name: 'Customer',
        refund_method: data.method
      },
      {
        storeName: 'FeraSetu',
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    );
  } catch (err: any) {
    console.warn(`[mailService] Could not send refund email to ${email}:`, err.message);
  }
}

export async function sendCreditNoteEmail(email: string, data: { creditNoteNumber: string; orderId: string; amountFormatted: string; storeName: string }): Promise<void> {
  try {
    await dispatchViaWorker(
      'credit_note.created',
      email,
      {
        credit_note_number: data.creditNoteNumber,
        order_id: data.orderId,
        amount: data.amountFormatted,
        customer_name: 'Customer',
        reason: 'Return / Adjustment'
      },
      {
        storeName: data.storeName,
        primaryColor: BRAND_COLOR,
        storeUrl: process.env.FRONTEND_URL || 'https://ferasetu.com',
        supportEmail: 'support@ferasetu.com'
      }
    );
  } catch (err: any) {
    console.warn(`[mailService] Could not send credit note email to ${email}:`, err.message);
  }
}