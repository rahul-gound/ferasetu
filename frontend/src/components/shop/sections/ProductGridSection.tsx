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

  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          style={{ width: '100%', height: '180px', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '180px',
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '48px', fontWeight: 700, color: accentColor,
        }}>
          {initials}
        </div>
      )}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', marginBottom: '8px', lineHeight: 1.3 }}>
          {product.name}
        </h3>
        {product.description && (
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '10px', lineHeight: 1.5, flex: 1 }}>
            {product.description.slice(0, 80)}{product.description.length > 80 ? '…' : ''}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {product.sale_price != null ? (
            <>
              <span style={{ fontSize: '18px', fontWeight: 700, color: accentColor }}>
                ₹{product.sale_price.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '14px', color: '#94A3B8', textDecoration: 'line-through' }}>
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '18px', fontWeight: 700, color: accentColor }}>
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {showStock && (
          <div style={{ marginBottom: '10px' }}>
            {product.stock_quantity > 0 ? (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                borderRadius: '10px', background: 'rgba(16,185,129,0.12)', color: '#059669',
              }}>
                ✓ In Stock ({product.stock_quantity})
              </span>
            ) : (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                borderRadius: '10px', background: 'rgba(239,68,68,0.12)', color: '#DC2626',
              }}>
                Out of Stock
              </span>
            )}
          </div>
        )}
        <button
          disabled={product.stock_quantity === 0}
          style={{
            background: product.stock_quantity === 0 ? '#CBD5E1' : accentColor,
            color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px', cursor: product.stock_quantity === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '14px', marginTop: 'auto',
          }}
        >
          {product.stock_quantity === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  );
}

export default function ProductGridSection({ config, products }: ProductGridSectionProps) {
  const title = (config.title as string) || 'Our Products';
  const accentColor = (config.accentColor as string) || '#FF6B35';
  const showStock = !!(config.showStock as boolean | undefined);
  const activeProducts = products.filter(p => p.is_active === 1);

  return (
    <section id="products" style={{ padding: '60px 24px', background: '#F8FAFC' }}>
      <h2 style={{
        textAlign: 'center', fontSize: '32px', fontWeight: 800,
        color: '#1E293B', marginBottom: '40px',
      }}>
        {title}
      </h2>
      {activeProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛍️</div>
          <p style={{ fontSize: '16px', fontWeight: 600 }}>No products available yet</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px', maxWidth: '1200px', margin: '0 auto',
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
    </section>
  );
}
