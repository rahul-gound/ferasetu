import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  FileText,
  Mail,
  ChevronDown,
  CheckCircle2,
  Users,
  Database,
  Sparkles,
  Server,
  Eye,
  Trash2,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';
import { useLanguage } from '../contexts/LanguageContext';

interface TocItem {
  id: string;
  title: string;
  number: string;
}

const TOC_ITEMS: TocItem[] = [
  { id: 'overview', title: 'Introduction & Overview', number: '1' },
  { id: 'roles', title: 'Merchants vs. Merchant Customers', number: '2' },
  { id: 'data-collection', title: 'Information We Collect', number: '3' },
  { id: 'data-usage', title: 'How We Use Your Information', number: '4' },
  { id: 'ownership', title: 'Data Ownership & Portability', number: '5' },
  { id: 'third-parties', title: 'Third-Party Sub-processors', number: '6' },
  { id: 'security', title: 'Data Security & Protection', number: '7' },
  { id: 'cookies', title: 'Cookies & Tracking Technologies', number: '8' },
  { id: 'retention', title: 'Data Retention & Deletion', number: '9' },
  { id: 'rights', title: 'Your Privacy Rights & Choices', number: '10' },
  { id: 'children', title: "Children's Privacy", number: '11' },
  { id: 'policy-updates', title: 'Changes to This Privacy Policy', number: '12' },
  { id: 'contact-requests', title: 'Contact & Privacy Requests', number: '13' },
];

function EmailCopyButton({ email, label }: { email: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-3 transition-colors hover:bg-slate-100/70">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Mail size={18} />
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
          <div className="font-semibold text-slate-900 break-all">
            <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
              {email}
            </a>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          onClick={handleCopy}
          type="button"
          aria-label={`Copy ${email} address`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-600" />
              <span className="text-emerald-600 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} className="text-slate-500" />
              <span>Copy</span>
            </>
          )}
        </button>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-2xs"
        >
          Send Email
        </a>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  const { getLocalizedLink, translate: t } = useLanguage();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      // Find visible entries
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);
      if (visibleEntries.length > 0) {
        // Take the one nearest to top
        const sorted = visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveSection(sorted[0].target.id);
      }
    };

    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: '-100px 0px -60% 0px',
      threshold: [0, 0.2, 0.5],
    });

    TOC_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -96; // Offset for sticky navbar
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
      setMobileMenuOpen(false);
    }
  };

  return (
    <PublicLayout>
      <SEO
        title="FeraSetu Privacy Policy"
        description="Learn how FeraSetu collects, uses, protects, and manages personal data when you use FeraSetu services."
        url="https://ferasetu.com/privacy"
        type="website"
      />

      {/* Hero Header */}
      <section className="relative pt-12 pb-10 border-b border-slate-200 bg-gradient-to-b from-blue-50/40 via-white to-[#F8FAFC]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <Link
              to={getLocalizedLink('/')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 mb-6 transition-colors group"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              {t('common.backToHome') || 'Back to Home'}
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck size={14} className="text-blue-600" />
              Official Legal Notice
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Privacy Policy
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mb-6">
              How FeraSetu handles your data
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium pt-2 border-t border-slate-200/80">
              <span>
                Last Updated: <strong className="text-slate-700">August 19, 2026</strong>
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span>Online Software Service</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                <CheckCircle2 size={15} /> Transparent &amp; Secure
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Mobile Table of Contents Accordion */}
        <div className="lg:hidden mb-8">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-toc"
            >
              <span className="flex items-center gap-2 text-sm">
                <FileText size={16} className="text-blue-600" />
                Table of Contents (
                {TOC_ITEMS.find((item) => item.id === activeSection)?.number || '1'}.{' '}
                {TOC_ITEMS.find((item) => item.id === activeSection)?.title || 'Overview'}
                )
              </span>
              <ChevronDown
                size={18}
                className={`text-slate-500 transition-transform duration-200 ${
                  mobileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {mobileMenuOpen && (
              <div id="mobile-toc" className="p-3 bg-white border-t border-slate-200 max-h-80 overflow-y-auto space-y-1">
                {TOC_ITEMS.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      type="button"
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-all flex items-start gap-2.5 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0">{item.number}.</span>
                      <span className="leading-snug">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Desktop Table of Contents (Sticky Sidebar) */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-28">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 font-bold text-slate-900 text-sm tracking-tight">
                <FileText size={16} className="text-blue-600" />
                <span>Table of Contents</span>
              </div>
              <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1" aria-label="Table of contents">
                {TOC_ITEMS.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm transition-all flex items-start gap-2 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold shrink-0 mt-0.5 ${
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {item.number}.
                      </span>
                      <span className="leading-tight">{item.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Contact Box on Desktop Sidebar */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Privacy Questions?</h4>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Contact our data protection team directly:
              </p>
              <a
                href="mailto:privacy@ferasetu.com"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Mail size={14} /> privacy@ferasetu.com
              </a>
            </div>
          </aside>

          {/* Privacy Document Body */}
          <main className="min-w-0 flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs p-6 sm:p-10 lg:p-12 text-slate-700 leading-relaxed font-normal">
            {/* Section 1: Overview */}
            <section id="overview" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <ShieldCheck size={18} /> Section 1
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                1. Introduction &amp; Overview
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-slate-600">
                Welcome to FeraSetu. FeraSetu is an online software platform designed to assist shopkeepers, merchants,
                and businesses in creating, operating, and growing their digital storefronts, product catalogs, customer
                interactions, and operations.
              </p>
              <p>
                We believe that trust is the foundation of digital commerce. This Privacy Policy describes how FeraSetu
                collects, uses, processes, stores, and protects personal data when you access or use our website,
                applications, merchant dashboards, and related services (collectively, the &ldquo;Services&rdquo;).
              </p>
              <p>
                Please read this document carefully to understand our privacy practices. By using FeraSetu, you
                acknowledge the collection and use of information in accordance with this Privacy Policy.
              </p>
            </section>

            {/* Section 2: Roles and Legal Distinction */}
            <section id="roles" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Users size={18} /> Section 2
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                2. Platform Roles &amp; Legal Relationship (Merchants vs. Merchant Customers)
              </h2>
              <p>
                To provide transparency and adhere to applicable data protection laws, it is essential to distinguish
                between the two distinct categories of individuals whose information may interact with our platform:
              </p>

              <div className="grid md:grid-cols-2 gap-6 my-6">
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-3">
                    A
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">FeraSetu Merchants &amp; Users</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    Merchants are business owners and operators who sign up for a FeraSetu account to create digital
                    stores and manage catalogs.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                    <li>FeraSetu directly collects and controls merchant account credentials, contact info, and billing records.</li>
                    <li>FeraSetu acts as the <strong>Data Fiduciary / Data Controller</strong> for merchant account data.</li>
                  </ul>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-lg mb-3">
                    B
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Customers of Merchants</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    Customers are end-consumers who visit or place orders on an independent storefront powered by
                    FeraSetu software.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                    <li>The <strong>Merchant is the Data Fiduciary / Controller</strong> determining why customer information is collected.</li>
                    <li>FeraSetu acts strictly as a <strong>Technology Service Provider / Data Processor</strong> providing infrastructure.</li>
                    <li>FeraSetu is <strong>not the seller</strong> of merchant goods and does not control merchant inventory or sales decisions.</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl text-sm text-slate-700 leading-relaxed">
                <strong>Important Legal Notice:</strong> If you are a customer purchasing goods from a merchant store
                hosted on FeraSetu, your transaction and customer relationship is directly with that merchant. Privacy
                inquiries regarding merchant order fulfillment, refunds, or store-specific data practices should be
                directed primarily to the respective merchant.
              </div>
            </section>

            {/* Section 3: Data Collection */}
            <section id="data-collection" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Database size={18} /> Section 3
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                3. Information We Collect
              </h2>
              <p>
                We collect personal data only when strictly necessary to provide reliable services, operate our
                software, process transactions, and ensure platform security.
              </p>

              <div className="space-y-4">
                <div className="p-5 border border-slate-200 rounded-xl bg-white">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    3.1 Information Provided Directly by Merchants
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
                    <li><strong>Account Credentials:</strong> Name, phone number, email address, and authentication credentials.</li>
                    <li><strong>Business &amp; Storefront Details:</strong> Store name, business category, WhatsApp number, store logo, address, and localized preferences.</li>
                    <li><strong>Catalog &amp; Inventory Data:</strong> Product names, descriptions, prices, photographs, variants, and stock counts uploaded to your store.</li>
                    <li><strong>Billing &amp; Plan Data:</strong> Chosen subscription tiers, invoicing details, and payment transaction references (financial card data is tokenized securely via certified payment gateways).</li>
                    <li><strong>Communications:</strong> Messages, feedback, support tickets, and feature requests submitted to our support team.</li>
                  </ul>
                </div>

                <div className="p-5 border border-slate-200 rounded-xl bg-white">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    3.2 Information Processed on Behalf of Merchants (End-Customer Data)
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
                    <li><strong>Order Details:</strong> Customer name, shipping and delivery addresses, phone number, email address, order items, and item notes.</li>
                    <li><strong>Order Communication:</strong> Delivery preferences and order tracking requests dispatched via WhatsApp or SMS on behalf of the store.</li>
                  </ul>
                </div>

                <div className="p-5 border border-slate-200 rounded-xl bg-white">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    3.3 Technical, Device &amp; Log Information
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
                    <li><strong>Device &amp; Network Identifiers:</strong> IP address, device type, operating system version, browser user agent, and screen resolution.</li>
                    <li><strong>Operational Logs:</strong> Timestamps of access, pages viewed, API response times, crash reports, and system diagnostics used to maintain platform stability.</li>
                  </ul>
                </div>

                <div className="p-5 border border-slate-200 rounded-xl bg-white">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    3.4 AI Prompts &amp; Store Generation Data
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
                    <li><strong>Fera AI Queries:</strong> Text inputs, audio transcriptions, product generation prompts, and catalog inquiries submitted to Fera AI tools to generate marketing copy, translations, or product descriptions.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 4: Data Usage */}
            <section id="data-usage" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Sparkles size={18} /> Section 4
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                4. How We Use Your Information
              </h2>
              <p>We process collected information for specific, lawful purposes including:</p>

              <div className="grid sm:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">Service Delivery &amp; Store Hosting</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Deploying storefronts, displaying product catalogs, syncing inventory, and transmitting customer orders in real-time.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">Authentication &amp; Account Security</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Verifying merchant identities, dispatching secure OTPs, and preventing unauthorized access to business dashboards.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">AI Assistance &amp; Automation</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Providing automated catalog generation, multilingual translations, and business analytics tailored to your store.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">Customer &amp; Technical Support</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Diagnosing technical issues, resolving bugs, responding to tickets, and improving usability across devices.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">Fraud Prevention &amp; Integrity</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Detecting bot activity, rate-limiting malicious traffic, preventing abuse, and safeguarding merchant transactions.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">Legal &amp; Regulatory Compliance</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Complying with applicable commercial, tax, accounting, and consumer protection requirements.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: Ownership and Portability */}
            <section id="ownership" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Lock size={18} /> Section 5
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                5. Data Ownership, Portability &amp; Merchant Control
              </h2>
              <div className="p-6 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                <h3 className="text-lg font-bold text-slate-900">Your Data Belongs to You</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  At FeraSetu, our philosophy is simple: <strong>your store data belongs exclusively to you</strong>.
                  We do not lock in your customer lists, order records, or product catalogs.
                </p>
                <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5 pt-2">
                  <li>
                    <strong>Full Data Portability:</strong> Merchants can export catalog data and order history at any
                    time in open standard formats (such as CSV and JSON) directly from their dashboard.
                  </li>
                  <li>
                    <strong>No Data Hijacking:</strong> We do not market third-party competitors to your store visitors,
                    nor do we repurpose your customer contacts for independent marketing.
                  </li>
                  <li>
                    <strong>Direct Control:</strong> You can add, edit, or delete catalog items and customer records
                    directly within the management console.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 6: Third-Party Sub-processors */}
            <section id="third-parties" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Server size={18} /> Section 6
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                6. Third-Party Sub-processors &amp; Service Providers
              </h2>
              <p>
                <strong>We never sell, rent, monetize, or trade personal data to advertisers or third parties.</strong>
              </p>
              <p>
                We only share personal data with trusted infrastructure providers and third-party vendors strictly
                necessary to execute our core services under robust contractual data protection safeguards:
              </p>

              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Cloud Hosting &amp; Edge Infrastructure</h3>
                  <p className="text-xs text-slate-600">
                    Trusted cloud providers (such as Cloudflare and enterprise database providers) for distributed CDN
                    caching, database security, DDoS mitigation, and uptime.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Payment Gateways &amp; Processing</h3>
                  <p className="text-xs text-slate-600">
                    Certified payment gateways (e.g. Razorpay, Stripe, and UPI rails) to facilitate merchant subscription
                    billing and storefront customer payments. Payment credentials are handled directly by PCI-DSS compliant
                    processors.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Messaging &amp; Notification Gateways</h3>
                  <p className="text-xs text-slate-600">
                    Telecommunication and messaging partners (such as WhatsApp Business API, SMS delivery platforms, and
                    transactional email services) to deliver critical order notifications and authentication OTPs.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">AI Inference Infrastructure</h3>
                  <p className="text-xs text-slate-600">
                    State-of-the-art AI infrastructure providers to process merchant prompt completions for catalog
                    generation. Prompts are transmitted securely and processed without being used to train third-party public models.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7: Security */}
            <section id="security" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Lock size={18} /> Section 7
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                7. Data Security &amp; Protection
              </h2>
              <p>
                We employ technical, administrative, and physical security measures designed to safeguard personal data
                from accidental loss, unauthorized access, disclosure, or destruction.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li>
                  <strong>Encryption in Transit:</strong> All web traffic and API communications are encrypted using
                  modern Transport Layer Security (TLS/HTTPS).
                </li>
                <li>
                  <strong>Encryption at Rest:</strong> Sensitive database fields and backups are encrypted at rest using
                  industry-standard cryptographic algorithms.
                </li>
                <li>
                  <strong>Access Controls:</strong> Administrative access to systems is governed by the principle of least
                  privilege, multi-factor authentication, and audited log trails.
                </li>
                <li>
                  <strong>Continuous Monitoring:</strong> Regular security audits, rate-limiting, and automated anomaly
                  detection are implemented across all endpoints.
                </li>
              </ul>
            </section>

            {/* Section 8: Cookies */}
            <section id="cookies" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Eye size={18} /> Section 8
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                8. Cookies &amp; Tracking Technologies
              </h2>
              <p>
                FeraSetu uses cookies and similar storage technologies (such as localStorage) solely to operate our
                platform smoothly:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li>
                  <strong>Strictly Necessary Cookies:</strong> Essential for signing in, maintaining your active session,
                  protecting against Cross-Site Request Forgery (CSRF), and remembering store configuration.
                </li>
                <li>
                  <strong>Functional &amp; Preference Cookies:</strong> Remembering your chosen UI language, theme, and
                  dashboard view preferences.
                </li>
                <li>
                  <strong>Performance &amp; Diagnostics:</strong> Anonymous diagnostic telemetry to optimize page load speeds
                  and identify runtime errors.
                </li>
              </ul>
              <p className="text-sm text-slate-600">
                You can manage or disable cookies through your web browser settings; however, disabling strictly
                necessary cookies may prevent access to authenticated merchant dashboards.
              </p>
            </section>

            {/* Section 9: Retention */}
            <section id="retention" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Trash2 size={18} /> Section 9
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                9. Data Retention &amp; Deletion
              </h2>
              <p>
                We retain personal data only for as long as necessary to fulfill the purposes for which it was collected,
                including providing Services, satisfying legal, accounting, tax, or reporting requirements, and resolving
                disputes.
              </p>
              <p>
                When a merchant closes their account, associated store configurations and active database entries are
                flagged for removal and securely deleted or anonymized in accordance with our retention schedules, except
                where applicable law mandates ongoing recordkeeping (e.g., invoices or tax records).
              </p>
            </section>

            {/* Section 10: Rights */}
            <section id="rights" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <HelpCircle size={18} /> Section 10
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                10. Your Privacy Rights &amp; Choices
              </h2>
              <p>Depending on your location and applicable privacy laws, you possess the following rights regarding your personal data:</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600 my-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Access</strong>
                  Request a summary or copy of personal data we hold about you.
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Correction</strong>
                  Update inaccurate or incomplete profile or business data via your dashboard.
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Data Portability</strong>
                  Request an export of catalog and customer records in readable format.
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Erasure / Deletion</strong>
                  Request deletion of your account and personal data, subject to legal limits.
                </div>
              </div>
              <p className="text-sm text-slate-600">
                To exercise any of these rights, please email{' '}
                <a href="mailto:privacy@ferasetu.com" className="text-blue-600 font-semibold hover:underline">
                  privacy@ferasetu.com
                </a>
                .
              </p>
            </section>

            {/* Section 11: Children's Privacy */}
            <section id="children" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <AlertTriangle size={18} /> Section 11
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                11. Children&apos;s Privacy
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                FeraSetu is a business-to-business commerce and merchant utility platform. Our Services are intended for
                use by adults who have reached the age of majority in their jurisdiction (at least 18 years of age). We do
                not knowingly collect or solicit personal data from children under 18. If we discover that personal data
                from a child has been collected without verifiable parental consent, we will take prompt steps to delete
                that data.
              </p>
            </section>

            {/* Section 12: Changes */}
            <section id="policy-updates" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <FileText size={18} /> Section 12
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                12. Changes to This Privacy Policy
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                We may update this Privacy Policy from time to time to reflect modifications in our software, legal
                requirements, or service operations. When changes are published, we will revise the &ldquo;Last
                Updated&rdquo; date at the top of this page. For significant updates, we will provide additional notice,
                such as an in-dashboard banner or email notification. Your continued use of FeraSetu following posted
                updates signifies your acceptance of the revised policy.
              </p>
            </section>

            {/* Section 13: Verbatim Contact & Privacy Requests */}
            <section id="contact-requests" className="scroll-mt-28 pt-10 border-t-2 border-slate-200 space-y-6">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Mail size={18} /> Section 13
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                  FeraSetu Contact &amp; Privacy Requests
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  FeraSetu is an online software service. We provide support and privacy assistance through online
                  channels and do not require users to contact us through a physical office address.
                </p>
              </div>

              {/* Dedicated Email Channels */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Privacy</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    For questions, requests, or complaints concerning Personal Data or this Privacy Policy:
                  </p>
                  <EmailCopyButton email="privacy@ferasetu.com" label="Privacy & Data Protection" />
                  <p className="text-xs text-slate-500 mt-2">
                    Where appropriate, we may provide an online privacy or support ticket through the FeraSetu platform.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">General Support</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    For technical issues, account assistance, billing questions, or general support:
                  </p>
                  <EmailCopyButton email="support@ferasetu.com" label="Technical & Account Support" />
                  <p className="text-xs text-slate-500 mt-2">
                    Users may also open a support ticket through the FeraSetu platform when that functionality is available.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Security</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    For responsible disclosure of security vulnerabilities or security-related concerns:
                  </p>
                  <EmailCopyButton email="security@ferasetu.com" label="Responsible Security Disclosure" />
                  <div className="mt-3 p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900 leading-relaxed">
                    <strong>Security Disclosure Guidelines:</strong> Please do not exploit, access, modify, download, or
                    disclose data belonging to other users while investigating a suspected vulnerability.
                  </div>
                </div>
              </div>

              {/* Privacy Requests Protocol */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-base font-bold text-slate-900">Privacy Requests</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  When submitting a privacy request, please provide enough information for us to understand and process
                  your request. We may request reasonable information necessary to verify your identity before providing
                  access to Personal Data or completing certain requests.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We will handle privacy requests and grievances in accordance with applicable law.
                </p>
              </div>

              {/* No Physical Address Statement */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-base font-bold text-slate-900">No Physical Address Required for Online Support</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  FeraSetu operates as an online service. Support, privacy requests, and security reports are handled
                  through the contact methods described above and, where available, through FeraSetu&apos;s online ticketing system.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Where applicable law requires FeraSetu to provide a specific legal or regulatory contact, additional
                  information will be provided through the appropriate notice or legal documentation.
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </PublicLayout>
  );
}

