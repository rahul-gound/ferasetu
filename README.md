# Fera Shopkeeper — AI-Powered E-Commerce Platform

> Build your online store in minutes with the power of AI. Designed for small retailers, kirana stores, and local businesses across India.

## 🌟 Features

### Free Tier
- **AI Website Builder** — Generate a complete store website from voice/text prompt
- **Free Subdomain** — `businessname.fera-shop.fera-seach.tech`
- **50 Products** — Upload photos, set prices, manage inventory
- **Order Management** — One-click ordering with local delivery options
- **Basic AI Assistant** — Powered by **Sarvam-30B** for routine queries
- **Basic Invoice Generation** & **500 MB storage**

### Premium Tier
- **Custom Domain** (`yourshop.com`) & **Unlimited Products**
- **Advanced AI** — Powered by **Sarvam-105B** for complex tasks
- **AI Sales Prediction** — Next-year forecasting with AI analytics
- **Customer Behavior Insights** & **Professional Templates**

## 🤖 AI Integration

| Model | Use Case |
|-------|----------|
| **Sarvam-30B** | General queries, minor edits, Q&A, customer support, voice commands |
| **Sarvam-105B** | Complete website creation, major structural changes, analytics predictions |

## 🗣️ Language Support

Supports all **22 official Indian languages** + English:
Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Sanskrit, Maithili, Konkani, Manipuri, Bodo, Dogri, Kashmiri, Nepali, Sindhi, Santali, English

## 🏗️ Architecture

```
fera-shopkeeper/
├── frontend/           # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/      # Dashboard, Products, Orders, Analytics, AI, Builder
│   │   ├── components/ # Layout, shared UI components
│   │   ├── contexts/   # Auth, Language contexts
│   │   ├── services/   # Axios API client
│   │   └── utils/      # Language translations
│   └── dist/           # Production build output
│
└── backend/            # Node.js + Express + TypeScript
    ├── src/
    │   ├── routes/     # Auth, AI, Products, Orders, Analytics, Website, Voice
    │   ├── services/   # Sarvam AI, Auth
    │   ├── models/     # SQLite database (sql.js)
    │   └── middleware/ # Auth, Rate limiting, Error handling
    └── data/           # SQLite database file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and add your Sarvam AI API keys
npm install
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
SARVAM_30B_API_KEY=your_sarvam_30b_api_key
SARVAM_105B_API_KEY=your_sarvam_105b_api_key
SARVAM_API_BASE_URL=https://api.sarvam.ai/v1
DATABASE_PATH=./data/fera_shopkeeper.db
FRONTEND_URL=http://localhost:5173
FREE_TIER_MAX_PRODUCTS=50
FREE_TIER_STORAGE_MB=500
BASE_DOMAIN=fera-shop.fera-seach.tech
```

> ⚠️ **Security**: Never commit `.env` files with real API keys. Always use `.env.example` as a template.

## 📱 Key Pages

| Page | Description |
|------|-------------|
| `/` | Marketing landing page |
| `/dashboard` | Business overview with stats & charts |
| `/products` | Product catalog management |
| `/orders` | Order tracking & management |
| `/analytics` | Sales analytics & AI predictions |
| `/ai-assistant` | AI chat with voice support |
| `/website-builder` | AI website generator & publisher |

## 🎤 Voice Commands

Users can speak commands in any supported language:
- *"Build me a grocery store website"* → AI creates complete website (Sarvam-105B)
- *"What are my best selling products?"* → AI analyzes and responds

## 🚚 Delivery Options

- **Pickup** — Customer picks up from store
- **Walking Distance** — Local delivery on foot  
- **Bicycle Delivery** — Wider local radius
- **Standard Delivery** — ₹30 delivery fee

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/ai/chat` | Chat with AI assistant |
| POST | `/api/ai/generate-website` | Generate website with AI |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/orders` | List orders |
| POST | `/api/orders/create` | Create order |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/analytics/dashboard` | Dashboard metrics |
| GET | `/api/analytics/predict` | AI sales prediction (Premium) |
| GET | `/api/website/generate` | AI generate website |
| POST | `/api/voice/speech-to-text` | Voice to text |
| POST | `/api/voice/text-to-speech` | Text to voice |

## 🛠️ Tech Stack

**Frontend:** React 18, TypeScript, Vite, React Router v6, TanStack Query, Recharts, Lucide React

**Backend:** Node.js, Express, TypeScript, sql.js (SQLite), JWT, bcryptjs, multer, axios

**AI:** Sarvam-30B (routine tasks), Sarvam-105B (complex generation), Sarvam Speech API

## 💰 Monetization

1. **Freemium** — Free tier converts to Premium (₹299/month or ₹2,999/year)
2. **Transaction fees** — 0.5% Premium, 1% Free tier
3. **Premium templates** — ₹99-₹499 one-time
4. **WhatsApp Business** add-on — ₹199/month

## 📄 License

MIT License
