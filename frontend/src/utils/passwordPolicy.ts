/**
 * Password policy — frontend mirror of the worker's `validatePassword()`.
 *
 * Both sides enforce identical rules so users get instant feedback in the
 * UI, but the SERVER check is authoritative and never trusts the client.
 *
 * Rules (OWASP ASVS V2.2 / NIST 800-63B aligned):
 *   - 12+ characters (supports long passphrases up to 1024 chars)
 *   - Max 1024 chars (DoS / storage guard)
 *   - Optional character flexibility — NIST no longer requires complexity
 *     classes; length is the primary lever. Passphrases like
 *     "correct horse battery staple" are explicitly allowed.
 *   - Reject common/leaked passwords against a static denylist (the Worker
 *     additionally submits the hash to HIBP's Pwned Passwords range API
 *     when reachable — that check happens server-side only).
 *   - Reject passwords containing the email local-part or full name
 *     (context-specific — an obvious attacker shortcut).
 *
 * `validatePassword()` returns `{ ok: true }` or `{ ok: false, message }`.
 */

export interface PasswordValidationResult {
  ok: boolean;
  message?: string;
  /** Strength score 0-4 for the UI meter — NIST doesn't mandate this, it's UX. */
  score?: 0 | 1 | 2 | 3 | 4;
}

const MIN_LENGTH = 12;
const MAX_LENGTH = 1024;

// A deliberately small static denylist — the server does the heavy lifting
// via HIBP range API. This is just first-line UX feedback.
const COMMON_LEAKED = new Set([
  'password', 'password123', 'password1234', '1234567890', '123456789012',
  'qwerty123', 'qwertyuiop', 'asdfghjkl', 'letmein123', 'welcome123',
  'admin12345', 'administrator', 'iloveyou', 'monkey123', 'football123',
  'passw0rd123', 'p@ssw0rd123', 'changeme123', 'superman123',
]);

export function validatePassword(
  password: string,
  context?: { email?: string; name?: string },
): PasswordValidationResult {
  if (typeof password !== 'string' || password.length === 0) {
    return { ok: false, message: 'Password is required.', score: 0 };
  }
  if (password.length < MIN_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_LENGTH} characters. Passphrases (multiple words) are encouraged.`,
      score: 1,
    };
  }
  if (password.length > MAX_LENGTH) {
    return { ok: false, message: `Password is too long (max ${MAX_LENGTH} chars).`, score: 0 };
  }

  const lower = password.toLowerCase();

  // Context-specific checks — reject if it contains the user's own email
  // local-part or name (case-insensitive substring match).
  if (context?.email) {
    const localPart = context.email.split('@')[0]?.toLowerCase();
    if (localPart && localPart.length >= 4 && lower.includes(localPart)) {
      return {
        ok: false,
        message: 'Your password should not contain your email address.',
        score: 2,
      };
    }
  }
  if (context?.name) {
    const namePart = context.name.trim().toLowerCase();
    if (namePart.length >= 3 && lower.includes(namePart)) {
      return {
        ok: false,
        message: 'Your password should not contain your name.',
        score: 2,
      };
    }
  }

  // Static leaked-password denylist (UX feedback only — Worker re-checks).
  if (COMMON_LEAKED.has(lower)) {
    return {
      ok: false,
      message: 'This password is commonly leaked. Please choose a different one.',
      score: 1,
    };
  }

  // Strength score — purely for UI feedback (length as primary lever).
  let score: 0 | 1 | 2 | 3 | 4 = 1;
  if (password.length >= 16) score = 3;
  if (password.length >= 24) score = 4;
  // Bonus for mixing classes — encouraged, not required.
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const classCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (classCount >= 3 && password.length >= 16) score = Math.max(score, 3) as 0 | 1 | 2 | 3 | 4;
  if (classCount === 4 && password.length >= 20) score = 4;

  return { ok: true, score };
}

/** Human-readable strength label for the UI meter. */
export function strengthLabel(score?: number): { label: string; color: string } {
  switch (score) {
    case 4:
      return { label: 'Strong', color: '#10b981' };
    case 3:
      return { label: 'Good', color: '#22c55e' };
    case 2:
      return { label: 'Fair', color: '#f59e0b' };
    case 1:
      return { label: 'Weak', color: '#ef4444' };
    default:
      return { label: 'Very weak', color: '#ef4444' };
  }
}
