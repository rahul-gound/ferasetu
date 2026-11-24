import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRealtimeSync } from '../services/realtimeSync';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import type { PublicShopData } from '../types/template';
import TemplateRenderer from '../components/shop/TemplateRenderer';
import SEO from '../components/SEO';

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const BASE_URL = 'https://ferasetu.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-default.png`;

export const DEMO_SHARMA_KIRANA_STORE: PublicShopData = {
  shop: {
    id: 'shop_sharma_kirana',
    name: 'Sharma Kirana Store',
    subdomain: 'sharma-kirana',
    hostname: 'sharma-kirana.ferasetu.com',
  },
  website: {
    id: 'site_sharma_kirana',
    name: 'Sharma Kirana Store',
    template: 'market',
    is_published: 1,
    config: {
      tagline: 'Your Trusted Neighborhood Grocer Since 1998',
      description: 'Daily fresh groceries, staples, dairy & home essentials delivered to your doorstep in 30 minutes with 0% extra markup.',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      address: 'Shop No. 4, Gandhi Chowk, Station Road, Jaipur, Rajasthan 302001',
      announcement: '🎉 Free home delivery on all neighborhood orders above ₹299!',
      currency: 'INR',
      maintenance_mode: 0,
    },
    sections: [
      {
        id: 'sec_hero',
        type: 'hero',
        config: {
          title: 'Sharma Kirana Store',
          subtitle: 'Pure staples, fresh dairy, and trusted pantry essentials delivered to your counter or doorstep.',
          ctaText: 'Explore Groceries',
          badge: 'Verified Neighborhood Store',
        },
      },
      {
        id: 'sec_products',
        type: 'productGrid',
        config: {
          title: 'Daily Essentials & Groceries',
          showStock: true,
        },
      },
      {
        id: 'sec_contact',
        type: 'contact',
        config: {
          storeName: 'Sharma Kirana Store',
          address: 'Shop No. 4, Gandhi Chowk, Station Road, Jaipur, Rajasthan 302001',
          phone: '+91 98765 43210',
          hours: 'Open Daily: 7:00 AM – 10:00 PM',
        },
      },
    ],
  },
  products: [
    {
      id: 'prod_atta_1',
      name: 'Aashirvaad Shudh Chakki Atta (5 kg)',
      description: '100% whole wheat flour ground from heavy golden grains. Soft rotis guaranteed.',
      price: 240,
      sale_price: 240,
      category: 'Atta & Flour',
      stock_quantity: 45,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_rice_1',
      name: 'India Gate Feast Rozzana Basmati Rice (1 kg)',
      description: 'Long slender aromatic Basmati rice, aged for everyday delicious pulao and biryani.',
      price: 110,
      sale_price: 95,
      category: 'Rice & Grains',
      stock_quantity: 60,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_oil_1',
      name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre)',
      description: 'Light, healthy cooking oil enriched with Vitamins A & D. Heart-friendly choice.',
      price: 165,
      sale_price: 145,
      category: 'Oils & Ghee',
      stock_quantity: 30,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_ghee_1',
      name: 'Amul Pure Desi Ghee (1 Litre Tin)',
      description: 'Traditional granular aromatic cow ghee from Amul. Rich aroma and authentic taste.',
      price: 640,
      sale_price: 590,
      category: 'Oils & Ghee',
      stock_quantity: 22,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_salt_1',
      name: 'Tata Salt Vacuum Evaporated Iodized Salt (1 kg)',
      description: 'Desh Ka Namak. Pure vacuum evaporated iodized salt for balanced daily nutrition.',
      price: 30,
      sale_price: 28,
      category: 'Spices & Seasoning',
      stock_quantity: 120,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_tea_1',
      name: 'Tata Tea Gold CTC Leaf Blend (500g)',
      description: 'Exquisite blend of strong Assam CTC tea with gentle aromatic long leaves.',
      price: 310,
      sale_price: 265,
      category: 'Tea & Coffee',
      stock_quantity: 35,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_maggi_1',
      name: 'Maggi 2-Minute Masala Noodles (Pack of 4)',
      description: 'All-time favorite instant masala noodles crafted with 10 authentic Indian spices.',
      price: 60,
      sale_price: 56,
      category: 'Snacks & Quick Bites',
      stock_quantity: 80,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_biscuit_1',
      name: 'Parle-G Original Glucose Biscuits (Pack of 6)',
      description: 'The golden original glucose biscuits filled with goodness of milk and wheat.',
      price: 45,
      sale_price: 40,
      category: 'Snacks & Quick Bites',
      stock_quantity: 90,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_soap_1',
      name: 'Dettol Original Germ Protection Soap (Pack of 4)',
      description: 'Trusted antibacterial bath soap with classic pine fragrance for family hygiene.',
      price: 180,
      sale_price: 160,
      category: 'Personal Care',
      stock_quantity: 40,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1607006314646-9d227f295e86?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_surf_1',
      name: 'Surf Excel Easy Wash Detergent Powder (1 kg)',
      description: 'Superfast stain removal formula with superior foaming power that treats tough stains gently.',
      price: 155,
      sale_price: 140,
      category: 'Cleaning & Household',
      stock_quantity: 35,
      is_active: 1,
      image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80',
    },
  ],
};

export default function ShopPage() {
  const params = useParams<{ shopName: string }>();
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('product');
  const initialOrderId = searchParams.get('order') || searchParams.get('order_id') || searchParams.get('tracking');
  
  // Logic to determine shop name:
  // 1. From URL params (e.g., /shop/my-kirana)
  // 2. From window.location.hostname (if it's not localhost or the main platform domain)
  const initialShopName = useMemo(() => {
    if (params.shopName) return params.shopName;
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname.toLowerCase();
    
    // Check local subdomain (e.g. sharma-kirana.localhost)
    if (hostname.endsWith('.localhost') && hostname !== 'localhost') {
      return hostname.slice(0, -'.localhost'.length);
    }

    const platformDomains = ['ferasetu.com', 'ferasetu.store', 'fera-search.tech'];
    const isLocalOrPreview = hostname.includes('app.github.dev') || hostname === 'localhost' || hostname.includes('127.0.0.1');

    if (!isLocalOrPreview) {
      // Find which platform domain this belongs to, if any
      const matchingPlatform = platformDomains.find(domain => hostname === domain || hostname.endsWith(`.${domain}`));
      
      if (matchingPlatform && hostname !== matchingPlatform) {
        // It's a subdomain (e.g., shopA.ferasetu.com)
        return hostname.replace(`.${matchingPlatform}`, '');
      } else {
        // It's a custom domain (e.g., mykiranastore.com)
        return hostname;
      }
    }
    return null;
  }, [params.shopName]);

  const [shopName, setShopName] = useState<string | null>(initialShopName);

  useEffect(() => {
    setShopName(initialShopName);
  }, [initialShopName]);

  const [data, setData] = useState<PublicShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShopData = useCallback((silent = false) => {
    if (!shopName) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    
    const normalizedName = shopName.trim().toLowerCase();
    const isSharmaStore = normalizedName === 'sharma-kirana' || normalizedName === 'sharma-general-store' || normalizedName.includes('sharma');

    axios.get<PublicShopData>(`${API}/website/public/${shopName}`)
      .then(res => {
        if (res.data && res.data.shop) {
          setData(res.data);
        } else if (isSharmaStore) {
          setData(DEMO_SHARMA_KIRANA_STORE);
        } else {
          setError('Shop not found');
        }
      })
      .catch(err => {
        if (isSharmaStore) {
          setData(DEMO_SHARMA_KIRANA_STORE);
          return;
        }
        if (!silent) {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setError('Shop not found');
          } else {
            setError('Unable to load shop. Please try again.');
          }
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [shopName]);

  useEffect(() => {
    if (!shopName) {
      setLoading(false);
      setError('Shop name not provided. Please check the URL or specify a shop.');
      return;
    }
    fetchShopData(false);
  }, [shopName, fetchShopData]);

  // Real-time synchronization for storefront visitors
  useRealtimeSync({
    channel: 'storefront',
    shopName,
    onEvent: (event) => {
      // Whenever stock, price, availability, or products change in D1, update silently without full reload
      if (event.event_type.startsWith('product:')) {
        fetchShopData(true);
      }
    },
  });

  // Track real visitor storefront footfall
  useEffect(() => {
    if (data?.shop) {
      try {
        let sid = '';
        try {
          sid = sessionStorage.getItem('fs_visitor_session') || '';
          if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
            sessionStorage.setItem('fs_visitor_session', sid);
          }
        } catch {}
        const ownerId = (data.shop as any).user_id || (data.shop as any).organization_id || data.shop.id;
        axios.post(`${API}/analytics/events`, {
          event_type: 'shop_visit',
          user_id: ownerId,
          organization_id: (data.shop as any).organization_id || data.shop.id,
          event_data: {
            shop_id: data.shop.id,
            shop_name: data.shop.name,
            session_id: sid,
            referrer: typeof document !== 'undefined' ? (document.referrer || 'direct') : 'direct',
            path: typeof window !== 'undefined' ? window.location.pathname : '',
          }
        }).catch(() => {});
      } catch {}
    }
  }, [data]);

  // Build structured data and SEO metadata from shop data
  const seoData = useMemo(() => {
    const isPublished = Boolean(data?.website?.is_published);
    if (!data || !isPublished) return null;

    const shop = data.shop;
    const firstProductImage = data.products?.[0]?.image_url;
    const ogImage = firstProductImage || DEFAULT_IMAGE;
    const shopUrl = (typeof window !== 'undefined' && window.location.hostname !== 'ferasetu.com' && window.location.hostname !== 'localhost')
      ? window.location.origin
      : (shop.hostname ? `https://${shop.hostname}` : `${BASE_URL}/shop/${shop.subdomain || shopName}`);
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
        justifyContent: 'center', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            border: '4px solid #0052FF', borderTopColor: 'transparent',
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
        justifyContent: 'center', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
              display: 'inline-block', background: '#0052FF', color: '#fff',
              padding: '12px 24px', borderRadius: '14px', textDecoration: 'none',
              fontWeight: 600, fontSize: '15px',
            }}
          >
            ← Back to FeraSetu
          </a>
        </div>
      </div>
    );
  }

  // Store is considered open and published if:
  // 1. The website is marked published (default), OR
  // 2. The store has active products in its catalog.
  // It is ONLY considered unannounced/closed if explicitly placed into maintenance mode without products.
  const hasProducts = Array.isArray(data.products) && data.products.length > 0;
  const isExplicitlyClosed = Boolean(
    data.website?.is_published === 0 &&
    ((data.website?.config as any)?.maintenance_mode || (data.website?.config as any)?.is_closed)
  );
  const isPublished = (!isExplicitlyClosed) || hasProducts;

  if (!isPublished) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
          title={`${data!.shop.name}`}
          shopName={data!.shop.name}
          siteName={data!.shop.name}
          favicon={(data!.shop as any)?.favicon_url || (data as any)?.brand?.favicon_url || (data!.website.config as any)?.favicon || null}
          description={seoData.description}
          image={(data as any)?.brand?.social_image || (data as any)?.brand?.logo_url || (data!.shop as any).logo_url || seoData.ogImage}
          url={seoData.shopUrl}
          type="business.business"
          structuredData={seoData.structuredData}
        />
      )}
      {(() => {
        const shopMarket = (data!.shop as any)?.market || 'IN';
        const storeCurrency = (data!.shop as any)?.currency || (data!.website.config as any)?.currency || (shopMarket === 'US' ? 'USD' : shopMarket === 'EU' ? 'EUR' : 'INR');
        const storeCurrencySymbol = (data!.shop as any)?.currency_symbol || (data!.website.config as any)?.currency_symbol || (storeCurrency === 'USD' ? '$' : storeCurrency === 'EUR' ? '€' : '₹');
        const merchantLogo = (data!.shop as any).logo_url || (data as any)?.brand?.logo_url || (data!.website.config as any)?.logo || null;
        const isService = Boolean((data!.shop as any)?.is_service === 1 || (data!.shop as any)?.is_service === true || (data!.shop as any)?.isService === true || (data!.shop as any)?.business_type === 'service' || (data!.shop as any)?.businessType === 'service' || (data!.shop as any)?.category === 'coaching' || (data!.website.config as any)?.is_service === true || (data!.website.config as any)?.isService === true || (data!.website.config as any)?.businessType === 'service' || (data!.website.config as any)?.category === 'coaching');

        return (
          <TemplateRenderer
            isService={isService}
            businessType={isService ? 'service' : 'retail'}
            shop={data!.shop}
            sections={data!.website.sections}
            products={data!.products}
            shopName={data!.shop.name}
            shopId={data!.shop.id}
            shopPhone={(data!.shop as any).phone || (data!.website.config as any)?.phone}
            shopLogo={merchantLogo}
            currency={storeCurrency}
            currencySymbol={storeCurrencySymbol}
            theme={(data!.website as any).theme || data!.website.template}
            overrides={(data!.website as any).config?.overrides || (data!.website as any).theme?.overrides}
            initialProductId={initialProductId}
            initialOrderId={initialOrderId}
          />
        );
      })()}
    </>
  );
}
