import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PublicFooter() {
  const { getLocalizedLink, translate: t } = useLanguage();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <img src="/logo-official.png" alt="FeraSetu" loading="lazy" className="h-7 w-auto object-contain opacity-90" />
            </Link>
            <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">{t('footer.product')}</h4>
            <ul className="space-y-3">
              <li><a href="/#features" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">{t('nav.features')}</a></li>
              <li><Link to={getLocalizedLink('/pricing')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">{t('nav.pricing')}</Link></li>
              <li><a href="/#how-it-works" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">{t('nav.howItWorks')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">{t('footer.account')}</h4>
            <ul className="space-y-3">
              <li><Link to={getLocalizedLink('/login')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">{t('nav.signIn')}</Link></li>
              <li><Link to={getLocalizedLink('/register')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">{t('footer.createStore')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-3">
              <li><Link to={getLocalizedLink('/privacy')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">{t('footer.privacy')}</Link></li>
              <li><Link to={getLocalizedLink('/terms')} className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">{t('footer.terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400 font-medium">
            {t('footer.rights', { year: new Date().getFullYear().toString() })}
          </p>
          <div className="flex gap-6">
            {/* Social links placeholder if any */}
          </div>
        </div>
      </div>
    </footer>
  );
}
