import React from 'react';
import { MotionConfig } from 'framer-motion';
import { MonoShopProvider, useMonoShop } from './MonoContext';
import MonoHeader from './MonoHeader';
import MonoHero from './MonoHero';
import MonoFeatured from './MonoFeatured';
import MonoSplitBanner from './MonoSplitBanner';
import MonoProductGrid from './MonoProductGrid';
import MonoCompareTable from './MonoCompareTable';
import MonoCategories from './MonoCategories';
import MonoTrustBar from './MonoTrustBar';
import MonoCartDrawer from './MonoCartDrawer';
import MonoAuthModal from './MonoAuthModal';
import MonoSearchOverlay from './MonoSearchOverlay';
import MonoQuickView from './MonoQuickView';
import MonoToasts from './MonoToasts';

function MonoStoreContent() {
  const { shopName } = useMonoShop();

  return (
    <div className="min-h-screen bg-white font-sans text-ink">
      <MonoHeader />

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-14 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)] lg:gap-14 lg:px-8 lg:pt-0">
        {/* Left column */}
        <div className="flex flex-col gap-14 lg:gap-16">
          <MonoHero />
          <MonoFeatured />
          <MonoSplitBanner />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-16 pt-2 lg:pt-10">
          <MonoProductGrid />
          <MonoCompareTable />
          <MonoCategories />
          <MonoTrustBar />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-surface py-12 text-ink">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tracking-tight">{shopName || 'MONO'}</span>
            <span className="text-xs text-ink/40">© {new Date().getFullYear()} · All rights reserved</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium text-ink/60">
            <span>Direct Merchant Store</span>
            <span>0% Commission</span>
            <span>Powered by FeraSetu</span>
          </div>
        </div>
      </footer>

      {/* Functional interactive layers */}
      <MonoSearchOverlay />
      <MonoQuickView />
      <MonoCartDrawer />
      <MonoAuthModal />
      <MonoToasts />
    </div>
  );
}

export default function MonoElectronicTemplate() {
  return (
    <MotionConfig reducedMotion="user">
      <MonoShopProvider>
        <MonoStoreContent />
      </MonoShopProvider>
    </MotionConfig>
  );
}
