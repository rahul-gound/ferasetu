import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
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
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);
const MARKET_STORAGE_KEY = 'fera_market';

export function MarketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [serverSub, setServerSub] = useState<any>(null);

  const [market, setMarketState] = useState<Market>(() => {
    return resolveMarket({
      accountMarket: (user as any)?.market,
      storedMarket: typeof window !== 'undefined' ? localStorage.getItem(MARKET_STORAGE_KEY) : null,
    });
  });

  const refreshSubscription = useCallback(async () => {
    if (!user) {
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
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [user, refreshSubscription]);

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
