import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { account } from '../lib/appwrite';
import { AppwriteException, OAuthProvider } from 'appwrite';
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
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
  sendVerificationEmail: (email: string, shopId?: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  createAccountAfterOTP: (data: RegisterData) => Promise<void>;
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

  // Appwrite requires us to create a JWT to pass to our backend
  const syncToken = async () => {
    try {
      const jwtResult = await account.createJWT();
      if (jwtResult && jwtResult.jwt) {
        localStorage.setItem('fera_token', jwtResult.jwt);
        return jwtResult.jwt;
      }
    } catch (err) {
      console.error('Failed to get Appwrite JWT:', err);
    }
    localStorage.removeItem('fera_token');
    return null;
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

  const loadProfile = async (): Promise<User | null> => {
    try {
      // 1. Get the current user from Appwrite
      const appwriteUser = await account.get();
      
      // 2. Sync their JWT so the backend can verify them
      await syncToken();

      // 3. Get or create their profile in our D1 backend
      const { data } = await api.get('/users/me');
      
      let profile: any;
      if (data.needs_init) {
        profile = await createProfile({
          name: appwriteUser.name || 'Shopkeeper',
          email: appwriteUser.email,
          preferredLanguage: localStorage.getItem('fera_language') || 'en',
        });
      } else {
        profile = data.user;
      }

      return {
        ...profile,
        is_verified: appwriteUser.emailVerification,
      };
    } catch (error) {
      // User is not logged into Appwrite
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const profile = await loadProfile();
        setUser(profile);
        persistLocalUser(profile);
      } catch (err) {
        console.error('Failed to load profile from backend:', err);
        setUser(null);
        persistLocalUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const profile = await loadProfile();
      setUser(profile);
      persistLocalUser(profile);
    } catch (err: any) {
      console.error('Appwrite login error:', err);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      account.createOAuth2Session(
          OAuthProvider.Google,
          `${window.location.origin}/dashboard`, // Success URL
          `${window.location.origin}/login` // Failure URL
      );
    } catch (err) {
      console.error('Google OAuth error:', err);
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      // 1. Create account in Appwrite
      // ID.unique() is the default ID pattern, but the JS SDK exposes 'unique()' if imported. 
      // It's safer to let Appwrite auto-generate if we pass 'unique()'.
      await account.create('unique()', data.email, data.password, data.name);
      
      // 2. Immediately log them in
      await account.createEmailPasswordSession(data.email, data.password);
      
      // 3. Send verification email (Appwrite specific)
      try {
        await account.createVerification(`${window.location.origin}/verify-email`);
      } catch (verifyErr) {
        console.warn('Could not send verification email immediately:', verifyErr);
      }
      
      // 4. Load their new profile
      const profile = await loadProfile();
      setUser(profile);
      persistLocalUser(profile);
    } catch (err) {
      console.error('Appwrite register error:', err);
      throw err;
    }
  };

  const sendOTP = async (email: string) => {
    // Appwrite doesn't use generic OTP by default for basic accounts without phone auth
    // We fallback to creating an email verification link
    await sendVerificationEmail(email);
  };

  const verifyOTP = async (userId: string, secret: string): Promise<boolean> => {
    // Appwrite uses updateVerification(userId, secret) for email verification URLs.
    // The query params from the URL are passed here.
    try {
      await account.updateVerification(userId, secret);
      // Reload profile to update is_verified flag
      const profile = await loadProfile();
      setUser(profile);
      persistLocalUser(profile);
      return true;
    } catch (err) {
      console.error('Verification code error:', err);
      return false;
    }
  };

  const createAccountAfterOTP = async (data: RegisterData) => {
    // Deprecated for Appwrite standard flow, but kept for interface compatibility
    await register(data);
  };

  const sendVerificationEmail = async (email: string, shopId?: string) => {
    try {
      await account.createVerification(`${window.location.origin}/verify-email`);
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (err) {
      console.warn('Appwrite logout failed (might already be logged out):', err);
    }
    setUser(null);
    persistLocalUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    persistLocalUser(updated);

    // Sync to D1
    const payload: Record<string, any> = {};
    for (const key of PROFILE_KEYS) {
      if (key in updates) payload[key] = (updates as any)[key];
    }
    if (Object.keys(payload).length > 0) {
      api.put('/users/me', payload).catch((err) => console.error('Failed to sync profile to D1:', err));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      loginWithGoogle,
      register,
      sendOTP,
      sendVerificationEmail,
      verifyOTP,
      createAccountAfterOTP,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
