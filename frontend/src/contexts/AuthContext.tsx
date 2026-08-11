import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useSignIn, useSignUp } from '@clerk/react';
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
  const { isLoaded: isClerkLoaded, isSignedIn, userId, signOut, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync token from Clerk to localStorage
  const syncToken = async () => {
    try {
      const token = await getToken();
      if (token) {
        localStorage.setItem('fera_token', token);
        return token;
      }
    } catch (err) {
      console.error('Failed to get Clerk token:', err);
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

  const loadProfile = async (): Promise<User> => {
    await syncToken();
    const { data } = await api.get('/users/me');
    
    let profile: any;
    if (data.needs_init) {
      profile = await createProfile({
        name: clerkUser?.fullName || clerkUser?.firstName || 'Shopkeeper',
        email: clerkUser?.primaryEmailAddress?.emailAddress || '',
        preferredLanguage: localStorage.getItem('fera_language') || 'en',
      });
    } else {
      profile = data.user;
    }

    return {
      ...profile,
      is_verified: clerkUser?.primaryEmailAddress?.verification.status === 'verified',
    };
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!isClerkLoaded) return;

      if (isSignedIn && clerkUser) {
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
      } else {
        setUser(null);
        persistLocalUser(null);
        setIsLoading(false);
      }
    };

    initAuth();
  }, [isClerkLoaded, isSignedIn, clerkUser]);

  const login = async (email: string, password: string) => {
    if (!isSignInLoaded) throw new Error('SignIn SDK not loaded');
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        // Active session is automatically set, useEffect will sync profile.
        await syncToken();
      } else {
        throw new Error(`Login requires verification step: ${result.status}`);
      }
    } catch (err: any) {
      console.error('Clerk login error:', err);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    if (!isSignInLoaded) throw new Error('SignIn SDK not loaded');
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err) {
      console.error('Google OAuth error:', err);
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    if (!isSignUpLoaded) throw new Error('SignUp SDK not loaded');
    try {
      // Create user signup in Clerk
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName: data.name,
      });

      if (result.status === 'complete') {
        // Automatically sync session and profile
        await syncToken();
      } else if (result.status === 'missing_requirements') {
        // By default, Clerk might require email verification (OTP code).
        // Initiate verification:
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
    } catch (err) {
      console.error('Clerk register error:', err);
      throw err;
    }
  };

  const sendOTP = async (email: string) => {
    // If we are in the registration flow, we can trigger verification code
    if (signUp) {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    if (!signUp) return false;
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: otp,
      });
      return result.status === 'complete';
    } catch (err) {
      console.error('Verification code error:', err);
      return false;
    }
  };

  const createAccountAfterOTP = async (data: RegisterData) => {
    // Already created in sign-up flow, just need to sync profile
    const profile = await createProfile({
      email: data.email,
      name: data.name,
      phone: data.phone,
      businessName: data.businessName,
      preferredLanguage: data.preferredLanguage,
    });
    setUser(profile);
    persistLocalUser(profile);
  };

  const sendVerificationEmail = async (email: string, shopId?: string) => {
    // Handled by Clerk natively during registration or via Clerk user dashboard
    await clerkUser?.primaryEmailAddress?.prepareVerification({ strategy: 'email_code' });
  };

  const logout = async () => {
    await signOut();
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
      isLoading: !isClerkLoaded || isLoading,
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
