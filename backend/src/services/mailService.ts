import { sendEmailViaBrevo, verifyBrevoConnection } from './brevoService';

const BRAND_COLOR = '#FF6B35';
const BRAND_NAME = 'FeraSetu';
const DEFAULT_FROM_EMAIL = 'noreply@ferasetu.fera-search.tech';
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

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #ffffff;
`;

const FOOTER_STYLE = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
`;

const BUTTON_STYLE = `
  display: inline-block;
  padding: 14px 32px;
  background-color: ${BRAND_COLOR};
  color: #ffffff !important;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 800;
  margin: 24px 0;
  font-size: 16px;
  box-shadow: 0 10px 15px -3px rgba(255, 107, 53, 0.3);
`;

export async function verifyMailService(): Promise<boolean> {
  return await verifyBrevoConnection();
}

export async function sendOTPEmail(email: string, otp: string) {
  const html = `
    <div style="${BASE_STYLE}">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: ${BRAND_COLOR}; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">${BRAND_NAME}</h1>
      </div>
      <div style="background: #fff; border: 1px solid #f1f5f9; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h2 style="font-size: 24px; font-weight: 800; color: #1e293b; margin-top: 0;">Verify your account 🔐</h2>
        <p style="font-size: 16px; color: #475569;">Namaste! 🙏 Welcome to FeraSetu. Use the code below to complete your registration and start your store.</p>
        
        <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center; margin: 32px 0; border: 2px solid #e2e8f0;">
          <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #1e293b; font-family: monospace;">${otp}</span>
        </div>
        
        <p style="font-size: 14px; color: #94a3b8; text-align: center;">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
      </div>
      
      <div style="${FOOTER_STYLE}">
        <p>© ${new Date().getFullYear()} ${BRAND_NAME} - AI-powered e-commerce for India.</p>
        <p>Digitizing Bharat, one shop at a time.</p>
      </div>
    </div>
  `;

  try {
    const sender = getFromAddress();
    await sendEmailViaBrevo(
      email,
      `${otp} is your verification code for FeraSetu`,
      html,
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
  const firstName = name.split(' ')[0];
  
  const html = `
    <div style="${BASE_STYLE}">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: ${BRAND_COLOR}; margin: 0; font-size: 28px; font-weight: 900;">${BRAND_NAME}</h1>
      </div>
      
      <div style="background: #fff; border: 1px solid #f1f5f9; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h2 style="font-size: 26px; font-weight: 800; color: #1e293b; margin-top: 0;">Namaste ${firstName}! 👋</h2>
        <p style="font-size: 18px; color: #475569; margin-bottom: 24px;">Your account is verified. You are now ready to grow your business with the power of AI.</p>
        
        <div style="background: #fff7ed; border-left: 4px solid ${BRAND_COLOR}; padding: 20px; margin-bottom: 32px; border-radius: 0 12px 12px 0;">
          <p style="margin: 0; font-weight: 700; color: #9a3412;">"Bade sapne, choti shuruat."</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #c2410c;">India is moving online, and your shop is now part of the revolution.</p>
        </div>

        <h3 style="font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 12px;">What can you do with FeraSetu?</h3>
        <ul style="padding: 0; list-style: none; margin-bottom: 32px;">
          <li style="margin-bottom: 12px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">✨</span>
            <span><strong>Instant Website:</strong> Create a professional shop in 2 minutes.</span>
          </li>
          <li style="margin-bottom: 12px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">📦</span>
            <span><strong>Easy Manager:</strong> Add products and track stock simply.</span>
          </li>
          <li style="margin-bottom: 12px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">🤖</span>
            <span><strong>AI Partner:</strong> Your personal assistant to grow sales.</span>
          </li>
        </ul>

        <div style="background: #f8fafc; border-radius: 20px; padding: 32px; margin-bottom: 32px;">
          <h3 style="font-size: 18px; font-weight: 800; color: #1e293b; margin-top: 0; margin-bottom: 20px; text-align: center;">Launch your shop in 3 steps:</h3>
          <div style="margin-bottom: 16px;">✅ <strong>Step 1:</strong> Add your first product with a photo.</div>
          <div style="margin-bottom: 16px;">✅ <strong>Step 2:</strong> Customize your shop colors with AI.</div>
          <div>✅ <strong>Step 3:</strong> Share your link on WhatsApp!</div>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="${BUTTON_STYLE}">Start Your Shop Now</a>
        </div>
      </div>

      <p style="text-align: center; font-size: 14px; color: #64748b; margin-top: 32px;">
        Need help? Just reply to this email or chat with us in the app. We are here to help you grow.
      </p>
      
      <div style="${FOOTER_STYLE}">
        <p>© ${new Date().getFullYear()} FeraSetu. Digitizing Bharat's Kirana Stores.</p>
        <p>Safe and Secure Platform</p>
      </div>
    </div>
  `;

  try {
    const sender = getFromAddress();
    await sendEmailViaBrevo(
      email,
      `Welcome to FeraSetu, ${firstName}! Your store is ready to launch 🚀`,
      html,
      sender.email,
      sender.name
    );
    console.log(`Onboarding email sent successfully to: ${email}`);
  } catch (error: any) {
    console.error(`Failed to send onboarding email to ${email}:`, error.message);
  }
}
