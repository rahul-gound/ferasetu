import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Lock, ChevronRight } from 'lucide-react';
import PublicLayout from '../../components/public/PublicLayout';
import SEOHead from '../../components/seo/SEOHead';
import { COMPARISONS_DATA } from '../../content/comparisonsData';
import { useAuth } from '../../contexts/AuthContext';

export default function CompareIndexPage() {
  const { register } = useAuth();
  const comparisons = Object.values(COMPARISONS_DATA);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Platform Comparisons', url: '/compare' },
  ];

  return (
    <PublicLayout>
      <SEOHead
        title="Compare E-Commerce Platforms & Alternatives | FeraSetu"
        description="Factual, data-driven comparisons of FeraSetu vs Shopify, WooCommerce, BigCommerce, Dukaan, and Wix/Squarespace. 0% platform commission, direct settlements, and serverless edge speed."
        breadcrumbs={breadcrumbs}
      />

      {/* Hero */}
      <section className="pt-14 pb-16 md:pt-20 md:pb-24 bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6"
          >
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-900 font-semibold">Compare Platforms</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>Factual, Zero-Slop Architecture &amp; Fee Matrix</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-3xl mb-6">
            Compare FeraSetu Against Legacy E-Commerce Platforms
          </h1>

          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mb-8">
            See how sovereign B2B commerce infrastructure with 0% platform commission, direct payment
            settlements, and Cloudflare edge performance stacks up against legacy competitors.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0052FF] text-white font-semibold text-sm shadow-sm hover:bg-[#0045d8] transition-all cursor-pointer"
            >
              <span>Launch Store for ₹0</span>
              <ArrowRight size={16} />
            </button>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-5 py-3.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Comparisons Grid */}
      <section className="py-16 md:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisons.map((comp) => (
              <div
                key={comp.slug}
                className="p-8 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all hover:shadow-md"
              >
                <div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-4">
                    {comp.competitorCategory}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3">
                    FeraSetu vs. {comp.competitorName}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {comp.subheading}
                  </p>
                  <ul className="space-y-2 mb-8 text-xs font-medium text-slate-700">
                    {comp.pillarHighlights.slice(0, 2).map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-900">{h.title}:</strong> {h.metric} (
                          {h.metricLabel})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link
                    to={`/compare/${comp.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0052FF] hover:text-[#0045d8] transition-colors"
                  >
                    <span>Read full comparison</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
