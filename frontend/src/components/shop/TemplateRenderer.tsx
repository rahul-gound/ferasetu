import { useState, useEffect } from 'react';
import type { TemplateSection, ShopProduct } from '../../types/template';
import NavbarSection from './sections/NavbarSection';
import HeroSection from './sections/HeroSection';
import BannerSection from './sections/BannerSection';
import ProductGridSection from './sections/ProductGridSection';
import ContactSection from './sections/ContactSection';
import FooterSection from './sections/FooterSection';
import TrackOrderModal from './TrackOrderModal';

interface TemplateRendererProps {
  sections: TemplateSection[];
  products: ShopProduct[];
  shopName: string;
  shopId: string;
  isPreview?: boolean;
}

export default function TemplateRenderer({ sections, products, shopName, shopId, isPreview }: TemplateRendererProps) {
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleOpenTrack = () => setShowTrackModal(true);
    window.addEventListener('fera-open-track-order', handleOpenTrack);
    return () => window.removeEventListener('fera-open-track-order', handleOpenTrack);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const contactSection = sections.find(s => s.type === 'contact');
  const shopPhone = (contactSection?.config?.phone as string) || '';

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        [data-section] {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        [data-section]:nth-child(1) { animation-delay: 0s; }
        [data-section]:nth-child(2) { animation-delay: 0.1s; }
        [data-section]:nth-child(3) { animation-delay: 0.2s; }
        [data-section]:nth-child(4) { animation-delay: 0.3s; }
        [data-section]:nth-child(5) { animation-delay: 0.4s; }
        [data-section]:nth-child(6) { animation-delay: 0.5s; }
        
        section {
          scroll-behavior: smooth;
        }
      `}</style>
      
      {isPreview && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 200,
          background: 'linear-gradient(90deg, #2563EB, #4F46E5)',
          color: '#fff', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '13px', fontWeight: 600,
        }}>
          <span>🔍</span> Live Preview
          <span style={{ marginLeft: 'auto', opacity: 0.7, fontWeight: 400 }}>
            Changes are saved automatically
          </span>
        </div>
      )}
      
      {showTrackModal && (
        <TrackOrderModal 
          shopId={shopId} 
          onClose={() => setShowTrackModal(false)} 
        />
      )}

      {sections.map((section, index) => {
        const key = `${section.type}-${index}`;
        const isVisible = visibleSections.has(key);
        
        return (
          <div
            key={section.id}
            id={key}
            data-section
            style={{
              opacity: isVisible ? 1 : 0.9,
            }}
          >
            {section.type === 'navbar' && <NavbarSection config={section.config} shopName={shopName} />}
            {section.type === 'hero' && <HeroSection config={section.config} shopName={shopName} />}
            {section.type === 'banner' && <BannerSection config={section.config} />}
            {section.type === 'productGrid' && <ProductGridSection config={section.config} products={products} shopId={shopId} shopPhone={shopPhone} />}
            {section.type === 'contact' && <ContactSection config={section.config} />}
            {section.type === 'footer' && <FooterSection config={section.config} />}
          </div>
        );
      })}
    </div>
  );
}
