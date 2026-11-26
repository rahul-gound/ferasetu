import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * 1. Cashfree Payments Logo
 */
export function CashfreeLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#13192B" />
      {/* Cashfree geometric 'C' glyph */}
      <path
        d="M28 14H20C15.5817 14 12 17.5817 12 22V26C12 30.4183 15.5817 34 20 34H28"
        stroke="#5856D6"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="28" cy="24" r="4.5" fill="#00C292" />
      <path d="M19 20H25M19 24H27M19 28H23" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 2. Razorpay Logo
 */
export function RazorpayLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#0C2340" />
      {/* Razorpay sharp lightning-R blade */}
      <path
        d="M26.8 11L15 27.5H23.5L19 37L33 20.5H24.5L26.8 11Z"
        fill="#0A85EA"
      />
      <path
        d="M23.5 27.5L26.8 11L33 20.5H24.5L23.5 27.5Z"
        fill="#3395FF"
      />
    </svg>
  );
}

/**
 * 3. UPI (Unified Payments Interface) Logo
 */
export function UpiLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      {/* UPI Green and Orange Triangles */}
      <path d="M22 13L13 24L22 35H27L18 24L27 13H22Z" fill="#097939" />
      <path d="M29 13L20 24L29 35H34L25 24L34 13H29Z" fill="#EE7202" />
    </svg>
  );
}

/**
 * 4. PhonePe Logo
 */
export function PhonePeLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#5F259F" />
      {/* Devanagari 'पे' (Pe) symbol */}
      <path
        d="M17 14H31V18H26V34H21V28H19C16.2386 28 14 25.7614 14 23V19C14 16.2386 16.2386 14 19 14H21"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M29 14L34 20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 5. Google Pay (GPay) Logo
 */
export function GooglePayLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      {/* Google Pay Multicolored G-loop */}
      <path d="M24 16C19.58 16 16 19.58 16 24C16 28.42 19.58 32 24 32C28.42 32 32 28.42 32 24" stroke="#4285F4" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 24H24" stroke="#4285F4" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 16C26.5 16 28.7 17.1 30.2 18.8" stroke="#EA4335" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 24C16 26.2 16.9 28.2 18.3 29.7" stroke="#34A853" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M18.3 29.7C19.8 31.1 21.8 32 24 32" stroke="#FBBC04" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 6. Paytm Logo
 */
export function PaytmLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#002E6E" />
      <text x="50%" y="38%" dominantBaseline="central" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="sans-serif">
        Pay
      </text>
      <text x="50%" y="68%" dominantBaseline="central" textAnchor="middle" fill="#00B9F5" fontSize="11" fontWeight="900" fontFamily="sans-serif">
        tm
      </text>
    </svg>
  );
}

/**
 * 7. Stripe Logo
 */
export function StripeLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#635BFF" />
      <path
        d="M28.4 21.3C28.4 19.8 27.2 18.9 25.2 18.9C22.6 18.9 20.4 19.8 19.2 20.4L18.4 16.8C19.9 16.1 22.5 15.3 25.5 15.3C30.2 15.3 33.3 17.6 33.3 21.7C33.3 27.6 25.1 27 25.1 29.5C25.1 30.7 26.2 31.3 27.8 31.3C30.3 31.3 32.5 30.5 33.5 29.8L34.3 33.5C32.7 34.2 30.3 35 27.3 35C22.5 35 19.9 32.6 19.9 28.9C19.9 23.4 28.4 23.9 28.4 21.3Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * 8. PayPal Logo
 */
export function PayPalLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      <path
        d="M17 33L21.5 13H29.5C33.5 13 36 15.5 35 19.5C34 23.5 30.5 25.5 26.5 25.5H23L21 33H17Z"
        fill="#003087"
      />
      <path
        d="M21 36L24.5 19H31.5C35 19 37 21 36 24.5C35 28 32 30 28.5 30H25.5L24 36H21Z"
        fill="#0079C1"
      />
    </svg>
  );
}

/**
 * 9. WhatsApp Business Logo
 */
export function WhatsAppLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#25D366" />
      <path
        d="M24 11C16.82 11 11 16.82 11 24C11 26.5 11.71 28.84 12.95 30.82L11.5 36.5L17.36 35.12C19.26 36.31 21.54 37 24 37C31.18 37 37 31.18 37 24C37 16.82 31.18 11 24 11Z"
        fill="#FFFFFF"
      />
      <path
        d="M29.5 27.2C29.2 28.1 27.9 28.8 26.9 29C26.2 29.1 25.3 29.2 22.2 27.9C18.3 26.3 15.8 22.3 15.6 22C15.4 21.7 14 19.8 14 17.9C14 16 15 15.1 15.3 14.7C15.6 14.3 16.1 14.2 16.5 14.2C16.8 14.2 17.1 14.2 17.4 14.2C17.7 14.2 18 14.1 18.3 14.8C18.6 15.5 19.3 17.3 19.4 17.5C19.5 17.7 19.5 17.9 19.4 18.2C19.3 18.5 19.2 18.7 19 18.9C18.8 19.1 18.6 19.4 18.4 19.6C18.2 19.8 18 20 18.2 20.4C18.4 20.8 19.2 22.1 20.4 23.2C21.9 24.5 23.2 25 23.6 25.2C24 25.4 24.3 25.3 24.5 25.1C24.8 24.8 25.7 23.7 26 23.3C26.3 22.9 26.6 23 27 23.1C27.4 23.2 29.5 24.2 29.9 24.4C30.3 24.6 30.6 24.7 30.7 24.9C30.8 25.1 30.8 26.1 29.5 27.2Z"
        fill="#25D366"
      />
    </svg>
  );
}

/**
 * 10. Telegram Logo
 */
export function TelegramLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#229ED9" />
      <path
        d="M34.5 14L13.5 22.5C12 23.1 12 23.9 13.3 24.3L18.7 26L31.2 18.1C31.8 17.7 32.3 18 31.8 18.5L21.7 27.6L21.3 32.5C21.8 32.5 22 32.3 22.3 32L24.7 29.7L29.7 33.4C30.6 33.9 31.3 33.7 31.5 32.6L34.8 17.1C35.1 15.9 34.3 15.3 34.5 14Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * 11. Twilio Logo
 */
export function TwilioLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#F22F46" />
      <circle cx="19" cy="19" r="4" fill="#FFFFFF" />
      <circle cx="29" cy="19" r="4" fill="#FFFFFF" />
      <circle cx="19" cy="29" r="4" fill="#FFFFFF" />
      <circle cx="29" cy="29" r="4" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 12. Transactional Email / Custom SMTP Logo
 */
export function SmtpEmailLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#1E293B" />
      <rect x="11" y="15" width="26" height="18" rx="3" fill="#3B82F6" />
      <path d="M12 16L24 25L36 16" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="15" r="4" fill="#10B981" />
    </svg>
  );
}

/**
 * 13. Shiprocket Logo
 */
export function ShiprocketLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#7336D6" />
      {/* Rocket icon */}
      <path
        d="M24 12C24 12 30 15 30 23L33 26V28L28 27L24 33L20 27L15 28V26L18 23C18 15 24 12 24 12Z"
        fill="#FFFFFF"
      />
      <circle cx="24" cy="21" r="2.5" fill="#36B37E" />
      <path d="M22 34L24 38L26 34" stroke="#FFAA00" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 14. Delhivery Logo
 */
export function DelhiveryLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#E42529" />
      {/* Bold 'D' package monogram */}
      <path
        d="M16 14H24C29.5 14 33 18 33 24C33 30 29.5 34 24 34H16V14ZM21 19V29H23.5C26.5 29 28 27 28 24C28 21 26.5 19 23.5 19H21Z"
        fill="#FFFFFF"
      />
      <path d="M30 18L35 24L30 30" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 15. Porter Logo
 */
export function PorterLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#0070F3" />
      {/* Mini delivery truck */}
      <rect x="12" y="17" width="16" height="12" rx="2" fill="#FFFFFF" />
      <path d="M28 20H33L36 24V29H28V20Z" fill="#FFFFFF" />
      <circle cx="17" cy="30" r="3" fill="#002D62" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="32" cy="30" r="3" fill="#002D62" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M15 22H21" stroke="#0070F3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 16. Dunzo Logo
 */
export function DunzoLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#00D290" />
      {/* Lightning bolt speed delivery */}
      <path d="M26 12L15 26H24L22 36L33 22H24L26 12Z" fill="#FFFFFF" stroke="#007755" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 17. Blue Dart Logo
 */
export function BlueDartLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#FFCC00" />
      <path d="M12 24L32 14L27 24L36 34L12 24Z" fill="#002060" />
      <circle cx="21" cy="24" r="2.5" fill="#E42529" />
    </svg>
  );
}

/**
 * 18. Tally Prime Logo
 */
export function TallyPrimeLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#F7931E" />
      {/* Tally gold ledger mark */}
      <rect x="14" y="14" width="20" height="20" rx="3" fill="#FFFFFF" />
      <path d="M18 19H30M24 19V30" stroke="#E65100" strokeWidth="3" strokeLinecap="round" />
      <circle cx="29" cy="29" r="2" fill="#0079C1" />
    </svg>
  );
}

/**
 * 19. Zoho Books Logo
 */
export function ZohoBooksLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      {/* 4 Zoho colorful squares */}
      <rect x="14" y="14" width="8" height="8" rx="2" fill="#EF4444" />
      <rect x="26" y="14" width="8" height="8" rx="2" fill="#22C55E" />
      <rect x="14" y="26" width="8" height="8" rx="2" fill="#3B82F6" />
      <rect x="26" y="26" width="8" height="8" rx="2" fill="#EAB308" />
    </svg>
  );
}

/**
 * 20. QuickBooks Logo
 */
export function QuickBooksLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#2CA01C" />
      {/* Interlocking qb */}
      <circle cx="20" cy="24" r="6" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M26 18V30" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="24" r="6" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M22 18V30" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 21. FeraSetu Sovereign AI Engine Logo
 */
export function FeraAiLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="feraAiGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B35" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#feraAiGrad)" />
      {/* AI Sparkle */}
      <path
        d="M24 12L26.5 20.5L35 23L26.5 25.5L24 34L21.5 25.5L13 23L21.5 20.5L24 12Z"
        fill="#FFFFFF"
      />
      <circle cx="33" cy="15" r="2" fill="#FFFFFF" opacity="0.9" />
      <circle cx="15" cy="31" r="1.5" fill="#FFFFFF" opacity="0.8" />
    </svg>
  );
}

/**
 * 22. Notion Logo
 */
export function NotionLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#000000" />
      <path
        d="M16 15L29 13.5C31.5 13.2 32 14.5 32 16.5V31C32 32.5 31 33.5 29 33.8L16 35C14.5 35.2 14 34 14 32.5V17.5C14 16 14.8 15.1 16 15Z"
        fill="#FFFFFF"
      />
      <path
        d="M19 19.5V29.5M19 19.5L27 29.5M27 19.5V29.5"
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 23. Google Stitch MCP Logo
 */
export function GoogleStitchLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#1E293B" />
      <path d="M24 13L34 23L24 33L14 23L24 13Z" stroke="#38BDF8" strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="13" r="3" fill="#EA4335" />
      <circle cx="34" cy="23" r="3" fill="#FBBC04" />
      <circle cx="24" cy="33" r="3" fill="#34A853" />
      <circle cx="14" cy="23" r="3" fill="#4285F4" />
      <circle cx="24" cy="23" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 24. Google Sheets Logo
 */
export function GoogleSheetsLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#0F9D58" />
      {/* Spreadsheet sheet with folded corner */}
      <path d="M15 13H28L34 19V34C34 35.1 33.1 36 32 36H15C13.9 36 13 35.1 13 34V15C13 13.9 13.9 13 15 13Z" fill="#FFFFFF" />
      <path d="M28 13V19H34" fill="#E8F5E9" />
      {/* Grid lines */}
      <rect x="17" y="22" width="13" height="10" stroke="#0F9D58" strokeWidth="1.5" fill="none" />
      <line x1="23.5" y1="22" x2="23.5" y2="32" stroke="#0F9D58" strokeWidth="1.5" />
      <line x1="17" y1="27" x2="30" y2="27" stroke="#0F9D58" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * 25. Slack Logo
 */
export function SlackLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#4A154B" />
      <circle cx="18" cy="20" r="2.5" fill="#36C5F0" />
      <rect x="22" y="17.5" width="8" height="5" rx="2.5" fill="#36C5F0" />
      <circle cx="28" cy="18" r="2.5" fill="#2EB67D" />
      <rect x="25.5" y="22" width="5" height="8" rx="2.5" fill="#2EB67D" />
      <circle cx="30" cy="28" r="2.5" fill="#E01E5A" />
      <rect x="18" y="25.5" width="8" height="5" rx="2.5" fill="#E01E5A" />
      <circle cx="20" cy="30" r="2.5" fill="#ECB22E" />
      <rect x="17.5" y="18" width="5" height="8" rx="2.5" fill="#ECB22E" />
    </svg>
  );
}

/**
 * 26. ESC/POS Thermal Receipt Printer Logo
 */
export function ThermalPrinterLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#1E293B" />
      {/* Modern thermal POS printer body */}
      <rect x="12" y="19" width="24" height="17" rx="3" fill="#334155" stroke="#64748B" strokeWidth="1.5" />
      {/* Paper exit feed */}
      <rect x="15" y="12" width="18" height="9" rx="1.5" fill="#FFFFFF" />
      <line x1="18" y1="15" x2="27" y2="15" stroke="#94A3B8" strokeWidth="1.5" />
      <line x1="18" y1="18" x2="30" y2="18" stroke="#94A3B8" strokeWidth="1.5" />
      {/* Power LED and feed button */}
      <circle cx="17" cy="24" r="1.5" fill="#10B981" />
      <circle cx="22" cy="24" r="1.5" fill="#38BDF8" />
      <rect x="26" y="23" width="7" height="2" rx="1" fill="#64748B" />
    </svg>
  );
}

/**
 * 27. Soundbox Logo
 */
export function SoundboxLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#0284C7" />
      {/* Speaker box */}
      <rect x="14" y="14" width="20" height="22" rx="3" fill="#0C4A6E" stroke="#38BDF8" strokeWidth="1.5" />
      <circle cx="24" cy="25" r="5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="24" cy="25" r="2" fill="#FFFFFF" />
      {/* Sound waves */}
      <path d="M37 18C39 20 40 22.5 40 25C40 27.5 39 30 37 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 18C9 20 8 22.5 8 25C8 27.5 9 30 11 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 28. Barcode Scanner Hardware Logo
 */
export function BarcodeScannerLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="12" fill="#0F172A" />
      {/* Barcode lines */}
      <rect x="14" y="14" width="2" height="12" fill="#FFFFFF" />
      <rect x="18" y="14" width="3" height="12" fill="#FFFFFF" />
      <rect x="23" y="14" width="1" height="12" fill="#FFFFFF" />
      <rect x="26" y="14" width="4" height="12" fill="#FFFFFF" />
      <rect x="32" y="14" width="2" height="12" fill="#FFFFFF" />
      {/* Red laser scan line */}
      <line x1="11" y1="20" x2="37" y2="20" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      {/* Scanner gun handle */}
      <path d="M22 28H26L28 35H24L22 28Z" fill="#475569" />
    </svg>
  );
}

/**
 * Master Registry Map: maps service IDs and names to their official vector logo
 */
export const INTEGRATION_LOGOS: Record<string, React.FC<LogoProps>> = {
  // Payments
  'cashfree-pg': CashfreeLogo,
  'cashfree': CashfreeLogo,
  'razorpay-pg': RazorpayLogo,
  'razorpay': RazorpayLogo,
  'offline-cod': UpiLogo,
  'upi': UpiLogo,
  'phonepe': PhonePeLogo,
  'phonepe-pg': PhonePeLogo,
  'google-pay': GooglePayLogo,
  'gpay': GooglePayLogo,
  'paytm': PaytmLogo,
  'paytm-pg': PaytmLogo,
  'stripe': StripeLogo,
  'stripe-pg': StripeLogo,
  'paypal': PayPalLogo,
  'paypal-pg': PayPalLogo,
  'payu-pg': CashfreeLogo,
  'pinelabs-pg': CashfreeLogo,

  // Messaging
  'wa-baileys': WhatsAppLogo,
  'whatsapp': WhatsAppLogo,
  'whatsapp-cloud-api': WhatsAppLogo,
  'gupshup-enterprise': WhatsAppLogo,
  'telegram': TelegramLogo,
  'telegram-bot': TelegramLogo,
  'twilio': TwilioLogo,
  'twilio-sms': TwilioLogo,
  'email-smtp': SmtpEmailLogo,
  'smtp': SmtpEmailLogo,

  // Logistics
  'shiprocket-logistics': ShiprocketLogo,
  'shiprocket': ShiprocketLogo,
  'delhivery-direct': DelhiveryLogo,
  'delhivery': DelhiveryLogo,
  'porter-hyperlocal': PorterLogo,
  'porter': PorterLogo,
  'dunzo-shadowfax': DunzoLogo,
  'dunzo': DunzoLogo,
  'bluedart': BlueDartLogo,
  'bluedart-apex': BlueDartLogo,
  'bluedart-dhl': BlueDartLogo,
  'dtdc-express': ShiprocketLogo,

  // Accounting
  'tally-erp': TallyPrimeLogo,
  'tally': TallyPrimeLogo,
  'zoho-books': ZohoBooksLogo,
  'zoho': ZohoBooksLogo,
  'marg-erp': TallyPrimeLogo,
  'quickbooks': QuickBooksLogo,

  // AI & Productivity
  'fera-ai': FeraAiLogo,
  'notion-mcp': NotionLogo,
  'notion': NotionLogo,
  'stitch-mcp': GoogleStitchLogo,
  'stitch': GoogleStitchLogo,
  'google-sheets': GoogleSheetsLogo,
  'sheets': GoogleSheetsLogo,
  'slack': SlackLogo,
  'zapier-make': GoogleStitchLogo,

  // Hardware
  'thermal-printer': ThermalPrinterLogo,
  'soundbox': SoundboxLogo,
  'barcode-scanner': BarcodeScannerLogo,
};

/**
 * Official Domain Mapping for Real Brand Favicons (Google S2 Favicon CDN)
 */
const SERVICE_FAVICON_DOMAINS: Record<string, string> = {
  'cashfree': 'cashfree.com',
  'cashfree-pg': 'cashfree.com',
  'razorpay': 'razorpay.com',
  'razorpay-pg': 'razorpay.com',
  'phonepe': 'phonepe.com',
  'phonepe-pg': 'phonepe.com',
  'google-pay': 'pay.google.com',
  'gpay': 'pay.google.com',
  'paytm': 'paytm.com',
  'paytm-pg': 'paytm.com',
  'stripe': 'stripe.com',
  'stripe-pg': 'stripe.com',
  'paypal': 'paypal.com',
  'paypal-pg': 'paypal.com',
  'payu-pg': 'payu.in',
  'pinelabs-pg': 'pinelabs.com',
  'upi': 'npci.org.in',
  'offline-cod': 'npci.org.in',
  'wa-baileys': 'whatsapp.com',
  'whatsapp': 'whatsapp.com',
  'whatsapp-cloud-api': 'whatsapp.com',
  'gupshup-enterprise': 'gupshup.io',
  'telegram': 'telegram.org',
  'telegram-bot': 'telegram.org',
  'twilio': 'twilio.com',
  'twilio-sms': 'twilio.com',
  'shiprocket': 'shiprocket.in',
  'shiprocket-logistics': 'shiprocket.in',
  'delhivery': 'delhivery.com',
  'delhivery-direct': 'delhivery.com',
  'porter': 'porter.in',
  'porter-hyperlocal': 'porter.in',
  'dunzo': 'dunzo.com',
  'dunzo-shadowfax': 'shadowfax.in',
  'bluedart': 'bluedart.com',
  'bluedart-apex': 'bluedart.com',
  'bluedart-dhl': 'dhl.com',
  'dtdc-express': 'dtdc.in',
  'tally': 'tallysolutions.com',
  'tally-erp': 'tallysolutions.com',
  'zoho': 'zoho.com',
  'zoho-books': 'zoho.com',
  'marg-erp': 'margcompusoft.com',
  'quickbooks': 'quickbooks.intuit.com',
  'notion': 'notion.so',
  'notion-mcp': 'notion.so',
  'google-sheets': 'sheets.google.com',
  'sheets': 'sheets.google.com',
  'slack': 'slack.com',
  'zapier-make': 'zapier.com',
  'stitch': 'stitch.withgoogle.com',
  'stitch-mcp': 'stitch.withgoogle.com',
  'fera-ai': 'ferasetu.com',
};

function RealFaviconBadge({
  domain,
  alt,
  size = 40,
  className = '',
  fallback,
}: {
  domain: string;
  alt: string;
  size?: number;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <>{fallback}</>;

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 shadow-xs p-1.5 overflow-hidden ${className}`}
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-contain rounded-md"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/**
 * Universal logo getter with real official favicon & SVG fallback
 */
export function getIntegrationLogo(serviceId: string, size = 40, className = ''): React.ReactNode {
  const normalized = serviceId.toLowerCase().trim();
  const Component = INTEGRATION_LOGOS[normalized];
  const fallbackNode = Component ? (
    <Component size={size} className={className} />
  ) : normalized.includes('pay') || normalized.includes('card') || normalized.includes('upi') ? (
    <UpiLogo size={size} className={className} />
  ) : normalized.includes('ship') || normalized.includes('track') || normalized.includes('delivery') ? (
    <ShiprocketLogo size={size} className={className} />
  ) : normalized.includes('mail') || normalized.includes('smtp') ? (
    <SmtpEmailLogo size={size} className={className} />
  ) : normalized.includes('chat') || normalized.includes('message') ? (
    <WhatsAppLogo size={size} className={className} />
  ) : normalized.includes('ai') || normalized.includes('bot') ? (
    <FeraAiLogo size={size} className={className} />
  ) : (
    <CashfreeLogo size={size} className={className} />
  );

  const faviconDomain = SERVICE_FAVICON_DOMAINS[normalized];
  if (faviconDomain) {
    return (
      <RealFaviconBadge
        domain={faviconDomain}
        alt={serviceId}
        size={size}
        className={className}
        fallback={fallbackNode}
      />
    );
  }

  return fallbackNode;
}
