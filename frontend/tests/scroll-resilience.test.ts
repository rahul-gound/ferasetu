import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Scroll Resilience — PublicSmoothScroll eliminates Lenis event hijacking and locks', async () => {
  const scrollSource = await readFile(new URL('../src/components/public/PublicSmoothScroll.tsx', import.meta.url), 'utf8');

  // Verify Lenis package and CSS imports are completely eliminated
  assert.ok(!scrollSource.includes("import Lenis from 'lenis'"), 'Must not import Lenis library');
  assert.ok(!scrollSource.includes("import 'lenis/dist/lenis.css'"), 'Must not import lenis.css (which applies overflow: clip)');

  // Verify non-blocking passive scroll listener
  assert.ok(scrollSource.includes("{ passive: true }"), 'Must register scroll listener with passive: true for smooth compositor thread');

  // Verify lag smoothing is healthy and not set to 0
  assert.ok(!scrollSource.includes('lagSmoothing(0)'), 'Must not disable GSAP lag smoothing');

  // Verify backward-compatible __lenis shim exists
  assert.ok(scrollSource.includes('lenisShim'), 'Must supply backward-compatible __lenis shim');
  assert.ok(scrollSource.includes('scrollTo:'), 'Shim must provide scrollTo method');
});

test('Scroll Resilience — Frictionless horizontal tracks without scroll pinning', async () => {
  const showcaseSource = await readFile(new URL('../src/components/marketing/StorefrontShowcase.tsx', import.meta.url), 'utf8');
  const circuitSource = await readFile(new URL('../src/components/marketing/CompleteCircuit.tsx', import.meta.url), 'utf8');

  // Verify StorefrontShowcase has no scroll pinning traps
  assert.ok(!showcaseSource.includes("pin: true"), 'StorefrontShowcase must not pin vertical page scroll');
  assert.ok(showcaseSource.includes("touch-pan-x"), 'StorefrontShowcase must enable touch-pan-x for frictionless mobile swiping');

  // Verify CompleteCircuit has direct interactive tabs without scroll pinning
  assert.ok(!circuitSource.includes("pin: true"), 'CompleteCircuit must not pin vertical page scroll');
  assert.ok(!circuitSource.includes('totalScrollDistance = 2200'), 'CompleteCircuit must not lock users in 2200px of forced scroll');
});

test('Scroll Resilience — LandingPage eliminates scroll-loading chunk spinners', async () => {
  const landingSource = await readFile(new URL('../src/pages/LandingPage.tsx', import.meta.url), 'utf8');

  // Verify static imports for fast rendering
  assert.ok(landingSource.includes("import TransparencyTable from '../components/marketing/TransparencyTable'"), 'TransparencyTable must be statically imported');
  assert.ok(landingSource.includes("import FAQSection from '../components/marketing/FAQSection'"), 'FAQSection must be statically imported');
  assert.ok(!landingSource.includes("lazy(() => import('../components/marketing/TransparencyTable'))"), 'TransparencyTable must not be lazy-loaded with chunk spinners');
});

test('Scroll Resilience — MarketingReveal includes safety fallback timeout', async () => {
  const revealSource = await readFile(new URL('../src/components/marketing/MarketingReveal.tsx', import.meta.url), 'utf8');

  assert.ok(revealSource.includes("safetyTimer"), 'MarketingReveal must have a safety fallback timer');
  assert.ok(revealSource.includes("rootMargin:"), 'MarketingReveal must have rootMargin to trigger pre-emptively');
});

test('Scroll Resilience — CSS specifies touch-action and hardware-accelerated momentum', async () => {
  const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

  assert.ok(cssSource.includes('touch-action: pan-y pinch-zoom;'), 'index.css must declare touch-action pan-y pinch-zoom');
  assert.ok(cssSource.includes('-webkit-overflow-scrolling: touch;'), 'index.css must declare webkit-overflow-scrolling touch');
  assert.ok(cssSource.includes('prefers-reduced-motion: reduce'), 'index.css must respect prefers-reduced-motion');
});

