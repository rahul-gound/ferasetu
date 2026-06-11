import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  account,
  databases,
  DATABASE_ID,
  USERS_COLLECTION_ID,
  ID,
  Permission,
  Role,
} from '../lib/appwrite';

interface User {
  id: string;
  email: string;
  name: string;
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
  register: (data: RegisterData) => Promise<void>;
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

// Profile fields stored in the Appwrite `users` collection. Keep this list in
// sync with the attributes created by scripts/setup-appwrite.mjs.
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

// Map an Appwrite profile document onto our User shape.
function docToUser(id: string, doc: Record<string, any>): User {
  return {
    id,
    email: doc.email,
    name: doc.name,
    phone: doc.phone ?? undefined,
    business_name: doc.business_name ?? undefined,
    plan: doc.plan || 'trial',
    preferred_language: doc.preferred_language || 'en',
    subdomain: doc.subdomain ?? undefined,
    custom_domain: doc.custom_domain ?? undefined,
    plan_expires_at: doc.plan_expires_at ?? undefined,
    ai_credits_balance: doc.ai_credits_balance ?? 0,
    ai_credits_monthly_limit: doc.ai_credits_monthly_limit ?? 0,
    ai_credits_used_month: doc.ai_credits_used_month ?? 0,
    ai_credits_reset_at: doc.ai_credits_reset_at ?? undefined,
    storage_used_bytes: doc.storage_used_bytes ?? 0,
    storage_limit_bytes: doc.storage_limit_bytes ?? 0,
  };
}

// Re-shape an Appwrite error so the existing pages (which read
// err.response.data.message / .error) can surface a useful message.
function toHttpishError(err: any): Error {
  const message = err?.message || 'Something went wrong. Please try again.';
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
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the profile doc for a logged-in account; create defaults if missing.
  const loadProfile = async (accountId: string, fallbackEmail: string, fallbackName: string): Promise<User> => {
    try {
      const doc = await databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, accountId);
      return docToUser(accountId, doc as any);
    } catch {
      return createProfile(accountId, { email: fallbackEmail, name: fallbackName });
    }
  };

  const createProfile = async (
    accountId: string,
    data: { email: string; name: string; phone?: string; businessName?: string; preferredLanguage?: string },
  ): Promise<User> => {
    const nowIso = new Date().toISOString();
    const profile = {
      email: data.email,
      name: data.name || 'User',
      phone: data.phone || undefined,
      business_name: data.businessName || undefined,
      plan: 'trial',
      preferred_language: data.preferredLanguage || 'en',
      subdomain: generateSubdomain(data.businessName || data.name || 'my-store'),
      custom_domain: undefined,
      plan_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ai_credits_balance: 20,
      ai_credits_monthly_limit: 20,
      ai_credits_used_month: 0,
      ai_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      storage_used_bytes: 0,
      storage_limit_bytes: 50 * 1024 * 1024,
      created_at: nowIso,
    };
    const doc = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      accountId,
      profile,
      [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))],
    );
    return docToUser(accountId, doc as any);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await account.get();
        const profile = await loadProfile(me.$id, me.email, me.name);
        setUser(profile);
        persistLocalUser(profile);
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
      const me = await account.get();
      const profile = await loadProfile(me.$id, me.email, me.name);
      setUser(profile);
      persistLocalUser(profile);
    } catch (err) {
      throw toHttpishError(err);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const email = data.email.trim();
      const created = await account.create(ID.unique(), email, data.password, data.name);
      await startSession(email, data.password);
      const profile = await createProfile(created.$id, {
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

    // Write changed profile fields back to Appwrite (best-effort).
    const payload: Record<string, any> = {};
    for (const key of PROFILE_KEYS) {
      if (key in updates) payload[key] = (updates as any)[key];
    }
    if (Object.keys(payload).length > 0) {
      databases
        .updateDocument(DATABASE_ID, USERS_COLLECTION_ID, user.id, payload)
        .catch((err) => console.error('Failed to sync profile to Appwrite:', err));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
