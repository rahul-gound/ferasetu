// app/[lang]/page.tsx
import React from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  SUPPORTED_LOCALES,
  getDictionary,
  type Locale
} from '../../frontend/src/lib/i18n';
import { getRegionalPricing } from '../../frontend/src/config/pricing';

const SITE_URL = 'https://ferasetu.com';

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map(lang => ({ lang }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang;
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : 'en';
  const dict = await getDictionary(locale);

  const languages: Record<string, string> = {
    'x-default': `${SITE_URL}/en`
  };
  for (const l of SUPPORTED_LOCALES) {
    languages[l] = `${SITE_URL}/${l}`;
  }

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: `${SITE_URL}/${locale}`,
      siteName: 'FeraSetu',
      locale: locale === 'en' ? 'en_US' : `${locale}_${locale.toUpperCase()}`,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.title,
      description: dict.meta.description
    }
  };
}

export default async function RegionalLandingPage({
  params
}: {
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang;
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : 'en';
  const dict = await getDictionary(locale);

  const headerList = await headers();
  const country = headerList.get('x-user-country') || 'US';
  const pricing = getRegionalPricing(country);

  return (
    <main className="flex flex-col items-center justify-center">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 flex w-full max-w-7xl items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-white">
            Fera<span className="text-blue-500">Setu</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
          >
            {dict.hero.ctaStart}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex w-full max-w-5xl flex-col items-center px-6 pt-24 pb-20 text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
          {dict.hero.badge}
        </div>

        <h1 className="whitespace-pre-line text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.15]">
          {dict.hero.title}
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
          {dict.hero.subtitle}
        </p>

        {/* Hero Actions & Mandatory Clickwrap */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-blue-600 px-8 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-500"
            >
              {dict.hero.ctaStart}
            </Link>
            <a
              href="#pricing"
              className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 text-base font-bold text-slate-200 transition-all hover:bg-white/10"
            >
              {dict.hero.ctaDemo}
            </a>
          </div>

          <p className="max-w-md pt-2 text-center text-xs text-slate-500">
            {dict.legal.clickwrap}{' '}
            <Link href="/terms" className="text-slate-400 underline hover:text-white">
              {dict.legal.terms}
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-slate-400 underline hover:text-white">
              {dict.legal.privacy}
            </Link>.
          </p>
        </div>
      </section>

      {/* Dynamic Regional Pricing Section */}
      <section id="pricing" className="w-full max-w-5xl border-t border-white/10 px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {dict.pricing.heading}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Currency automatically localized for your region: <span className="font-bold text-white">{pricing.currency}</span> ({country})
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Starter Plan */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-8 shadow-xl">
            <div>
              <h3 className="text-xl font-bold text-white">{dict.pricing.starterName}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{pricing.symbol}{pricing.starterPrice}</span>
                <span className="text-sm text-slate-400">{pricing.starterPeriod}</span>
              </div>
              <p className="mt-4 text-xs text-slate-500">{pricing.taxNote}</p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <Link
                href="/register"
                className="w-full rounded-xl bg-slate-800 py-3.5 text-center text-sm font-bold text-white transition-all hover:bg-slate-700"
              >
                {dict.pricing.starterCta}
              </Link>
              <span className="text-[11px] text-slate-500">
                {dict.legal.clickwrap}{' '}
                <Link href="/terms" className="underline hover:text-white">{dict.legal.terms}</Link>
              </span>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-blue-500 bg-blue-950/20 p-8 shadow-2xl shadow-blue-950/50">
            <div className="absolute -top-3.5 right-6 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
              Recommended
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{dict.pricing.proName}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{pricing.symbol}{pricing.proPrice}</span>
                <span className="text-sm text-slate-400">{pricing.proPeriod}</span>
              </div>
              <p className="mt-4 text-xs text-blue-300/80">
                {pricing.trialDays > 0 ? `${pricing.trialDays}-day zero-risk trial • ` : ''}Powered by {pricing.gateway.toUpperCase()}
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <Link
                href="/register?plan=pro"
                className="w-full rounded-xl bg-blue-600 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500"
              >
                {dict.pricing.proCta}
              </Link>
              <span className="text-[11px] text-slate-500">
                {dict.legal.clickwrap}{' '}
                <Link href="/terms" className="underline hover:text-white">{dict.legal.terms}</Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
