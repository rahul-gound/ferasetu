import { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, X, Check, Phone, MapPin, Truck, 
  Package, ExternalLink, CreditCard, Wallet, Mail, 
  ShoppingCart, Plus, Minus, Trash2, ArrowRight
} from 'lucide-react';
import type { SectionConfig, ShopProduct } from '../../../types/template';

const API = import.meta.env.VITE_API_URL || '/api';

interface ProductGridSectionProps {
  config: SectionConfig;
  products: ShopProduct[];
  shopId: string;
  shopPhone?: string;
}

interface CartItem extends ShopProduct {
  quantity: number;
}

function ProductCard({ product, accentColor, showStock, onBuyNow, onAddToCart, shopPhone }: {
  product: ShopProduct;
  accentColor: string;
  showStock: boolean;
  onBuyNow: (p: ShopProduct) => void;
  onAddToCart: (p: ShopProduct) => void;
  shopPhone: string;
}) {
  const initials = product.name.charAt(0).toUpperCase();
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const discount = hasSale ? Math.round(((product.price - product.sale_price!) / product.price) * 100) : 0;
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <>
      <style>{`
        .fera-product-card {
          animation: fadeInUp 0.6s ease-out backwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="fera-product-card" style={{
        background: '#fff', borderRadius: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'all 0.3s ease', position: 'relative',
        border: '1px solid #f1f5f9',
        opacity: isOutOfStock ? 0.8 : 1
      }}>
      
      {hasSale && (
        <div className="fera-product-badge" style={{ background: '#EF4444', animation: 'pulse 2s infinite' }}>{discount}% OFF</div>
      )}

      {isOutOfStock && (
        <div className="fera-product-badge" style={{ background: '#64748b', left: 'auto', right: '12px' }}>OUT OF STOCK</div>
      )}

      {product.image_url ? (
        <div style={{ position: 'relative', height: '200px', overflow: 'hidden', background: '#f5f7fa' }}>
          <img
            src={product.image_url}
            alt={product.name}
            style={{ 
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
            onLoad={(e) => { e.currentTarget.style.animation = 'fadeIn 0.4s ease'; }}
          />
        </div>
      ) : (
        <div style={{
          width: '100%', height: '200px',
          background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '64px', fontWeight: 800, color: accentColor, opacity: 0.8,
          transition: 'all 0.3s ease',
        }}>
          {initials}
        </div>
      )}
      
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
          {product.category || 'General'}
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', lineHeight: 1.4, minHeight: '44px' }}>
          {product.name}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {hasSale ? (
            <>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
                ₹{product.sale_price!.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '15px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {showStock && (
          <div style={{ marginBottom: '16px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '4px 8px',
              borderRadius: '20px', 
              background: !isOutOfStock ? '#f0fdf4' : '#fef2f2', 
              color: !isOutOfStock ? '#16a34a' : '#dc2626',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
              {!isOutOfStock ? `Availability: ${product.stock_quantity} Left` : 'Sold Out'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
             <button
               className="fera-action-btn btn-buy"
               disabled={isOutOfStock}
               style={{ opacity: isOutOfStock ? 0.5 : 1 }}
               onClick={() => onBuyNow(product)}
             >
               Buy Now
             </button>
             <button
               className="fera-action-btn btn-cart"
               disabled={isOutOfStock}
               style={{ opacity: isOutOfStock ? 0.5 : 1 }}
               onClick={() => onAddToCart(product)}
             >
               <ShoppingCart size={16} /> Cart
             </button>
          </div>
          
          <button
            className="fera-action-btn btn-wa"
            onClick={() => {
               const phone = shopPhone.replace(/\D/g, '') || '91XXXXXXXXXX';
               const message = encodeURIComponent(`Namaste! I'm interested in: ${product.name}\nPrice: ₹${product.sale_price || product.price}\nIs it available?`);
               window.open(`https://wa.me/${phone.startsWith('91') ? phone : '91'+phone}?text=${message}`, '_blank');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Inquiry on WhatsApp
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

export default function ProductGridSection({ config, products, shopId, shopPhone = '' }: ProductGridSectionProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{ id: string; invoice: string; deliveryCode: string; paymentOtp: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    deliveryType: 'pickup',
    paymentMethod: 'offline'
  });

  const title = (config.title as string) || 'Our Products';
  const accentColor = (config.accentColor as string) || '#FF6B35';
  const showStock = config.showStock !== false;
  const activeProducts = products.filter(p => p.is_active === 1);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
  }, [cart]);

  const addToCart = (product: ShopProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast_success(`${product.name} added to cart!`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        // Cap at stock
        const product = products.find(p => p.id === productId);
        if (product && newQty > product.stock_quantity) {
           toast_error(`Only ${product.stock_quantity} units available`);
           return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleBuyNow = (product: ShopProduct) => {
    setCart([{ ...product, quantity: 1 }]);
    setIsCheckingOut(true);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsOrdering(true);
    try {
      const res = await axios.post(`${API}/orders/create`, {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        deliveryAddress: formData.address,
        deliveryType: formData.deliveryType,
        paymentMethod: formData.paymentMethod,
        shopId: shopId,
        items: cart.map(item => ({ productId: item.id, quantity: item.quantity }))
      });
      
      setOrderComplete({
        id: res.data.order.id,
        invoice: res.data.invoiceNumber,
        deliveryCode: res.data.order.deliveryCode,
        paymentOtp: res.data.order.paymentOtp
      });
      setCart([]); // Clear cart
    } catch (err) {
      console.error('Order failed', err);
      alert('Sorry, there was an error placing your order. Please check stock levels.');
    } finally {
      setIsOrdering(false);
    }
  };

  // Helper for simple toast
  const toast_success = (msg: string) => {
    const el = document.createElement('div');
    el.innerText = msg;
    el.style.cssText = `position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#10B981; color:white; padding:12px 24px; border-radius:30px; z-index:9999; font-weight:700; box-shadow:0 10px 20px rgba(0,0,0,0.1); animation: slideUp 0.3s ease-out;`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 2000);
  };

  const toast_error = (msg: string) => {
    const el = document.createElement('div');
    el.innerText = msg;
    el.style.cssText = `position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#EF4444; color:white; padding:12px 24px; border-radius:30px; z-index:9999; font-weight:700; box-shadow:0 10px 20px rgba(0,0,0,0.1); animation: slideUp 0.3s ease-out;`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 2000);
  };

  return (
    <section id="products" style={{ padding: 'clamp(40px, 8vw, 80px) 24px', background: '#fcfcfd' }}>
      <style>{`
        .fera-product-card:hover { transform: translateY(-8px); box-shadow: 0 12px 30px rgba(0,0,0,0.12); border-color: ${accentColor}33; }
        .fera-product-badge { position: absolute; top: 12px; left: 12px; z-index: 5; padding: 4px 10px; borderRadius: 8px; fontSize: 11px; fontWeight: 800; color: #fff; text-transform: uppercase; }
        .fera-action-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 16px; border-radius: 10px; border: none; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; min-height: 48px; }
        .btn-buy { background: ${accentColor}; color: #fff; }
        .btn-cart { background: ${accentColor}15; color: ${accentColor}; border: 1px solid ${accentColor}33; }
        .btn-wa { background: #fff; color: #25D366; border: 1.5px solid #25D366; }
        .fera-action-btn:active { transform: scale(0.98); }
        @keyframes slideUp { from { transform: translate(-50%, 40px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .fera-checkout-modal { animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <span style={{ fontSize: 'clamp(12px, 2vw, 13px)', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '2px', background: `${accentColor}10`, padding: '8px 16px', borderRadius: '30px', display: 'inline-block', marginBottom: '16px' }}>
             Browse Store
          </span>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: 900, color: '#0f172a', marginTop: '12px', letterSpacing: '-1px' }}>{title}</h2>
          <div style={{ width: '60px', height: '4px', background: accentColor, margin: '20px auto', borderRadius: '2px' }} />
        </div>

        {activeProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
            <Package size={48} style={{ marginBottom: '16px', color: '#cbd5e1' }} />
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Store is getting restocked!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
            {activeProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                accentColor={accentColor}
                showStock={showStock}
                onBuyNow={handleBuyNow}
                onAddToCart={addToCart}
                shopPhone={shopPhone}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setShowCart(true)}
          style={{
            position: 'fixed', bottom: '30px', right: '30px', zIndex: 100,
            background: accentColor, color: '#fff', border: 'none', borderRadius: '50px',
            padding: '16px 28px', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '12px',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          <ShoppingCart size={22} />
          <span>Cart ({cart.length}) · ₹{cartTotal.toLocaleString('en-IN')}</span>
        </button>
      )}

      {/* Cart Drawer Overlay */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s' }}>
           <div style={{ width: '100%', maxWidth: '450px', background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Shopping Cart</h2>
                 <button onClick={() => setShowCart(false)} style={{ border: 'none', background: '#f1f5f9', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                 {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '100px' }}>
                       <ShoppingBag size={64} color="#e2e8f0" style={{ marginBottom: '16px' }} />
                       <p>Your cart is empty</p>
                    </div>
                 ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                       {cart.map(item => (
                          <div key={item.id} style={{ display: 'flex', gap: '16px' }}>
                             <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden' }}>
                                {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, fontWeight: 800 }}>{item.name[0]}</div>}
                             </div>
                             <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.name}</div>
                                <div style={{ color: accentColor, fontWeight: 700, marginTop: '4px' }}>₹{(item.sale_price || item.price).toLocaleString('en-IN')}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                   <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                      <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer' }}><Minus size={14}/></button>
                                      <span style={{ padding: '0 10px', fontWeight: 700, fontSize: '14px' }}>{item.quantity}</span>
                                      <button onClick={() => updateQuantity(item.id, 1)} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer' }}><Plus size={14}/></button>
                                   </div>
                                   <button onClick={() => removeFromCart(item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Remove</button>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              {cart.length > 0 && (
                <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', background: '#fcfcfd' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Subtotal</span>
                      <span style={{ fontSize: '22px', fontWeight: 900 }}>₹{cartTotal.toLocaleString('en-IN')}</span>
                   </div>
                   <button 
                     onClick={() => { setShowCart(false); setIsCheckingOut(true); }}
                     style={{ width: '100%', background: accentColor, color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                   >
                     Checkout Now <ArrowRight size={20} />
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckingOut && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="fera-checkout-modal" style={{ background: '#fff', borderRadius: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.3)' }}>
            <button onClick={() => { setIsCheckingOut(false); setOrderComplete(null); }} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', zIndex: 10 }}><X size={20} /></button>

            {orderComplete ? (
              <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', background: '#f0fdf4', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}><Check size={44} strokeWidth={3} /></div>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>Order Confirmed!</h2>
                <p style={{ color: '#64748b', marginBottom: '32px' }}>Your order <b>#{orderComplete.invoice}</b> has been received.</p>
                
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', marginBottom: '32px', textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: '8px' }}>
                    {formData.deliveryType === 'delivery' ? 'Security Code for Delivery' : 'OTP for Pickup'}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: accentColor, letterSpacing: '3px' }}>
                    {formData.deliveryType === 'delivery' ? orderComplete.deliveryCode : orderComplete.paymentOtp}
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Please show this code to the {formData.deliveryType === 'delivery' ? 'delivery partner' : 'shopkeeper'}.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => {
                      const phone = shopPhone.replace(/\D/g, '') || '91XXXXXXXXXX';
                      const msg = encodeURIComponent(`Namaste! I just placed an order.\nOrder ID: ${orderComplete.id}\nItems: ${cart.length}\nTotal: ₹${cartTotal}\nCode: ${orderComplete.deliveryCode}`);
                      window.open(`https://wa.me/${phone.startsWith('91') ? phone : '91'+phone}?text=${msg}`, '_blank');
                    }}
                    style={{ background: '#25D366', color: '#fff', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  >
                    Send Order on WhatsApp <ExternalLink size={18} />
                  </button>
                  <button onClick={() => { setIsCheckingOut(false); setOrderComplete(null); }} style={{ padding: '12px', color: '#64748b', border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer' }}>Close</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '24px' }}>Confirm Order</h2>
                
                <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '24px', border: '1.5px solid #f1f5f9', borderRadius: '16px', padding: '12px' }}>
                   {cart.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                         <span style={{ fontSize: '14px' }}>{item.quantity}x {item.name}</span>
                         <span style={{ fontWeight: 700 }}>₹{(item.quantity * (item.sale_price || item.price)).toLocaleString('en-IN')}</span>
                      </div>
                   ))}
                </div>

                <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Your Name *</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Phone *</label>
                      <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Email Address *</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Collection Method</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button type="button" onClick={() => setFormData({...formData, deliveryType: 'pickup'})} style={{ padding: '12px', borderRadius: '12px', border: '2px solid', borderColor: formData.deliveryType === 'pickup' ? accentColor : '#e2e8f0', background: formData.deliveryType === 'pickup' ? `${accentColor}05` : '#fff', color: formData.deliveryType === 'pickup' ? accentColor : '#64748b', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <MapPin size={18} /> Pickup
                      </button>
                      <button type="button" onClick={() => setFormData({...formData, deliveryType: 'delivery'})} style={{ padding: '12px', borderRadius: '12px', border: '2px solid', borderColor: formData.deliveryType === 'delivery' ? accentColor : '#e2e8f0', background: formData.deliveryType === 'delivery' ? `${accentColor}05` : '#fff', color: formData.deliveryType === 'delivery' ? accentColor : '#64748b', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Truck size={18} /> Delivery
                      </button>
                    </div>
                  </div>

                  {formData.deliveryType === 'delivery' && (
                    <div className="fadeIn">
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Delivery Address *</label>
                      <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', minHeight: '60px' }} />
                    </div>
                  )}

                  <div style={{ marginTop: '8px', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                      <span>Total Pay</span>
                      <span>₹{(cartTotal + (formData.deliveryType === 'delivery' ? 30 : 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button type="submit" disabled={isOrdering} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: accentColor, color: '#fff', fontSize: '18px', fontWeight: 900, cursor: isOrdering ? 'not-allowed' : 'pointer', opacity: isOrdering ? 0.7 : 1, marginTop: '8px' }}>
                    {isOrdering ? 'Placing Order...' : 'Confirm & Place Order'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
