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

## Multilingual Experience

FeraSetu supports the requested 22-language India catalog, with English as the canonical fallback:

`as`, `bn`, `brx`, `doi`, `gu`, `hi`, `kn`, `ks`, `gom`, `mai`, `ml`, `mni`, `mr`, `ne`, `or`, `pa`, `sa`, `ta`, `te`, `ur`, `sd`, and `en`.

### Architecture

- `frontend/src/i18n/config.ts` defines the language catalog, locale metadata, route helpers, and RTL direction.
- `frontend/src/i18n/core.ts` provides shared core-interface translations for all non-English languages.
- `frontend/src/i18n/en.ts` is the typed fallback dictionary.
- `frontend/src/contexts/LanguageContext.tsx` is the single provider for active language, dictionary loading, fallback, and route-aware links.
- `frontend/src/components/LanguageSelector.tsx` provides one searchable selector with a desktop popover and mobile bottom sheet.
- Urdu, Kashmiri, and Sindhi use RTL document direction and script-aware font fallbacks.

### Persistence

- Public routes support language-prefixed URLs such as `/hi`, `/mr/login`, and `/ta/register`.
- Unauthenticated choices persist in `localStorage` and a pre-login `sessionStorage` preference.
- Authenticated choices synchronize with the merchant `preferred_language` account field.
- Dashboard and application routes use the persisted language without requiring a URL prefix or logout.

### Coverage

All 22 languages receive the same typed key set and English fallback. Hindi, Marathi, and Gujarati currently have richer translation coverage. Long-form marketing copy in the remaining languages intentionally falls back to English instead of rendering missing or misleading text.

## Legal Documents

- The production Terms of Service is implemented in `frontend/src/pages/TermsPage.tsx` and covers 25 merchant-facing sections, including definitions, eligibility, the software-provider business model, Account security, merchant responsibilities, content licensing, Fera AI, subscriptions, payments, acceptable use, data, security, suspension, liability, indemnification, disputes, governing law, changes, and contact channels.
- The Terms clearly state that FeraSetu is not a marketplace, is not the seller of merchant products, does not own merchant inventory, and does not set merchant prices.
- The Terms preserve merchant ownership of Merchant Data and Content while granting FeraSetu only the limited operational license needed to provide the Services.
- The Privacy Policy remains the separate privacy document and was not modified in this update.
- Legal details that should be confirmed by FeraSetu's owner or qualified Indian legal counsel include the final registered-office address, arbitration seat or forum, refund policy specifics, tax treatment, and any specific regulatory disclosures.

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

## Authentication Flow

- WorkOS AuthKit uses the current origin with `/callback` as the OAuth redirect URI.
- `frontend/src/pages/AuthCallbackPage.tsx` waits for both the WorkOS session and the FeraSetu merchant profile, then replaces the callback URL with `/dashboard`.
- If code exchange or profile provisioning fails, the callback page shows a recoverable sign-in retry instead of remaining on a silent spinner or creating a redirect loop.
- Registration calls the WorkOS SDK `signUp` method directly. If signup cannot start, the existing Register page fallback can attempt sign-in.
- Google OAuth and the full production WorkOS-to-dashboard journey have not been verified from this environment because an interactive authenticated browser session is required.

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

- Frontend default TypeScript check (`tsc --noEmit`): passing.
- Frontend stricter app-scoped TypeScript check (`tsc --noEmit -p tsconfig.app.json`): 59 pre-existing errors remain in unrelated files.
- Frontend production build: passing.
- Backend test suite: 69 tests passing.
- WorkOS callback route smoke check: `/`, `/register`, `/login`, `/callback`, `/hi/register`, `/hi/login`, and `/hi/callback` returned HTTP 200 from the local production preview.
- Focused auth lint: `AuthCallbackPage.tsx` is clean; five pre-existing errors remain in `AuthContext.tsx`, plus two pre-existing hook warnings in `LoginPage.tsx` and `RegisterPage.tsx`.
- Compiled language bundles: all 21 non-English bundles import successfully, contain the 224 English fallback keys, and have no missing or undefined values.
- Local preview: `/`, `/hi`, `/mr/login`, `/ta/register`, `/pricing`, `/login`, and `/register` returned HTTP 200.
- Terms route validation: `/terms`, `/hi/terms`, `/privacy`, `/`, `/login`, `/register`, and `/pricing` returned HTTP 200; all 25 Terms section IDs are present in the production bundle.
- Terms page lint: passing. Mobile/browser visual QA remains not verified in this environment.
- Frontend lint: 205 pre-existing problems remain across unrelated files.
- Browser visual QA: not verified in this environment because headless Chromium could not start its GPU process.
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
- [x] 22-language architecture and persistent language journey
- [x] Production Terms of Service
- [ ] Payment integration completion
- [ ] Complete long-form marketing copy translation
- [ ] Production SEO response-header verification
- [ ] End-to-end merchant journey QA

## Documentation Maintenance

Update this README whenever user-facing behavior, setup instructions, architecture, environment requirements, scripts, or verification status change. Keep the README synchronized with the actual repository rather than aspirational product plans.

## Contributing

Bug reports, feature suggestions, and pull requests are welcome. Before submitting changes, run the relevant build and test commands and describe any known limitations in the pull request.

## License

MIT
