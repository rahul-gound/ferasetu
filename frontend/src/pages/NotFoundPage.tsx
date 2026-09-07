import { Link } from 'react-router-dom';
import { Compass, ArrowRight, LayoutDashboard, Store, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicFooter from '../components/public/PublicFooter';

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <SEO
        title="404 — Page Not Found • FeraSetu"
        description="The page you are looking for does not exist or has moved."
        noindex
      />

      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-xl mx-auto text-center">
          {/* Compass & Store Graphic Motif */}
          <div className="relative mx-auto mb-8 w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-blue-50 border border-blue-100 rotate-6 transition-transform" />
            <div className="absolute inset-0 rounded-3xl bg-amber-50 border border-amber-100 -rotate-3 transition-transform" />
            <div className="relative w-24 h-24 rounded-2xl bg-white shadow-xl shadow-slate-200/60 border border-slate-100 flex items-center justify-center">
              <Compass size={44} className="text-blue-600 animate-spin-slow" />
              <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-amber-500 text-white shadow-md">
                <Store size={18} />
              </div>
            </div>
          </div>

          {/* Error Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider mb-4">
            404 Error • Store Route Not Found
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Looks like this store page took a wrong turn.
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist, was renamed, or has moved to a new address.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
            <Link
              to="/"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-blue-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Back to FeraSetu</span>
              <ArrowRight size={16} />
            </Link>

            {user && (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-slate-900 text-white font-bold text-sm sm:text-base hover:bg-slate-800 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <LayoutDashboard size={16} />
                <span>Go to Dashboard</span>
              </Link>
            )}
          </div>

          {/* Help Links */}
          <div className="border-t border-slate-100 pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <Link to="/pricing" className="hover:text-blue-600 transition-colors">Pricing Plans</Link>
            <span>•</span>
            <Link to="/#how-it-works" className="hover:text-blue-600 transition-colors">How FeraSetu Works</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
            <span>•</span>
            <a href="mailto:support@ferasetu.com" className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors">
              <HelpCircle size={13} />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
