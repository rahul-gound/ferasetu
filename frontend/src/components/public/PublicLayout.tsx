import { ReactNode } from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import LanguageSuggestionBanner from '../LanguageSuggestionBanner';
import PublicSmoothScroll from './PublicSmoothScroll';
import MeditativeSanctuaryPill from '../marketing/MeditativeSanctuaryPill';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <PublicSmoothScroll>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#2563EB]/20 selection:text-[#2563EB]">
        <PublicNavbar />
        
        <main className="flex-grow">
          {children}
        </main>
        
        <LanguageSuggestionBanner />
        <PublicFooter />
        <MeditativeSanctuaryPill />
      </div>
    </PublicSmoothScroll>
  );
}

