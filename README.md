# Fera Shopkeeper — AI-Powered E-Commerce SaaS

> Build your online store in minutes with AI. Designed for small retailers, kirana stores, and local businesses across India.

---

## 📐 Architecture Overview

```
fera-shopkeeper/
├── frontend/                  # React 19 + Vite + TypeScript
│   └── src/
│       ├── types/
│       │   └── template.ts    # TemplateSection, ShopTemplate, PublicShopData
│       ├── components/
│       │   ├── Layout.tsx     # Sidebar + top bar shell
│       │   └── shop/
│       │       ├── TemplateRenderer.tsx        # Dynamic render engine
│       │       └── sections/
│       │           ├── NavbarSection.tsx
│       │           ├── HeroSection.tsx
│       │           ├── BannerSection.tsx
│       │           ├── ProductGridSection.tsx
│       │           ├── ContactSection.tsx
│       │           └── FooterSection.tsx
│       ├── pages/
│       │   ├── LandingPage.tsx        # Public marketing page
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── DashboardPage.tsx      # Stats, revenue chart, recent orders
│       │   ├── ProductsPage.tsx       # CRUD with image upload
│       │   ├── OrdersPage.tsx         # Orders + invoice system
│       │   ├── AnalyticsPage.tsx      # Charts + AI predictions
│       │   ├── AIAssistantPage.tsx    # Chat with voice I/O
│       │   ├── WebsiteBuilderPage.tsx # 3-panel SaaS builder
│       │   └── ShopPage.tsx           # Public /shop/:shopName
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   └── LanguageContext.tsx
│       └── services/
│           └── api.ts                 # Axios instance (JWT attached)
│
└── backend/                   # Node.js + Express + TypeScript
    └── src/
        ├── routes/
        │   ├── auth.ts
        │   ├── products.ts
        │   ├── orders.ts      # + PATCH /:id/payment, GET /:id/invoice
        │   ├── analytics.ts   # dashboard, sales, predict (premium)
        │   ├── website.ts     # template CRUD + GET /public/:shopName
        │   ├── ai.ts
        │   └── voice.ts
        ├── services/
        │   └── sarvamAI.ts    # Sarvam-30B & 105B clients
        ├── models/
        │   └── database.ts    # sql.js SQLite wrapper
        └── middleware/
            ├── auth.ts        # JWT verify + requirePremium
            └── rateLimiter.ts
```

---

## 🧩 Template System

The platform uses a **JSON-based template system** where every shop's appearance is defined as an ordered array of sections.

### Template Section Shape

```typescript
interface TemplateSection {
  id: string;                    // unique section ID
  type: 'navbar' | 'hero' | 'banner' | 'productGrid' | 'contact' | 'footer';
  config: Record<string, unknown>; // section-specific settings
}
```

### Stored in DB

```sql
websites (
  id, user_id, name,
  template TEXT,     -- template ID (grocery, fashion, ...)
  sections JSON,     -- TemplateSection[] array
  config   JSON,     -- global config / theme overrides
  is_published INTEGER
)
```

### Example Template JSON

```json
[
  {
    "id": "navbar-1",
    "type": "navbar",
    "config": {
      "shopName": "Sharma Kirana",
      "primaryColor": "#2E7D32",
      "links": [
        { "label": "Home",     "href": "#" },
        { "label": "Products", "href": "#products" },
        { "label": "Contact",  "href": "#contact" }
      ]
    }
  },
  {
    "id": "hero-1",
    "type": "hero",
    "config": {
      "headline": "Fresh Groceries, Delivered Fast",
      "subheadline": "Your trusted neighbourhood kirana — now online.",
      "ctaText": "Shop Now",
      "ctaHref": "#products",
      "bgColor": "#2E7D32"
    }
  },
  {
    "id": "banner-1",
    "type": "banner",
    "config": {
      "text": "🎉 Free delivery on orders above ₹299",
      "bgColor": "#FF6B35"
    }
  },
  {
    "id": "products-1",
    "type": "productGrid",
    "config": { "title": "Our Products", "columns": 3 }
  },
  {
    "id": "contact-1",
    "type": "contact",
    "config": {
      "address": "Shop No. 1, Main Bazaar",
      "phone": "+91 98765 43210",
      "hours": "Mon–Sat: 9am–9pm"
    }
  },
  {
    "id": "footer-1",
    "type": "footer",
    "config": {
      "shopName": "Sharma Kirana",
      "tagline": "Serving with love ❤️"
    }
  }
]
```

### Dynamic Render Engine

`TemplateRenderer.tsx` maps each section `type` to its React component:

```tsx
// Simplified
function TemplateRenderer({ sections, products, shopName }) {
  return sections.map(section => {
    switch (section.type) {
      case 'navbar':      return <NavbarSection      config={section.config} shopName={shopName} />;
      case 'hero':        return <HeroSection         config={section.config} shopName={shopName} />;
      case 'banner':      return <BannerSection       config={section.config} />;
      case 'productGrid': return <ProductGridSection  config={section.config} products={products} />;
      case 'contact':     return <ContactSection      config={section.config} />;
      case 'footer':      return <FooterSection       config={section.config} />;
    }
  });
}
```

---

## 🤖 AI System Design

### Two-Model Strategy

| Model | API Key Env Var | Use Cases |
|-------|----------------|-----------|
| **Sarvam-30B** | `SARVAM_30B_API_KEY` | General queries, quick answers, minor edits, translation, customer support chat |
| **Sarvam-105B** | `SARVAM_105B_API_KEY` | Full website generation, major restructuring, AI sales predictions |

The frontend switches models based on message intent — website creation commands automatically route to 105B.

### AI-Powered Website Generation

```
User: "Build me a grocery store"
  ↓
POST /api/website/generate
  { businessType: "grocery", businessName: "My Shop", description: "..." }
  ↓
Backend: buildDefaultSections("grocery", ...)
  → Returns TemplateSection[] with pre-filled hero text, palette, etc.
  ↓
AI adds product suggestions, tagline tweaks
  ↓
Sections saved to DB, user can fine-tune in builder
```

### Voice Flow

```
Mic → Browser MediaRecorder API → PCM blob
  ↓
POST /api/voice/speech-to-text (Sarvam STT API)
  ↓
Transcribed text fed into AI chat
  ↓
AI response → POST /api/voice/text-to-speech → audio blob played back
```

### Supported Languages (22 + English)

Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Sanskrit, Maithili, Konkani, Manipuri, Bodo, Dogri, Kashmiri, Nepali, Sindhi, Santali

---

## 🏗️ Key Features

### Free Tier
- Free subdomain: `businessname.fera-shop.fera-search.tech`
- Up to **50 products**
- Basic AI (Sarvam-30B)
- Order management + basic invoices
- 500 MB storage

### Premium Tier (₹499/month)
- **Custom domain**
- Unlimited products
- Advanced AI (Sarvam-105B) with sales predictions
- Next-year revenue forecast
- Customer behavior insights

### Website Builder (3-Panel SaaS UI)
- **Left:** Template gallery (6 templates) + section editor (add/remove/reorder)
- **Center:** Live preview at 60% zoom scale
- **Right:** Section config form (color pickers, text inputs)
- AI prompt bar: describe your business → auto-generate sections
- One-click publish → live at `/shop/:shopName`

### Invoice System
- Every order auto-generates a tax invoice
- Shopkeeper can mark: **Paid / Unpaid / Pay Later**
- Printable invoice modal in orders page

### Public Shop Page
- Route: `/shop/:shopName`
- No auth required
- Backend endpoint: `GET /api/website/public/:shopName`
- Renders dynamically from stored `sections` JSON

---

## 🚀 Setup & Running

### Prerequisites
- Node.js 18+ and npm 9+

### 1. Clone & Install

```bash
git clone <repo-url>
cd fera-shopkeeeper-web-testing-

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment Variables

**Backend** — create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=change-this-to-a-long-random-string
SARVAM_30B_API_KEY=your_sarvam_30b_key
SARVAM_105B_API_KEY=your_sarvam_105b_key
SARVAM_API_BASE_URL=https://api.sarvam.ai/v1
DATABASE_PATH=./data/fera_shopkeeper.db
FRONTEND_URL=http://localhost:5173
FREE_TIER_MAX_PRODUCTS=50
BASE_DOMAIN=fera-shop.fera-search.tech
```

**Frontend** — create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Servers

```bash
# Terminal 1 — Backend
cd backend
npm run build && node dist/index.js
# OR for hot-reload:
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### 4. Build for Production

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
# Output in frontend/dist/
```

---

## 🌐 Deployment Guide

### Option A: Single VPS (recommended for MVP)

```
VPS (DigitalOcean / AWS EC2 / Hetzner)
├── nginx (reverse proxy)
│   ├── / → frontend static files (frontend/dist)
│   ├── /api → backend :5000
│   └── Wildcard SSL (*.fera-shop.fera-search.tech)
└── PM2 → backend process management
```

**nginx config snippet:**
```nginx
server {
  server_name *.fera-shop.fera-search.tech;
  location /api { proxy_pass http://localhost:5000; }
  location / { root /var/www/fera/frontend/dist; try_files $uri $uri/ /index.html; }
}
```

### Option B: Serverless

- Frontend → Vercel / Cloudflare Pages (set `VITE_API_URL` to your API URL)
- Backend → Railway / Render / Fly.io
- DB → Turso (LibSQL cloud) or PostgreSQL

### Wildcard Subdomain Setup

1. Add `A` record: `*.fera-shop.fera-search.tech → your-server-IP`
2. Generate wildcard SSL: `certbot --nginx -d *.fera-shop.fera-search.tech`

---

## 📊 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register + auto-create subdomain |
| POST | `/api/auth/login` | — | Get JWT token |
| GET | `/api/auth/me` | ✅ | Current user profile |
| GET | `/api/products` | ✅ | List products (paginated) |
| POST | `/api/products` | ✅ | Create product |
| PUT | `/api/products/:id` | ✅ | Update product |
| DELETE | `/api/products/:id` | ✅ | Delete product |
| GET | `/api/orders` | ✅ | List orders (filtered, paginated) |
| POST | `/api/orders/create` | ✅ | Create order + auto-invoice |
| PATCH | `/api/orders/:id/status` | ✅ | Update order status |
| PATCH | `/api/orders/:id/payment` | ✅ | Update payment status (paid/unpaid/pay_later) |
| GET | `/api/orders/:id/invoice` | ✅ | Get order + invoice |
| GET | `/api/analytics/dashboard` | ✅ | Stats, chart, recent orders |
| GET | `/api/analytics/sales` | ✅ | Revenue & category breakdown |
| GET | `/api/analytics/predict` | ✅ Premium | AI sales forecast |
| GET | `/api/website` | ✅ | Get own website config |
| POST | `/api/website` | ✅ | Save website (sections + config) |
| POST | `/api/website/generate` | ✅ | AI-generate website sections |
| PATCH | `/api/website/publish` | ✅ | Publish / unpublish |
| GET | `/api/website/templates` | ✅ | List 6 templates with default sections |
| GET | `/api/website/public/:shopName` | — | **Public** — render shop |
| POST | `/api/ai/chat` | ✅ | Chat (auto-selects 30B or 105B) |
| POST | `/api/voice/speech-to-text` | ✅ | Audio → text |
| POST | `/api/voice/text-to-speech` | ✅ | Text → audio |

---

## 🔮 Future Scaling Plan

### Phase 1 — Performance (Month 1–2)
- Migrate from sql.js to PostgreSQL (Prisma ORM)
- Add Redis for session caching + rate limiting
- CDN for product images (Cloudflare R2 / S3)

### Phase 2 — Marketplace (Month 3–4)
- Multi-vendor marketplace mode
- Integrated payment gateway (Razorpay / PhonePe)
- WhatsApp Business API for order notifications
- GST invoice generation

### Phase 3 — AI Enhancement (Month 5–6)
- Fine-tuned model on Indian retail data
- Automated social media post generation (product launch posts)
- QR code store sharing
- Offline-first PWA with background sync

### Phase 4 — Scale (Month 7–12)
- Kubernetes / container orchestration
- Multi-region deployment (Mumbai + Bangalore)
- Analytics data warehouse (ClickHouse)
- A/B testing engine for shop templates

---

## 💰 Monetization Strategy

1. **Freemium conversion** — Free tier is useful but Premium unlocks AI predictions, custom domain, unlimited products → target ₹499/month
2. **Annual plan** — ₹3,999/year (33% saving) — improves LTV
3. **Transaction fee** — 0.5% on Premium orders, 1% on Free
4. **Premium templates** — ₹199–₹999 one-time purchase
5. **WhatsApp Business** add-on — ₹199/month
6. **B2B reseller** — White-label for distributors/wholesalers

**User Acquisition for Indian Retail:**
- Partner with local CA/GST consultants (they reach shopkeepers)
- YouTube tutorials in regional languages
- WhatsApp group marketing in trade associations
- Google My Business integration referral

---

## ⚠️ Security Notes

- Never commit `.env` files with real API keys
- JWT secret must be at least 32 characters
- Rate limiting: 100 req/15 min per IP on all `/api/` routes
- All user data is scoped by `user_id` in every query
- SQL injection protection via parameterized queries throughout

---

## 📄 License

MIT © Fera Shopkeeper
