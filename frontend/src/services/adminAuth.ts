import axios from 'axios';
import { getWorkOSToken, clearCachedToken } from './authBridge';

const rawApi = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApi.replace(/\/+$/, '');
const VERIFY_URL = API_BASE.endsWith('/api') ? `${API_BASE}/admin/verify` : `${API_BASE}/api/admin/verify`;

export interface AdminVerificationResult {
  status: 'authorized' | 'unauthorized' | 'forbidden' | 'error';
  user?: {
    id: string;
    email: string;
    role: string;
    method?: string;
  };
  errorMessage?: string;
}

/**
 * Retrieves the most authoritative authentication token for platform administration.
 * Prefers the live WorkOS session token, falling back to cached admin_token.
 */
export async function getAdminToken(): Promise<string | null> {
  try {
    const workosToken = await getWorkOSToken();
    if (workosToken) {
      // Keep localStorage in sync so legacy components and requests have immediate access
      try {
        localStorage.setItem('admin_token', workosToken);
      } catch {}
      return workosToken;
    }
  } catch (err) {
    console.warn('[adminAuth] Could not fetch fresh WorkOS token:', err);
  }

  try {
    return localStorage.getItem('admin_token');
  } catch {
    return null;
  }
}

/**
 * Cryptographically verifies the platform administrator session with the Cloudflare Worker.
 * Returns:
 * - 'authorized' (HTTP 200): Verified WorkOS session and allowlisted platform administrator.
 * - 'forbidden' (HTTP 403): Valid WorkOS user, but NOT an authorized administrator.
 * - 'unauthorized' (HTTP 401): No valid session or expired token.
 */
export async function verifyAdminStatus(customToken?: string | null): Promise<AdminVerificationResult> {
  const token = customToken !== undefined ? customToken : await getAdminToken();

  if (!token) {
    return { status: 'unauthorized', errorMessage: 'No authentication token available' };
  }

  try {
    const res = await axios.get(VERIFY_URL, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      // Do not treat 401 or 403 as network rejections
      validateStatus: (status) => status < 500
    });

    if (res.status === 200 && res.data?.authorized) {
      // Sync verified token to localStorage for child admin pages
      try {
        localStorage.setItem('admin_token', token);
      } catch {}
      return {
        status: 'authorized',
        user: res.data.user
      };
    }

    if (res.status === 403) {
      return {
        status: 'forbidden',
        errorMessage: res.data?.error || 'Your account does not have platform administrator privileges.'
      };
    }

    if (res.status === 401) {
      clearAdminSession();
      return {
        status: 'unauthorized',
        errorMessage: res.data?.error || 'Session expired or invalid.'
      };
    }

    return {
      status: 'error',
      errorMessage: `Unexpected status code: ${res.status}`
    };
  } catch (err: any) {
    console.error('[adminAuth] Verification request failed:', err);
    return {
      status: 'error',
      errorMessage: err.response?.data?.error || err.message || 'Failed to verify administrator status'
    };
  }
}

/**
 * Clears administrator tokens and cached credentials.
 */
export function clearAdminSession() {
  try {
    localStorage.removeItem('admin_token');
  } catch {}
  clearCachedToken();
}
