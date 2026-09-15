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

export interface ProductOption {
  id: string;
  name: string;
  position: number;
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  option_signature: string;
  sku?: string;
  barcode?: string;
  price: number;
  price_minor: number;
  compare_at_price?: number | null;
  compare_at_price_minor?: number | null;
  image_url?: string;
  media_key?: string;
  status: 'active' | 'draft' | 'archived';
  option_values?: Record<string, string>;
}

export interface ShopProduct {
  id: string;
  name: string;
  title?: string;
  description?: string;
  price: number;
  price_minor?: number;
  sale_price?: number;
  category?: string;
  stock_quantity: number;
  stock?: number;
  image_url?: string;
  media_key?: string;
  is_active: number;
  status?: string;
  sku?: string;
  barcode?: string;
  options?: ProductOption[];
  variants?: ProductVariant[];
  has_variants?: boolean;
}

export interface PublicShopData {
  shop: { id: string; name: string; subdomain: string; hostname?: string };
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
