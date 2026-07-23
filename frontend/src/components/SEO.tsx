import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://ferasetu.appwrite.network';
const DEFAULT_IMAGE = `${BASE_URL}/og-default.png`;

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'business.business';
  shopName?: string;
  structuredData?: Record<string, unknown>;
}

export default function SEO({
  title = 'FeraSetu — Your Shop\'s Digital Bridge',
  description = 'Build your shop website, manage products, and grow orders with AI. Dukaan ko online lao, orders WhatsApp par pao.',
  image = DEFAULT_IMAGE,
  url = BASE_URL,
  type = 'website',
  structuredData,
}: SEOProps) {
  const fullTitle = title.includes('FeraSetu') ? title : `${title} | FeraSetu`;
  const ogImage = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="FeraSetu" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Canonical */}
      <link rel="canonical" href={url} />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
