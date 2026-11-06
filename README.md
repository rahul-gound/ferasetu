# FeraSetu 

> **AI-Powered E-Commerce shopify alternative **

FeraSetu bridge the shopkeeper store to internet by making website . it is very simple , transparent nd easy for begginer not like shopify or other which is good but hard and complex . our vision is to make simplicity .

---
for the help see the docs folder 
---

## What FeraSetu Does

-help customer to make website manage whatsapp or offline orders see inventory se they are making loss or profit

---



---

## Getting Started & Local Development

### Prerequisites

- **Node.js**: `20.x` or newer
- **npm**: `10.x` or newer
- **Cloudflare Wrangler** (optional, for edge testing): `npm install -g wrangler`
- **Python 3.10+** (optional, if testing `ferasetu-smtp`)


### Environment Configuration

Copy the example environment files and populate required keys:

```bash
# Frontend configuration
cp frontend/.env.example frontend/.env.local

# Backend configuration
cp backend/.env.example backend/.env
```

Key environment variables:
- `FRONTEND_URL`: `http://localhost:5173`
- `PORT`: `3001` (backend dev)
- `SARVAM_30B_API_KEY`: API key for Sarvam AI models
- `7smtp_api`: to send the smtp emaill key
- `WORKOS_CLIENT_ID` and `WORKOS_API_KEY`: WorkOS credentials for login 
- `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`: Cashfree payment credentials for pament 

### Run Development Servers

Run frontend and backend simultaneously:

```bash
# Start frontend (Vite on http://localhost:5173)
npm run dev:frontend

# Start backend (Express on http://localhost:3001)
npm run dev:backend
```

To run the Cloudflare Worker locally with local D1:

```bash
npx wrangler dev
```

### Production Build

```bash
# Build both frontend and backend
npm run build

# Build only frontend
npm run build:frontend

# Build only backend
npm run build:backend
```

---

## how to run it 

to run it you have :

###frontend 

```bash
cd ferasetu/frontend
npm run dev  ```

###backend

```bash
cd ferasetu/backend
npm run de
```

### Required for self hosted 

workos auth 
ai api ( ai.ferasetu.com)


##where i used Ai

i used ai to code and fix bug but i do research and find bugs and try to add new features and see how to increase ui 


