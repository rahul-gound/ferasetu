import { useState } from 'react';
import { Send, Sparkles, RotateCcw, BrainCircuit, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { TemplateSection } from '../types/template';

interface AIBuilderState {
  step: 'questions' | 'generating' | 'result';
  shopCategory?: string;
  shopDescription?: string;
  targetAudience?: string;
  keyFeatures?: string;
  colorScheme?: string;
  contactInfo?: string;
}

function parseAIResponse(text: string): TemplateSection[] {
  // Clean the text: remove markdown code blocks if present
  let cleanText = text.trim();
  if (cleanText.includes('```')) {
    const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleanText = match[1];
    }
  }

  // Find the first '[' and last ']' to extract the JSON array
  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');
  
  if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
    throw new Error('Could not parse AI response as JSON (no array found)');
  }
  
  cleanText = cleanText.substring(firstBracket, lastBracket + 1);

  try {
    const sections = JSON.parse(cleanText);
    if (!Array.isArray(sections)) {
      throw new Error('AI response is not an array');
    }
    return sections.map(s => ({
      id: `${s.type}-${Date.now()}-${Math.random()}`,
      type: s.type || 'hero',
      config: s.config || {}
    }));
  } catch (e) {
    console.error('Failed to parse JSON:', cleanText);
    throw new Error('Could not parse AI response as JSON');
  }
}

export default function WebsiteAIBuilder({ 
  shopName,
  onGenerate 
}: { 
  shopName: string;
  onGenerate: (sections: TemplateSection[]) => void;
}) {
  const [state, setState] = useState<AIBuilderState>({ step: 'questions' });
  const [thinking, setThinking] = useState(false);

  const SHOP_CATEGORIES = [
    'Grocery & Food',
    'Clothing & Fashion',
    'Electronics',
    'Restaurant & Cafe',
    'Beauty & Wellness',
    'Home & Furniture',
    'Books & Stationery',
    'Sports & Fitness',
    'Other'
  ];

  const COLOR_SCHEMES = [
    { name: 'Professional (Blue)', colors: '#004E89', accent: '#1565C0' },
    { name: 'Vibrant (Orange)', colors: '#FF6B35', accent: '#FF8C42' },
    { name: 'Modern (Purple)', colors: '#7C3AED', accent: '#6366F1' },
    { name: 'Fresh (Green)', colors: '#10B981', accent: '#059669' },
    { name: 'Bold (Red)', colors: '#EF4444', accent: '#DC2626' },
  ];

  const handleGenerateWebsite = async () => {
    if (!state.shopCategory?.trim() || !state.shopDescription?.trim()) {
      toast.error('Please fill in shop category and description');
      return;
    }

    setState(s => ({ ...s, step: 'generating' }));
    setThinking(true);

    const prompt = `You are a professional web designer. Create a complete website design for a shopkeeper.
    
Shop Details:
- Name: ${shopName}
- Category: ${state.shopCategory}
- Description: ${state.shopDescription}
- Target Audience: ${state.targetAudience || 'General customers'}
- Key Features: ${state.keyFeatures || 'Standard e-commerce'}
- Preferred Color: ${state.colorScheme || 'Professional'}
- Contact: ${state.contactInfo || 'Not provided'}

CRITICAL INSTRUCTION: Generate ONLY a valid JSON array. DO NOT include any conversational text, markdown formatting (no \`\`\`json), or explanations. 

Expected Output Format:
[
  {
    "type": "navbar",
    "config": {"shopName": "${shopName}", "primaryColor": "#FF6B35", "accentColor": "#004E89", "links": []}
  },
  {
    "type": "hero",
    "config": {"headline": "...", "subheadline": "...", "ctaText": "Shop Now", "ctaHref": "#products", "bgColor": "#FF6B35"}
  },
  {
    "type": "banner",
    "config": {"text": "...", "bgColor": "#F59E0B", "textColor": "#fff"}
  },
  {
    "type": "productGrid",
    "config": {"title": "Our Products", "accentColor": "#FF6B35", "showStock": true}
  },
  {
    "type": "contact",
    "config": {"title": "Find Us", "address": "${state.contactInfo || 'Coming soon'}", "phone": "", "email": "", "hours": "Mon–Sat: 9am–8pm"}
  },
  {
    "type": "footer",
    "config": {"shopName": "${shopName}", "tagline": "Your trusted online store", "primaryColor": "#1E293B", "social": {}}
  }
]

Make the copy professional, compelling, and relevant to their ${state.shopCategory} business.`;

    try {
      const response = await api.post('/ai/chat', {
        message: prompt,
        language: 'en',
      });

      const content = response.data?.content || response.data?.message || '';
      const sections = parseAIResponse(content);

      setState(s => ({ ...s, step: 'result' }));
      toast.success('✨ Website design created successfully!');
      
      setTimeout(() => {
        onGenerate(sections);
      }, 1000);
    } catch (error) {
      console.error('AI generation failed:', error);
      toast.error('Failed to generate website. Please try again.');
      setState(s => ({ ...s, step: 'questions' }));
    } finally {
      setThinking(false);
    }
  };

  const resetBuilder = () => {
    setState({ step: 'questions' });
  };

  // Questions Step
  if (state.step === 'questions') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', paddingBottom: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            Let AI Build Your Website
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Answer a few questions and we'll create a complete design for you
          </p>
        </div>

        {/* Shop Category */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            📂 Shop Category *
          </label>
          <select
            value={state.shopCategory || ''}
            onChange={e => setState(s => ({ ...s, shopCategory: e.target.value }))}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: '14px',
            }}
          >
            <option value="">Select category...</option>
            {SHOP_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Shop Description */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            📝 Describe Your Shop *
          </label>
          <textarea
            value={state.shopDescription || ''}
            onChange={e => setState(s => ({ ...s, shopDescription: e.target.value }))}
            placeholder="e.g., Fresh groceries delivered daily, premium quality products..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit',
              minHeight: '80px', resize: 'vertical',
            }}
          />
        </div>

        {/* Target Audience */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            👥 Target Audience
          </label>
          <input
            type="text"
            value={state.targetAudience || ''}
            onChange={e => setState(s => ({ ...s, targetAudience: e.target.value }))}
            placeholder="e.g., Families, students, professionals..."
            className="input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Key Features */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            ⭐ Key Features/Benefits
          </label>
          <textarea
            value={state.keyFeatures || ''}
            onChange={e => setState(s => ({ ...s, keyFeatures: e.target.value }))}
            placeholder="e.g., Free delivery, 24-hour support, authentic products..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit',
              minHeight: '70px', resize: 'vertical',
            }}
          />
        </div>

        {/* Color Scheme */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            🎨 Color Scheme
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {COLOR_SCHEMES.map(scheme => (
              <button
                key={scheme.name}
                onClick={() => setState(s => ({ ...s, colorScheme: scheme.name }))}
                style={{
                  padding: '12px', borderRadius: '8px', border: '2px solid var(--border)',
                  background: scheme.colors,
                  cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: state.colorScheme === scheme.name ? scheme.colors : 'var(--border)',
                  transform: state.colorScheme === scheme.name ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: state.colorScheme === scheme.name ? `0 0 12px ${scheme.colors}40` : 'none',
                }}
                title={scheme.name}
              >
                <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700, display: 'block', textAlign: 'center' }}>
                  {scheme.name.split(' (')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            📞 Contact Info (Optional)
          </label>
          <input
            type="text"
            value={state.contactInfo || ''}
            onChange={e => setState(s => ({ ...s, contactInfo: e.target.value }))}
            placeholder="Phone, email, address..."
            className="input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateWebsite}
          className="btn btn-primary"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', fontSize: '14px', fontWeight: 700, padding: '12px',
          }}
        >
          <Sparkles size={16} />
          Generate Website Design
        </button>
      </div>
    );
  }

  // Generating Step
  if (state.step === 'generating') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: '16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 2s infinite' }}>✨</div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            Creating Your Website
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {thinking ? 'AI is thinking about your perfect design...' : 'Almost done...'}
          </p>
        </div>
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366F1' }}>
            <BrainCircuit size={16} style={{ animation: 'spin 2s linear infinite' }} />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>THINKING</span>
          </div>
        )}
      </div>
    );
  }

  // Result Step
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '16px', textAlign: 'center',
      padding: '20px',
    }}>
      <div style={{ fontSize: '48px' }}>🎉</div>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          Website Design Ready!
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Your AI-generated website is loading. You can edit any section after creation.
        </p>
      </div>
      <button
        onClick={resetBuilder}
        className="btn btn-secondary"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
        }}
      >
        <RotateCcw size={14} />
        Generate Another Design
      </button>
    </div>
  );
}
