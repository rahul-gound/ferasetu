import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import type { PublicShopData } from '../types/template';
import TemplateRenderer from '../components/shop/TemplateRenderer';
import SEO from '../components/SEO';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = 'https://ferasetu.appwrite.network';
const DEFAULT_IMAGE = `${BASE_URL}/og-default.png`;

export default function ShopPage() {
  const params = useParams<{ shopName: string }>();
  
  // Logic to determine shop name:
  // 1. From URL params (e.g., /shop/my-kirana)
  // 2. From window.location.hostname (if it's not localhost or the main platform domain)
  const [shopName, setShopName] = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isMainPlatform = hostname.includes('fera-shop.fera-search.tech') || 
                           hostname.includes('fera-search.tech') ||
                           hostname.includes('app.github.dev') ||
                           hostname.includes('localhost');

    if (params.shopName) {
      setShopName(params.shopName);
    } else if (!isMainPlatform) {
      // If we are on a custom domain like mykiranastore.com
      setShopName(hostname);
    }
  }, [params.shopName]);

  const [data, setData] = useState<PublicShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopName) return;
    axios.get<PublicShopData>(`${API}/website/public/${shopName}`)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('Shop not found');
        } else {
          setError('Unable to load shop. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [shopName]);

  // Build structured data and SEO metadata from shop data
  const seoData = useMemo(() => {
    if (!data || !data.website.is_published) return null;

    const shop = data.shop;
    const firstProductImage = data.products?.[0]?.image_url;
    const ogImage = firstProductImage || DEFAULT_IMAGE;
    const shopUrl = `${BASE_URL}/shop/${shop.subdomain || shopName}`;
    const description = data.products?.length
      ? `${shop.name} — ${data.products.length} products available online. Shop now on FeraSetu!`
      : `${shop.name} — Online store powered by FeraSetu. Dukaan ko online lao, orders WhatsApp par pao.`;

    // LocalBusiness structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: shop.name,
      url: shopUrl,
      description,
      image: ogImage,
      ...(data.products?.length && {
        makesOffer: data.products.slice(0, 10).map((p) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: p.name,
            ...(p.image_url && { image: p.image_url }),
            ...(p.description && { description: p.description }),
            ...(p.price && { offers: { '@type': 'Offer', price: p.price, priceCurrency: 'INR' } }),
          },
        })),
      }),
    };

    return { shopUrl, ogImage, description, structuredData };
  }, [data, shopName]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            border: '4px solid #FF6B35', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#64748B', fontSize: '16px' }}>Loading store…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏪</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1E293B', marginBottom: '12px' }}>
            Shop Not Found
          </h1>
          <p style={{ color: '#64748B', fontSize: '16px', marginBottom: '24px' }}>
            {error || 'This shop does not exist or has been removed.'}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block', background: '#FF6B35', color: '#fff',
              padding: '12px 24px', borderRadius: '24px', textDecoration: 'none',
              fontWeight: 600, fontSize: '15px',
            }}
          >
            ← Back to FeraSetu
          </a>
        </div>
      </div>
    );
  }

  if (!data.website.is_published) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚧</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>
            This store is coming soon
          </h1>
          <p style={{ color: '#64748B', marginTop: '8px' }}>
            {data.shop.name} is not published yet. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {seoData && (
        <SEO
          title={`${data!.shop.name} — Online Store on FeraSetu`}
          description={seoData.description}
          image={seoData.ogImage}
          url={seoData.shopUrl}
          type="business.business"
          structuredData={seoData.structuredData}
        />
      )}
      <TemplateRenderer
        sections={data!.website.sections}
        products={data!.products}
        shopName={data!.shop.name}
        shopId={data!.shop.id}
      />
    </>
  );
}
