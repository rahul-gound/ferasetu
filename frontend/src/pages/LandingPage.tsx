import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { TrustedBusinesses } from '../components/landing/TrustedBusinesses';
import { WhyFeraSetu } from '../components/landing/WhyFeraSetu';
import { Features } from '../components/landing/Features';
import { Testimonials } from '../components/landing/Testimonials';
import { Pricing } from '../components/landing/Pricing';
import { FAQ } from '../components/landing/FAQ';
import { CTASection } from '../components/landing/CTASection';
import { Footer } from '../components/landing/Footer';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <>
      <SEO
        title="FeraSetu - AI-Powered Online Store Builder for Indian SMBs"
        description="Launch your online store in minutes with FeraSetu. AI website builder, WhatsApp ordering, inventory management, and analytics—all in one platform."
        canonical="https://ferasetu.com"
      />
      <main>
        <Navbar />
        <Hero />
        <TrustedBusinesses />
        <WhyFeraSetu />
        <Features />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTASection />
        <Footer />
      </main>
    </>
  );
}
