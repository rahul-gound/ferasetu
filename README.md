````md
# FeraSetu — Your Shop’s Digital Bridge

https://ferasetu.appwrite.network/

Build your own shop site, manage products, and boost your sales with the help of AI—all in one place.

**Dukaan ko online lao, orders WhatsApp par pao.**

---

## 🎁 Beta Offer: ₹299 Plan — FREE During Beta

### Here’s the deal:

We’re giving away our ₹299/month Starter plan for free during beta.

All we ask is for your feedback, reviews, and feature requests.

Your input helps us make FeraSetu better and faster.

### What’s Included in the Beta (worth ₹299/month):

- A shop site + free subdomain
- Product and order management
- Basic invoicing
- Simple AI assistant with starter credits
- Ticket support system

**Beta access is open to everyone.**

---

## 💬 Share Your Feedback Easily

Inside the dashboard, just go to **“Survey & Feedback.”**

There you’ll find:

- Structured questions and space for free-text feedback
- Option to leave your contact details
- Download your submissions as a CSV

---

## 📅 Want to Talk? Book a Quick Call

Need help or want to chat about your shop’s needs?

Book a 10–15 minute feedback call right from the dashboard.

Your experience matters—let’s make this work for you.

---

## 📐 Architecture at a Glance

### Frontend

React 19 + Vite + TypeScript, with modular components for every shop section and full CRUD pages.

### Backend

Node.js with Express and TypeScript, handling auth, products, orders, analytics, website templates, AI, and voice features.

MySQL (Oracle) for storage.

JWT authentication, rate limiting, and separate context/providers for auth and language.

Code is organized—see details above if you’re into structure.

---

## 🧩 The Template System

Shops look unique because we stitch them together from reusable JSON “sections.”

Each website’s appearance is a list of these sections, which define everything from the navbar to the footer.

### Example Section

```ts
interface TemplateSection {
  id: string;
  type: 'navbar' | 'hero' | 'banner' | 'productGrid' | 'contact' | 'footer';
  config: Record;
}
````

We store this array in the database, so every shop renders exactly as it should.

Section rendering is handled by `TemplateRenderer.tsx`, which knows what component to use for each type.

---

## 🤖 How The AI Works

Two AI models, both Sarvam:

* **30B** for quick tasks
* **105B** for heavy-lifting

### 30B handles:

* Chat
* Translations
* Support questions

### 105B handles:

* Full website creation
* Major edits
* Sales prediction

The frontend picks the model depending on your request—no setup needed.

With just one command, you can ask:

> "Build me a grocery store."

The backend generates shop sections, AI fills in details and product ideas, then saves everything to your shop.

You can edit it further anytime.

### Voice Features

Voice features are baked-in too:

1. Speak via your mic
2. Browser sends the audio
3. Backend converts speech to text
4. AI processes the request
5. Audio reply is returned

Available in English and 22 Indian languages.

---

## 🏗️ Key Features

### Beta (₹0/month)

* Free subdomain (`businessname.ferasetu.fera-search.tech`)
* Up to 19 products
* Basic AI (Sarvam-30B)
* Order management + invoices
* 500 MB storage

### Premium (₹499/month)

* Custom domain support
* Unlimited products
* Advanced AI (Sarvam-105B)
* Sales predictions
* Revenue forecasts
* Customer behavior insights

### Site Builder

* Three-panel UI
* Pick templates
* Tweak sections
* Live preview

### AI Prompt Bar

Describe your business and get a full setup in seconds.

### One-Click Publish

Publish your shop instantly.

### Invoices

Automatically generated tax invoices for each order, with payment status tracking and print options.

### Public Shop Page

Anyone can see your shop at:

```text
/shop/:shopName
```

Dynamic rendering is powered by saved section JSON.

---

## 🚀 Quick Start Guide

### Requirements

* Node.js 18+
* npm 9+

### 1. Clone and Install

```bash
git clone
cd fera-shopkeeeper-web-testing-
```

Set up backend and frontend folders and run:

```bash
npm install
```

### 2. Environment Variables

Add environment variables in:

```text
backend/.env
frontend/.env
```

### 3. Start Your Servers

#### Backend

```bash
npm run build && node dist/index.js
```

or

```bash
npm run dev
```

#### Frontend

```bash
npm run dev
```

Access frontend at:

```text
http://localhost:5173
```

API runs on:

```text
http://localhost:5000
```

### 4. Build For Production

Build production assets if needed.

---

## 🌐 Deployment (For Reviewers)

### Single VPS

* Use nginx
* Serve static frontend
* Proxy backend API
* Configure wildcard SSL

### Serverless

Frontend:

* Vercel
* Cloudflare

Backend:

* Railway
* Render

Database:

* Turso
* Managed services

### Custom Subdomains

Configure:

* Wildcard DNS
* Wildcard SSL

---

## 📊 API Overview

Endpoints include:

* Registration
* Login
* Product management
* Order management
* AI chat
* Voice features
* Analytics
* Public shop rendering

---

## 🔮 Roadmap for Scaling

### Phase 1

Performance improvements:

* Redis caching
* CDN for images

### Phase 2

Marketplace:

* Multi-vendor support
* Integrated payments
* WhatsApp notifications

### Phase 3

AI:

* Fine-tuned models
* Social media content generation

### Phase 4

Scale:

* Kubernetes
* Multi-region deployment
* Advanced analytics
* A/B testing

---

## 💰 Monetization Plans

### During Beta

₹299 plan is free.

### After Beta

* ₹299/month Starter Plan
* ₹499/month Premium Plan

Future additions:

* Annual plans
* Low transaction fees
* Paid templates
* WhatsApp add-ons
* B2B reseller options

---

## 🔒 Security Reminders (for Reviewers)

* Don’t commit real API keys in code
* Keep JWT secrets strong
* API has rate limiting (100 req/15min/IP)
* All data is tied to users in queries
* Prevents SQL injection everywhere with parameterized queries

---

## 📄 License

MIT © FeraSetu

```
```

