# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product
FeraSetu

## Audience
The Global Shopkeeper: independent retail merchants, corner grocers, bodegas, boutiques, and artisans across 48+ regions.

## Purpose
Direct commerce and digital storefront engine offering 0% marketplace commission, direct merchant-customer relationships, and zero technical jargon.

## Stack
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Primitives: shadcn/ui (`@/components/ui/*`), Lucide React icons (`size={18}` / `size={20}`, `strokeWidth={1.75}`)
- Motion & Scroll: Lenis smooth scrolling, GSAP orchestration
- Micro-interactions: React Bits (`SpotlightCard`, `SplitText`)
- Design Foundations: Superdesign and OpenDesign
- Backend: Cloudflare Workers serverless edge architecture (`worker/`), Cloudflare D1 SQL, OpenAI-compatible AI cluster (`https://ai.fera-search.tech/v1`)

## Constraints
- 0% marketplace toll: 100% direct merchant settlement (UPI AutoCollect, Cashfree, Razorpay, direct bank sweeps).
- No heavy 3D or canvas shaders on functional or transactional screens.
- Mobile touch targets must be at least 48x48px in bottom thumb zones (Fitts's Law).
- High contrast outdoor and harsh shop lighting legibility (`text-slate-900` / `text-slate-700`).
- Generous whitespace and calm trust psychology (`p-6` to `p-10`, `gap-6` to `gap-8`, ample section margins).
- Zero card-in-card nesting: use tint shifts (`bg-slate-50`), subtle borders (`border-slate-100`), or whitespace.
- Doherty threshold: All interactive elements must provide visual feedback in <400ms.
- Hick's Law: 1–2 primary decisions per screen.
- Language & Tone: Zero synthetic AI buzzwords (enforced by SlopMonster for a 5/5 human score).
- Strictly zero Sarvam AI mentions: Brand exclusively as FeraSetu AI / Fera AI.
