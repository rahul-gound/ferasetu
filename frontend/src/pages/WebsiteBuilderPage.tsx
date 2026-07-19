import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Globe, Eye, EyeOff, Sparkles, Plus, Trash2, Save,
  ExternalLink, Layers, Settings, ChevronDown, GripVertical, Wand2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import TemplateRenderer from '../components/shop/TemplateRenderer';
import WebsiteAIBuilder from '../components/WebsiteAIBuilder';
import type { TemplateSection, ShopTemplate } from '../types/template';

const SECTION_META: Record<TemplateSection['type'], { emoji: string; label: string }> = {
  navbar:      { emoji: '🧭', label: 'Navbar' },
  hero:        { emoji: '🦸', label: 'Hero' },
  banner:      { emoji: '📢', label: 'Banner' },
  productGrid: { emoji: '🛍️', label: 'Products' },
  contact:     { emoji: '📍', label: 'Contact' },
  footer:      { emoji: '🦶', label: 'Footer' },
};

const SECTION_TYPES = Object.keys(SECTION_META) as TemplateSection['type'][];

function makeDefaultSection(type: TemplateSection['type'], shopName: string): TemplateSection {
  const defaults: Record<TemplateSection['type'], TemplateSection['config']> = {
    navbar: { shopName, primaryColor: '#FF6B35', accentColor: '#004E89', links: [] },
    hero: { headline: 'Welcome to our store', subheadline: 'Shop the best products', ctaText: 'Shop Now', ctaHref: '#products', bgColor: '#FF6B35' },
    banner: { text: '🎉 Special offers available!', bgColor: '#F59E0B', textColor: '#fff' },
    productGrid: { title: 'Our Products', accentColor: '#FF6B35', showStock: true },
    contact: { title: 'Find Us', address: '', phone: '', email: '', hours: '' },
    footer: { shopName, tagline: 'Powered by FeraSetu', primaryColor: '#1E293B', social: {} },
  };
  return { id: `${type}-${Date.now()}`, type, config: defaults[type] };
}

const MOCK_PRODUCTS = [
  { id: '1', name: 'Sample Product 1', price: 299, stock_quantity: 10, is_active: 1 as const },
  { id: '2', name: 'Sample Product 2', price: 599, stock_quantity: 5, is_active: 1 as const },
  { id: '3', name: 'Sample Product 3', price: 149, stock_quantity: 0, is_active: 1 as const },
];

interface WebsiteData {
  id: string;
  name: string;
  template: string;
  sections: TemplateSection[];
  is_published: number;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || ''}
      style={{ width: '100%', boxSizing: 'border-box' }}
    />
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
      />
      <input
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1 }}
      />
    </div>
  );
}

function SectionConfigEditor({ section, onChange }: {
  section: TemplateSection;
  onChange: (key: string, value: unknown) => void;
}) {
  const cfg = section.config;
  const str = (v: unknown, fallback = '') => (v as string) || fallback;

  switch (section.type) {
    case 'navbar':
      return (
        <>
          <FieldRow label="Shop Name">
            <TextInput value={str(cfg.shopName)} onChange={v => onChange('shopName', v)} placeholder="My Store" />
          </FieldRow>
          <FieldRow label="Primary Color">
            <ColorInput value={str(cfg.primaryColor, '#FF6B35')} onChange={v => onChange('primaryColor', v)} label="Primary color" />
          </FieldRow>
          <FieldRow label="Accent Color">
            <ColorInput value={str(cfg.accentColor, '#004E89')} onChange={v => onChange('accentColor', v)} label="Accent color" />
          </FieldRow>
        </>
      );
    case 'hero':
      return (
        <>
          <FieldRow label="Headline">
            <TextInput value={str(cfg.headline)} onChange={v => onChange('headline', v)} placeholder="Welcome to our store" />
          </FieldRow>
          <FieldRow label="Subheadline">
            <TextInput value={str(cfg.subheadline)} onChange={v => onChange('subheadline', v)} placeholder="Shop the best products" />
          </FieldRow>
          <FieldRow label="CTA Button Text">
            <TextInput value={str(cfg.ctaText)} onChange={v => onChange('ctaText', v)} placeholder="Shop Now" />
          </FieldRow>
          <FieldRow label="CTA Button Link">
            <TextInput value={str(cfg.ctaHref)} onChange={v => onChange('ctaHref', v)} placeholder="#products" />
          </FieldRow>
          <FieldRow label="Background Color">
            <ColorInput value={str(cfg.bgColor, '#FF6B35')} onChange={v => onChange('bgColor', v)} label="Background color" />
          </FieldRow>
        </>
      );
    case 'banner':
      return (
        <>
          <FieldRow label="Banner Text">
            <TextInput value={str(cfg.text)} onChange={v => onChange('text', v)} placeholder="🎉 Special offers available!" />
          </FieldRow>
          <FieldRow label="Background Color">
            <ColorInput value={str(cfg.bgColor, '#F59E0B')} onChange={v => onChange('bgColor', v)} label="Background color" />
          </FieldRow>
          <FieldRow label="Text Color">
            <ColorInput value={str(cfg.textColor, '#ffffff')} onChange={v => onChange('textColor', v)} label="Text color" />
          </FieldRow>
        </>
      );
    case 'productGrid':
      return (
        <>
          <FieldRow label="Section Title">
            <TextInput value={str(cfg.title)} onChange={v => onChange('title', v)} placeholder="Our Products" />
          </FieldRow>
          <FieldRow label="Accent Color">
            <ColorInput value={str(cfg.accentColor, '#FF6B35')} onChange={v => onChange('accentColor', v)} label="Accent color" />
          </FieldRow>
          <FieldRow label="Options">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!(cfg.showStock as boolean | undefined)}
                onChange={e => onChange('showStock', e.target.checked)}
              />
              Show Stock Quantity
            </label>
          </FieldRow>
        </>
      );
    case 'contact':
      return (
        <>
          <FieldRow label="Section Title">
            <TextInput value={str(cfg.title)} onChange={v => onChange('title', v)} placeholder="Find Us" />
          </FieldRow>
          <FieldRow label="Address">
            <TextInput value={str(cfg.address)} onChange={v => onChange('address', v)} placeholder="123 Main Street, City" />
          </FieldRow>
          <FieldRow label="Phone">
            <TextInput value={str(cfg.phone)} onChange={v => onChange('phone', v)} placeholder="+91 9999999999" />
          </FieldRow>
          <FieldRow label="Email">
            <TextInput value={str(cfg.email)} onChange={v => onChange('email', v)} placeholder="hello@mystore.com" />
          </FieldRow>
          <FieldRow label="Business Hours">
            <TextInput value={str(cfg.hours)} onChange={v => onChange('hours', v)} placeholder="Mon–Sat: 9am – 8pm" />
          </FieldRow>
        </>
      );
    case 'footer':
      return (
        <>
          <FieldRow label="Shop Name">
            <TextInput value={str(cfg.shopName)} onChange={v => onChange('shopName', v)} placeholder="My Store" />
          </FieldRow>
          <FieldRow label="Tagline">
            <TextInput value={str(cfg.tagline)} onChange={v => onChange('tagline', v)} placeholder="Your best shopping destination" />
          </FieldRow>
          <FieldRow label="Background Color">
            <ColorInput value={str(cfg.primaryColor, '#1E293B')} onChange={v => onChange('primaryColor', v)} label="Background color" />
          </FieldRow>
          <FieldRow label="WhatsApp Link">
            <TextInput
              value={str((cfg.social as Record<string, string> | undefined)?.whatsapp)}
              onChange={v => onChange('social', { ...(cfg.social as Record<string, string> || {}), whatsapp: v })}
              placeholder="https://wa.me/91XXXXXXXXXX"
            />
          </FieldRow>
          <FieldRow label="Instagram Link">
            <TextInput
              value={str((cfg.social as Record<string, string> | undefined)?.instagram)}
              onChange={v => onChange('social', { ...(cfg.social as Record<string, string> || {}), instagram: v })}
              placeholder="https://instagram.com/mystore"
            />
          </FieldRow>
          <FieldRow label="Facebook Link">
            <TextInput
              value={str((cfg.social as Record<string, string> | undefined)?.facebook)}
              onChange={v => onChange('social', { ...(cfg.social as Record<string, string> || {}), facebook: v })}
              placeholder="https://facebook.com/mystore"
            />
          </FieldRow>
        </>
      );
  }
}

export default function WebsiteBuilderPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ai' | 'gallery' | 'editor' | 'preview'>('ai');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [shopName, setShopName] = useState('');
  const [, setShopPhone] = useState('');
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  const { data: websiteData } = useQuery<WebsiteData | null>({
    queryKey: ['website'],
    queryFn: async () => {
      try {
        const res = await api.get('/website');
        return res.data as WebsiteData;
      } catch {
        return null;
      }
    },
  });

  const { data: templates = [] } = useQuery<ShopTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/website/templates');
      return (res.data.templates || res.data) as ShopTemplate[];
    },
  });

  useEffect(() => {
    if (websiteData) {
      setShopName(websiteData.name || user?.business_name || '');
      if (websiteData.sections?.length) {
        setSections(websiteData.sections);
        const contactSection = websiteData.sections.find(s => s.type === 'contact');
        if (contactSection?.config?.phone) {
          setShopPhone(contactSection.config.phone as string);
        }
      }
      if (websiteData.template) setSelectedTemplate(websiteData.template);
      setIsPublished(websiteData.is_published === 1);
    } else if (user?.business_name) {
      setShopName(user.business_name);
      setShopPhone(user.phone || '');
    }
  }, [websiteData, user]);

  const saveMutation = useMutation({
    mutationFn: () => api.post('/website', { name: shopName, template: selectedTemplate, sections }),
    onSuccess: () => {
      toast.success(translate('saved') || 'Website saved!');
      queryClient.invalidateQueries({ queryKey: ['website'] });
      setSaving(false);
    },
    onError: () => {
      toast.error('Failed to save. Please try again.');
      setSaving(false);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.patch('/website/publish', { published: !isPublished }),
    onSuccess: (res) => {
      const published = (res.data as { published: boolean }).published;
      setIsPublished(published);
      toast.success(published ? '🌐 Website published!' : '🔒 Website unpublished');
      if (published) {
        try {
          const flags = JSON.parse(localStorage.getItem('fera_setup_flags') || '{}');
          flags.website_published = true;
          localStorage.setItem('fera_setup_flags', JSON.stringify(flags));
        } catch { /* ignore */ }
      }
    },
    onError: () => toast.error('Failed to update publish status'),
  });

  const handleSave = () => {
    if (!shopName.trim()) { toast.error('Please enter a shop name'); return; }
    setSaving(true);
    saveMutation.mutate();
  };

  const updateSectionConfig = (sectionId: string, key: string, value: unknown) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, config: { ...s.config, [key]: value } } : s
    ));
  };

  const deleteSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const addSection = (type: TemplateSection['type']) => {
    const newSection = makeDefaultSection(type, shopName || 'My Store');
    setSections(prev => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    setAddSectionOpen(false);
    setActiveTab('editor');
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiResponse('');
    try {
      const res = await api.post('/ai/chat', {
        message: `Generate website sections JSON for: ${aiPrompt}`,
        language: 'en',
        usageType: 'website_ai',
      });
      const data = res.data as { content?: string };
      setAiResponse(data.content || 'AI response received');
    } catch (err: any) {
      toast.error(err.response?.status === 402 ? 'AI credits finished. Buy credits to continue.' : 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;

  const panelBase: React.CSSProperties = {
    background: 'var(--surface)', borderRadius: '12px',
    border: '1px solid var(--border)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  };

  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'fera-search.tech';
  const liveUrl = `https://${user?.subdomain || shopName.toLowerCase().replace(/\s+/g, '-')}.${baseDomain}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--surface)', borderRadius: '12px',
        border: '1px solid var(--border)', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <Globe size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginRight: '4px' }}>
          Website Builder
        </h1>
        <input
          className="input"
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          placeholder="Your shop name..."
          style={{ flex: 1, minWidth: '160px', maxWidth: '260px' }}
        />
        {isPublished && shopName && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', color: '#059669', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={13} /> View Live
          </a>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: isPublished ? '#EF4444' : '#10B981',
              borderColor: isPublished ? '#EF4444' : '#10B981',
            }}
          >
            {isPublished ? <EyeOff size={15} /> : <Globe size={15} />}
            {isPublished ? 'Take Offline' : 'Deploy Website'}
          </button>
        </div>
      </div>

      {isPublished && user?.subdomain && (
        <div style={{
          background: '#ECFDF5', border: '1px solid #10B981',
          padding: '12px 20px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: '#10B981', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff'
          }}>
            <Globe size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#065F46' }}>
              Your shop is LIVE!
            </div>
            <div style={{ fontSize: '13px', color: '#047857' }}>
              Anyone can visit at: <a 
                href={`https://${user.subdomain}.${baseDomain}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ fontWeight: 800, textDecoration: 'underline', color: 'inherit' }}
              >
                {user.subdomain}.{baseDomain}
              </a>
            </div>
          </div>
          <button 
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => {
              navigator.clipboard.writeText(`https://${user.subdomain}.${baseDomain}`);
              toast.success('Link copied to clipboard!');
            }}
          >
            Copy Link
          </button>
        </div>
      )}

      {/* Mobile tab switcher */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {(['ai', 'gallery', 'editor', 'preview'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              background: activeTab === tab ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
            }}
          >
            {tab === 'ai' && <Wand2 size={14} />}
            {tab === 'gallery' && <Layers size={14} />}
            {tab === 'editor' && <Settings size={14} />}
            {tab === 'preview' && <Eye size={14} />}
            {tab === 'ai' ? 'AI Mode' : tab === 'gallery' ? 'Design' : tab === 'editor' ? 'Edit Content' : 'Preview'}
          </button>
        ))}
      </div>

      {/* 3-panel body */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>

        {/* LEFT PANEL */}
        <div style={{
          ...panelBase,
          width: '300px', flexShrink: 0,
          display: (activeTab === 'preview' || activeTab === 'ai') ? 'none' : 'flex',
        }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['gallery', 'editor'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '13px',
                  background: activeTab === t ? 'var(--bg)' : 'var(--surface)',
                  color: activeTab === t ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === t ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                {t === 'gallery' ? '🎨 Choose Design' : '📝 Manage Sections'}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* GALLERY TAB */}
            {activeTab === 'gallery' && (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Choose a look for your shop
                </p>
                {templates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                    <p style={{ fontSize: '13px' }}>Loading templates…</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {templates.map(t => (
                      <div
                        key={t.id}
                        style={{
                          borderRadius: '10px', overflow: 'hidden',
                          border: selectedTemplate === t.id
                            ? `2px solid ${t.primaryColor}`
                            : '2px solid var(--border)',
                          cursor: 'pointer', transition: 'border-color 0.15s',
                        }}
                        onClick={() => {
                          setSections(t.defaultSections);
                          setSelectedTemplate(t.id);
                          setActiveTab('editor');
                        }}
                      >
                        <div style={{
                          background: t.primaryColor, padding: '16px',
                          display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                          <span style={{ fontSize: '28px' }}>{t.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{t.name}</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px' }}>{t.category}</div>
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg)' }}>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
                            {t.description}
                          </p>
                          <button
                            className="btn btn-primary"
                            style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                            onClick={e => {
                              e.stopPropagation();
                              setSections(t.defaultSections);
                              setSelectedTemplate(t.id);
                              setActiveTab('editor');
                            }}
                          >
                            Use Template
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTIONS EDITOR TAB */}
            {activeTab === 'editor' && (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    {sections.length} section{sections.length !== 1 ? 's' : ''}
                    {selectedTemplate && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {selectedTemplate}</span>
                    )}
                  </div>
                </div>

                {sections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    <Layers size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                    <p style={{ fontSize: '13px' }}>No sections yet.<br />Add one below or pick a template.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {sections.map(section => {
                      const meta = SECTION_META[section.type];
                      const isSelected = selectedSectionId === section.id;
                      return (
                        <div
                          key={section.id}
                          onClick={() => setSelectedSectionId(section.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                            background: isSelected ? 'rgba(255,107,53,0.08)' : 'var(--bg)',
                            border: isSelected ? '1px solid rgba(255,107,53,0.3)' : '1px solid var(--border)',
                            transition: 'all 0.15s',
                          }}
                        >
                          <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '16px' }}>{meta.emoji}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                            {meta.label}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); deleteSection(section.id); }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-muted)', padding: '2px',
                              display: 'flex', alignItems: 'center',
                            }}
                            aria-label="Delete section"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Section dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setAddSectionOpen(o => !o)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <Plus size={15} /> Add Section <ChevronDown size={13} />
                  </button>
                  {addSectionOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      overflow: 'hidden', marginTop: '4px',
                    }}>
                      {SECTION_TYPES.map(type => {
                        const meta = SECTION_META[type];
                        return (
                          <button
                            key={type}
                            onClick={() => addSection(type)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              width: '100%', padding: '10px 14px',
                              border: 'none', background: 'none', cursor: 'pointer',
                              fontSize: '14px', color: 'var(--text)', textAlign: 'left',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <span>{meta.emoji}</span>
                            <span style={{ fontWeight: 500 }}>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Helper strip */}
          <div style={{
            borderTop: '1px solid var(--border)', padding: '14px',
            background: 'var(--bg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={14} style={{ color: '#7C3AED' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED' }}>FeraSetu Helper</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                className="input"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ask AI to write for you..."
                style={{ flex: 1, fontSize: '12px' }}
                onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate(); }}
              />
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating}
                style={{
                  background: '#7C3AED', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '8px 10px', cursor: 'pointer',
                  fontSize: '13px', flexShrink: 0,
                }}
              >
                {aiGenerating ? '⏳' : 'Create'}
              </button>
            </div>
            {aiResponse && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  padding: '10px', background: 'rgba(124,58,237,0.08)',
                  borderRadius: '6px', fontSize: '12px', color: 'var(--text)',
                  lineHeight: 1.5, maxHeight: '80px', overflowY: 'auto',
                }}>
                  {aiResponse}
                </div>
                {(aiResponse.includes('[') || aiResponse.includes('{')) && (
                  <button
                    onClick={() => {
                      try {
                        let jsonStr = aiResponse;
                        const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                        if (codeBlockMatch) {
                           jsonStr = codeBlockMatch[1];
                        }
                        const jsonMatch = jsonStr.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
                        if (!jsonMatch) throw new Error('No JSON found');
                        
                        let parsed;
                        try {
                           parsed = JSON.parse(jsonMatch[0]);
                        } catch (parseError) {
                           // If it fails to parse, it might be truncated.
                           throw new Error('JSON is incomplete or invalid. Please ask the AI to "continue" or generate a shorter version.');
                        }

                        const newSections = Array.isArray(parsed) ? parsed : (parsed.sections || []);
                        if (newSections.length > 0) {
                          setSections(newSections);
                          toast.success('✨ AI Sections applied to your website!');
                        } else {
                          throw new Error('No sections found in JSON.');
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Could not parse AI response into website sections.');
                      }
                    }}
                    style={{
                      background: '#10B981', color: '#fff', border: 'none',
                      borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                      fontSize: '11px', fontWeight: 700, width: '100%',
                    }}
                  >
                    🪄 Apply these sections to my site
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL — AI Builder or Live Preview */}
        <div style={{
          ...panelBase, flex: 1, minWidth: 0,
          display: (activeTab === 'editor' || activeTab === 'ai') ? 'flex' : 'none',
        }}>
          {activeTab === 'ai' ? (
            // AI Mode
            <div style={{
              padding: '20px', flex: 1, overflowY: 'auto',
              background: 'var(--bg)',
            }}>
              <WebsiteAIBuilder
                shopName={shopName}
                onGenerate={(sections) => {
                  setSections(sections);
                  setActiveTab('preview');
                  toast.success('✨ Website design created! Check the preview.', { duration: 5000 });
                }}
              />
            </div>
          ) : (
            // Live Preview (for editor tab)
            <>
              <div style={{
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--bg)',
              }}>
                <Eye size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Live Preview</span>
                <span style={{
                  marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)',
                  background: 'var(--surface)', padding: '2px 8px', borderRadius: '10px',
                }}>60% zoom</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', background: '#e2e8f0', padding: '16px' }}>
                <div style={{
                  width: '166.67%',
                  transformOrigin: 'top left',
                  transform: 'scale(0.6)',
                  background: '#fff',
                  minHeight: '800px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}>
                  {sections.length === 0 ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: '600px', color: '#94A3B8', flexDirection: 'column', gap: '16px',
                    }}>
                      <Globe size={48} style={{ opacity: 0.3 }} />
                      <p style={{ fontSize: '20px', fontWeight: 600 }}>Your website preview will appear here</p>
                      <p style={{ fontSize: '14px' }}>Select a template or add sections to get started</p>
                    </div>
                  ) : (
                    <TemplateRenderer
                      shopId={user?.id || 'preview'}
                      sections={sections}
                      products={MOCK_PRODUCTS}
                      shopName={shopName || 'My Store'}
                      isPreview={true}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL — Section Config */}
        <div style={{
          ...panelBase, width: '280px', flexShrink: 0,
          display: (activeTab === 'gallery' || activeTab === 'preview' || activeTab === 'ai') ? 'none' : 'flex',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)',
          }}>
            <Settings size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              {selectedSection
                ? `${SECTION_META[selectedSection.type].emoji} ${SECTION_META[selectedSection.type].label} Settings`
                : 'Section Settings'}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {selectedSection ? (
              <SectionConfigEditor
                section={selectedSection}
                onChange={(key, value) => updateSectionConfig(selectedSection.id, key, value)}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <Settings size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  Select a section from the editor panel to configure its settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
