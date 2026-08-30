# Dispatch: Milestone 4 (M4) Worker — Landing Page Copy & Positioning

## Context & Objectives
You are the dedicated Worker for Milestone 4 (Landing Page Copy & $100 Startup Positioning).
Working directory: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\worker_m4_gen2
Project root: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-
Original request: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\.agents\ORIGINAL_REQUEST.md
Master architecture: c:\Users\himanshu\OneDrive\fera-shopkeeeper-web-testing-\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Scope of Ownership (Exclusive Write Ownership)
- `frontend/src/pages/LandingPage.tsx`
- `frontend/src/i18n/` (translations for landing page / hero copy)

## Key Deliverables & Requirements
1. **Value-Based Positioning for Indian Shopkeepers ($100 Startup Framing)**:
   - Hero Badge: "FOR INDIAN SHOPKEEPERS & LOCAL RETAILERS"
   - Hero Headline: "Apni dukaan ko online le jao. Orders badhao, business sambhalo — ek hi jagah se." (Build your online store, accept more orders, and manage your business from one place.)
   - Hero Subtitle: "No technical knowledge required. Get your own store link, take orders directly on WhatsApp with UPI payments, and let Fera AI help you manage inventory and restock smoothly."
   - Primary CTA: "Start Free (₹0)" -> `/register`
   - Secondary CTA: "See Pricing Plans" -> `/pricing`
   - Trust Badges: "₹0 to start · No credit card required · Ready in 5 minutes · 100% Data in India"
2. **Problem & Solution Breakdown**:
   - Problem 1: Lost WhatsApp Orders — No more digging through 50 chat threads to find who ordered what.
   - Problem 2: Zero Commission — Stop paying 15–30% of your hard-earned revenue to aggregators.
   - Problem 3: No Developers Needed — Add products from your phone, share your link, and start selling today.
3. **Live Pricing Preview**:
   - Render 3 transparent cards: Free (₹0), Business (₹399/mo - Recommended / Most Popular), Pro (₹999/mo).
   - Display 4-5 focused merchant outcome bullets per card.
4. **Verification**:
   - Run `npm run build` in `frontend/` to confirm 0 TypeScript or build errors.
   - Write `handoff.md` with file changes and verification proof.
   - Notify parent orchestrator via `send_message`.
