import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const BASE_URL = 'https://ferasetu.appwrite.network';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Dukaan ka website kaise banaye?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu pe free me apni dukaan ka website bana sakte ho. Bas register karo, apna shop name do, aur AI khud sab kuch set kar dega — products, design, sab. 2 minute me live ho jayega.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya dukaan ka website banana free hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan! FeraSetu ka beta plan bilkul free hai — ₹299/month ka plan abhi zero me mil raha hai. Isme subdomain, products, orders, invoices, aur AI sab included hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Shopify se FeraSetu kya fark hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Shopify ₹2,000+/month se shuru hota hai aur English-first hai. FeraSetu ₹0 (beta) me hai, 22 Indian languages support karta hai, aur Indian shopkeepers ke liye banaya gaya hai — WhatsApp orders, local payments, Hindi me AI assistant.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya mujhe coding aani chahiye website banane ke liye?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Bilkul nahi! FeraSetu me sirf apna business batao — AI automatically website bana dega. Templates se choose karo, products add karo, aur publish karo. Zero coding required.',
      },
    },
  ],
};

export default function OnlineDukaanBanaye() {
  return (
    <div style={{ fontFamily: "'Work Sans', 'Outfit', sans-serif", background: '#fff', minHeight: '100vh' }}>
      <SEO
        title="Dukaan Ka Website Kaise Banaye — Free Me Online Dukaan Banaye"
        description="Apni dukaan ka website free me banaye FeraSetu pe. 2 minute me live, AI-powered, 22 Indian languages me. Shopify se sasta aur better for Indian shopkeepers."
        url={`${BASE_URL}/online-dukaan-banaye`}
        structuredData={faqSchema}
      />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #060818 0%, #1a1f3a 100%)',
        color: '#fff', padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: '#FF6B35', fontWeight: 700, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
            FeraSetu — Dukaan ko online lao
          </p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.2, marginBottom: '20px' }}>
            Dukaan Ka Website<br />Kaise Banaye?
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Ab apni dukaan ko online lana hai toh mushkil nahi hai. FeraSetu pe free me website banao, products add karo, aur orders WhatsApp pe lo. <strong style={{ color: '#fff' }}>2 minute me live.</strong>
          </p>
          <a href="/register" style={{
            display: 'inline-block', background: '#FF6B35', color: '#fff',
            padding: '16px 40px', borderRadius: '30px', textDecoration: 'none',
            fontWeight: 700, fontSize: '17px', transition: 'transform 0.2s',
          }}>
            Free Me Dukaan Banaye →
          </a>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}>
          3 Simple Steps Me Dukaan Online Karo
        </h2>
        {[
          { step: '1', title: 'Register Karo', desc: 'FeraSetu pe free account banao. Sirf name, phone, aur shop name chahiye. Koi credit card nahi chahiye.' },
          { step: '2', title: 'AI Se Website Banao', desc: 'Apna business batao — "Mere paas kirana store hai" — aur AI automatically pura website bana dega. Products, design, sab set.' },
          { step: '3', title: 'Publish aur Share Karo', desc: 'One click me website live. Apna link WhatsApp pe share karo, customers seedha aapki dukaan dekh sakte hain.' },
        ].map((item) => (
          <div key={item.step} style={{
            display: 'flex', gap: '24px', alignItems: 'flex-start',
            padding: '32px', marginBottom: '24px',
            background: '#f8fafc', borderRadius: '16px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: '#FF6B35', color: '#fff', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '20px', flexShrink: 0,
            }}>
              {item.step}
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ color: '#475569', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Why FeraSetu */}
      <section style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}>
            FeraSetu Kyun Best Hai Indian Shopkeepers Ke Liye?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {[
              { icon: '💰', title: 'Free Beta', desc: '₹299/month ka plan abhi ₹0 me mil raha hai. No hidden charges.' },
              { icon: '🇮🇳', title: '22 Indian Languages', desc: 'Hindi, Tamil, Bengali, Marathi — apni bhasha me website aur AI assistant.' },
              { icon: '📱', title: 'WhatsApp Orders', desc: 'Customers ko WhatsApp pe order karo. Indian shopkeepers ke liye banaya gaya.' },
              { icon: '🤖', title: 'AI-Powered', desc: 'Website khud banti hai. Products suggest hoti hain. Sales predict hoti hain.' },
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
        background: 'linear-gradient(135deg, #FF6B35 0%, #e85d2a 100%)',
        color: '#fff',
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>
          Apni Dukaan Abhi Online Karo
        </h2>
        <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
          Free beta me sab kuch included hai. Abhi start karo aur dekho kitna easy hai.
        </p>
        <a href="/register" style={{
          display: 'inline-block', background: '#fff', color: '#FF6B35',
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
          <Link to="/free-online-store" style={{ color: '#60a5fa', textDecoration: 'none' }}>Free Online Store Banaye</Link>
          <Link to="/shopify-alternative-india" style={{ color: '#60a5fa', textDecoration: 'none' }}>Shopify Ka Alternative</Link>
          <Link to="/kirana-store-online" style={{ color: '#60a5fa', textDecoration: 'none' }}>Kirana Store Online</Link>
        </div>
        <p style={{ fontSize: '13px', marginTop: '24px', opacity: 0.6 }}>© FeraSetu — Dukaan ko online lao, orders WhatsApp par pao</p>
      </section>
    </div>
  );
}
