export interface SectionConfig {
  [key: string]: unknown;
}

export interface TemplateSection {
  id: string;
  type: 'navbar' | 'hero' | 'banner' | 'productGrid' | 'contact' | 'footer';
  config: SectionConfig;
}

export interface ShopTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  primaryColor: string;
  accentColor: string;
  emoji: string;
  defaultSections: TemplateSection[];
}

export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  sale_price?: number;
  category?: string;
  stock_quantity: number;
  image_url?: string;
  is_active: number;
}

export interface PublicShopData {
  shop: { id: string; name: string; subdomain: string };
  website: {
    id: string;
    name: string;
    template: string;
    sections: TemplateSection[];
    config: Record<string, unknown>;
    is_published: number;
  };
  products: ShopProduct[];
}
