import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth as useWorkOSAuth } from '@workos-inc/authkit-react';
import api from '../services/api';

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
export let getWorkOSToken: () => Promise<string | null> = async () => null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const {
    isLoading: isWorkOSLoading,
    user: workosUser,
    signIn,
    signUp,
    signOut,
    getAccessToken
  } = useWorkOSAuth();

  useEffect(() => {
    getWorkOSToken = async () => {
      try {
        const token = await getAccessToken();
        return token;
      } catch {
        return null;
      }
    };
  }, [getAccessToken]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (isWorkOSLoading) return;

      if (!workosUser) {
        if (mounted) {
          setProfile(null);
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
        }
      } catch (err) {
        console.error('Failed to load profile from backend:', err);
        if (mounted) setProfile(null);
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

  const contextValue: AuthContextType = {
    user: profile,
    isLoading: isWorkOSLoading || isProfileLoading,
    login: () => signIn(),
    loginWithGoogle: () => signIn(),
    register: () => signUp(),
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
