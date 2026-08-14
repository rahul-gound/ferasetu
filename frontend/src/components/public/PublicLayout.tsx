import { ReactNode } from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#2563EB]/20 selection:text-[#2563EB]">
      <style>{`
        h1, h2, h3, h4, h5, h6 { font-family: 'Inter', sans-serif; letter-spacing: -0.02em; }
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <PublicNavbar />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <PublicFooter />
    </div>
  );
}
