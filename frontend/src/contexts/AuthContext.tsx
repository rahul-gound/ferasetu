import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { useAuth as useWorkOSAuth } from '@workos-inc/authkit-react';
import api from '../services/api';
import { setUnauthorizedHandler, setWorkOSTokenGetter, clearCachedToken } from '../services/authBridge';

// ─── AUTH DEV LOGGING ────────────────────────────────────────────────────────
// All AUTH_* logs are DEV-only. Sensitive values (tokens, codes) are never logged.
const IS_DEV = import.meta.env.DEV;
function authLog(event: string, detail?: string) {
  if (!IS_DEV) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[AUTH ${ts}] ${event}${detail ? ` — ${detail}` : ''}`);
}

export interface Organization {
  id: string;
  name: string;
  workos_organization_id?: string;
  market: 'IN' | 'US' | 'EU' | 'OTHER';
  plan: 'free' | 'premium' | 'trial' | 'beta' | 'basic' | 'standard' | 'business' | 'pro' | 'starter';
  address?: string | null;
  city?: string | null;
  state?: string | null;
  store_slug: string;
  store_url?: string;
  role: 'owner' | 'admin' | 'staff';
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  phone?: string;
  business_name?: string;
  profile_picture?: string;
  plan: 'free' | 'premium' | 'trial' | 'beta' | 'basic' | 'standard' | 'business' | 'pro' | 'starter';
  market?: 'IN' | 'US' | 'EU' | 'OTHER';
  trial_started_at?: string;
  trial_ends_at?: string;
  cancel_at_period_end?: number | boolean;
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
  organization?: Organization | null;
  has_organization?: boolean;
}

// Auth has exactly 3 externally-visible states + error for internal use.
// NEVER treat 'loading' as 'unauthenticated'.
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  hasOrganization: boolean;
  authStatus: AuthStatus;
  isLoading: boolean;
  profileError: string | null;
  login: (options?: { loginHint?: string }) => void;
  loginWithGoogle: (options?: { loginHint?: string }) => void;
  register: (options?: { loginHint?: string }) => void;
  sendOTP: (email: string) => Promise<void>;
  sendVerificationEmail: (email: string, shopId?: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  createAccountAfterOTP: (data: any) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setOrganizationContext: (org: Organization) => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_KEYS: (keyof User)[] = [
  'email', 'name', 'phone', 'business_name', 'profile_picture', 'plan', 'market', 'preferred_language',
  'subdomain', 'custom_domain', 'trial_started_at', 'trial_ends_at', 'cancel_at_period_end',
  'plan_expires_at', 'ai_credits_balance',
  'ai_credits_monthly_limit', 'ai_credits_used_month', 'ai_credits_reset_at',
  'storage_used_bytes', 'storage_limit_bytes',
];

export function AuthProvider({ children }: { children: ReactNode }) {
  authLog('AUTH_INIT');

  // Pre-populate the profile from localStorage for instant UI hydration,
  // but ALWAYS start isProfileLoading=true. This ensures authStatus is
  // 'loading' until WorkOS finishes its initialization cycle — regardless
  // of whether we have a cached profile. Never skip the loading phase.
  const [profile, setProfile] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('fera_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // KEY FIX: Always start as true. isProfileLoading being false when WorkOS
  // is still initializing (isWorkOSLoading=true) caused authStatus to flash
  // 'unauthenticated' before the session was verified, triggering the redirect
  // loop. We resolve this by always waiting for WorkOS to finish first.
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Track whether we've already done the initial profile load to prevent
  // re-clearing on subsequent renders where workosUser may briefly be null.
  const initialLoadDoneRef = useRef(false);

  const {
    isLoading: isWorkOSLoading,
    user: workosUser,
    signIn,
    signUp,
    signOut,
    getAccessToken
  } = useWorkOSAuth();

  // Wire the WorkOS token getter into the Axios interceptor.
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

  // Handle unauthorized responses from the API.
  // Only wipe session on explicit auth-endpoint failures, not transient API errors.
  useEffect(() => {
    setUnauthorizedHandler(({ status, url }) => {
      authLog('API_401', `${status} on ${url}`);
      // Never wipe session on arbitrary feature requests (/products, /orders, etc.)
      // Only act on the authoritative identity endpoint or explicit auth errors.
      const isAuthoritativeEndpoint = url.includes('/users/me') || url.includes('/auth/logout');
      if (!isAuthoritativeEndpoint) return;
      // Even for /users/me 401, don't immediately wipe — WorkOS may still refresh.
      // We just log it. The WorkOS SDK will fire onRefreshFailure if the session is truly dead.
      authLog('API_401', `Authoritative endpoint 401 — session may be expiring`);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  // Core profile-loading effect. Runs whenever WorkOS auth state settles.
  // CRITICAL: guard on isWorkOSLoading — never act while WorkOS is still initializing.
  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      // Wait for WorkOS to finish its initialization cycle.
      // isWorkOSLoading=true means WorkOS is checking for a session cookie/refresh token.
      // Never treat this transient state as 'unauthenticated'.
      if (isWorkOSLoading) {
        authLog('AUTH_LOADING', 'WorkOS SDK still initializing — holding');
        return;
      }

      // WorkOS has settled. Now check the result.
      if (!workosUser) {
        authLog('AUTH_SESSION_MISSING');
        if (mounted) {
          // Only clear the profile if this is NOT the very first render with
          // a localStorage-cached profile AND WorkOS has definitively said no session.
          // On subsequent renders (e.g., after logout), always clear.
          setProfile(null);
          localStorage.removeItem('fera_user');
          setProfileError(null);
          setIsProfileLoading(false);
          initialLoadDoneRef.current = true;
        }
        return;
      }

      authLog('AUTH_SESSION_FOUND', workosUser.email);

      try {
        let token: string | null = null;
        try {
          token = await getAccessToken();
        } catch (e) {
          console.warn('[AuthContext] Could not retrieve WorkOS access token:', e);
        }

        const config: any = {};
        if (token) {
          config.headers = { Authorization: `Bearer ${token}` };
        }

        // The Cloudflare Worker verifies the WorkOS access token and owns
        // user provisioning in D1. This is the authoritative profile source.
        const { data } = await api.get('/users/me', config);
        let currentProfile = data.user;

        // Check for pending registration data from the custom sign-up form.
        let pendingRegistration: Record<string, any> | null = null;
        try {
          const rawPending = sessionStorage.getItem('fera_pending_registration');
          if (rawPending) {
            pendingRegistration = JSON.parse(rawPending);
            sessionStorage.removeItem('fera_pending_registration');
          }
        } catch (e) {
          console.error('[AuthContext] Failed to parse pending registration:', e);
        }

        const storedReferralCode = localStorage.getItem('fera_referral_code');
        if (data.needs_init || pendingRegistration || storedReferralCode) {
          const payload: Record<string, any> = {
            name: pendingRegistration?.name || (workosUser.firstName && workosUser.lastName
              ? `${workosUser.firstName} ${workosUser.lastName}`
              : (workosUser.email || 'Shopkeeper')),
            email: workosUser.email,
            preferred_language: pendingRegistration?.preferred_language || localStorage.getItem('fera_language') || 'en',
          };
          if (pendingRegistration?.business_name) payload.business_name = pendingRegistration.business_name;
          if (pendingRegistration?.subdomain) payload.subdomain = pendingRegistration.subdomain;
          if (pendingRegistration?.phone) payload.phone = pendingRegistration.phone;
          if (pendingRegistration?.profile_picture) payload.profile_picture = pendingRegistration.profile_picture;
          if (storedReferralCode) {
            payload.referral_code = storedReferralCode;
          }

          try {
            const { data: updateData } = await api.put('/users/me', payload);
            if (storedReferralCode) {
              localStorage.removeItem('fera_referral_code');
            }
            if (updateData?.user) {
              currentProfile = updateData.user;
            }
          } catch (putErr) {
            console.warn('[AuthContext] Failed to save profile/referral:', putErr);
          }
        }

        const oauthPic = (workosUser as any)?.profilePictureUrl || null;
        if (mounted) {
          authLog('AUTH_SESSION_FOUND', `Profile loaded for ${workosUser.email}`);
          setProfile({
            ...currentProfile,
            profile_picture: currentProfile?.profile_picture || oauthPic || undefined,
            organization: data.organization || null,
            has_organization: data.has_organization ?? (Boolean(data.organization) || false),
            is_verified: workosUser.emailVerified ?? true,
          });
          if (data.organization) {
            setOrganization(data.organization);
          }
          setProfileError(null);
          initialLoadDoneRef.current = true;
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        const message = err instanceof Error ? err.message : 'Unknown profile error';
        authLog('AUTH_CALLBACK_FAILURE', `Profile bootstrap failed (${status ?? 'network'})`);
        console.error(`[AuthContext] Failed to load profile from backend (${status ?? 'network'}):`, err);

        if (mounted) {
          setProfileError(`Profile bootstrap failed (${status ?? 'network'}): ${message}`);
          // If the backend returns 401, credentials may be momentarily stale or expired.
          // Attempt a one-time force-refresh retry before wiping the session.
          if (status === 401) {
            try {
              clearCachedToken();
              const freshToken = await getAccessToken({ forceRefresh: true });
              if (freshToken) {
                const { data: retryData } = await api.get('/users/me', {
                  headers: { Authorization: `Bearer ${freshToken}` }
                });
                if (mounted && retryData?.user) {
                  const oauthPic = (workosUser as any)?.profilePictureUrl || null;
                  authLog('AUTH_SESSION_RECOVERED', `Profile restored on retry for ${workosUser.email}`);
                  setProfile({
                    ...retryData.user,
                    profile_picture: retryData.user?.profile_picture || oauthPic || undefined,
                    organization: retryData.organization || null,
                    has_organization: retryData.has_organization ?? (Boolean(retryData.organization) || false),
                    is_verified: workosUser.emailVerified ?? true,
                  });
                  if (retryData.organization) {
                    setOrganization(retryData.organization);
                  }
                  setProfileError(null);
                  initialLoadDoneRef.current = true;
                  return;
                }
              }
            } catch (retryErr) {
              console.warn('[AuthContext] 401 recovery retry failed:', retryErr);
            }

            authLog('AUTH_SESSION_EXPIRED', 'Backend 401 on /users/me — session expired or invalid signature');
            setProfile(null);
            localStorage.removeItem('fera_user');
            initialLoadDoneRef.current = true;
            return;
          }

          // Fall back to a minimal WorkOS-derived profile only on transient network or 5xx issues
          const oauthPic = (workosUser as any)?.profilePictureUrl || null;
          setProfile({
            id: workosUser.id || workosUser.email,
            email: workosUser.email,
            name: workosUser.firstName && workosUser.lastName
              ? `${workosUser.firstName} ${workosUser.lastName}`
              : (workosUser.email || 'Shopkeeper'),
            profile_picture: oauthPic || undefined,
            is_verified: workosUser.emailVerified ?? true,
            plan: 'free',
            market: 'IN',
            preferred_language: localStorage.getItem('fera_language') || 'en',
            ai_credits_balance: 20,
            ai_credits_monthly_limit: 20,
            ai_credits_used_month: 0,
            storage_used_bytes: 0,
            storage_limit_bytes: 52428800,
            has_organization: false,
            organization: null,
          });
          initialLoadDoneRef.current = true;
        }
      } finally {
        if (mounted) setIsProfileLoading(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [workosUser, isWorkOSLoading]);

  // Proactively revalidate / refresh token when the tab regains visibility/focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && workosUser) {
        try {
          await getAccessToken();
        } catch (e) {
          console.debug('[AuthContext] Visibility token refresh check:', e);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [workosUser, getAccessToken]);

  // Persist profile to localStorage whenever it changes.
  useEffect(() => {
    if (profile) {
      try {
        localStorage.setItem('fera_user', JSON.stringify(profile));
      } catch (e) {
        console.error('[AuthContext] Failed to persist profile:', e);
      }
    }
  }, [profile]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setProfile(current => {
      if (!current) return null;
      const updated = { ...current, ...updates };

      // Sync to D1
      const payload: Record<string, any> = {};
      for (const key of PROFILE_KEYS) {
        if (key in updates) payload[key] = (updates as any)[key];
      }
      if (Object.keys(payload).length > 0) {
        api.put('/users/me', payload).catch((err) => console.error('[AuthContext] Failed to sync profile to D1:', err));
      }
      return updated;
    });
  }, []);

  const getWorkOSDirectAuthUrl = useCallback((screenHint?: 'sign-in' | 'sign-up', loginHint?: string) => {
    const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID || 'client_01KZRE47KGSPK84HEP9WNBG9YY';
    const redirectUri = window.location.origin + '/callback';
    const hintParam = screenHint ? `&screen_hint=${screenHint}` : '';
    const loginHintParam = loginHint ? `&login_hint=${encodeURIComponent(loginHint)}` : '';
    return `https://api.workos.com/user_management/authorize?provider=authkit&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code${hintParam}${loginHintParam}`;
  }, []);

  const login = useCallback(async (opts?: { loginHint?: string }) => {
    authLog('AUTH_INIT', 'login() called by user action');
    try {
      if (typeof signIn === 'function') {
        await signIn(opts?.loginHint ? { loginHint: opts.loginHint } : undefined);
      } else {
        window.location.assign(getWorkOSDirectAuthUrl('sign-in', opts?.loginHint));
      }
    } catch (err) {
      console.error('[AuthContext] WorkOS signIn failed, falling back to direct URL:', err);
      window.location.assign(getWorkOSDirectAuthUrl('sign-in', opts?.loginHint));
    }
  }, [signIn, getWorkOSDirectAuthUrl]);

  const loginWithGoogle = useCallback(async (opts?: { loginHint?: string }) => {
    authLog('AUTH_INIT', 'loginWithGoogle() called by user action');
    try {
      if (typeof signIn === 'function') {
        await signIn(opts?.loginHint ? { loginHint: opts.loginHint } : undefined);
      } else {
        window.location.assign(getWorkOSDirectAuthUrl('sign-in', opts?.loginHint));
      }
    } catch (err) {
      console.error('[AuthContext] WorkOS Google signIn failed:', err);
      window.location.assign(getWorkOSDirectAuthUrl('sign-in', opts?.loginHint));
    }
  }, [signIn, getWorkOSDirectAuthUrl]);

  const register = useCallback(async (opts?: { loginHint?: string }) => {
    authLog('AUTH_INIT', 'register() called by user action');
    try {
      if (typeof signUp === 'function') {
        await signUp(opts?.loginHint ? { loginHint: opts.loginHint } : undefined);
        return;
      }
    } catch (err) {
      console.error('[AuthContext] WorkOS signUp failed, falling back to direct URL:', err);
    }
    window.location.assign('https://decent-grass-08.authkit.app/sign-up');
  }, [signUp]);

  const logout = useCallback(() => {
    authLog('AUTH_LOGOUT');
    localStorage.removeItem('fera_user');
    setProfile(null);
    initialLoadDoneRef.current = false;
    signOut();
  }, [signOut]);

  const [organization, setOrganization] = useState<Organization | null>(null);

  const setOrganizationContext = useCallback((org: Organization) => {
    setOrganization(org);
    setProfile(curr => curr ? { ...curr, organization: org, has_organization: true } : null);
  }, []);

  const sendOTP = useCallback(async () => {}, []);
  const sendVerificationEmail = useCallback(async () => {}, []);
  const verifyOTP = useCallback(async () => true, []);
  const createAccountAfterOTP = useCallback(async () => {}, []);
  const getToken = useCallback(async () => getAccessToken(), [getAccessToken]);

  const hasOrganization = Boolean(organization || profile?.has_organization || profile?.organization);

  // ─── AUTH STATUS ──────────────────────────────────────────────────────────
  // Rule: isWorkOSLoading ALWAYS maps to 'loading', no exceptions.
  // Only when WorkOS has settled AND profile loading is done do we evaluate
  // authenticated vs unauthenticated.
  const authStatus: AuthStatus = useMemo(() => {
    if (isWorkOSLoading || isProfileLoading) return 'loading';
    if (profile && workosUser) return 'authenticated';
    if (profileError && profile) return 'authenticated'; // fallback profile, allow through
    if (profileError) return 'error';
    return 'unauthenticated';
  }, [isWorkOSLoading, isProfileLoading, profile, workosUser, profileError]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user: profile,
    organization: organization || profile?.organization || null,
    hasOrganization,
    authStatus,
    isLoading: isWorkOSLoading || isProfileLoading,
    profileError,
    login,
    loginWithGoogle,
    register,
    sendOTP,
    sendVerificationEmail,
    verifyOTP,
    createAccountAfterOTP,
    logout,
    updateUser,
    setOrganizationContext,
    getAccessToken: getToken
  }), [
    profile,
    organization,
    hasOrganization,
    authStatus,
    isWorkOSLoading,
    isProfileLoading,
    profileError,
    login,
    loginWithGoogle,
    register,
    sendOTP,
    sendVerificationEmail,
    verifyOTP,
    createAccountAfterOTP,
    logout,
    updateUser,
    setOrganizationContext,
    getToken
  ]);

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
