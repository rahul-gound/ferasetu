import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { TrustedBusinesses } from '../components/landing/TrustedBusinesses';
import { WhyFeraSetu } from '../components/landing/WhyFeraSetu';

// Lazy load below-the-fold sections
const Features = lazy(() => import('../components/landing/Features').then(m => ({ default: m.Features })));
const Testimonials = lazy(() => import('../components/landing/Testimonials').then(m => ({ default: m.Testimonials })));
const Pricing = lazy(() => import('../components/landing/Pricing').then(m => ({ default: m.Pricing })));
const FAQ = lazy(() => import('../components/landing/FAQ').then(m => ({ default: m.FAQ })));
const CTASection = lazy(() => import('../components/landing/CTASection').then(m => ({ default: m.CTASection })));
const Footer = lazy(() => import('../components/landing/Footer').then(m => ({ default: m.Footer })));

// Skeleton loader for sections
function SectionSkeleton() {
  return (
    <div className="py-24 px-4 bg-slate-50 animate-pulse">
      <div className="max-w-6xl mx-auto">
        <div className="h-12 bg-slate-200 rounded-lg mb-4 w-1/3" />
        <div className="h-6 bg-slate-200 rounded-lg w-2/3" />
      </div>
    </div>
  );
}

export default function LandingPageOptimized() {
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
        {/* Above the fold - critical content */}
        <Navbar />
        <Hero />
        <TrustedBusinesses />
        <WhyFeraSetu />

        {/* Below the fold - lazy loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <Features />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Testimonials />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Pricing />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <FAQ />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CTASection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <Footer />
        </Suspense>
      </main>
    </>
  );
}
