import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  BrainCircuit,
  CheckCircle2,
  HelpCircle,
  Palette,
  Image as ImageIcon,
  Upload,
  ArrowRight,
  ArrowLeft,
  Store,
  MessageCircle,
  ShoppingBag,
  ShieldCheck,
  Check,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { TemplateSection } from '../types/template';

interface WebsiteAIBuilderProps {
  shopName?: string;
  onGenerate?: (sections: TemplateSection[]) => void;
  websiteId?: string;
  onApplied?: (updatedWebsite: any) => void;
}

interface AIPreferences {
  // Step 1: Dream Store
  shopName: string;
  shopCategory: string;
  shopDescription: string;
  specialty: string;

  // Step 2: Clearing Doubts & Clarifying Preferences
  fulfillmentMethod: 'whatsapp' | 'checkout' | 'hybrid';
  vibe: 'market' | 'atelier' | 'bold' | 'minimal';
  sectionsWanted: string[];

  // Step 3: Visual Identity
  logoUrl: string;
  heroImageUrl: string;
  primaryColor: string;
  accentColor: string;
  colorPresetName: string;
}

const CATEGORIES = [
  'Grocery & Daily Kirana',
  'Clothing, Fashion & Boutique',
  'Electronics, Mobiles & Gadgets',
  'Restaurant, Sweets & Bakery',
  'Handcrafts, Pottery & Artisans',
  'Health, Ayurvedic & Wellness',
  'Home Decor & Furniture',
  'Jewelry & Accessories',
  'Books & Stationery',
  'General Retail & Supermarket',
];

const CURATED_HERO_PRESETS = [
  { label: '🍏 Fresh Grocery & Kirana', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80' },
  { label: '👗 Boutique & Modern Fashion', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80' },
  { label: '📱 Electronics & Gadgets', url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1600&q=80' },
  { label: '☕ Cafe, Sweets & Chai', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&q=80' },
  { label: '🏺 Handcrafted Pottery & Art', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1600&q=80' },
  { label: '🌿 Natural Forest Honey & Ayurvedic', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1600&q=80' },
];

const COLOR_PRESETS = [
  { name: 'Royal Blue (Trust & Tech)', primary: '#2563EB', accent: '#1D4ED8' },
  { name: 'Forest Green (Fresh & Natural)', primary: '#059669', accent: '#047857' },
  { name: 'Warm Saffron (Vibrant & Festive)', primary: '#D97706', accent: '#B45309' },
  { name: 'Ruby Crimson (Bold & Festive)', primary: '#E11D48', accent: '#BE123C' },
  { name: 'Luxury Obsidian (Elegant & Premium)', primary: '#0F172A', accent: '#334155' },
  { name: 'Royal Purple (Artisan & Boutique)', primary: '#7C3AED', accent: '#6D28D9' },
];

export default function WebsiteAIBuilder({
  shopName = 'My Store',
  onGenerate,
  websiteId,
  onApplied,
}: WebsiteAIBuilderProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  const [prefs, setPrefs] = useState<AIPreferences>({
    shopName: shopName,
    shopCategory: 'Grocery & Daily Kirana',
    shopDescription: 'Quality everyday essentials and fresh groceries delivered directly to your doorstep with zero middleman markup.',
    specialty: '100% Genuine, same-day local delivery, direct merchant care',
    fulfillmentMethod: 'whatsapp',
    vibe: 'market',
    sectionsWanted: ['hero', 'divider', 'image-banner', 'product-grid', 'trust-strip', 'faq', 'footer'],
    logoUrl: '',
    heroImageUrl: CURATED_HERO_PRESETS[0].url,
    primaryColor: '#2563EB',
    accentColor: '#1D4ED8',
    colorPresetName: 'Royal Blue (Trust & Tech)',
  });

  const toggleSection = (sectionKey: string) => {
    setPrefs((prev) => {
      const exists = prev.sectionsWanted.includes(sectionKey);
      return {
        ...prev,
        sectionsWanted: exists
          ? prev.sectionsWanted.filter((s) => s !== sectionKey)
          : [...prev.sectionsWanted, sectionKey],
      };
    });
  };

  const generateMonogramLogo = () => {
    const initials = prefs.shopName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'FS';
    const svgLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="${encodeURIComponent(prefs.primaryColor)}"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="44">${initials}</text></svg>`;
    setPrefs((prev) => ({ ...prev, logoUrl: svgLogo }));
    toast.success(`Generated brand monogram logo for "${prefs.shopName}"!`);
  };

  const handleRunAIGenerator = async () => {
    setIsGenerating(true);
    setGenerationProgress('Consulting Fera AI design models & crafting human copy…');

    try {
      // Build bespoke sections based on preferences and doubts cleared
      const generatedSections: any[] = [];

      // 1. Header (Navbar)
      generatedSections.push({
        id: `header-${Date.now()}`,
        type: 'header',
        variant: prefs.vibe === 'atelier' ? 'editorial' : prefs.vibe === 'minimal' ? 'minimal' : 'commerce',
        config: {
          shopName: prefs.shopName,
          primaryColor: prefs.primaryColor,
          logoUrl: prefs.logoUrl || undefined,
        },
      });

      // 2. Hero Section
      if (prefs.sectionsWanted.includes('hero')) {
        generatedSections.push({
          id: `hero-${Date.now() + 1}`,
          type: 'hero',
          variant: prefs.vibe === 'atelier' ? 'editorial' : prefs.vibe === 'minimal' ? 'minimal' : 'commerce-banner',
          config: {
            eyebrow: 'OFFICIAL STOREFRONT • 0% COMMISSION',
            headline: `${prefs.shopName} — Direct From Shopkeeper`,
            subheadline: prefs.shopDescription || 'Explore authentic merchandise delivered directly from our store.',
            ctaText: prefs.fulfillmentMethod === 'whatsapp' ? 'Order on WhatsApp' : 'Browse Catalog',
            ctaHref: prefs.fulfillmentMethod === 'whatsapp' ? '#contact' : '#products',
            clickAction: prefs.fulfillmentMethod === 'whatsapp' ? 'whatsapp' : 'scroll',
            imageUrl: prefs.heroImageUrl,
            bgColor: prefs.primaryColor,
          },
        });
      }

      // 3. Straight Line Divider
      if (prefs.sectionsWanted.includes('divider')) {
        generatedSections.push({
          id: `divider-${Date.now() + 2}`,
          type: 'divider',
          config: {
            style: 'solid',
            thickness: 2,
            width: '80%',
            color: prefs.primaryColor,
            label: '✦ CURATED SELECTION ✦',
            spacing: 'md',
          },
        });
      }

      // 4. Promo Image Banner Section
      if (prefs.sectionsWanted.includes('image-banner')) {
        generatedSections.push({
          id: `image-banner-${Date.now() + 3}`,
          type: 'image-banner',
          config: {
            imageUrl: prefs.heroImageUrl,
            headline: `Quality You Can Trust`,
            subheadline: prefs.specialty,
            ctaText: prefs.fulfillmentMethod === 'whatsapp' ? 'Chat Directly with Owner' : 'Shop Selected Items',
            clickAction: prefs.fulfillmentMethod === 'whatsapp' ? 'whatsapp' : 'cart',
            height: 'medium',
            overlayDarkness: 'medium',
          },
        });
      }

      // 5. Product Grid
      if (prefs.sectionsWanted.includes('product-grid')) {
        generatedSections.push({
          id: `product-grid-${Date.now() + 4}`,
          type: 'product-grid',
          variant: 'clean',
          config: {
            title: 'Featured Products',
            columns: 3,
            showStock: true,
          },
        });
      }

      // 6. Trust Strip
      if (prefs.sectionsWanted.includes('trust-strip')) {
        generatedSections.push({
          id: `trust-strip-${Date.now() + 5}`,
          type: 'trust-strip',
          variant: 'commerce-badges',
          config: {
            badge1: '0% Middleman Fees',
            badge2: '100% Direct Store Support',
            badge3: 'Fast Local Delivery',
          },
        });
      }

      // 7. Customer Reviews / Testimonials
      if (prefs.sectionsWanted.includes('testimonials')) {
        generatedSections.push({
          id: `testimonials-${Date.now() + 6}`,
          type: 'testimonials',
          config: {
            title: 'Loved by Local Customers',
          },
        });
      }

      // 8. FAQ
      if (prefs.sectionsWanted.includes('faq')) {
        generatedSections.push({
          id: `faq-${Date.now() + 7}`,
          type: 'faq',
          config: {
            title: 'Frequently Asked Questions',
          },
        });
      }

      // 9. Footer
      generatedSections.push({
        id: `footer-${Date.now() + 8}`,
        type: 'footer',
        config: {
          shopName: prefs.shopName,
          tagline: `${prefs.shopName} — Direct shopkeeper commerce powered by FeraSetu.`,
          primaryColor: '#0F172A',
        },
      });

      // Assemble full payload
      const fullWebsitePayload = {
        name: prefs.shopName,
        template: prefs.vibe,
        theme: {
          id: prefs.vibe,
          overrides: {
            primaryColor: prefs.primaryColor,
            accentColor: prefs.accentColor,
            fontFamily: prefs.vibe === 'atelier' ? "'Playfair Display', serif" : 'Inter, sans-serif',
          },
        },
        config: {
          logo: prefs.logoUrl,
          heroImage: prefs.heroImageUrl,
          overrides: {
            primaryColor: prefs.primaryColor,
            accentColor: prefs.accentColor,
          },
        },
        sections: generatedSections,
      };

      // Notify parent canvas
      if (onGenerate) onGenerate(generatedSections);
      if (onApplied) onApplied(fullWebsitePayload);

      toast.success('🎉 Your custom shop website has been created and applied!');
    } catch (err: any) {
      console.error('AI Builder error:', err);
      toast.error('Could not apply AI website. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 select-none">
      {/* Header Stepper Indicator */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-950 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 text-white flex items-center justify-center shadow-xs">
              <Wand2 size={15} />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              AI Storefront Creator
            </h2>
          </div>
          <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200">
            Step {currentStep} of 3
          </span>
        </div>

        {/* Stepper Dots */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[
            { step: 1, label: 'Shop Concept' },
            { step: 2, label: 'Preferences & Doubts' },
            { step: 3, label: 'Colors & Branding' },
          ].map((s) => (
            <div
              key={s.step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentStep >= s.step ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Multi-Step Form Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* STEP 1: SHOP CONCEPT & WHAT YOU SELL */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Tell us about your shop
              </h3>
              <p className="text-xs text-slate-500">
                Answer these simple questions so AI writes accurate headlines, badges, and catalog descriptions.
              </p>
            </div>

            {/* Shop Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                🏪 Shop or Brand Name
              </label>
              <input
                type="text"
                value={prefs.shopName}
                onChange={(e) => setPrefs({ ...prefs, shopName: e.target.value })}
                placeholder="e.g. Laxmi Kirana & Dry Fruits"
                className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-xs"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                📦 Category of Merchandise
              </label>
              <select
                value={prefs.shopCategory}
                onChange={(e) => setPrefs({ ...prefs, shopCategory: e.target.value })}
                className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                📝 Describe what you offer to customers
              </label>
              <textarea
                rows={3}
                value={prefs.shopDescription}
                onChange={(e) => setPrefs({ ...prefs, shopDescription: e.target.value })}
                placeholder="e.g. Best quality spices, pulses, rice, cold-pressed oils at honest prices."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-xs resize-none"
              />
            </div>

            {/* Unique Guarantee */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                ⭐ What is your main specialty or customer promise?
              </label>
              <input
                type="text"
                value={prefs.specialty}
                onChange={(e) => setPrefs({ ...prefs, specialty: e.target.value })}
                placeholder="e.g. 100% Purity Guarantee, 30-minute delivery, Free sample with every order"
                className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium shadow-xs"
              />
            </div>
          </div>
        )}

        {/* STEP 2: CLEARING DOUBTS & CUSTOMER WORKFLOW PREFERENCES */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <HelpCircle size={16} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Let's clear any doubts about how you operate
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Choose the exact customer experience you want on your storefront.
              </p>
            </div>

            {/* Question 1: How do you want to fulfill orders? */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                1. How should customers place orders with you?
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'whatsapp',
                    title: 'Direct WhatsApp Chat & Confirmation (Recommended)',
                    desc: 'Customer clicks button and their cart/inquiry opens directly in your WhatsApp. 0% fees, 100% human relationship.',
                    icon: MessageCircle,
                    badge: 'Zero Commission',
                  },
                  {
                    id: 'checkout',
                    title: 'Online Storefront Cart & Delivery Address',
                    desc: 'Customer adds items to cart, types address, and places order online. You receive instant order alert.',
                    icon: ShoppingBag,
                    badge: 'Automated Cart',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = prefs.fulfillmentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPrefs({ ...prefs, fulfillmentMethod: item.id as any })}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                        isSel
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 ring-2 ring-purple-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 ${isSel ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question 2: Store Vibe / Aesthetic */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                2. Which visual vibe best represents your business?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'market', title: 'Modern Clean Retail', desc: 'High-contrast, fast & clear for daily shopping' },
                  { id: 'atelier', title: 'Warm Artisan Craft', desc: 'Editorial serif typography, heritage feel' },
                  { id: 'bold', title: 'Bold Youth D2C', desc: 'Energetic pills, vibrant colors, high punch' },
                  { id: 'minimal', title: 'Swiss Minimalist', desc: 'Clean monochrome, brutalist structural lines' },
                ].map((v) => {
                  const isSel = prefs.vibe === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPrefs({ ...prefs, vibe: v.id as any })}
                      className={`text-left p-3 rounded-xl border text-xs transition-all ${
                        isSel
                          ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 font-bold ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700'
                      }`}
                    >
                      <span className="block font-bold text-slate-900 dark:text-white mb-0.5">{v.title}</span>
                      <span className="text-[10px] text-slate-500 leading-tight block">{v.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question 3: Sections Wanted */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                3. Choose sections to generate:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'hero', label: 'Hero Showcase' },
                  { id: 'divider', label: 'Straight Line Divider' },
                  { id: 'image-banner', label: 'Image Section / Banner' },
                  { id: 'product-grid', label: 'Product Catalog Grid' },
                  { id: 'trust-strip', label: 'Trust & Guarantees' },
                  { id: 'testimonials', label: 'Customer Reviews' },
                  { id: 'faq', label: 'FAQ Accordion' },
                ].map((sec) => {
                  const isChecked = prefs.sectionsWanted.includes(sec.id);
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                        isChecked
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${isChecked ? 'bg-purple-600 text-white' : 'border border-slate-300'}`}>
                        {isChecked && <Check size={12} />}
                      </div>
                      <span className="truncate">{sec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOGO, IMAGES & COLOR PALETTE */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Palette size={16} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Brand Identity: Logo, Imagery & Colors
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Give your store its signature look and authentic feel.
              </p>
            </div>

            {/* Logo Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Store Logo
                </label>
                <button
                  type="button"
                  onClick={generateMonogramLogo}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 flex items-center gap-1"
                >
                  <Sparkles size={11} />
                  <span>1-Click Monogram</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {prefs.logoUrl ? (
                  <div className="w-14 h-14 rounded-2xl border border-slate-200 p-1 flex items-center justify-center bg-white shadow-2xs overflow-hidden shrink-0">
                    <img src={prefs.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50 text-[10px] text-center font-medium shrink-0">
                    No Logo
                  </div>
                )}
                <input
                  type="text"
                  value={prefs.logoUrl}
                  onChange={(e) => setPrefs({ ...prefs, logoUrl: e.target.value })}
                  placeholder="Paste logo image URL or use 1-click generator above"
                  className="flex-1 h-11 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Curated Hero Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Showcase & Hero Image
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CURATED_HERO_PRESETS.map((preset) => {
                  const isSel = prefs.heroImageUrl === preset.url;
                  return (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setPrefs({ ...prefs, heroImageUrl: preset.url })}
                      className={`relative rounded-xl overflow-hidden border p-2 text-left transition-all ${
                        isSel
                          ? 'border-purple-600 ring-2 ring-purple-500/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="h-16 w-full rounded-lg overflow-hidden mb-1.5 bg-slate-100">
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 block truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-1">
                <input
                  type="text"
                  value={prefs.heroImageUrl}
                  onChange={(e) => setPrefs({ ...prefs, heroImageUrl: e.target.value })}
                  placeholder="Or enter custom image URL https://..."
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Primary Brand Color Palette
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isSel = prefs.primaryColor === preset.primary;
                  return (
                    <button
                      key={preset.primary}
                      type="button"
                      onClick={() =>
                        setPrefs({
                          ...prefs,
                          primaryColor: preset.primary,
                          accentColor: preset.accent,
                          colorPresetName: preset.name,
                        })
                      }
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                        isSel
                          ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20 font-bold'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: preset.primary }} />
                      <span className="text-[11px] text-slate-800 truncate">{preset.name.split(' (')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex inputs */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={prefs.primaryColor}
                  onChange={(e) => setPrefs({ ...prefs, primaryColor: e.target.value, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-1 bg-white"
                />
                <input
                  type="text"
                  value={prefs.primaryColor}
                  onChange={(e) => setPrefs({ ...prefs, primaryColor: e.target.value, accentColor: e.target.value })}
                  className="flex-1 h-10 px-3 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-shrink-0 shadow-lg">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => (s - 1) as any)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => (s + 1) as any)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 transition-all"
          >
            <span>Next: {currentStep === 1 ? 'Clear Doubts' : 'Brand Identity'}</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRunAIGenerator}
            disabled={isGenerating}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-purple-600/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <BrainCircuit size={16} className="animate-spin text-purple-200" />
                <span>Crafting Your Website…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Build My Shop Website Live</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
