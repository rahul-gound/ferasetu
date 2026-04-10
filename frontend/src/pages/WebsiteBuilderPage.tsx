import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Globe, Sparkles, ExternalLink, Eye, EyeOff,
  CheckCircle, Clock, Palette, ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface WebsiteConfig {
  id: string;
  business_name: string;
  description: string;
  business_type: string;
  color_scheme: string;
  template_id?: string;
  is_published: boolean;
  subdomain: string;
  custom_domain?: string;
  generated_at?: string;
  banner_text?: string;
  theme?: {
    primary: string;
    secondary: string;
    font: string;
  };
}

interface Template {
  id: string;
  name: string;
  business_type: string;
  preview_url?: string;
  thumbnail?: string;
  description: string;
  colors: string[];
}

const BUSINESS_TYPES = [
  { id: 'grocery', label: '🛒 Grocery', desc: 'General provisions & daily essentials' },
  { id: 'fashion', label: '👗 Fashion', desc: 'Clothes, accessories & lifestyle' },
  { id: 'restaurant', label: '🍽️ Restaurant', desc: 'Food, meals & beverages' },
  { id: 'electronics', label: '📱 Electronics', desc: 'Gadgets, repairs & appliances' },
  { id: 'medical', label: '💊 Medical', desc: 'Pharmacy & healthcare products' },
  { id: 'general', label: '🏪 General', desc: 'Multi-category store' },
];

const COLOR_THEMES = [
  { id: 'orange', label: 'Energetic', colors: ['#FF6B35', '#FFF0E8'], preview: '#FF6B35' },
  { id: 'blue', label: 'Professional', colors: ['#004E89', '#E8F4FF'], preview: '#004E89' },
  { id: 'green', label: 'Natural', colors: ['#1A936F', '#E8FFF7'], preview: '#1A936F' },
  { id: 'purple', label: 'Premium', colors: ['#7C3AED', '#F3EEFF'], preview: '#7C3AED' },
  { id: 'red', label: 'Bold', colors: ['#EF4444', '#FFF0F0'], preview: '#EF4444' },
];

function WebsitePreview({ config }: { config: Partial<WebsiteConfig> & { color?: string } }) {
  const primaryColor = config.color || '#FF6B35';
  const bgColor = `${primaryColor}15`;

  return (
    <div style={{
      border: '2px solid var(--border)', borderRadius: '12px',
      overflow: 'hidden', fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      {/* Browser chrome */}
      <div style={{
        background: '#f5f5f5', padding: '8px 12px',
        borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
            <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, background: '#fff', borderRadius: '6px',
          padding: '3px 10px', fontSize: '11px', color: '#666',
        }}>
          {config.subdomain || 'yourstore'}.fera-shop.fera-seach.tech
        </div>
      </div>

      {/* Store preview */}
      <div style={{ background: '#fff' }}>
        {/* Header */}
        <div style={{ background: primaryColor, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>
            {config.business_name || 'Your Store Name'}
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
            <span>Home</span><span>Products</span><span>Cart</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{
          background: bgColor, padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: primaryColor, marginBottom: '6px' }}>
            {config.banner_text || `Welcome to ${config.business_name || 'Our Store'}!`}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', maxWidth: '300px', margin: '0 auto 12px' }}>
            {config.description || 'Quality products at the best prices'}
          </div>
          <div style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: '20px',
            background: primaryColor, color: '#fff', fontSize: '12px', fontWeight: 700,
          }}>
            Shop Now →
          </div>
        </div>

        {/* Product grid mock */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '10px' }}>Featured Products</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden',
              }}>
                <div style={{ height: '60px', background: `${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {config.business_type === 'grocery' ? '🥑' : config.business_type === 'fashion' ? '👕' : config.business_type === 'restaurant' ? '🍕' : '📦'}
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#333' }}>Product {i}</div>
                  <div style={{ fontSize: '11px', color: primaryColor, fontWeight: 700 }}>₹99</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#333', padding: '10px 20px', textAlign: 'center', fontSize: '10px', color: '#aaa' }}>
          Powered by Fera · Built with AI
        </div>
      </div>
    </div>
  );
}

export default function WebsiteBuilderPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();

  const [businessType, setBusinessType] = useState('general');
  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [description, setDescription] = useState('');
  const [colorTheme, setColorTheme] = useState('orange');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'templates'>('builder');

  const { data: websiteConfig, refetch: refetchConfig } = useQuery<WebsiteConfig>({
    queryKey: ['website'],
    queryFn: async () => (await api.get('/website')).data,
    retry: false,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ['website-templates'],
    queryFn: async () => (await api.get('/website/templates')).data,
    retry: false,
  });

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) =>
      api.patch('/website/publish', { is_published: publish }),
    onSuccess: (_, publish) => {
      queryClient.invalidateQueries({ queryKey: ['website'] });
      toast.success(publish ? '🎉 Website published!' : 'Website unpublished');
    },
    onError: () => toast.error('Failed to update publish status'),
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      api.post('/website/apply-template', { template_id: templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website'] });
      toast.success('Template applied!');
    },
    onError: () => toast.error('Failed to apply template'),
  });

  const handleGenerate = async () => {
    if (!businessName.trim()) { toast.error('Please enter your business name'); return; }

    setGenerating(true);
    try {
      await api.post('/website/generate', {
        business_name: businessName,
        description,
        business_type: businessType,
        color_theme: colorTheme,
      });
      await refetchConfig();
      toast.success('🎉 Website generated with AI!');
    } catch {
      toast.error('Failed to generate website. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const selectedColorTheme = COLOR_THEMES.find(c => c.id === colorTheme);
  const previewColor = selectedColorTheme?.preview || '#FF6B35';

  const storeUrl = websiteConfig
    ? `https://${websiteConfig.subdomain}.fera-shop.fera-seach.tech`
    : user?.subdomain
    ? `https://${user.subdomain}.fera-shop.fera-seach.tech`
    : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>{translate('websiteBuilder')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Build your online storefront with AI in seconds
          </p>
        </div>

        {websiteConfig && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Published status */}
            <span style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              background: websiteConfig.is_published ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: websiteConfig.is_published ? '#059669' : '#DC2626',
              border: `1px solid ${websiteConfig.is_published ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {websiteConfig.is_published ? <CheckCircle size={13} /> : <Clock size={13} />}
              {websiteConfig.is_published ? 'Published' : 'Unpublished'}
            </span>

            {/* Publish/Unpublish */}
            <button
              onClick={() => publishMutation.mutate(!websiteConfig.is_published)}
              disabled={publishMutation.isPending}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: publishMutation.isPending ? 0.7 : 1 }}
            >
              {websiteConfig.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
              {websiteConfig.is_published ? translate('unpublishWebsite') : translate('publishWebsite')}
            </button>
          </div>
        )}
      </div>

      {/* Store URL banner */}
      {storeUrl && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px', borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(0,78,137,0.08), rgba(255,107,53,0.08))',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Globe size={18} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{translate('yourSubdomain')}</div>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: 'var(--primary)', fontWeight: 600, fontSize: '14px', textDecoration: 'none',
            }}>
              {storeUrl} <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', width: 'fit-content' }}>
        {(['builder', 'templates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px',
              background: activeTab === tab ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'builder' ? '🤖 AI Builder' : '🎨 Templates'}
          </button>
        ))}
      </div>

      {activeTab === 'builder' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Panel: Builder form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Business Type */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>
                Business Type
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {BUSINESS_TYPES.map(bt => (
                  <button
                    key={bt.id}
                    onClick={() => setBusinessType(bt.id)}
                    style={{
                      padding: '10px 12px', borderRadius: '8px', border: '2px solid',
                      borderColor: businessType === bt.id ? 'var(--primary)' : 'var(--border)',
                      background: businessType === bt.id ? 'rgba(255,107,53,0.08)' : 'var(--bg)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: businessType === bt.id ? 'var(--primary)' : 'var(--text)' }}>
                      {bt.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{bt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Store details */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>
                Store Details
              </h3>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  Business Name *
                </label>
                <input
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g. Sharma General Store"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '90px' }}
                  placeholder="Tell AI about your business, what you sell, who your customers are..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Color theme */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={16} /> Color Theme
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {COLOR_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setColorTheme(theme.id)}
                    title={theme.label}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: theme.preview, border: '3px solid',
                      borderColor: colorTheme === theme.id ? '#1a1a2e' : 'transparent',
                      cursor: 'pointer', boxShadow: colorTheme === theme.id ? `0 0 0 3px ${theme.preview}50` : 'none',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Selected: {selectedColorTheme?.label}
              </p>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: generating ? 'var(--border)' : 'linear-gradient(135deg, #FF6B35, #004E89)',
                color: generating ? 'var(--text-muted)' : '#fff',
                fontWeight: 700, fontSize: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: generating ? 'none' : '0 4px 20px rgba(255,107,53,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {generating ? (
                <>
                  <span style={{
                    width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.2)',
                    borderTopColor: 'var(--text-muted)', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  {translate('generating')}
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate with AI (Sarvam 105B)
                </>
              )}
            </button>

            {websiteConfig && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                fontSize: '13px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <CheckCircle size={14} /> Website generated! Customize and publish above.
              </div>
            )}
          </div>

          {/* Right Panel: Preview */}
          <div style={{ position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>
              Live Preview
            </h3>
            <WebsitePreview
              config={{
                business_name: businessName || websiteConfig?.business_name,
                description: description || websiteConfig?.description,
                business_type: businessType || websiteConfig?.business_type,
                subdomain: user?.subdomain,
                color: previewColor,
                is_published: websiteConfig?.is_published,
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
              Preview updates as you fill the form
            </p>
          </div>
        </div>
      ) : (
        /* Templates Tab */
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Choose from AI-designed templates for your business type
          </p>

          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <Globe size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ fontSize: '16px', fontWeight: 600 }}>Templates coming soon</p>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>Use the AI Builder to create your custom store</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {templates.map(template => (
                <div key={template.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                  {/* Template thumbnail */}
                  <div style={{
                    height: '160px', background: template.colors?.[1] || '#f5f5f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {template.thumbnail ? (
                      <img src={template.thumbnail} alt={template.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '80%', padding: '12px', background: '#fff',
                        borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                      }}>
                        <div style={{ height: '8px', background: template.colors?.[0] || '#FF6B35', borderRadius: '4px', marginBottom: '6px', width: '60%' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px' }}>
                          {[1, 2, 3].map(i => (
                            <div key={i} style={{ height: '30px', background: `${template.colors?.[0] || '#FF6B35'}20`, borderRadius: '4px' }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', top: '8px', left: '8px',
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    }}>
                      {template.business_type}
                    </div>
                  </div>

                  <div style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '6px' }}>
                      {template.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                      {template.description}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                      {template.colors?.map((c, i) => (
                        <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c }} />
                      ))}
                    </div>
                    <button
                      onClick={() => applyTemplateMutation.mutate(template.id)}
                      disabled={applyTemplateMutation.isPending}
                      className="btn btn-primary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      Apply Template <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
