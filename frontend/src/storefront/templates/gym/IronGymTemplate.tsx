import React from 'react';
import { MotionConfig } from 'framer-motion';
import { GymProvider } from './GymContext';
import GymHeader from './GymHeader';
import GymHero from './GymHero';
import GymStatsStrip from './GymStatsStrip';
import GymProgramsSection from './GymProgramsSection';
import GymMembershipTiers from './GymMembershipTiers';
import GymClassSchedule from './GymClassSchedule';
import GymProShop from './GymProShop';
import GymFacilityTour from './GymFacilityTour';
import GymCoachesSection from './GymCoachesSection';
import GymFreePassModal from './GymFreePassModal';
import GymFooter from './GymFooter';

// Core interactive overlays from storefront
import CartDrawer from '../../components/CartDrawer';
import ProductDetailModal from '../../components/ProductDetailModal';
import CustomerAuthModal from '../../components/CustomerAuthModal';
import CustomerAccountDrawer from '../../components/CustomerAccountDrawer';

function IronGymContent() {
  return (
    <div className="min-h-screen bg-[#090A0D] text-white font-sans antialiased selection:bg-[#D4FF00] selection:text-[#090A0D]">
      <GymHeader />
      <main className="space-y-0">
        <GymHero />
        <GymStatsStrip />
        <GymProgramsSection />
        <GymMembershipTiers />
        <GymClassSchedule />
        <GymProShop />
        <GymFacilityTour />
        <GymCoachesSection />
      </main>
      <GymFooter />

      {/* Interactive Overlays */}
      <GymFreePassModal />
      <CartDrawer />
      <ProductDetailModal />
      <CustomerAuthModal />
      <CustomerAccountDrawer />
    </div>
  );
}

export default function IronGymTemplate() {
  return (
    <MotionConfig reducedMotion="user">
      <GymProvider>
        <IronGymContent />
      </GymProvider>
    </MotionConfig>
  );
}
