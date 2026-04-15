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

console.log('🔑 Sarvam 30B API Key exists:', !!process.env.SARVAM_30B_API_KEY);
console.log('🔑 Sarvam 105B API Key exists:', !!process.env.SARVAM_105B_API_KEY);

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
  general: `You are Fera AI, an intelligent assistant for the Fera Shopkeeper platform — designed to help small retailers (especially Kirana stores) in India build and manage their online stores. You help with:
- Building and customizing websites simply
- Managing products and inventory in local languages
- Processing orders and deliveries
- Understanding sales analytics in a simple way
- Marketing suggestions for local neighborhoods

Be friendly, simple, and practical. Use a helpful "Elder Brother" or "Friend" tone. Use the user's preferred language when possible. Avoid technical jargon.`,

  websiteBuilder: `You are Fera AI Website Builder. 
When given business details, you MUST generate a JSON configuration that follows this EXACT structure:
{
  "sections": [
    {
      "id": "unique-id",
      "type": "navbar",
      "config": { "shopName": "Name", "primaryColor": "#hex", "accentColor": "#hex" }
    },
    {
      "id": "unique-id",
      "type": "hero",
      "config": { "headline": "Text", "subheadline": "Text", "ctaText": "Button", "bgColor": "#hex" }
    },
    {
      "id": "unique-id",
      "type": "productGrid",
      "config": { "title": "Products", "accentColor": "#hex", "showStock": true }
    },
    {
      "id": "unique-id",
      "type": "contact",
      "config": { "title": "Find Us", "address": "...", "phone": "..." }
    },
    {
      "id": "unique-id",
      "type": "footer",
      "config": { "shopName": "Name", "tagline": "..." }
    }
  ]
}
Allowed types: navbar, hero, banner, productGrid, contact, footer.
Use Indian business context. Return ONLY the JSON object.`,

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
  const modelName = model === '105b' ? 'sarvam-105b' : 'sarvam-30b';

  const apiKey = model === '105b' ? process.env.SARVAM_105B_API_KEY : process.env.SARVAM_30B_API_KEY;

  console.log(`🤖 AI Request to model: ${modelName} (using key: ${apiKey?.substring(0, 8)}...)`);

  try {
    if (!apiKey || apiKey === 'undefined' || apiKey.length < 5) {
       console.warn(`⚠️ API Key for ${modelName} is missing or invalid. Using fallback.`);
       throw new Error(`API Key for ${modelName} is missing`);
    }

    const response = await client.post('/chat/completions', {
      model: modelName,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2048
    });

    console.log(`✅ AI Response received from ${modelName}`);

    return {
      content: response.data.choices[0].message.content,
      model: modelName,
      usage: response.data.usage
    };
  } catch (error: any) {
    const errorData = error.response?.data;
    console.error(`❌ Sarvam AI API Error (${modelName}):`, JSON.stringify(errorData || error.message));

    // Fallback response for development/testing when API is unavailable or errors
    if (process.env.NODE_ENV === 'development' || !apiKey || apiKey === 'undefined' || apiKey.length < 5) {
      console.log(`ℹ️ Returning fallback response for ${modelName}`);
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
  taskType: 'simple' | 'complex' = 'simple',
  systemPromptKey: string = 'general'
): Promise<SarvamChatResponse> {
  const model = selectModel(taskType);
  const systemPrompt = SYSTEM_PROMPTS[systemPromptKey] || SYSTEM_PROMPTS.general;
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage }
  ];

  return chatWithSarvam({ messages, language, max_tokens: taskType === 'complex' ? 4096 : 2048 }, model);
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
    return "Namaste! I'll help you build your Kirana store website in 1 minute. Just tell me your shop's name and what you sell (like groceries, milk, or snacks). I'll create a beautiful site where your customers can see products and order on WhatsApp! 🛒✨";
  }
  if (content.includes('product') || content.includes('inventory')) {
    return "Managing products is very easy! You can just take a photo of your items, add the price, and they will appear on your website. Do you want me to show you how to add your first 5 products? 📦";
  }
  if (content.includes('order')) {
    return "All your customer orders will show up in the 'Orders' section. You will also get a notification. You can then pack the items and mark them as 'Ready for Delivery'. Need help with a specific order? 📋";
  }
  if (content.includes('analytics') || content.includes('sales')) {
    return "I can show you which items (like bread or sugar) are selling most in your shop. This will help you stock the right items. Check your 'Analytics' page for simple charts! 📊";
  }
  return "Namaste! I'm Fera AI, your shop's digital friend. I can help you take your Kirana store online. Just tell me what you need—like building a website, adding products, or checking orders. How can I help you today? 🙏";
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
