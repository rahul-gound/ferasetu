# FeraSetu Marketing Landing Page

Next.js SSR landing page with glassmorphism design and **real platform data**.

## Why Next.js?

- **SSR/SSG**: Server-side rendering for SEO + faster initial paint
- **Real data**: Fetches live stats from backend `/api/auth/public/platform-stats` (revalidated every 5 min)
- **Glassmorphism**: Modern glass card design with backdrop-blur
- **Optimized**: Code-split components, lazy animations, no client-side data fetching for stats

## Architecture

```
marketing/
├── app/
│   ├── layout.tsx      # Root layout + SEO metadata
│   ├── page.tsx        # Server component - fetches real stats, renders sections
│   └── globals.css     # Glassmorphism + animations CSS
├── components/
│   ├── Navbar.tsx      # Glassmorphic nav bar
│   ├── Hero.tsx        # Hero with real-time data viz mockup
│   ├── TrustBar.tsx    # Infinite city marquee
│   ├── Features.tsx    # 6 feature cards with icons
│   ├── AnalyticsShowcase.tsx # Live platform stats (server-fetched)
│   ├── Pricing.tsx     # 3-tier pricing table
│   ├── TrustBadges.tsx # Badges + testimonial with real numbers
│   ├── FinalCTA.tsx    # Conversion CTA
│   └── Footer.tsx
├── lib/
│   └── stats.ts        # Server-side fetch + formatters
├── next.config.js      # API rewrites to backend
├── tailwind.config.js  # Glassmorphism tokens + keyframes
└── package.json
```

## Data Flow

1. User visits landing page
2. Next.js server fetches `/api/auth/public/platform-stats` (no auth needed)
3. Stats are cached for 5 minutes (ISR via `revalidate: 300`)
4. Components receive real `totalUsers`, `totalOrders`, `totalRevenue`, etc.
5. All numbers displayed are from the database — no fake "10,000+ shopkeepers"

## Setup

```bash
cd marketing
cp .env.local.example .env.local  # set BACKEND_URL
npm install
npm run dev    # runs on port 3000
npm run build  # production build
npm start      # serve production build
```

## Production Deployment

Deploy this Next.js app to Vercel or any Node host. Set `BACKEND_URL` to your production API.
The Vite app (`frontend/`) handles the dashboard/app routes, while this Next.js app handles the public landing page for SEO + speed.
