import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const BASE_URL = 'https://ferasetu.appwrite.network';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Shopify ka sasta alternative kya hai India me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu — ₹0 (beta) me online store, Shopify jaise features but Indian shopkeepers ke liye banaya gaya. Hindi + 22 languages, WhatsApp orders, AI assistant.',
      },
    },
    {
      '@type': 'Question',
      name: 'Shopify vs FeraSetu — kya fark hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Shopify ₹2,000+/month, English-first, international payments. FeraSetu ₹0 (beta), Hindi + 22 Indian languages, WhatsApp-first, Indian payment methods. Shopify international sellers ke liye hai, FeraSetu Indian dukaan ke liye.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya FeraSetu pe custom domain lag sakta hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan, premium plan (₹499/month) me custom domain support hai. Free me bhi subdomain milta hai — apni-dukaan.ferasetu.fera-search.tech.',
      },
    },
    {
      '@type': 'Question',
      name: 'Indian shopkeepers ke liye kaunsa platform best hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Indian shopkeepers ke liye FeraSetu best hai kyunki ye Hindi me hai, WhatsApp pe orders leta hai, aur free hai. Shopify bahut mehenga hai aur English me hai jo Indian customers ko suit nahi karta.',
      },
    },
  ],
};

export default function ShopifyAlternativeIndia() {
  return (
    <div style={{ fontFamily: "'Work Sans', 'Outfit', sans-serif", background: '#fff', minHeight: '100vh' }}>
      <SEO
        title="Shopify Ka Alternative India Me — FeraSetu Free Online Store"
        description="Shopify ka sasta alternative India me. FeraSetu pe free me online store banaye — Hindi, WhatsApp orders, AI assistant. ₹0 beta vs Shopify ₹2000+/month."
        url={`${BASE_URL}/shopify-alternative-india`}
        structuredData={faqSchema}
      />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #060818 0%, #1e1b4b 100%)',
        color: '#fff', padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: '#818cf8', fontWeight: 700, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Indian Shopkeepers Ke Liye
          </p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.2, marginBottom: '20px' }}>
            Shopify Ka Alternative<br />India Me
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '620px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Shopify ₹2,000+/month se shuru hota hai. <strong style={{ color: '#818cf8' }}>FeraSetu ₹0 (beta)</strong> me hai. Hindi + 22 Indian languages, WhatsApp orders, aur AI jo aapki bhasha me baat kare.
          </p>
          <a href="/register" style={{
            display: 'inline-block', background: '#6366f1', color: '#fff',
            padding: '16px 40px', borderRadius: '30px', textDecoration: 'none',
            fontWeight: 700, fontSize: '17px',
          }}>
            Free Me Try Karo →
          </a>
        </div>
      </section>

      {/* Comparison table */}
      <section style={{ padding: '80px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}>
          Shopify vs FeraSetu — Seedhi Baat
        </h2>
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            padding: '16px 20px', background: '#1e293b', color: '#fff',
            fontWeight: 700, fontSize: '14px',
          }}>
            <span>Feature</span>
            <span style={{ textAlign: 'center' }}>Shopify</span>
            <span style={{ textAlign: 'center' }}>FeraSetu</span>
          </div>
          {[
            { feature: 'Monthly Price', shopify: '₹2,000+', fera: '₹0 (beta)' },
            { feature: 'Languages', shopify: 'English-first', fera: '22 Indian languages' },
            { feature: 'AI Assistant', shopify: 'Add-on (extra $/mo)', fera: 'Included (Hindi)' },
            { feature: 'WhatsApp Orders', shopify: 'Via app ($$$)', fera: 'Built-in' },
            { feature: 'Setup Time', shopify: 'Hours to days', fera: '2 minutes' },
            { feature: 'Target User', shopify: 'Global sellers', fera: 'Indian shopkeepers' },
            { feature: 'Subdomain', shopify: 'Your .myshopify.com', fera: 'Your .ferasetu subdomain' },
            { feature: 'Custom Domain', shopify: 'Paid plan', fera: '₹499/month plan' },
            { feature: 'Invoices', shopify: 'App install', fera: 'Built-in' },
          ].map((row, i) => (
            <div key={row.feature} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
              background: i % 2 === 0 ? '#fff' : '#fafbfc',
            }}>
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{row.feature}</span>
              <span style={{ textAlign: 'center', color: '#ef4444', fontSize: '14px' }}>{row.shopify}</span>
              <span style={{ textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: '14px' }}>{row.fera}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Why FeraSetu wins */}
      <section style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}>
            FeraSetu Kyun Better Hai Indian Dukaan Ke Liye
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {[
              { icon: '🇮🇳', title: 'Made for India', desc: 'Shopify Silicon Valley ke liye bana hai. FeraSetu Indian shopkeepers ke liye — Hindi, WhatsApp, local payments.' },
              { icon: '🤖', title: 'Hindi AI', desc: 'Shopify ka AI English me hai. FeraSetu ka AI Hindi me baat kare — "Mere grocery store ke liye 10 products suggest karo."' },
              { icon: '💰', title: 'Price', desc: 'Shopify ₹2,000+ se shuru. FeraSetu free. Period. Beta ke baad bhi ₹299 — Shopify ka 1/7th.' },
              { icon: '📱', title: 'WhatsApp First', desc: 'Indian customers WhatsApp pe order karna chahte hain. FeraSetu ye built-in deta hai — Shopify me alag se app lagana padta hai.' },
            ].map((item) => (
              <div key={item.title} style={{
                background: '#fff', padding: '28px', borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: '#475569', lineHeight: 1.6, margin: 0, fontSize: '15px' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, textAlign: 'center', marginBottom: '40px', color: '#1e293b' }}>
          Aksar Pooche Jaane Wale Sawaal
        </h2>
        {faqSchema.mainEntity.map((faq) => (
          <details key={faq.name} style={{
            marginBottom: '16px', padding: '20px 24px',
            background: '#f8fafc', borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            <summary style={{ fontWeight: 600, fontSize: '16px', color: '#1e293b', cursor: 'pointer' }}>
              {faq.name}
            </summary>
            <p style={{ marginTop: '12px', color: '#475569', lineHeight: 1.7, margin: '12px 0 0' }}>
              {faq.acceptedAnswer.text}
            </p>
          </details>
        ))}
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 24px', textAlign: 'center',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#fff',
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>
          Shopify Chhodo, FeraSetu Try Karo
        </h2>
        <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '500px', margin: '0 auto 32px' }}>
          Free beta me sab kuch hai jo ek Indian shopkeeper ko chahiye. Abhi start karo.
        </p>
        <a href="/register" style={{
          display: 'inline-block', background: '#fff', color: '#4f46e5',
          padding: '16px 40px', borderRadius: '30px', textDecoration: 'none',
          fontWeight: 700, fontSize: '17px',
        }}>
          Free Me Shuru Karo →
        </a>
      </section>

      {/* Internal links */}
      <section style={{ padding: '48px 24px', textAlign: 'center', background: '#060818', color: '#94a3b8' }}>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>Aur padho:</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <Link to="/online-dukaan-banaye" style={{ color: '#60a5fa', textDecoration: 'none' }}>Dukaan Ka Website Banaye</Link>
          <Link to="/free-online-store" style={{ color: '#60a5fa', textDecoration: 'none' }}>Free Online Store Banaye</Link>
          <Link to="/kirana-store-online" style={{ color: '#60a5fa', textDecoration: 'none' }}>Kirana Store Online</Link>
        </div>
        <p style={{ fontSize: '13px', marginTop: '24px', opacity: 0.6 }}>© FeraSetu — Dukaan ko online lao, orders WhatsApp par pao</p>
      </section>
    </div>
  );
}
