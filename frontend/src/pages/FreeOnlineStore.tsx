import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const BASE_URL = 'https://ferasetu.appwrite.network';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Free me online store kaise banaye?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu pe free account banao, AI ko apna business batao, aur 2 minute me website ready. Koi credit card nahi, koi hidden charge nahi — sab free me.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya free plan me products add kar sakte hain?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan! Free beta plan me 19 products add kar sakte ho, subdomain milta hai, order management, invoices, aur AI assistant sab included hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Online store banane ke baad customers kaise aayenge?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Apna store link WhatsApp pe share karo, Instagram pe dalo, aur Google pe bhi index hota hai. FeraSetu ke shop pages SEO-friendly hain toh customers seedha Google se bhi aa sakte hain.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya payment gateway lagega?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu pe orders WhatsApp pe le sakte ho — customers ko payment link bhejo ya cash-on-delivery rakho. Indian shopkeepers ke liye ye sabse easy way hai.',
      },
    },
  ],
};

export default function FreeOnlineStore() {
  return (
    <div style={{ fontFamily: "'Work Sans', 'Outfit', sans-serif", background: '#fff', minHeight: '100vh' }}>
      <SEO
        title="Free Me Online Store Kaise Banaye — ₹0 Me Dukaan Online Karo"
        description="Free me online store banaye FeraSetu pe. Zero cost, AI-powered, 22 Indian languages. Products, orders, invoices — sab free during beta."
        url={`${BASE_URL}/free-online-store`}
        structuredData={faqSchema}
      />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #060818 0%, #0f172a 100%)',
        color: '#fff', padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: '#10b981', fontWeight: 700, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
            100% Free During Beta
          </p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.2, marginBottom: '20px' }}>
            Free Me Online Store<br />Kaise Banaye?
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            ₹299/month ka plan <strong style={{ color: '#10b981' }}>abhi bilkul free</strong> hai. Koi credit card nahi, koi hidden charge nahi. Bas register karo aur dukaan online karo.
          </p>
          <a href="/register" style={{
            display: 'inline-block', background: '#10b981', color: '#fff',
            padding: '16px 40px', borderRadius: '30px', textDecoration: 'none',
            fontWeight: 700, fontSize: '17px',
          }}>
            Free Me Shuru Karo →
          </a>
        </div>
      </section>

      {/* What you get free */}
      <section style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}>
          Free Me Kya Milega?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {[
            { icon: '🌐', title: 'Free Subdomain', desc: 'apni-dukaan.ferasetu.fera-search.tech — apna naam, apni dukaan.' },
            { icon: '📦', title: '19 Products Tak', desc: 'Products add karo with photos, prices, descriptions. Sab free.' },
            { icon: '🧾', title: 'Invoices', desc: 'Har order pe automatic tax invoice. Professional lagta hai.' },
            { icon: '📊', title: 'Order Management', desc: 'Orders track karo, status update karo, customers ko inform karo.' },
            { icon: '🤖', title: 'AI Assistant', desc: 'Hindi me sawaal pucho — products suggest karo, website edit karo.' },
            { icon: '💬', title: 'WhatsApp Ready', desc: 'Customers ko WhatsApp pe share karo. Indian shopkeepers ke liye best.' },
          ].map((item) => (
            <div key={item.title} style={{
              padding: '24px', background: '#f8fafc', borderRadius: '14px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>{item.title}</h3>
              <p style={{ color: '#475569', lineHeight: 1.6, margin: 0, fontSize: '14px' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, textAlign: 'center', marginBottom: '32px', color: '#1e293b' }}>
            Free vs Paid — Kya Fark Hai?
          </h2>
          <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {[
              { feature: 'Website + Subdomain', free: '✅', paid: '✅' },
              { feature: 'Products', free: '19 tak', paid: 'Unlimited' },
              { feature: 'AI Assistant', free: 'Starter credits', paid: 'Advanced (105B)' },
              { feature: 'Custom Domain', free: '❌', paid: '✅' },
              { feature: 'Sales Predictions', free: '❌', paid: '✅' },
              { feature: 'Invoices', free: '✅', paid: '✅' },
              { feature: 'Price', free: '₹0 (beta)', paid: '₹499/month' },
            ].map((row, i) => (
              <div key={row.feature} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                padding: '14px 20px', borderBottom: i < 6 ? '1px solid #f1f5f9' : 'none',
                background: i % 2 === 0 ? '#fff' : '#fafbfc',
              }}>
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{row.feature}</span>
                <span style={{ textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: '14px' }}>{row.free}</span>
                <span style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600, fontSize: '14px' }}>{row.paid}</span>
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
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>
          Abhi Free Me Start Karo
        </h2>
        <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '500px', margin: '0 auto 32px' }}>
          Koi credit card nahi. Koi commitment nahi. Bas 2 minute lagenge.
        </p>
        <a href="/register" style={{
          display: 'inline-block', background: '#fff', color: '#059669',
          padding: '16px 40px', borderRadius: '30px', textDecoration: 'none',
          fontWeight: 700, fontSize: '17px',
        }}>
          Free Account Banaye →
        </a>
      </section>

      {/* Internal links */}
      <section style={{ padding: '48px 24px', textAlign: 'center', background: '#060818', color: '#94a3b8' }}>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>Aur padho:</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <Link to="/online-dukaan-banaye" style={{ color: '#60a5fa', textDecoration: 'none' }}>Dukaan Ka Website Banaye</Link>
          <Link to="/shopify-alternative-india" style={{ color: '#60a5fa', textDecoration: 'none' }}>Shopify Ka Alternative</Link>
          <Link to="/kirana-store-online" style={{ color: '#60a5fa', textDecoration: 'none' }}>Kirana Store Online</Link>
        </div>
        <p style={{ fontSize: '13px', marginTop: '24px', opacity: 0.6 }}>© FeraSetu — Dukaan ko online lao, orders WhatsApp par pao</p>
      </section>
    </div>
  );
}
