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
  url?: string;
  type?: 'website' | 'product' | 'business.business';
  shopName?: string;
  siteName?: string;
  favicon?: string;
  structuredData?: Record<string, unknown>;
  noindex?: boolean;
}

export default function SEO({
  title,
  description,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  shopName,
  siteName,
  favicon,
  structuredData,
  noindex = false,
}: SEOProps) {
  const { language, translate } = useLanguage();
  const location = useLocation();
  
  const finalNoIndex = noindex ?? false;

  // Use translated defaults if props aren't provided
  const finalTitle = title || (shopName ? shopName : translate('seo.landing.title'));
  const finalDesc = description || translate('seo.landing.desc');
  const effectiveSiteName = siteName || shopName || 'FeraSetu';
  
  // Independent store branding: If shopName is provided, never force "FeraSetu" branding
  let fullTitle = finalTitle;
  if (shopName) {
    fullTitle = finalTitle.includes(shopName) ? finalTitle : `${finalTitle} | ${shopName}`;
  } else {
    fullTitle = finalTitle.includes('FeraSetu') ? finalTitle : `${finalTitle} | FeraSetu`;
  }
  const ogImage = image || DEFAULT_IMAGE;

  // Calculate canonical and hreflang URLs
  const cleanPath = location.pathname.replace(/\/$/, '') || '/';
  
  // Determine if it's a public route for hreflang generation
  const isPublicRoute = !cleanPath.includes('/dashboard') && !cleanPath.includes('/admin') && !cleanPath.includes('/settings');
  
  const currentUrl = url || `${BASE_URL}${cleanPath}`;

  const publishedLanguages = SUPPORTED_LANGUAGES.filter(l => l.status === 'published');
  const shouldGenerateLanguageAlternates = isPublicRoute && !finalNoIndex;

  return (
    <Helmet htmlAttributes={{ lang: language }}>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="robots" content={finalNoIndex ? "noindex, nofollow" : "index, follow"} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={effectiveSiteName} />

      {/* Favicon & Icons */}
      {favicon ? (
        <>
          <link rel="icon" href={favicon} type={favicon.endsWith('.png') ? 'image/png' : favicon.endsWith('.ico') ? 'image/x-icon' : undefined} />
          <link rel="shortcut icon" href={favicon} />
          <link rel="apple-touch-icon" href={favicon} />
        </>
      ) : (
        <link rel="icon" href="/favicon.ico" />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={ogImage} />

      {/* Canonical URL matches exact language URL */}
      <link rel="canonical" href={currentUrl} />

      {/* Bidirectional Hreflang Tags (only for published public pages) */}
      {shouldGenerateLanguageAlternates && publishedLanguages.map(lang => {
        const langPath = getLanguagePath(cleanPath, lang.code);
        const hreflangUrl = `${BASE_URL}${langPath}`;
        return (
          <link key={lang.code} rel='alternate' hrefLang={lang.code} href={hreflangUrl} />
        );
      })}
      
      {shouldGenerateLanguageAlternates && (
        <link rel='alternate' hrefLang='x-default' href={`${BASE_URL}${getLanguagePath(cleanPath, 'en')}`} />
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
