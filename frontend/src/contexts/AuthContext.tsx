import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  account,
  ID,
  OAuthProvider,
} from '../lib/appwrite';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium' | 'trial' | 'basic' | 'standard' | 'pro';
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
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName?: string;
  preferredLanguage?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Profile fields stored in D1.
const PROFILE_KEYS: (keyof User)[] = [
  'email', 'name', 'phone', 'business_name', 'plan', 'preferred_language',
  'subdomain', 'custom_domain', 'plan_expires_at', 'ai_credits_balance',
  'ai_credits_monthly_limit', 'ai_credits_used_month', 'ai_credits_reset_at',
  'storage_used_bytes', 'storage_limit_bytes',
];

function generateSubdomain(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'my-store';
}

// Re-shape an Appwrite error so the existing pages (which read
// err.response.data.message / .error) can surface a useful message.
function toHttpishError(err: any): Error {
  const message = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
  const wrapped = new Error(message) as Error & {
    response: { data: { message: string; error: string } };
  };
  wrapped.response = { data: { message, error: message } };
  return wrapped;
}

// Keep the rest of the app (local data layer reads `fera_user`) working.
function persistLocalUser(user: User | null) {
  if (user) {
    localStorage.setItem('fera_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('fera_user');
    localStorage.removeItem('fera_token');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync JWT from Appwrite to localStorage for the `api` service to use.
  const syncToken = async () => {
    try {
      const { jwt } = await account.createJWT();
      localStorage.setItem('fera_token', jwt);
      return jwt;
    } catch (err) {
      localStorage.removeItem('fera_token');
      return null;
    }
  };

  // Fetch the profile from D1 (via Worker); create/init if missing.
  const loadProfile = async (): Promise<User> => {
    await syncToken();
    const me = await account.get();
    const { data } = await api.get('/users/me');
    
    let profile: any;
    if (data.needs_init) {
      profile = await createProfile({
        name: data.user.name,
        email: data.user.email,
      });
    } else {
      profile = data.user;
    }

    return {
      ...profile,
      is_verified: me.emailVerification,
    };
  };

  const sendVerificationEmail = async () => {
    try {
      await account.createVerification(window.location.origin + '/dashboard');
    } catch (err) {
      throw toHttpishError(err);
    }
  };

  const createProfile = async (
    data: { email: string; name: string; phone?: string; businessName?: string; preferredLanguage?: string },
  ): Promise<User> => {
    const payload = {
      name: data.name,
      phone: data.phone,
      business_name: data.businessName,
      preferred_language: data.preferredLanguage || 'en',
      subdomain: generateSubdomain(data.businessName || data.name || 'my-store'),
    };
    const { data: response } = await api.put('/users/me', payload);
    return response.user;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await account.get();
        if (me) {
          const profile = await loadProfile();
          setUser(profile);
          persistLocalUser(profile);
        }
      } catch {
        setUser(null);
        persistLocalUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const startSession = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
    } catch (err: any) {
      // A stale session can block a fresh login; clear it and retry once.
      if (err?.type === 'user_session_already_exists') {
        await account.deleteSession('current').catch(() => {});
        await account.createEmailPasswordSession(email, password);
      } else {
        throw err;
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await startSession(email.trim(), password);
      const profile = await loadProfile();
      setUser(profile);
      persistLocalUser(profile);
    } catch (err) {
      throw toHttpishError(err);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await account.createOAuth2Session(
        OAuthProvider.Google,
        window.location.origin + '/dashboard',
        window.location.origin + '/login'
      );
    } catch (err) {
      throw toHttpishError(err);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const email = data.email.trim();
      try {
        await account.create(ID.unique(), email, data.password, data.name);
      } catch (err: any) {
        // If account already exists, just try to log in instead of failing.
        if (err?.code !== 409) throw err;
      }
      
      await startSession(email, data.password);
      const profile = await createProfile({
        email,
        name: data.name,
        phone: data.phone,
        businessName: data.businessName,
        preferredLanguage: data.preferredLanguage,
      });
      setUser(profile);
      persistLocalUser(profile);
    } catch (err) {
      throw toHttpishError(err);
    }
  };

  const logout = async () => {
    await account.deleteSession('current').catch(() => {});
    setUser(null);
    persistLocalUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    persistLocalUser(updated);

    // Sync to D1 (best-effort).
    const payload: Record<string, any> = {};
    for (const key of PROFILE_KEYS) {
      if (key in updates) payload[key] = (updates as any)[key];
    }
    if (Object.keys(payload).length > 0) {
      api.put('/users/me', payload).catch((err) => console.error('Failed to sync profile to D1:', err));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, register, sendVerificationEmail, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

