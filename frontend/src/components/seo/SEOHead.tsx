import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SUPPORTED_LANGUAGES, getLanguagePath } from '../../i18n';
import { useLanguage } from '../../contexts/LanguageContext';

const BASE_URL = 'https://ferasetu.com';
const DEFAULT_IMAGE = `${BASE_URL}/logo-official.png`;

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  siteName?: string;
  shopName?: string;
  favicon?: string;
  noindex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Sovereign Global Organization + WebSite + SoftwareApplication JSON-LD Schemas.
 * Typo variants like "erasetu" and lexical variants ("Fera Setu", "FeraSetu Commerce")
 * are strictly placed inside `alternateName` for entity resolution without visible UI pollution.
 */
export const GLOBAL_ORGANIZATION_SCHEMA = {
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'FeraSetu',
  legalName: 'FeraSetu Technologies',
  alternateName: ['Fera Setu', 'FeraSetu Commerce', 'ferasetu.com', 'erasetu'],
  url: `${BASE_URL}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/logo-official.png`,
    width: 512,
    height: 512,
  },
  description:
    'Sovereign B2B digital commerce infrastructure for independent retailers, grocers, and brands with 0% platform commission.',
  email: 'support@ferasetu.com',
  sameAs: [
    'https://twitter.com/ferasetu',
    'https://linkedin.com/company/ferasetu',
    'https://github.com/ferasetu',
  ],
};

export const GLOBAL_WEBSITE_SCHEMA = {
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  url: `${BASE_URL}/`,
  name: 'FeraSetu',
  alternateName: ['Fera Setu', 'FeraSetu Commerce', 'erasetu'],
  publisher: {
    '@id': `${BASE_URL}/#organization`,
  },
};

export const GLOBAL_SOFTWARE_APP_SCHEMA = {
  '@type': 'SoftwareApplication',
  '@id': `${BASE_URL}/#software`,
  name: 'FeraSetu',
  alternateName: ['Fera Setu', 'FeraSetu Commerce', 'erasetu'],
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${BASE_URL}/`,
  description:
    'Sovereign B2B commerce infrastructure platform enabling independent retailers to operate branded online stores with 0% platform commission, direct payment settlement, unmasked customer relationships, and Cloudflare edge serverless performance.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    category: 'Free Forever Tier',
  },
};

export default function SEOHead({
  title,
  description,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  siteName,
  shopName,
  favicon,
  noindex = false,
  breadcrumbs,
  structuredData,
}: SEOHeadProps) {
  const { language, translate } = useLanguage();
  const location = useLocation();

  const finalNoIndex = noindex ?? false;

  // Compute final title & description
  const fallbackTitle = shopName ? shopName : translate('seo.landing.title');
  const rawTitle = title || fallbackTitle;
  const effectiveSiteName = siteName || shopName || 'FeraSetu';

  let fullTitle = rawTitle;
  if (shopName) {
    fullTitle = rawTitle.includes(shopName) ? rawTitle : `${rawTitle} | ${shopName}`;
  } else {
    fullTitle = rawTitle.includes('FeraSetu') ? rawTitle : `${rawTitle} | FeraSetu`;
  }

  const finalDesc =
    description ||
    translate('seo.landing.desc') ||
    'Run your own branded online store, receive direct customer orders, and keep what you make after payment processing. 0% FeraSetu platform commission.';

  const ogImage = image || DEFAULT_IMAGE;

  // Normalized canonical URL with trailing slash convention
  const cleanPath = location.pathname.replace(/\/$/, '') || '/';
  const canonicalSubpath = cleanPath === '/' ? '/' : `${cleanPath}/`;
  const currentUrl = url || `${BASE_URL}${canonicalSubpath}`;

  // Bidirectional Hreflang alternates
  const isPublicRoute =
    !cleanPath.includes('/dashboard') &&
    !cleanPath.includes('/admin') &&
    !cleanPath.includes('/settings') &&
    !cleanPath.includes('/onboarding');
  const publishedLanguages = SUPPORTED_LANGUAGES.filter((l) => l.status === 'published');
  const shouldGenerateLanguageAlternates = isPublicRoute && !finalNoIndex;

  // Optional BreadcrumbList schema
  const breadcrumbSchema =
    breadcrumbs && breadcrumbs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((crumb, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: crumb.name,
            item: crumb.url.startsWith('http') ? crumb.url : `${BASE_URL}${crumb.url}`,
          })),
        }
      : null;

  // Assemble graph of structured data
  const combinedGraph: Record<string, unknown>[] = [
    GLOBAL_ORGANIZATION_SCHEMA,
    GLOBAL_WEBSITE_SCHEMA,
    GLOBAL_SOFTWARE_APP_SCHEMA,
  ];

  if (breadcrumbSchema) {
    combinedGraph.push(breadcrumbSchema);
  }

  if (structuredData) {
    if (Array.isArray(structuredData)) {
      combinedGraph.push(...structuredData);
    } else {
      combinedGraph.push(structuredData);
    }
  }

  const rootStructuredData = {
    '@context': 'https://schema.org',
    '@graph': combinedGraph,
  };

  return (
    <Helmet htmlAttributes={{ lang: language }}>
      {/* Primary HTML Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="robots" content={finalNoIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Canonical Link */}
      <link rel="canonical" href={currentUrl} />

      {/* OpenGraph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={effectiveSiteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ferasetu" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={ogImage} />

      {/* Favicon & Web Manifest */}
      {favicon ? (
        <>
          <link
            rel="icon"
            href={favicon}
            type={favicon.endsWith('.png') ? 'image/png' : favicon.endsWith('.ico') ? 'image/x-icon' : undefined}
          />
          <link rel="shortcut icon" href={favicon} />
          <link rel="apple-touch-icon" href={favicon} />
        </>
      ) : (
        <>
          <link rel="icon" type="image/x-icon" href="/favicon.ico" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/site.webmanifest" />
        </>
      )}

      {/* Multi-region Hreflang alternates */}
      {shouldGenerateLanguageAlternates &&
        publishedLanguages.map((lang) => {
          const langPath = getLanguagePath(cleanPath, lang.code);
          const normalizedLangPath = langPath === '/' ? '/' : `${langPath.replace(/\/$/, '')}/`;
          return (
            <link
              key={lang.code}
              rel="alternate"
              hrefLang={lang.code}
              href={`${BASE_URL}${normalizedLangPath}`}
            />
          );
        })}

      {shouldGenerateLanguageAlternates && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${BASE_URL}${
            getLanguagePath(cleanPath, 'en') === '/' ? '/' : `${getLanguagePath(cleanPath, 'en').replace(/\/$/, '')}/`
          }`}
        />
      )}

      {/* JSON-LD Structured Data Schema */}
      <script type="application/ld+json">{JSON.stringify(rootStructuredData)}</script>
    </Helmet>
  );
}
