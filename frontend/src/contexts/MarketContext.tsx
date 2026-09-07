import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  type Market,
  type MarketPricingConfig,
  getMarketConfig,
  getTrialPolicy,
  resolveMarket,
  formatMarketPrice,
  DEFAULT_MARKET
} from '../config/pricing';

export interface SubscriptionStatus {
  isIndianFree: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  isEndingSoon: boolean;
  isPaidActive: boolean;
  isCancelled: boolean;
  cancelAtPeriodEnd: boolean;
  planExpiresAt: Date | null;
  trialEndsAt: Date | null;
  trialStartedAt: Date | null;
}

interface MarketContextType {
  market: Market;
  setMarket: (market: Market) => void;
  config: MarketPricingConfig;
  trialPolicy: ReturnType<typeof getTrialPolicy>;
  formatPrice: (amount: number) => string;
  subscription: SubscriptionStatus;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);
const MARKET_STORAGE_KEY = 'fera_market';

export function MarketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [market, setMarketState] = useState<Market>(() => {
    return resolveMarket({
      accountMarket: (user as any)?.market,
      storedMarket: typeof window !== 'undefined' ? localStorage.getItem(MARKET_STORAGE_KEY) : null,
    });
  });

  // Sync if authenticated user's account has a specified market
  useEffect(() => {
    if ((user as any)?.market) {
      const accMarket = String((user as any).market).toUpperCase();
      if (accMarket === 'IN' || accMarket === 'US' || accMarket === 'EU' || accMarket === 'OTHER') {
        setMarketState(accMarket as Market);
        try {
          localStorage.setItem(MARKET_STORAGE_KEY, accMarket);
        } catch {}
      }
    }
  }, [(user as any)?.market]);

  const setMarket = useCallback((newMarket: Market) => {
    setMarketState(newMarket);
    try {
      localStorage.setItem(MARKET_STORAGE_KEY, newMarket);
    } catch {}
  }, []);

  const config = useMemo(() => getMarketConfig(market), [market]);
  const trialPolicy = useMemo(() => getTrialPolicy(market), [market]);
  const formatPrice = useCallback((amount: number) => formatMarketPrice(amount, market), [market]);

  // Compute reactive subscription & trial state
  const subscription = useMemo<SubscriptionStatus>(() => {
    const userMarket: Market = ((user as any)?.market?.toUpperCase() as Market) || market;
    const plan = user?.plan || 'free';
    const isPaid = plan === 'starter' || plan === 'business' || plan === 'pro' || plan === 'standard' || plan === 'growth' || plan === 'premium';
    const isCancelled = Boolean((user as any)?.cancel_at_period_end);
    const planExpiresAt = user?.plan_expires_at ? new Date(user.plan_expires_at) : null;

    let trialEndsAt: Date | null = null;
    let trialStartedAt: Date | null = null;

    if (user?.trial_ends_at) {
      trialEndsAt = new Date(user.trial_ends_at);
      if (user?.trial_started_at) {
        trialStartedAt = new Date(user.trial_started_at);
      }
    } else if (user?.trial_started_at) {
      trialStartedAt = new Date(user.trial_started_at);
      trialEndsAt = new Date(trialStartedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else if (user && !isPaid) {
      // Deterministic fallback pinned to user ID in localStorage so it never shifts on refresh
      const storageKey = `fera_trial_started_${user.id}`;
      let storedStart = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (!storedStart) {
        storedStart = new Date().toISOString();
        try {
          localStorage.setItem(storageKey, storedStart);
        } catch {}
      }
      trialStartedAt = new Date(storedStart);
      trialEndsAt = new Date(trialStartedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    const now = new Date();
    const isTrialExpired = !isPaid && !!trialEndsAt && trialEndsAt.getTime() <= now.getTime();
    const isTrialing = !isPaid && !!trialEndsAt && !isTrialExpired;
    const trialDaysRemaining = trialEndsAt && isTrialing
      ? Math.max(1, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const isEndingSoon = isTrialing && trialDaysRemaining <= 3;

    if (userMarket === 'IN') {
      return {
        isIndianFree: !isPaid,
        isTrialing,
        trialDaysRemaining,
        isTrialExpired,
        isEndingSoon,
        isPaidActive: isPaid,
        isCancelled,
        cancelAtPeriodEnd: isCancelled,
        planExpiresAt,
        trialEndsAt,
        trialStartedAt,
      };
    }

    // US, EU, and OTHER: 14-day trial model; upgrade required after trial
    return {
      isIndianFree: false,
      isTrialing,
      trialDaysRemaining,
      isTrialExpired,
      isEndingSoon,
      isPaidActive: isPaid,
      isCancelled,
      cancelAtPeriodEnd: isCancelled,
      planExpiresAt,
      trialEndsAt,
      trialStartedAt,
    };
  }, [user, market]);

  return (
    <MarketContext.Provider
      value={{
        market,
        setMarket,
        config,
        trialPolicy,
        formatPrice,
        subscription,
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
      subscription: {
        isIndianFree: false,
        isTrialing: false,
        trialDaysRemaining: 0,
        isTrialExpired: false,
        isEndingSoon: false,
        isPaidActive: false,
        isCancelled: false,
        cancelAtPeriodEnd: false,
        planExpiresAt: null,
        trialEndsAt: null,
        trialStartedAt: null,
      },
    };
  }
  return context;
}
