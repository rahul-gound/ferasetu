import { getPlatformStats, formatNumber, formatCurrency } from '@/lib/stats';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import TrustBar from '@/components/TrustBar';
import Features from '@/components/Features';
import AnalyticsShowcase from '@/components/AnalyticsShowcase';
import Pricing from '@/components/Pricing';
import TrustBadges from '@/components/TrustBadges';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';

export const revalidate = 300;

export default async function Page() {
  const stats = await getPlatformStats();

  return (
    <main className="min-h-screen bg-[#060818] text-white overflow-x-hidden font-body">
      <Navbar />
      <Hero stats={stats} />
      <TrustBar />
      <Features />
      <AnalyticsShowcase stats={stats} />
      <Pricing />
      <TrustBadges stats={stats} />
      <FinalCTA />
      <Footer />
    </main>
  );
}
