import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth as useWorkOSAuth } from '@workos-inc/authkit-react';
import api from '../services/api';
import { setUnauthorizedHandler, setWorkOSTokenGetter } from '../services/authBridge';

interface User {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium' | 'trial' | 'beta' | 'basic' | 'standard' | 'pro';
  preferred_language: string;
  subdomain?: string;
  custom_domain?: string;
  plan_expires_at?: string;
  ai_credits_balance?: number;
  ai_credits_monthly_limit?: number;
  ai_credits_used_month?: number;
  ai_credits_reset_at?: string;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  profileError: string | null;
  login: () => void;
  loginWithGoogle: () => void;
  register: () => void;
  sendOTP: (email: string) => Promise<void>;
  sendVerificationEmail: (email: string, shopId?: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  createAccountAfterOTP: (data: any) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_KEYS: (keyof User)[] = [
  'email', 'name', 'phone', 'business_name', 'plan', 'preferred_language',
  'subdomain', 'custom_domain', 'plan_expires_at', 'ai_credits_balance',
  'ai_credits_monthly_limit', 'ai_credits_used_month', 'ai_credits_reset_at',
  'storage_used_bytes', 'storage_limit_bytes',
];

// Global token retriever for Axios
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const {
    isLoading: isWorkOSLoading,
    user: workosUser,
    signIn,
    signUp,
    signOut,
    getAccessToken
  } = useWorkOSAuth();

  useEffect(() => {
    setWorkOSTokenGetter(async () => {
      try {
        const token = await getAccessToken();
        return token;
      } catch {
        return null;
      }
    });
  }, [getAccessToken]);

  useEffect(() => {
    setUnauthorizedHandler(({ status, url, error }) => {
      const detail = error instanceof Error ? error.message : 'Unauthorized';
      const label = url === '/users/me' ? 'Profile request' : 'Authenticated API request';
      setProfileError(`${label} failed (${status} ${url}): ${detail}`);
      setProfile(null);
      setIsProfileLoading(false);
      if (import.meta.env.DEV) {
        console.error(`Authenticated API returned ${status} for ${url}`, error);
      }
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (isWorkOSLoading) return;

      if (!workosUser) {
        if (mounted) {
          setProfile(null);
          setProfileError(null);
          setIsProfileLoading(false);
        }
        return;
      }

      try {
        // The Cloudflare Worker verifies the WorkOS access token injected by
        // the shared API client. It owns user provisioning in D1.
        const { data } = await api.get('/users/me');
        let currentProfile = data.user;

        if (data.needs_init) {
          const { data: updateData } = await api.put('/users/me', {
            name: workosUser.firstName && workosUser.lastName
              ? `${workosUser.firstName} ${workosUser.lastName}`
              : (workosUser.email || 'Shopkeeper'),
            email: workosUser.email,
            preferred_language: localStorage.getItem('fera_language') || 'en',
          });
          currentProfile = updateData.user;
        }

        if (mounted) {
          setProfile({
            ...currentProfile,
            is_verified: workosUser.emailVerified,
          });
          setProfileError(null);
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        const message = err instanceof Error ? err.message : 'Unknown profile error';
        console.error(`Failed to load profile from backend (${status ?? 'network'}):`, err);
        if (mounted) {
          setProfileError(`Profile bootstrap failed (${status ?? 'network'}): ${message}`);
          setProfile({
            id: workosUser.id || workosUser.email,
            email: workosUser.email,
            name: workosUser.firstName && workosUser.lastName
              ? `${workosUser.firstName} ${workosUser.lastName}`
              : (workosUser.email || 'Shopkeeper'),
            is_verified: workosUser.emailVerified,
            plan: 'free',
            preferred_language: localStorage.getItem('fera_language') || 'en',
            ai_credits_balance: 20,
            ai_credits_monthly_limit: 20,
            ai_credits_used_month: 0,
            storage_used_bytes: 0,
            storage_limit_bytes: 52428800,
          });
        }
      } finally {
        if (mounted) setIsProfileLoading(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [workosUser, isWorkOSLoading]);

  const updateUser = (updates: Partial<User>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);

    // Sync to D1
    const payload: Record<string, any> = {};
    for (const key of PROFILE_KEYS) {
      if (key in updates) payload[key] = (updates as any)[key];
    }
    if (Object.keys(payload).length > 0) {
      api.put('/users/me', payload).catch((err) => console.error('Failed to sync profile to D1:', err));
    }
  };

  const getWorkOSDirectAuthUrl = (screenHint?: 'sign-in' | 'sign-up') => {
    const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID || 'client_01KZRE47KGSPK84HEP9WNBG9YY';
    const redirectUri = window.location.origin + '/callback';
    const hintParam = screenHint ? `&screen_hint=${screenHint}` : '';
    return `https://api.workos.com/user_management/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code${hintParam}`;
  };

  const contextValue: AuthContextType = {
    user: profile,
    isLoading: isWorkOSLoading || isProfileLoading,
    profileError,
    login: async () => {
      try {
        if (typeof signIn === 'function') {
          await signIn();
          setTimeout(() => {
            if (window.location.pathname.includes('/login')) {
              window.location.assign(getWorkOSDirectAuthUrl('sign-in'));
            }
          }, 600);
        } else {
          window.location.assign(getWorkOSDirectAuthUrl('sign-in'));
        }
      } catch (err) {
        console.error('WorkOS signIn failed, falling back to direct URL:', err);
        window.location.assign(getWorkOSDirectAuthUrl('sign-in'));
      }
    },
    loginWithGoogle: async () => {
      try {
        if (typeof signIn === 'function') {
          await signIn();
        } else {
          window.location.assign(getWorkOSDirectAuthUrl('sign-in'));
        }
      } catch (err) {
        console.error('WorkOS Google signIn failed:', err);
        window.location.assign(getWorkOSDirectAuthUrl('sign-in'));
      }
    },
    register: async () => {
      try {
        if (typeof signUp === 'function') {
          await signUp();
          setTimeout(() => {
            if (window.location.pathname.includes('/register')) {
              window.location.assign(getWorkOSDirectAuthUrl('sign-up'));
            }
          }, 600);
        } else {
          window.location.assign(getWorkOSDirectAuthUrl('sign-up'));
        }
      } catch (err) {
        console.error('WorkOS signUp failed, falling back to direct URL:', err);
        window.location.assign(getWorkOSDirectAuthUrl('sign-up'));
      }
    },
    logout: () => signOut(),
    sendOTP: async () => {}, // Handled by WorkOS
    sendVerificationEmail: async () => {}, // Handled by WorkOS
    verifyOTP: async () => true, // Handled by WorkOS
    createAccountAfterOTP: async () => {}, // Handled by WorkOS
    updateUser,
    getAccessToken: async () => getAccessToken()
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
