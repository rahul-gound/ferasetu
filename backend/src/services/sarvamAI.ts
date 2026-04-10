import axios, { AxiosInstance } from 'axios';

const SARVAM_BASE_URL = process.env.SARVAM_API_BASE_URL || 'https://api.sarvam.ai/v1';

// Sarvam-30B: For general queries, minor modifications, routine assistance
const sarvam30BClient: AxiosInstance = axios.create({
  baseURL: SARVAM_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SARVAM_30B_API_KEY}`
  },
  timeout: 30000
});

// Sarvam-105B: For complete website creation and major structural changes
const sarvam105BClient: AxiosInstance = axios.create({
  baseURL: SARVAM_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SARVAM_105B_API_KEY}`
  },
  timeout: 120000
});

export type SarvamModel = '30b' | '105b';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SarvamChatRequest {
  messages: ChatMessage[];
  language?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface SarvamChatResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface WebsiteGenerationRequest {
  businessType: string;
  businessName: string;
  description: string;
  products?: string[];
  language?: string;
  colorPreference?: string;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  general: `You are Fera AI, an intelligent assistant for the Fera Shopkeeper platform — designed to help small retailers and local business owners in India build and manage their online stores. You help with:
- Building and customizing websites
- Managing products and inventory
- Processing orders and deliveries
- Understanding sales analytics
- Marketing suggestions

Be friendly, simple, and practical. Use the user's preferred language when possible. For technical tasks, provide step-by-step guidance.`,

  websiteBuilder: `You are Fera AI Website Builder, an expert at creating beautiful, functional e-commerce websites for Indian small businesses. When given a business type and details, you generate complete website configurations including:
- Page structure (homepage, products, about, contact)
- Color themes appropriate for the business type
- Content suggestions
- Product category recommendations
- SEO-friendly descriptions

Always return valid JSON configurations.`,

  analytics: `You are Fera AI Analytics, specializing in business insights for Indian small retailers. You analyze sales data, identify trends, and provide actionable recommendations. You help predict future sales using historical data patterns.`
};

/**
 * Select the appropriate model based on task complexity:
 * - 30B: General queries, minor changes, Q&A, customer support
 * - 105B: Website creation, major restructuring, complex analysis
 */
function selectModel(taskType: 'simple' | 'complex'): SarvamModel {
  return taskType === 'complex' ? '105b' : '30b';
}

export async function chatWithSarvam(
  request: SarvamChatRequest,
  model: SarvamModel = '30b'
): Promise<SarvamChatResponse> {
  const client = model === '105b' ? sarvam105BClient : sarvam30BClient;
  const modelName = model === '105b' ? 'sarvam-2-large' : 'sarvam-2-small';

  try {
    const response = await client.post('/chat/completions', {
      model: modelName,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2048
    });

    return {
      content: response.data.choices[0].message.content,
      model: modelName,
      usage: response.data.usage
    };
  } catch (error: any) {
    // Fallback response for development/testing when API is unavailable
    if (process.env.NODE_ENV === 'development' || !process.env.SARVAM_30B_API_KEY) {
      return {
        content: generateFallbackResponse(request.messages, model),
        model: `${modelName}-fallback`,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      };
    }
    throw new Error(`Sarvam AI error: ${error.message}`);
  }
}

export async function generateWebsiteConfig(
  request: WebsiteGenerationRequest
): Promise<Record<string, unknown>> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS.websiteBuilder },
    {
      role: 'user',
      content: `Create a complete website configuration for:
Business Name: ${request.businessName}
Business Type: ${request.businessType}
Description: ${request.description}
${request.products ? `Products: ${request.products.join(', ')}` : ''}
${request.colorPreference ? `Color Preference: ${request.colorPreference}` : ''}

Return a JSON object with: { theme, pages, navigation, hero, features, seo }`
    }
  ];

  // Use 105B for complete website generation
  const response = await chatWithSarvam(
    { messages, temperature: 0.8, max_tokens: 4096 },
    '105b'
  );

  try {
    // Extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Return default config if parsing fails
  }

  return getDefaultWebsiteConfig(request);
}

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  language: string = 'en',
  taskType: 'simple' | 'complex' = 'simple'
): Promise<SarvamChatResponse> {
  const model = selectModel(taskType);
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS.general },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage }
  ];

  return chatWithSarvam({ messages, language }, model);
}

export async function translateToLanguage(
  text: string,
  targetLanguage: string
): Promise<string> {
  if (targetLanguage === 'en') return text;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a translation assistant. Translate the given text to the specified language accurately and naturally. Return only the translated text.'
    },
    {
      role: 'user',
      content: `Translate to ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}: ${text}`
    }
  ];

  const response = await chatWithSarvam({ messages, temperature: 0.3 }, '30b');
  return response.content;
}

export async function predictSales(
  salesData: Array<{ date: string; amount: number; products: string[] }>,
  businessType: string
): Promise<Record<string, unknown>> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS.analytics },
    {
      role: 'user',
      content: `Analyze this sales data for a ${businessType} and predict next month's sales:
${JSON.stringify(salesData.slice(-30), null, 2)}

Return JSON with: { prediction, trend, recommendations, confidence_score }`
    }
  ];

  // Use 105B for complex analytics
  const response = await chatWithSarvam(
    { messages, temperature: 0.4, max_tokens: 2048 },
    '105b'
  );

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* ignore */ }

  return {
    prediction: 'Unable to generate prediction',
    trend: 'neutral',
    recommendations: [],
    confidence_score: 0
  };
}

function generateFallbackResponse(messages: ChatMessage[], _model: SarvamModel): string {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const content = lastUserMessage?.content?.toLowerCase() || '';

  if (content.includes('website') || content.includes('create') || content.includes('build')) {
    return "I'll help you create your website! Please provide your business name, type of products you sell, and any specific preferences for colors or style. I'll generate a complete website for you right away.";
  }
  if (content.includes('product') || content.includes('inventory')) {
    return "I can help you manage your products! You can add products with photos, prices, and track inventory. Would you like me to guide you through adding your first product?";
  }
  if (content.includes('order')) {
    return "Your orders are managed in the Orders section. You can track status, manage deliveries, and generate invoices for each order. Is there a specific order you need help with?";
  }
  if (content.includes('analytics') || content.includes('sales')) {
    return "Based on your business data, I can help predict future sales trends and provide recommendations. Check your Analytics dashboard for detailed insights!";
  }
  return "I'm Fera AI, your business assistant! I can help you build your website, manage products, handle orders, and grow your business. What would you like to do today?";
}

function getDefaultWebsiteConfig(request: WebsiteGenerationRequest): Record<string, unknown> {
  return {
    theme: {
      primaryColor: '#FF6B35',
      secondaryColor: '#004E89',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px'
    },
    pages: ['home', 'products', 'about', 'contact'],
    navigation: {
      logo: request.businessName,
      links: ['Home', 'Products', 'About', 'Contact']
    },
    hero: {
      title: `Welcome to ${request.businessName}`,
      subtitle: request.description,
      cta: 'Shop Now'
    },
    features: ['Product Catalog', 'Easy Ordering', 'Fast Delivery'],
    seo: {
      title: request.businessName,
      description: request.description,
      keywords: [request.businessType, 'local shop', 'buy online']
    }
  };
}

export const SUPPORTED_LANGUAGES: Array<{ code: string; name: string; nativeName: string }> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্' },
  { code: 'brx', name: 'Bodo', nativeName: 'बर' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ' }
];

const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(l => [l.code, l.name])
);
