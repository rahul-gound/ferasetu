import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth as useWorkOSAuth } from '@workos-inc/authkit-react';
import axios from 'axios';
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
        // Get the WorkOS access token and exchange it for a FeraSetu session.
        // The backend verifies the WorkOS JWT, provisions the user if new,
        // and sets an HttpOnly access_token cookie for all subsequent API calls.
        const workosAccessToken = await getAccessToken();
        if (!workosAccessToken) throw new Error('No WorkOS access token available');

        // Use axios directly so we can set the Authorization header and
        // receive the HttpOnly session cookie that the backend sets.
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const { data } = await axios.post(
          `${apiBase}/users/workos-session`,
          {},
          {
            headers: { Authorization: `Bearer ${workosAccessToken}` },
            withCredentials: true,
          }
        );

        if (mounted) {
          setProfile({
            ...data.user,
            is_verified: workosUser.emailVerified ?? Boolean(data.user.is_verified),
          });
        }
      } catch (err) {
        console.error('Failed to establish WorkOS session with backend:', err);
        if (mounted) setProfile(null);
        // Prevent infinite redirect loops if the backend rejects the token
        signOut();
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
