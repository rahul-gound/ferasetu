/**
 * PublicFooter — Improved with positioning tagline, Fera AI link,
 * support info, and dynamic copyright year.
 */
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export default function PublicFooter() {
  const { getLocalizedLink, translate: t } = useLanguage();
  const { register, login } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-5">
              <img
                src="/logo-official.png"
                alt="FeraSetu"
                loading="lazy"
                className="h-7 w-auto object-contain opacity-90"
              />
            </Link>
            <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed mb-4">
              Your own online store. Your customers. Your profits.
            </p>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Built for Indian shopkeepers who want to sell directly — without marketplace commissions or technical complexity.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/#features"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  {t('nav.features')}
                </a>
              </li>
              <li>
                <a
                  href="/#how-it-works"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  {t('nav.howItWorks')}
                </a>
              </li>
              <li>
                <a
                  href="/#fera-ai"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium flex items-center gap-1.5"
                >
                  <Sparkles size={12} className="text-purple-500" />
                  Fera AI
                </a>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/pricing')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  {t('nav.pricing')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Account</h4>
            <ul className="space-y-3">
              <li>
                <button
                  type="button"
                  onClick={() => register()}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium text-left cursor-pointer"
                >
                  Create Free Store
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => login()}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium text-left cursor-pointer"
                >
                  {t('nav.signIn')}
                </button>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/pricing')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  View Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal + Support */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-4">Help & Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to={getLocalizedLink('/privacy')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to={getLocalizedLink('/terms')}
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@ferasetu.com"
                  className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-400 font-medium">
            © {year} FeraSetu. All rights reserved. · Made with ❤️ in India 🇮🇳
          </p>
          <p className="text-xs text-slate-400 font-medium">
            Transparent pricing · No commissions · Your data stays in India
          </p>
        </div>
      </div>
    </footer>
  );
}
