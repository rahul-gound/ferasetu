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
  { id: 'google-data', title: 'Google User Data & OAuth Disclosures', number: '5' },
  { id: 'ownership', title: 'Data Ownership & Portability', number: '6' },
  { id: 'third-parties', title: 'Third-Party Sub-processors', number: '7' },
  { id: 'security', title: 'Data Security & Protection', number: '8' },
  { id: 'cookies', title: 'Cookies & Tracking Technologies', number: '9' },
  { id: 'retention', title: 'Data Retention & Deletion', number: '10' },
  { id: 'rights', title: 'Your Privacy Rights & Choices', number: '11' },
  { id: 'children', title: "Children's Privacy", number: '12' },
  { id: 'policy-updates', title: 'Changes to This Privacy Policy', number: '13' },
  { id: 'contact-requests', title: 'Contact & Privacy Requests', number: '14' },
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
                  <h3 className="text-lg font-bold text-slate-900 mb-2">FeraSetu Merchants &amp; Store Owners</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    Merchants are business operators who register for a FeraSetu account to create digital storefronts, manage products, and fulfill orders.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                    <li>FeraSetu acts as the <strong>Data Controller (or Business under CCPA)</strong> solely for merchant account credentials, contact information, billing records, and direct platform usage.</li>
                    <li>Merchants hold complete authority over their store setup, branding, and customer pricing.</li>
                  </ul>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-lg mb-3">
                    B
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Customers of Merchants (End-Buyers)</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    Buyers are consumers who view catalogs or place orders on independent merchant storefronts powered by FeraSetu technology.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                    <li>The <strong>Merchant is the independent Data Controller</strong> determining why and how buyer information is gathered.</li>
                    <li>FeraSetu acts strictly as a <strong>Data Processor (or Service Provider under CCPA)</strong> executing automated processing on the merchant&apos;s instructions.</li>
                    <li><strong>No FeraSetu Liability:</strong> FeraSetu is not legally responsible or liable for how shopkeepers use, store, disclose, or market using their buyers&apos; phone numbers, emails, or physical addresses.</li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl text-sm text-amber-950 leading-relaxed">
                <strong>Controller vs. Processor Disclaimer:</strong> FeraSetu provides cloud storefront technology. Merchants are solely responsible for publishing their own store privacy policies, honoring customer opt-outs, and adhering to local and international privacy laws regarding their buyers&apos; personal data.
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

            {/* Section 5: Google User Data & OAuth Disclosures */}
            <section id="google-data" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <ShieldCheck size={18} /> Section 5
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                5. Google User Data &amp; OAuth Disclosures
              </h2>

              <p className="text-slate-700 leading-relaxed">
                FeraSetu enables users to register and sign in securely using Google OAuth (&ldquo;Sign in with Google&rdquo;). This section explicitly details our collection, use, storage, and retention of Google user data in strict compliance with the <strong>Google API Services User Data Policy</strong>.
              </p>

              <div className="space-y-4">
                <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    5.1 Google Data We Access
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    When you sign in using Google, FeraSetu requests only basic profile identification scopes:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
                    <li><strong>Primary Email Address:</strong> Used as your unique account identifier, for essential service communications, and security alerts.</li>
                    <li><strong>Full Name (Given Name and Family Name):</strong> Used to personalize your store management dashboard.</li>
                    <li><strong>Profile Picture URL:</strong> Used optionally to display your avatar within your merchant account.</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-3 italic">
                    We do not request access to Google Drive, Gmail, Google Contacts, Google Calendar, or any sensitive/restricted Google scopes.
                  </p>
                </div>

                <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    5.2 How We Use Google User Data
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
                    <li>Authenticating your identity and provisioning your merchant store dashboard.</li>
                    <li>Transmitting transactional notifications regarding your store, orders, and security updates.</li>
                    <li>Preventing fraudulent registrations and maintaining system security.</li>
                  </ul>
                </div>

                <div className="p-5 border-2 border-blue-200 bg-blue-50/60 rounded-xl shadow-2xs">
                  <h3 className="text-base font-bold text-blue-900 mb-2">
                    5.3 Google Limited Use Requirements Disclosure
                  </h3>
                  <p className="text-sm text-blue-950 font-semibold leading-relaxed mb-3">
                    FeraSetu&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
                    <a
                      href="https://developers.google.com/terms/api-services-user-data-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-700 hover:text-blue-900 font-bold"
                    >
                      Google API Services User Data Policy
                    </a>
                    , including the Limited Use requirements.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-xs text-blue-900">
                    <li><strong>No Advertising:</strong> Google user data is never used or transferred to serve advertisements, including personalized, retargeted, or interest-based advertising.</li>
                    <li><strong>No Data Brokering:</strong> We never sell, lease, or monetize Google user data to data brokers, advertising networks, or third parties under any circumstances.</li>
                    <li><strong>No AI Model Training:</strong> Google user data is not used to train, retrain, fine-tune, or improve generalized machine learning (ML) or artificial intelligence (AI) models.</li>
                    <li><strong>Human Access Restrictions:</strong> Human beings are not permitted to inspect your Google account data unless you provide explicit consent for technical troubleshooting, it is necessary for security investigations, or it is required to comply with applicable law.</li>
                  </ul>
                </div>

                <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    5.4 Data Retention, Revocation &amp; Deletion of Google Data
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li>
                      <strong>Revoking Access:</strong> You can revoke FeraSetu&apos;s access to your Google account at any time via your{' '}
                      <a
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800 font-semibold"
                      >
                        Google Security Settings (Third-party apps with account access)
                      </a>.
                    </li>
                    <li>
                      <strong>Requesting Deletion:</strong> You can request immediate and permanent deletion of your FeraSetu account and all associated Google data by submitting a request to{' '}
                      <a href="mailto:privacy@ferasetu.com" className="text-blue-600 font-semibold underline">
                        privacy@ferasetu.com
                      </a>
                      . All account records will be purged within thirty (30) business days.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 6: Ownership and Portability */}
            <section id="ownership" className="scroll-mt-28 pt-10 border-t border-slate-100 space-y-5">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Lock size={18} /> Section 6
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                6. Data Ownership, Portability &amp; Merchant Control
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
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Authentication &amp; User Identity — WorkOS Inc.</h3>
                  <p className="text-xs text-slate-600">
                    We use <strong>WorkOS Inc.</strong> to handle merchant registration, authentication, session token generation, and secure Single Sign-On (SSO). WorkOS processes authentication credentials under strict enterprise privacy safeguards.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Global Payment Processing — Stripe Inc.</h3>
                  <p className="text-xs text-slate-600">
                    International transactions, credit cards, and global subscription billing are processed securely via <strong>Stripe Inc.</strong> FeraSetu does not store credit card numbers; payment data is transmitted directly to Stripe under PCI-DSS Level 1 compliance.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Domestic &amp; UPI Payment Processing — Razorpay Software Pvt. Ltd.</h3>
                  <p className="text-xs text-slate-600">
                    Domestic transactions, UPI payments, and Indian banking transfers are processed via <strong>Razorpay Software Pvt. Ltd.</strong> Payment credentials and KYC verifications are managed in accordance with Reserve Bank of India (RBI) regulations.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Edge Compute &amp; Database Hosting — Cloudflare Inc.</h3>
                  <p className="text-xs text-slate-600">
                    Platform APIs, serverless computing, and Cloudflare D1 distributed databases are hosted on <strong>Cloudflare Inc.</strong> for high-availability caching, DDoS mitigation, and encrypted database operations.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">Multilingual AI Inference — Sarvam AI</h3>
                  <p className="text-xs text-slate-600">
                    Multilingual text generation and regional voice prompts for store catalog setup are processed via <strong>Sarvam AI</strong> without using merchant data to train public foundation models.
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
                10. International Privacy Rights &amp; Right to Deletion (GDPR &amp; CCPA)
              </h2>
              <p>
                Regardless of your country of residence, FeraSetu complies with international data privacy baselines, including the European Union / United Kingdom General Data Protection Regulation (GDPR) and the California Consumer Privacy Act as amended by the California Privacy Rights Act (CCPA / CPRA).
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600 my-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Access / Know (GDPR Art. 15 / CCPA)</strong>
                  Request confirmation of whether your data is being processed, and obtain a copy of all personal data we maintain.
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Rectification (GDPR Art. 16)</strong>
                  Correct inaccurate or incomplete profile or business records at any time via your merchant dashboard.
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Data Portability (GDPR Art. 20)</strong>
                  Export your full product catalogs, order records, and settings in structured, machine-readable formats (CSV/JSON).
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">Right to Erasure &amp; Deletion (GDPR Art. 17 / CCPA)</strong>
                  Demand the immediate, permanent deletion of your account and all associated personal records across our systems.
                </div>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  How to Submit an Account &amp; Data Deletion Request
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  To request complete account deletion and data erasure, submit an email request to our Data Protection Officer at:
                </p>
                <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                  <Mail size={16} />
                  <a href="mailto:privacy@ferasetu.com?subject=Data%20Erasure%20Request" className="hover:underline">
                    privacy@ferasetu.com
                  </a>
                  <span className="text-xs text-slate-400 font-normal">(Subject: Data Erasure Request)</span>
                </div>
                <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                  <li><strong>Verification:</strong> We will verify your identity using your registered account email to safeguard against unauthorized requests.</li>
                  <li><strong>Timeline:</strong> All deletion requests are fulfilled within thirty (30) calendar days from verification without charge.</li>
                  <li><strong>Confirmation:</strong> You will receive a formal confirmation once all database records, authentication credentials, and session tokens have been permanently purged.</li>
                </ul>
              </div>
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

