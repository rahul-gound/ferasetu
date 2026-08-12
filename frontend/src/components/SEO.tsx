import { Helmet } from 'react-helmet-async';
import { SUPPORTED_LANGUAGES, getLanguagePath } from '../i18n';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const BASE_URL = 'https://ferasetu.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-default.png`;

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'product' | 'business.business';
  shopName?: string;
  structuredData?: Record<string, unknown>;
  noindex?: boolean;
}

export default function SEO({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = 'website',
  structuredData,
  noindex = false,
}: SEOProps) {
  const { language, translate } = useLanguage();
  const location = useLocation();
  
  // Find current language config
  const currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === language);
  // Force noindex if current language is a draft
  const isDraftLanguage = currentLangConfig?.status === 'draft';
  const finalNoIndex = noindex || isDraftLanguage;

  // Use translated defaults if props aren't provided
  const finalTitle = title || translate('seo.landing.title');
  const finalDesc = description || translate('seo.landing.desc');
  const fullTitle = finalTitle.includes('FeraSetu') ? finalTitle : `${finalTitle} | FeraSetu`;
  const ogImage = image || DEFAULT_IMAGE;

  // Calculate canonical and hreflang URLs
  const cleanPath = location.pathname.replace(/\/$/, '') || '/';
  
  // Determine if it's a public route for hreflang generation
  const isPublicRoute = !cleanPath.includes('/dashboard') && !cleanPath.includes('/admin') && !cleanPath.includes('/settings');
  
  const currentUrl = `${BASE_URL}${cleanPath}`;

  const publishedLanguages = SUPPORTED_LANGUAGES.filter(l => l.status === 'published');

  return (
    <Helmet htmlAttributes={{ lang: language }}>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      {finalNoIndex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="FeraSetu" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={ogImage} />

      {/* Canonical URL matches exact language URL */}
      <link rel="canonical" href={currentUrl} />

      {/* Bidirectional Hreflang Tags (only for published public pages) */}
      {isPublicRoute && publishedLanguages.map(lang => {
        const langPath = getLanguagePath(cleanPath, lang.code);
        const hreflangUrl = `${BASE_URL}${langPath}`;
        return (
          <link key={lang.code} rel="alternate" hreflang={lang.code} href={hreflangUrl} />
        );
      })}
      
      {isPublicRoute && (
        <link rel="alternate" hreflang="x-default" href={`${BASE_URL}${getLanguagePath(cleanPath, 'en')}`} />
      )}

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
