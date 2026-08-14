import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PublicFooter() {
  const { getLocalizedLink } = useLanguage();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <img src="/logo-official.png" alt="FeraSetu" loading="lazy" className="h-7 w-auto object-contain opacity-90" />
            </Link>
            <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed">
              Independent digital commerce for Indian small businesses. Own your customers, keep your profits.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="/#features" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Features</a></li>
              <li><Link to={getLocalizedLink('/pricing')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Pricing</Link></li>
              <li><a href="/#how-it-works" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">How it works</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Account</h4>
            <ul className="space-y-3">
              <li><Link to={getLocalizedLink('/login')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Sign In</Link></li>
              <li><Link to={getLocalizedLink('/register')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Create Free Store</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><Link to={getLocalizedLink('/privacy')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Privacy Policy</Link></li>
              <li><Link to={getLocalizedLink('/terms')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400 font-medium">
            © {new Date().getFullYear()} FeraSetu. All rights reserved.
          </p>
          <div className="flex gap-6">
            {/* Social links placeholder if any */}
          </div>
        </div>
      </div>
    </footer>
  );
}
