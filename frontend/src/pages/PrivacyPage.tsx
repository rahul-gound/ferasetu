import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import PublicLayout from '../components/public/PublicLayout';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <SEO title="Privacy Policy — FeraSetu" description="Privacy Policy for FeraSetu users." url="https://ferasetu.com/privacy" type="website" />
      <div className="max-w-3xl mx-auto px-6 py-20 bg-white shadow-sm border border-slate-200 rounded-2xl my-12">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-8 transition-colors font-medium">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">Privacy Policy</h1>
        <div className="text-slate-600 space-y-8 leading-relaxed text-lg">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Data Ownership</h2>
            <p>At FeraSetu, we believe your data is yours. The customer information, order history, and product details you collect through your store belong entirely to you.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, such as your name, email address, phone number, and business details. We also collect usage data to improve our platform's performance.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to operate, maintain, and improve our services. We do not sell your personal information or your customers' data to third parties.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Data Portability</h2>
            <p>You have the right to request a full export of your store data at any time. We provide tools within the dashboard to download your catalog and order history in standard formats.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@ferasetu.com" className="text-blue-600 hover:underline">support@ferasetu.com</a>.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
