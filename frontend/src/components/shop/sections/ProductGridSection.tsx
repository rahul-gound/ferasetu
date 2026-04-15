import type { SectionConfig, ShopProduct } from '../../../types/template';

interface ProductGridSectionProps {
  config: SectionConfig;
  products: ShopProduct[];
}

function ProductCard({ product, accentColor, showStock }: {
  product: ShopProduct;
  accentColor: string;
  showStock: boolean;
}) {
  const initials = product.name.charAt(0).toUpperCase();
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const discount = hasSale ? Math.round(((product.price - product.sale_price!) / product.price) * 100) : 0;

  return (
    <div className="fera-product-card" style={{
      background: '#fff', borderRadius: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'all 0.3s ease', position: 'relative',
      border: '1px solid #f1f5f9',
    }}>
      <style>{`
        .fera-product-card:hover { transform: translateY(-8px); boxShadow: 0 12px 30px rgba(0,0,0,0.12); border-color: ${accentColor}33; }
        .fera-product-badge { position: absolute; top: 12px; left: 12px; z-index: 5; padding: 4px 10px; borderRadius: 8px; fontSize: 11px; fontWeight: 800; color: #fff; text-transform: uppercase; }
        .fera-whatsapp-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border-radius: 12px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; margin-top: auto; }
      `}</style>
      
      {hasSale && (
        <div className="fera-product-badge" style={{ background: '#EF4444' }}>{discount}% OFF</div>
      )}

      {product.image_url ? (
        <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        <div style={{
          width: '100%', height: '200px',
          background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '64px', fontWeight: 800, color: accentColor, opacity: 0.8
        }}>
          {initials}
        </div>
      )}
      
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          {product.category || 'General'}
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>
          {product.name}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
          {hasSale ? (
            <>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                ₹{product.sale_price!.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 500 }}>
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {showStock && (
          <div style={{ marginBottom: '16px' }}>
            <span style={{
              fontSize: '12px', fontWeight: 600, padding: '4px 10px',
              borderRadius: '20px', 
              background: product.stock_quantity > 0 ? '#f0fdf4' : '#fef2f2', 
              color: product.stock_quantity > 0 ? '#16a34a' : '#dc2626',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
              {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
            </span>
          </div>
        )}

        <button
          className="fera-whatsapp-btn"
          disabled={product.stock_quantity === 0}
          style={{
            background: product.stock_quantity === 0 ? '#f1f5f9' : '#25D366',
            color: product.stock_quantity === 0 ? '#94a3b8' : '#fff',
            cursor: product.stock_quantity === 0 ? 'not-allowed' : 'pointer',
          }}
          onClick={() => {
             const message = encodeURIComponent(`Namaste! I want to order: ${product.name} (Qty: 1) for ₹${product.sale_price || product.price}`);
             window.open(`https://wa.me/91XXXXXXXXXX?text=${message}`, '_blank');
          }}
        >
          {product.stock_quantity === 0 ? 'Out of Stock' : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Order on WhatsApp
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ProductGridSection({ config, products }: ProductGridSectionProps) {
  const title = (config.title as string) || 'Our Products';
  const accentColor = (config.accentColor as string) || '#FF6B35';
  const showStock = config.showStock !== false;
  const activeProducts = products.filter(p => p.is_active === 1);

  return (
    <section id="products" style={{ padding: '80px 24px', background: '#fcfcfd' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '2px', background: `${accentColor}10`, padding: '8px 16px', borderRadius: '30px' }}>
            🛍️ Fresh Inventory
          </span>
          <h2 style={{
            fontSize: 'clamp(32px, 4vw, 42px)', fontWeight: 900,
            color: '#0f172a', marginTop: '16px', letterSpacing: '-1px'
          }}>
            {title}
          </h2>
          <div style={{ width: '60px', height: '4px', background: accentColor, margin: '20px auto', borderRadius: '2px' }} />
        </div>

        {activeProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 24px', background: '#fff', borderRadius: '30px', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏪</div>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Our store is getting restocked!</p>
            <p style={{ fontSize: '16px', color: '#64748b' }}>We'll have new products for you very soon.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '32px',
          }}>
            {activeProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                accentColor={accentColor}
                showStock={showStock}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
