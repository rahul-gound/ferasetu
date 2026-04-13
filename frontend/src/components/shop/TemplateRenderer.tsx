import type { TemplateSection, ShopProduct } from '../../types/template';
import NavbarSection from './sections/NavbarSection';
import HeroSection from './sections/HeroSection';
import BannerSection from './sections/BannerSection';
import ProductGridSection from './sections/ProductGridSection';
import ContactSection from './sections/ContactSection';
import FooterSection from './sections/FooterSection';

interface TemplateRendererProps {
  sections: TemplateSection[];
  products: ShopProduct[];
  shopName: string;
  isPreview?: boolean;
}

export default function TemplateRenderer({ sections, products, shopName, isPreview }: TemplateRendererProps) {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
      {sections.map(section => {
        switch (section.type) {
          case 'navbar':
            return <NavbarSection key={section.id} config={section.config} shopName={shopName} />;
          case 'hero':
            return <HeroSection key={section.id} config={section.config} shopName={shopName} />;
          case 'banner':
            return <BannerSection key={section.id} config={section.config} />;
          case 'productGrid':
            return <ProductGridSection key={section.id} config={section.config} products={products} />;
          case 'contact':
            return <ContactSection key={section.id} config={section.config} />;
          case 'footer':
            return <FooterSection key={section.id} config={section.config} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
