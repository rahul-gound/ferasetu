
import { Link } from 'react-router-dom';
import { Bot, Globe, Mic, Package, CheckCircle, Star, Zap, ShoppingBag } from 'lucide-react';

const FEATURES = [
  {
    icon: <Bot size={32} color="#FF6B35" />,
    title: 'AI Website Builder',
    desc: 'Describe your business in any Indian language and our AI builds your complete online store in seconds.',
  },
  {
    icon: <Globe size={32} color="#004E89" />,
    title: 'Multi-language Support',
    desc: 'Sell in all 22 scheduled Indian languages. Reach customers in their mother tongue.',
  },
  {
    icon: <Mic size={32} color="#1A936F" />,
    title: 'Voice Commands',
    desc: 'Add products, check orders, and manage your store using just your voice — no typing needed.',
  },
  {
    icon: <Package size={32} color="#F59E0B" />,
    title: 'Free to Start',
    desc: 'List up to 50 products for free. No credit card required. Upgrade anytime for unlimited access.',
  },
];

const FREE_FEATURES = [
  '50 products',
  'Free subdomain (yourstore.fera-shop.fera-seach.tech)',
  'Basic AI Assistant (Sarvam 30B)',
  'Multi-language storefront',
  'Order management',
  'Basic analytics',
];

const PREMIUM_FEATURES = [
  'Unlimited products',
  'Custom domain support',
  'Advanced AI (Sarvam 105B)',
  'AI sales predictions',
  'Priority support',
  'Advanced analytics & reports',
  'Voice commerce',
  'Bulk product import',
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#1a1a2e', background: '#fff' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🛒</span>
          <span style={{ fontWeight: 800, fontSize: '20px', color: '#FF6B35' }}>Fera</span>
          <span style={{ fontSize: '13px', color: '#666', marginLeft: '4px' }}>Shopkeeper AI</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/login" style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid #FF6B35',
            color: '#FF6B35', textDecoration: 'none', fontWeight: 600, fontSize: '14px',
            transition: 'all 0.15s',
          }}>
            Login
          </Link>
          <Link to="/register" style={{
            padding: '8px 20px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #FF6B35, #e55a24)',
            color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '14px',
          }}>
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '80px 40px 60px',
        background: 'linear-gradient(135deg, #fff7f3 0%, #f0f7ff 50%, #f0fff8 100%)',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,107,53,0.1)', borderRadius: '20px',
          padding: '6px 16px', marginBottom: '24px', fontSize: '13px', fontWeight: 600,
          color: '#FF6B35',
        }}>
          <Zap size={14} /> Powered by Sarvam AI · Made for Bharat
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1,
          marginBottom: '20px', maxWidth: '800px', margin: '0 auto 20px',
        }}>
          <span style={{ color: '#1a1a2e' }}>Build Your </span>
          <span style={{
            background: 'linear-gradient(135deg, #FF6B35, #e55a24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Online Store</span>
          <br />
          <span style={{ color: '#1a1a2e' }}>with </span>
          <span style={{
            background: 'linear-gradient(135deg, #004E89, #0070c0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>AI</span>
        </h1>

        <p style={{
          fontSize: '18px', color: '#555', maxWidth: '600px', margin: '20px auto 40px',
          lineHeight: 1.7,
        }}>
          The smart platform for India's small retailers. Launch your store in minutes,
          manage orders effortlessly, and grow your business — in your own language.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{
            padding: '14px 32px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF6B35, #e55a24)',
            color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '16px',
            boxShadow: '0 4px 20px rgba(255,107,53,0.35)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <ShoppingBag size={18} /> Start for Free
          </Link>
          <Link to="/login" style={{
            padding: '14px 32px', borderRadius: '10px',
            border: '2px solid #004E89',
            color: '#004E89', textDecoration: 'none', fontWeight: 700, fontSize: '16px',
          }}>
            Sign In →
          </Link>
        </div>

        <p style={{ marginTop: '16px', fontSize: '13px', color: '#999' }}>
          No credit card required · Free forever plan available
        </p>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap',
          marginTop: '60px', padding: '24px 40px',
          background: '#fff', borderRadius: '16px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          maxWidth: '700px', margin: '60px auto 0',
        }}>
          {[['10,000+', 'Active Stores'], ['22', 'Indian Languages'], ['₹50Cr+', 'GMV Processed'], ['4.8★', 'App Rating']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FF6B35' }}>{v}</div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a1a2e' }}>
            Everything you need to sell online
          </h2>
          <p style={{ color: '#666', fontSize: '16px', marginTop: '12px' }}>
            Built specifically for Indian small businesses and street vendors
          </p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px', maxWidth: '1100px', margin: '0 auto',
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              padding: '32px 28px', borderRadius: '16px',
              border: '1px solid #f0f0f0', background: '#fafafa',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: '#1a1a2e' }}>
                {f.title}
              </h3>
              <p style={{ color: '#666', lineHeight: 1.7, fontSize: '14px' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 40px', background: 'linear-gradient(135deg, #fff7f3, #f0f7ff)' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800 }}>Get your store live in 3 steps</h2>
        </div>
        <div style={{
          display: 'flex', gap: '24px', justifyContent: 'center',
          flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto',
        }}>
          {[
            { step: '1', title: 'Tell AI about your business', desc: 'In your language, describe what you sell' },
            { step: '2', title: 'AI builds your store', desc: 'Products, design, and layout — done instantly' },
            { step: '3', title: 'Start selling', desc: 'Share your store link and accept orders' },
          ].map(s => (
            <div key={s.step} style={{
              flex: '1', minWidth: '240px', textAlign: 'center',
              padding: '32px 24px', background: '#fff', borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6B35, #e55a24)',
                color: '#fff', fontSize: '20px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>{s.step}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{s.title}</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800 }}>Simple, transparent pricing</h2>
          <p style={{ color: '#666', marginTop: '12px', fontSize: '16px' }}>
            Start free, scale as you grow
          </p>
        </div>
        <div style={{
          display: 'flex', gap: '24px', justifyContent: 'center',
          flexWrap: 'wrap', maxWidth: '820px', margin: '0 auto',
        }}>
          {/* Free */}
          <div style={{
            flex: 1, minWidth: '300px', padding: '36px 32px',
            border: '2px solid #e5e7eb', borderRadius: '20px', background: '#fafafa',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>FREE</div>
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#1a1a2e' }}>₹0<span style={{ fontSize: '16px', fontWeight: 400, color: '#999' }}>/mo</span></div>
            <p style={{ color: '#666', margin: '12px 0 24px', fontSize: '14px' }}>Perfect to get started</p>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              {FREE_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#444' }}>
                  <CheckCircle size={16} color="#1A936F" style={{ flexShrink: 0, marginTop: '2px' }} />
                  {f}
                </div>
              ))}
            </div>
            <Link to="/register" style={{
              display: 'block', textAlign: 'center', marginTop: '24px',
              padding: '12px', borderRadius: '10px', border: '2px solid #FF6B35',
              color: '#FF6B35', textDecoration: 'none', fontWeight: 700,
            }}>
              Get Started Free
            </Link>
          </div>

          {/* Premium */}
          <div style={{
            flex: 1, minWidth: '300px', padding: '36px 32px',
            border: '2px solid #FF6B35', borderRadius: '20px',
            background: 'linear-gradient(135deg, #fff7f3, #fff)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'linear-gradient(135deg, #FF6B35, #e55a24)',
              color: '#fff', fontSize: '11px', fontWeight: 700,
              padding: '4px 10px', borderRadius: '12px',
            }}>
              POPULAR
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#FF6B35' }}>PREMIUM</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#1a1a2e' }}>₹499<span style={{ fontSize: '16px', fontWeight: 400, color: '#999' }}>/mo</span></div>
            <p style={{ color: '#666', margin: '12px 0 24px', fontSize: '14px' }}>For growing businesses</p>
            <div style={{ borderTop: '1px solid #ffd6c0', paddingTop: '20px' }}>
              {PREMIUM_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#444' }}>
                  <CheckCircle size={16} color="#FF6B35" style={{ flexShrink: 0, marginTop: '2px' }} />
                  {f}
                </div>
              ))}
            </div>
            <Link to="/register" style={{
              display: 'block', textAlign: 'center', marginTop: '24px',
              padding: '12px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #FF6B35, #e55a24)',
              color: '#fff', textDecoration: 'none', fontWeight: 700,
              boxShadow: '0 4px 16px rgba(255,107,53,0.35)',
            }}>
              Start Premium Trial
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        padding: '80px 40px',
        background: 'linear-gradient(135deg, #FF6B35, #004E89)',
        textAlign: 'center',
        color: '#fff',
      }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
          Ready to grow your business?
        </h2>
        <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
          Join thousands of Indian shopkeepers who use Fera to sell online every day.
        </p>
        <Link to="/register" style={{
          display: 'inline-block', padding: '14px 40px', borderRadius: '10px',
          background: '#fff', color: '#FF6B35', textDecoration: 'none',
          fontWeight: 800, fontSize: '16px',
        }}>
          Create Your Free Store →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 40px', background: '#1a1a2e', color: '#aaa',
        textAlign: 'center', fontSize: '13px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#FF6B35', fontWeight: 700 }}>🛒 Fera Shopkeeper AI</span>
          {' · '}Made with ❤️ for Bharat
        </div>
        <div>© 2025 Fera · Built on Sarvam AI · Supporting all 22 Indian languages</div>
      </footer>
    </div>
  );
}
