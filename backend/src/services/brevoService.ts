import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

interface EmailPayload {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  sender?: { email: string; name?: string };
  replyTo?: { email: string; name?: string };
}

function coerceSender(senderEmail?: string, senderName?: string): { email: string; name?: string } | undefined {
  if (!senderEmail) return undefined;
  const s = senderEmail.trim();
  const match = s.match(/^"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = (senderName || match[1].trim() || undefined);
    return { email: match[2].trim(), name };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return { email: s, name: senderName };
  }
  console.warn(`Invalid sender email ignored: ${senderEmail}`);
  return undefined;
}

export async function sendEmailViaBrevo(
  to: string,
  subject: string,
  htmlContent: string,
  senderEmail?: string,
  senderName?: string
): Promise<{ messageId: string }> {
  if (!BREVO_API_KEY) {
    console.warn('Brevo API key not configured. Email skipped.');
    return { messageId: 'mock-id' };
  }

  const payload: EmailPayload = {
    to: [{ email: to }],
    subject,
    htmlContent,
    sender: coerceSender(senderEmail, senderName),
  };

  try {
    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      timeout: 10000,
    });

    return { messageId: response.headers['x-message-id'] || 'unknown' };
  } catch (error: any) {
    const detail = error.response?.data?.message || error.message;
    console.error('Brevo send failed:', detail, 'payload.sender=', payload.sender);
    throw new Error(`Brevo email send failed: ${detail}`);
  }
}

export async function verifyBrevoConnection(): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.warn('Brevo API key not configured.');
    return false;
  }

  try {
    const testPayload = {
      to: [{ email: 'test@example.com' }],
      subject: 'Brevo Connection Test',
      htmlContent: '<p>This is a test email to verify Brevo API connection.</p>',
      sender: { email: 'noreply@ferasetu.fera-search.tech' },
    };

    await axios.post(BREVO_API_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      timeout: 5000,
    });

    console.log('Brevo API connection verified successfully');
    return true;
  } catch (error: any) {
    console.error('Brevo API verification failed:', error.response?.data?.message || error.message);
    return false;
  }
}
