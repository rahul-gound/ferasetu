import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#060818] text-white selection:bg-[#FF6B35] selection:text-white font-sans">
      <SEO title="Privacy Policy — FeraSetu" description="Privacy Policy for FeraSetu users." url="https://ferasetu.com/privacy" type="website" />
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="text-white/70 space-y-6 leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Data Ownership</h2>
            <p>At FeraSetu, we believe your data is yours. The customer information, order history, and product details you collect through your store belong entirely to you.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, such as your name, email address, phone number, and business details. We also collect usage data to improve our platform's performance.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to operate, maintain, and improve our services. We do not sell your personal information or your customers' data to third parties.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Portability</h2>
            <p>You have the right to request a full export of your store data at any time. We provide tools within the dashboard to download your catalog and order history in standard formats.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at support@ferasetu.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
