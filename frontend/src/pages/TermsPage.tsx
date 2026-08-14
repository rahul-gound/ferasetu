import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';

export default function TermsPage() {
  return (
    <PublicLayout>
      <SEO title="Terms of Service — FeraSetu" description="Terms of Service for FeraSetu users." url="https://ferasetu.com/terms" type="website" />
      <div className="max-w-3xl mx-auto px-6 py-20 bg-white shadow-sm border border-slate-200 rounded-2xl my-12">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-8 transition-colors font-medium">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">Terms of Service</h1>
        <div className="text-slate-600 space-y-8 leading-relaxed text-lg">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
            <p>Welcome to FeraSetu. By accessing or using our platform, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Your Independent Store</h2>
            <p>FeraSetu provides infrastructure for you to run your digital store. You retain full ownership of your store data, customer relationships, and profits. We do not act as a marketplace or intermediary between you and your customers.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Account Responsibilities</h2>
            <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You must maintain accurate business information on your storefront.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Subscriptions and Payments</h2>
            <p>Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis. You may cancel your subscription at any time without hidden penalties.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Termination</h2>
            <p>We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
