import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import type { PublicShopData } from '../types/template';
import TemplateRenderer from '../components/shop/TemplateRenderer';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    document.title = `${shopName} — Powered by FeraSetu`;
    axios.get<PublicShopData>(`${API}/website/public/${shopName}`)
      .then(res => {
        setData(res.data);
        document.title = `${res.data.shop.name} — Powered by FeraSetu`;
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
    <TemplateRenderer
      sections={data.website.sections}
      products={data.products}
      shopName={data.shop.name}
      shopId={data.shop.id}
    />
  );
}
