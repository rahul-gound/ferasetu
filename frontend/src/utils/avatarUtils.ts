/**
 * FeraSetu Avatar & Profile Image Utilities
 * Provides deterministic, offline-capable Google & GitHub style avatars,
 * and sanitizes synthetic machine user IDs (e.g. user_01...) from merchant-facing UI.
 */

const GOOGLE_PALETTE = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

/**
 * Checks whether a given string is a raw machine-generated identifier
 * (e.g. WorkOS user ID `user_01M2FQ94TPQ7GQ18WNZ68EN5`, internal org ID, or dummy email).
 */
export function isSyntheticUserIdentifier(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return true;
  const lower = text.toLowerCase().trim();
  return (
    lower.startsWith('user_') ||
    lower.startsWith('org_') ||
    lower.startsWith('shop_') ||
    lower.includes('user_01') ||
    lower.includes('@user.ferasetu.com') ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(lower)
  );
}

/**
 * Returns a human-friendly label for a user's subtitle or secondary line.
 * If the email is a genuine human address, returns it.
 * If it's a machine ID like `user_01M2FQ94TPQ7GQ18WNZ68EN5`, strips it completely.
 */
export function cleanUserSubtitle(email?: string | null, storeSubdomain?: string | null): string {
  if (email && !isSyntheticUserIdentifier(email) && email.includes('@')) {
    return email.trim();
  }
  if (storeSubdomain && !isSyntheticUserIdentifier(storeSubdomain) && storeSubdomain !== 'mystore.ferasetu.com') {
    return storeSubdomain.trim();
  }
  return 'Store Owner';
}

/**
 * Generates an SVG data URL in the visual style of a Google Workspace account avatar.
 * Uses Google's official brand colors and a crisp, centered white capital initial.
 */
export function getGoogleStyleAvatar(seed: string): string {
  const cleanSeed = (seed || 'Shopkeeper').trim();
  const char = (cleanSeed.charAt(0) || 'M').toUpperCase();
  let hash = 0;
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = (hash << 5) - hash + cleanSeed.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % GOOGLE_PALETTE.length;
  const bg = GOOGLE_PALETTE[colorIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <circle cx="64" cy="64" r="64" fill="${bg}"/>
    <text x="64" y="82" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${char}</text>
  </svg>`.replace(/\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an authentic 5x5 symmetric pixel identicon SVG data URL
 * matching GitHub's iconic account avatar design.
 */
export function getGithubStyleAvatar(seed: string): string {
  const str = (seed || 'shopkeeper').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  // GitHub identicon colors: HSL with pleasing saturation & lightness
  const hues = [210, 160, 340, 260, 45, 120, 190, 280, 15, 95];
  const hue = hues[absHash % hues.length];
  const color = `hsl(${hue}, 65%, 45%)`;
  const bg = '#f0f3f6';

  // 5x5 grid with horizontal reflection (columns 0, 1, 2, 1, 0)
  let rects = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const bitIndex = (row * 3 + col) % 31;
      const bit = (absHash >> bitIndex) & 1;
      if (bit) {
        const x1 = col * 20 + 14;
        const x2 = (4 - col) * 20 + 14;
        const y = row * 20 + 14;
        rects += `<rect x="${x1}" y="${y}" width="20" height="20" fill="${color}" rx="2"/>`;
        if (col !== 2) {
          rects += `<rect x="${x2}" y="${y}" width="20" height="20" fill="${color}" rx="2"/>`;
        }
      }
    }
  }

  // Fallback rect if empty hash pattern
  if (!rects) {
    rects = `<rect x="34" y="34" width="60" height="60" fill="${color}" rx="6"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <rect width="128" height="128" rx="64" fill="${bg}"/>
    ${rects}
  </svg>`.replace(/\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resolves the final effective profile picture.
 * Prioritizes:
 * 1. User uploaded custom photo (data URL or uploaded image URL)
 * 2. OAuth provider picture from Google or GitHub (via WorkOS profilePictureUrl)
 * 3. Generated Google-style or GitHub-style avatar
 */
export function resolveEffectiveProfilePicture(options: {
  customPicture?: string | null;
  oauthPicture?: string | null;
  seedName?: string | null;
  preferredStyle?: 'google' | 'github';
}): string {
  if (options.customPicture && options.customPicture.trim()) {
    return options.customPicture.trim();
  }
  if (options.oauthPicture && options.oauthPicture.trim() && !isSyntheticUserIdentifier(options.oauthPicture)) {
    return options.oauthPicture.trim();
  }
  const seed = options.seedName || 'Shopkeeper';
  if (options.preferredStyle === 'github') {
    return getGithubStyleAvatar(seed);
  }
  return getGoogleStyleAvatar(seed);
}
