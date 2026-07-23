import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const BASE_URL = 'https://ferasetu.appwrite.network';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Kirana store online kaise kare?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu pe free account banao, "Mere paas kirana store hai" bolo, aur AI pura website bana dega — products, prices, design sab set. 2 minute me live.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kirana store ke liye kaunsa platform best hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FeraSetu — kyunki ye free hai, Hindi me hai, aur Indian kirana stores ke liye banaya gaya hai. Shopify bahut mehenga hai aur English me hai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kirana store ka website banane me kitna time lagta hai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sirf 2-5 minute. Register karo, business type batao, AI website bana dega. Phir products add karo aur publish karo. Koi coding nahi chahiye.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kya kirana store ke liye WhatsApp orders mil sakte hain?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Haan! FeraSetu pe customers seedha WhatsApp pe order kar sakte hain. Aapko order notification milega aur aap directly customer se baat kar sakte ho.',
      },
    },
  ],
};

export default function KiranaStoreOnline() {
  return (
    <div style={{ fontFamily: "'Work Sans', 'Outfit', sans-serif", background: '#fff', minHeight: '100vh' }}>
      <SEO
        title="Kirana Store Online Kaise Kare — Free Me Dukaan Digital Karo"
        description="Kirana store ko online kare FeraSetu pe. Free, Hindi me, AI-powered. Products, orders, invoices — sab kuch 2 minute me. WhatsApp orders bhi milenge."
        url={`${BASE_URL}/kirana-store-online`}
        structuredData={faqSchema}
      />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #060818 0%, #1a2332 100%)',
        color: '#fff', padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Kirana Stores Ke Liye — #1 Platform
          </p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.2, marginBottom: '20px' }}>
            Kirana Store Online<br />Kaise Kare?
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '620px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Apne kirana store ko 2 minute me online karo. <strong style={{ color: '#f59e0b' }}>Free hai, Hindi me hai</strong>, aur customers seedha WhatsApp pe order denge. AI sab set kar dega.
          </p>
          <a href="/register" style={{
            display: 'inline-block', background: '#f59e0b', color: '#fff',
            padding: '16px 40px', borderRadius: '30px', textDecoration: 'none',
            fontWeight: 700, fontSize: '17px',
          }}>
            Kirana Store Online Karo →
          </a>
        </div>
      </section>

      {/* Steps for kirana */}
      <section style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}>
          Kirana Store Online Karne Ke 3 Steps
        </h2>
        {[
          { step: '1', title: 'FeraSetu Pe Register Karo', desc: 'Sirf name, phone, aur "Mere paas kirana store hai" likho. Free account ban jayega — koi credit card nahi chahiye.' },
          { step: '2', title: 'AI Ko Batao Apni Dukaan', desc: '"Mere paas 500 sq ft ki kirana store hai, Delhi me hai" — AI automatically products suggest karega, prices set karega, aur website bana dega.' },
          { step: '3', title: 'Publish aur WhatsApp Pe Share Karo', desc: 'One click me website live. Apna link WhatsApp groups me dalo — "Ab mere store se online order kar sakte ho!" Customers seedha aapki dukaan dekhenge.' },
        ].map((item) => (
          <div key={item.step} style={{
            display: 'flex', gap: '24px', alignItems: 'flex-start',
            padding: '32px', marginBottom: '24px',
            background: '#fffbeb', borderRadius: '16px',
            border: '1px solid #fef3c7',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: '#f59e0b', color: '#fff', display: 'flex',
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

      {/* Kirana-specific features */}
      <section style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#1e293b' }}>
            Kirana Stores Ke Liye Kya Khas Hai?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {[
              { icon: '🛒', title: 'Product Catalog', desc: 'Sabzi, daal, chawal, masala — sab products photos ke saath add karo. Customers ghar baithe dekh sakte hain.' },
              { icon: '📱', title: 'WhatsApp Orders', desc: 'Customer ko link do, wo WhatsApp pe order kare. Aapko notification milega — seedha phone pe confirm karo.' },
              { icon: '💰', title: 'Cash on Delivery', desc: 'Payment gateway ki zaroorat nahi. COD rakho — Indian kirana stores ke liye sabse natural way hai.' },
              { icon: '🧾', title: 'Auto Invoices', desc: 'Har order pe automatic tax invoice banta hai. Professional lagta hai aur records bhi maintained rahte hain.' },
              { icon: '🇮🇳', title: 'Hindi Me Sab', desc: 'AI assistant Hindi me baat kare. Website bhi Hindi me ban sakti hai. Aapke customers ko English ki zaroorat nahi.' },
              { icon: '📊', title: 'Sales Track Karo', desc: 'Kitna bik raha hai, kaunsa product popular hai — sab dashboard pe dikh jayega. Data-driven decisions lo.' },
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
          Kirana Stores Ke Baare Me Aksar Pooche Jaane Wale Sawaal
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
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#fff',
      }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>
          Apna Kirana Store Abhi Online Karo
        </h2>
        <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '500px', margin: '0 auto 32px' }}>
          Free hai. 2 minute lagenge. Aur phir customers seedha WhatsApp pe order denge.
        </p>
        <a href="/register" style={{
          display: 'inline-block', background: '#fff', color: '#d97706',
          padding: '16px 40px', borderRadius: '30px', textDecoration: 'none',
          fontWeight: 700, fontSize: '17px',
        }}>
          Free Me Start Karo →
        </a>
      </section>

      {/* Internal links */}
      <section style={{ padding: '48px 24px', textAlign: 'center', background: '#060818', color: '#94a3b8' }}>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>Aur padho:</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <Link to="/online-dukaan-banaye" style={{ color: '#60a5fa', textDecoration: 'none' }}>Dukaan Ka Website Banaye</Link>
          <Link to="/free-online-store" style={{ color: '#60a5fa', textDecoration: 'none' }}>Free Online Store Banaye</Link>
          <Link to="/shopify-alternative-india" style={{ color: '#60a5fa', textDecoration: 'none' }}>Shopify Ka Alternative</Link>
        </div>
        <p style={{ fontSize: '13px', marginTop: '24px', opacity: 0.6 }}>© FeraSetu — Dukaan ko online lao, orders WhatsApp par pao</p>
      </section>
    </div>
  );
}
