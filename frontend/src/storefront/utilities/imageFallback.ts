/**
 * Generates an SVG data URI placeholder for products with missing images.
 * Designed to look intentional, refined, and theme-neutral.
 */
export function getProductPlaceholderSvg(label: string = 'Product', accentColor: string = '#475569'): string {
  const initial = (label.trim().charAt(0) || 'P').toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
      <rect width="400" height="400" fill="#F8FAFC"/>
      <circle cx="200" cy="180" r="70" fill="#E2E8F0"/>
      <path d="M160 270C160 240 180 230 200 230C220 230 240 240 240 270" stroke="#CBD5E1" stroke-width="6" stroke-linecap="round"/>
      <text x="200" y="195" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="48" fill="${accentColor}">
        ${initial}
      </text>
      <text x="200" y="320" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="14" fill="#94A3B8" letter-spacing="1">
        FERASETU STORE
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Fallback handler for <img> onError events.
 */
export function handleImageFallback(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  label: string = 'Product',
  fallbackUrl?: string
): void {
  const img = event.currentTarget;
  img.onerror = null; // Prevent infinite loop if fallback fails
  img.src = fallbackUrl || getProductPlaceholderSvg(label);
}
