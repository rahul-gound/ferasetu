import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import {
  type Market,
  type MarketPricingConfig,
  getMarketConfig,
  getTrialPolicy,
  resolveMarket,
  formatMarketPrice,
  getMarketCookie,
  setMarketCookie,
  isValidMarket,
  normalizeMarket,
  DEFAULT_MARKET,
  MARKET_STORAGE_KEY
} from '../config/pricing';

export interface SubscriptionStatus {
  isIndianFree: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  trialUsed: boolean;
  trialEligible: boolean;
  isTrialExpired: boolean;
  isEndingSoon: boolean;
  isPaidActive: boolean;
  isCancelled: boolean;
  cancelAtPeriodEnd: boolean;
  plan: string;
  status: string;
  planExpiresAt: Date | null;
  trialEndsAt: Date | null;
  trialStartedAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  paymentProvider: string | null;
}

interface MarketContextType {
  market: Market;
  setMarket: (market: Market) => void;
  config: MarketPricingConfig;
  trialPolicy: ReturnType<typeof getTrialPolicy>;
  formatPrice: (amount: number) => string;
  subscription: SubscriptionStatus;
  refreshSubscription: () => Promise<void>;
  isMarketOverridden: boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, authStatus } = useAuth();
  const [serverSub, setServerSub] = useState<any>(null);

  // Check whether user has an explicit saved preference
  const initialSavedPref = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const fromCookie = getMarketCookie();
    if (fromCookie && isValidMarket(fromCookie)) return normalizeMarket(fromCookie);
    try {
      const fromStorage = localStorage.getItem(MARKET_STORAGE_KEY);
      if (fromStorage && isValidMarket(fromStorage)) return normalizeMarket(fromStorage);
    } catch {}
    return null;
  }, []);

  const [isMarketOverridden, setIsMarketOverridden] = useState<boolean>(Boolean(initialSavedPref));

  const [market, setMarketState] = useState<Market>(() => {
    // 1. Explicit user override
    if (initialSavedPref) return initialSavedPref;

    // 2. Authenticated user's account market
    const accMarket = (user as any)?.market;
    if (accMarket && isValidMarket(accMarket)) {
      return normalizeMarket(accMarket);
    }

    // 3. Edge-injected meta tag if present in SSR / Edge HTML
    if (typeof document !== 'undefined') {
      const metaEl = document.querySelector('meta[name="ferasetu-market"]');
      const metaContent = metaEl?.getAttribute('content');
      if (metaContent && isValidMarket(metaContent)) {
        return normalizeMarket(metaContent);
      }
    }

    // 4. Default fallback
    return DEFAULT_MARKET;
  });

  const hasGeoResolved = useRef(false);

  // Background country resolution via /api/geo edge endpoint (Privacy-first: ZERO GPS prompts)
  useEffect(() => {
    // If user already has an explicit saved preference, never overwrite it with IP geolocation
    if (initialSavedPref || isMarketOverridden || hasGeoResolved.current) {
      return;
    }

    let isMounted = true;
    hasGeoResolved.current = true;

    fetch('/api/geo')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted || !data) return;
        // Verify user hasn't toggled preference while request was in-flight
        const currentSaved = getMarketCookie();
        if (currentSaved && isValidMarket(currentSaved)) return;

        const resolved = resolveMarket(data.country || data.region);
        setMarketState(resolved);
      })
      .catch(() => {
        // Safe offline / network fallback: retains existing resolved market
      });

    return () => {
      isMounted = false;
    };
  }, [initialSavedPref, isMarketOverridden]);

  const refreshSubscription = useCallback(async () => {
    if (!user || isLoading || authStatus !== 'authenticated') {
      setServerSub(null);
      return;
    }
    try {
      const res = await api.get('/subscription');
      if (res.data) {
        setServerSub(res.data);
      }
    } catch {
      // Fall back gracefully if network unavailable
    }
  }, [user, isLoading, authStatus]);

  useEffect(() => {
    if (user && !isLoading && authStatus === 'authenticated') {
      refreshSubscription();
    }
  }, [user, isLoading, authStatus, refreshSubscription]);

  // Sync if authenticated user's account has a specified market and user hasn't overridden
  useEffect(() => {
    if ((user as any)?.market && !isMarketOverridden) {
      const accMarket = String((user as any).market).toUpperCase();
      if (isValidMarket(accMarket)) {
        const normalized = normalizeMarket(accMarket);
        setMarketState(normalized);
        setMarketCookie(normalized);
      }
    }
  }, [(user as any)?.market, isMarketOverridden]);

  // Explicit user override action (via MarketSelector UI)
  const setMarket = useCallback((newMarket: Market) => {
    const normalized = normalizeMarket(newMarket);
    setMarketState(normalized);
    setIsMarketOverridden(true);
    setMarketCookie(normalized);
  }, []);

  const config = useMemo(() => getMarketConfig(market), [market]);
  const trialPolicy = useMemo(() => getTrialPolicy(market), [market]);
  const formatPrice = useCallback((amount: number) => formatMarketPrice(amount, market), [market]);

  // Compute authoritative subscription & trial state
  const subscription = useMemo<SubscriptionStatus>(() => {
    const userMarket: Market = ((user as any)?.market?.toUpperCase() as Market) || market;
    const plan = serverSub?.plan || user?.plan || 'free';
    const status = serverSub?.status || (plan === 'trial' ? 'trial' : plan !== 'free' && plan !== 'beta' ? 'active' : 'free');
    const isPaid = status === 'active' || ['starter', 'business', 'pro', 'standard', 'growth', 'premium', 'scale'].includes(plan);
    const isCancelled = Boolean(serverSub ? serverSub.cancelAtPeriodEnd : (user as any)?.cancel_at_period_end);

    const periodEndRaw = serverSub?.currentPeriodEnd || serverSub?.trialEndsAt || user?.plan_expires_at || user?.trial_ends_at;
    const planExpiresAt = periodEndRaw ? new Date(periodEndRaw) : null;
    const currentPeriodStart = serverSub?.currentPeriodStart ? new Date(serverSub.currentPeriodStart) : null;
    const currentPeriodEnd = serverSub?.currentPeriodEnd ? new Date(serverSub.currentPeriodEnd) : planExpiresAt;

    let trialEndsAt: Date | null = null;
    let trialStartedAt: Date | null = null;

    if (serverSub?.trialEndsAt) {
      trialEndsAt = new Date(serverSub.trialEndsAt);
      if (serverSub.trialStartedAt) trialStartedAt = new Date(serverSub.trialStartedAt);
    } else if (user?.trial_ends_at) {
      trialEndsAt = new Date(user.trial_ends_at);
      if (user?.trial_started_at) trialStartedAt = new Date(user.trial_started_at);
    } else if (user?.plan_expires_at && (user.plan === 'trial' || user.plan === 'beta')) {
      trialEndsAt = new Date(user.plan_expires_at);
    }

    const trialUsed = Boolean(serverSub ? serverSub.trialUsed : (user as any)?.trial_used || trialEndsAt);
    const trialEligible = Boolean(serverSub ? serverSub.trialEligible : (!trialUsed && userMarket !== 'IN'));

    const now = new Date();
    const isTrialExpired = status === 'expired' || (!isPaid && !!trialEndsAt && trialEndsAt.getTime() <= now.getTime());
    const isTrialing = (status === 'trial' || plan === 'trial') && !isPaid && !!trialEndsAt && !isTrialExpired;
    const trialDaysRemaining = trialEndsAt && isTrialing
      ? Math.max(1, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const isEndingSoon = isTrialing && trialDaysRemaining <= 3;

    if (userMarket === 'IN') {
      return {
        isIndianFree: !isPaid,
        isTrialing: false,
        trialDaysRemaining: 0,
        trialUsed,
        trialEligible: false,
        isTrialExpired: false,
        isEndingSoon: false,
        isPaidActive: isPaid,
        isCancelled,
        cancelAtPeriodEnd: isCancelled,
        plan,
        status,
        planExpiresAt,
        trialEndsAt: null,
        trialStartedAt: null,
        currentPeriodStart,
        currentPeriodEnd,
        paymentProvider: serverSub?.paymentProvider || null,
      };
    }

    return {
      isIndianFree: false,
      isTrialing,
      trialDaysRemaining,
      trialUsed,
      trialEligible,
      isTrialExpired,
      isEndingSoon,
      isPaidActive: isPaid,
      isCancelled,
      cancelAtPeriodEnd: isCancelled,
      plan,
      status,
      planExpiresAt,
      trialEndsAt,
      trialStartedAt,
      currentPeriodStart,
      currentPeriodEnd,
      paymentProvider: serverSub?.paymentProvider || null,
    };
  }, [user, market, serverSub]);

  return (
    <MarketContext.Provider
      value={{
        market,
        setMarket,
        config,
        trialPolicy,
        formatPrice,
        subscription,
        refreshSubscription,
        isMarketOverridden,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket(): MarketContextType {
  const context = useContext(MarketContext);
  if (!context) {
    const cfg = getMarketConfig(DEFAULT_MARKET);
    return {
      market: DEFAULT_MARKET,
      setMarket: () => {},
      config: cfg,
      trialPolicy: getTrialPolicy(DEFAULT_MARKET),
      formatPrice: (amt: number) => formatMarketPrice(amt, DEFAULT_MARKET),
      refreshSubscription: async () => {},
      isMarketOverridden: false,
      subscription: {
        isIndianFree: false,
        isTrialing: false,
        trialDaysRemaining: 0,
        trialUsed: false,
        trialEligible: false,
        isTrialExpired: false,
        isEndingSoon: false,
        isPaidActive: false,
        isCancelled: false,
        cancelAtPeriodEnd: false,
        plan: 'free',
        status: 'free',
        planExpiresAt: null,
        trialEndsAt: null,
        trialStartedAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        paymentProvider: null,
      },
    };
  }
  return context;
}
