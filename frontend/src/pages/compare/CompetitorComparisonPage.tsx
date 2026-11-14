import React, { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  HelpCircle,
  Server,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Lock,
} from 'lucide-react';
import PublicLayout from '../../components/public/PublicLayout';
import SEOHead from '../../components/seo/SEOHead';
import { COMPARISONS_DATA } from '../../content/comparisonsData';
import { useAuth } from '../../contexts/AuthContext';

export default function CompetitorComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const { register } = useAuth();

  const data = useMemo(() => {
    if (!slug) return null;
    return COMPARISONS_DATA[slug] || null;
  }, [slug]);

  if (!data) {
    return <Navigate to="/compare" replace />;
  }

  // Generate structured FAQPage schema
  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: data.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Compare Platforms', url: '/compare' },
    { name: data.competitorName + ' Alternative', url: `/compare/${data.slug}` },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title={data.title}
        description={data.metaDescription}
        breadcrumbs={breadcrumbs}
        structuredData={faqSchema}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 border-b border-slate-200/80 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Breadcrumb nav */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6"
          >
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/compare" className="hover:text-blue-600 transition-colors">
              Compare
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-900 font-semibold">{data.competitorName} Alternative</span>
          </nav>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>{data.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl mb-6">
            {data.h1}
          </h1>

          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mb-8">
            {data.subheading}
          </p>

          {/* Quick Summary Callout Box */}
          <div className="p-5 md:p-6 rounded-xl bg-slate-50 border border-slate-200/90 max-w-3xl mb-8 text-sm md:text-base text-slate-700 leading-relaxed font-medium">
            <span className="font-bold text-slate-900">Bottom Line: </span>
            {data.summaryQuote}
          </div>

          {/* CTA Group */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0052FF] text-white font-semibold text-sm shadow-sm hover:bg-[#0045d8] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span>Build My Store for ₹0</span>
              <ArrowRight size={16} />
            </button>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-5 py-3.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              View Transparent Pricing
            </Link>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
            <span>✓ No credit card required</span>
            <span>·</span>
            <span>✓ 0% platform commission</span>
            <span>·</span>
            <span>✓ Live in under 5 minutes</span>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Ribbon */}
      <section className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.pillarHighlights.map((pillar, idx) => (
              <div
                key={idx}
                className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl font-extrabold text-[#0052FF] tracking-tight mb-1">
                    {pillar.metric}
                  </div>
                  <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
                    {pillar.metricLabel}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mb-2">{pillar.title}</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architectural & Economic Comparison Table */}
      <section className="py-16 md:py-24 bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
              Architectural &amp; Fee Matrix
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              FeraSetu vs. {data.competitorName}: Side-by-Side Breakdown
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Every detail verified against current public pricing schedules, platform documentation,
              and real-world merchant operating constraints.
            </p>
          </div>

          {/* Desktop & Tablet Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-1/3">
                    Feature &amp; Metric
                  </th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50/50 w-1/3">
                    FeraSetu
                  </th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-1/3">
                    {data.competitorName}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.matrix.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-6 align-top">
                      <div className="font-bold text-slate-900">{row.feature}</div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                        {row.category}
                      </div>
                      {row.notes && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{row.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-6 align-top bg-blue-50/20 font-medium text-slate-900">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span>{row.ferasetu}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-top text-slate-600">
                      <div className="flex items-start gap-2">
                        {row.isFeraAdvantage ? (
                          <XCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 size={18} className="text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span>{row.competitor}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why Switch In-Depth Reasoning */}
      <section className="py-16 md:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
              Strategic Advantages
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Why Independent Merchants Switch from {data.competitorName}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(data.whySwitchPoints || (data as any).whySwitchReasons || []).map((point: any, idx: number) => (
              <div
                key={idx}
                className="p-8 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base mb-6 border border-blue-100">
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{point.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {point.description}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{point.takeaway}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Migration Guidance */}
      <section className="py-16 md:py-20 bg-white border-b border-slate-200">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
              Hassle-Free Transition
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Migrate from {data.competitorName} in 3 Simple Steps
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              No developer required. Your existing domain, customer relationships, and inventory
              transfer cleanly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.migrationSteps.map((step) => (
              <div
                key={step.step}
                className="p-6 rounded-xl bg-slate-50 border border-slate-200 relative"
              >
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                  Step {step.step}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[900px] mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
              Common Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Switching Questions
            </h2>
          </div>

          <div className="space-y-4">
            {data.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-white border border-slate-200/90 shadow-sm"
              >
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-start gap-2.5">
                  <HelpCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>{faq.question}</span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed pl-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitor Hub Switcher Strip */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Compare other platforms:
          </div>
          <div className="flex flex-wrap gap-2.5">
            {Object.values(COMPARISONS_DATA).map((comp) => (
              <Link
                key={comp.slug}
                to={`/compare/${comp.slug}`}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                  comp.slug === data.slug
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                vs. {comp.competitorName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final Action CTA */}
      <section className="py-16 md:py-20 bg-slate-900 text-white">
        <div className="max-w-[900px] mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-blue-400 mb-6 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>0% Commission · Direct Settlement · Edge Speed</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Own your customer relationships. Keep 100% of your earnings.
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
            Start on our permanent ₹0 plan today. Claim your branded storefront, connect direct
            payments, and receive WhatsApp cart orders immediately.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#0052FF] text-white font-semibold text-sm shadow-md hover:bg-[#0045d8] transition-all cursor-pointer"
            >
              <span>Get Started for ₹0 Free</span>
              <ArrowRight size={16} />
            </button>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-750 transition-colors"
            >
              Explore Pricing Plans
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
