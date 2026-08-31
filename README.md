# FeraSetu

FeraSetu helps Indian shopkeepers move from offline and WhatsApp-based selling to a guided online storefront, product catalog, order workflow, and simple business tools without needing technical knowledge.

> FeraSetu is under active development. Features, plans, and workflows may change as the product is validated with real merchants.

## What FeraSetu Does

- Guides a merchant from basic shop information to a publishable online storefront.
- Provides product management, order management, analytics, and shop dashboards.
- Includes Fera AI as contextual help for setup, product, order, and store-improvement tasks.
- Keeps the workflow focused on the merchant's next meaningful action rather than exposing technical configuration.
- Supports responsive layouts for mobile-first shopkeepers as well as desktop users.

## Product Strategy

The experience combines four strategic layers:

1. **Blue Ocean:** Reduce the complexity that prevents offline and non-technical merchants from going online.
2. **Purple Cow:** Make the offline shop to online storefront transformation memorable and concrete.
3. **Halo Effect:** Prioritize polish in high-visibility moments such as the hero, navigation, onboarding, first store preview, pricing, empty states, and loading/error states.
4. **AIDA:** Move visitors from clear understanding to interest, confidence, and action.

Marketing and product messaging is centralized in `frontend/src/content/strategy.ts` so value positioning can be reviewed and tested without scattering copy across components.

## Core Features

- Public marketing pages, including pricing and product-specific landing pages.
- Merchant registration and login.
- Guided store setup and onboarding.
- Storefront website builder.
- Product catalog management.
- Order management.
- Business analytics.
- Fera AI workflow assistance.
- Stage-based pricing presentation: Start, Grow, and Scale.
- Admin and merchant application surfaces.

## SEO Behavior

FeraSetu uses page-level robots metadata rather than a global noindex header.

- Public marketing pages are indexable.
- Login and registration pages use `noindex, nofollow`.
- Private merchant, admin, dashboard, analytics, and settings pages use `noindex, nofollow`.
- The global `X-Robots-Tag: noindex, nofollow` rule was removed from `frontend/public/_headers`.

The implementation is centralized in `frontend/src/components/SEO.tsx`.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query
- Zustand
- WorkOS AuthKit

### Backend and Infrastructure

- Node.js
- Express
- Jest
- Cloudflare Workers
- MySQL with SQLite fallback
- Appwrite storage

## Repository Structure

```text
frontend/    React merchant, admin, and public web application
backend/     Node.js API and database services
worker/      Cloudflare Worker API
packages/    Shared packages
docs/        Product, architecture, and process documentation
marketing/   Marketing assets and campaign material
scripts/     Automation and utility scripts
tests/       Cross-application test material
config/      Deployment and environment configuration
data/        Local data used by development services
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A browser for local preview

### Clone and Install

```bash
git clone https://github.com/rahul-gound/ferasetu.git
cd ferasetu
npm run install:all
```

### Configure Environment

Copy the provided environment templates and replace their example values:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Required configuration depends on the services you are testing. The frontend template includes API, authentication, Appwrite, domain, and feature-flag settings. The backend template includes server, database, AI, email, storage, admin, and payment settings.

### Run Development Servers

From the repository root:

```bash
npm run dev:frontend
npm run dev:backend
```

The frontend runs through Vite. The backend runs through its Node.js development script.

## Build

Build both frontend and backend:

```bash
npm run build
```

Build only the frontend:

```bash
npm run build:frontend
```

Build only the backend:

```bash
npm run build:backend
```

## Verification

The frontend can be checked with:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Backend tests can be run with:

```bash
cd backend
npm test
```

Current known status:

- Frontend TypeScript check: passing.
- Frontend production build: passing.
- Frontend lint: currently reports pre-existing issues across unrelated files.
- GitHub reports repository security alerts that still require review.

## Roadmap

- [x] Merchant authentication
- [x] Dashboard
- [x] Product management
- [x] Order management
- [x] Analytics foundation
- [x] Guided onboarding
- [x] Store builder foundation
- [x] Fera AI workflow assistance
- [x] Stage-based pricing presentation
- [ ] Payment integration completion
- [ ] Multi-language expansion
- [ ] Production SEO response-header verification
- [ ] End-to-end merchant journey QA

## Documentation Maintenance

Update this README whenever user-facing behavior, setup instructions, architecture, environment requirements, scripts, or verification status change. Keep the README synchronized with the actual repository rather than aspirational product plans.

## Contributing

Bug reports, feature suggestions, and pull requests are welcome. Before submitting changes, run the relevant build and test commands and describe any known limitations in the pull request.

## License

MIT
