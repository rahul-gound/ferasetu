// src/config/pricing.ts
import { EU_COUNTRY_CODES } from '../lib/i18n';

export interface PlanDetails {
  currency: 'INR' | 'EUR' | 'USD';
  symbol: string;
  starterPrice: string;
  starterPeriod: string;
  proPrice: string;
  proPeriod: string;
  trialDays: number;
  gateway: 'razorpay' | 'stripe';
  taxNote: string;
}

export function getRegionalPricing(countryCode?: string | null): PlanDetails {
  const country = (countryCode || 'US').toUpperCase();

  // India & South Asia Tier
  if (country === 'IN') {
    return {
      currency: 'INR',
      symbol: '₹',
      starterPrice: '0',
      starterPeriod: 'Forever Free',
      proPrice: '499',
      proPeriod: '/month',
      trialDays: 0,
      gateway: 'razorpay',
      taxNote: 'Inclusive of GST where applicable'
    };
  }

  // European Union (Eurozone) Tier
  if ((EU_COUNTRY_CODES as readonly string[]).includes(country)) {
    return {
      currency: 'EUR',
      symbol: '€',
      starterPrice: '19',
      starterPeriod: '/month',
      proPrice: '49',
      proPeriod: '/month',
      trialDays: 14,
      gateway: 'stripe',
      taxNote: 'Prices exclude EU VAT where applicable'
    };
  }

  // USA & Global Fallback Tier
  return {
    currency: 'USD',
    symbol: '$',
    starterPrice: '19',
    starterPeriod: '/month',
    proPrice: '49',
    proPeriod: '/month',
    trialDays: 14,
    gateway: 'stripe',
    taxNote: 'Prices in USD. Local sales tax may apply'
  };
}
