// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'hi'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'en';

const EXCLUDED_PATHS = [
  '/api',
  '/_next',
  '/assets',
  '/static',
  '/callback',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/site.webmanifest',
  '/main.js',
  '/index.html'
];

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.includes('.') ||
    /\.(js|css|json|map|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico)$/i.test(pathname) ||
    EXCLUDED_PATHS.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

function detectLocale(request: NextRequest): { locale: Locale; country: string } {
  const country =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    (request as any).geo?.country ||
    'US';

  if (country === 'IN') {
    return { locale: 'hi', country };
  }

  const acceptLang = request.headers.get('accept-language') || '';
  const preferredLocales = acceptLang
    .split(',')
    .map(part => {
      const [langCode, q] = part.trim().split(';q=');
      return {
        code: langCode.split('-')[0].toLowerCase(),
        weight: q ? parseFloat(q) : 1.0
      };
    })
    .sort((a, b) => b.weight - a.weight);

  for (const preferred of preferredLocales) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(preferred.code)) {
      return { locale: preferred.code as Locale, country };
    }
  }

  return { locale: DEFAULT_LOCALE, country };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const pathnameSegments = pathname.split('/').filter(Boolean);
  const currentLocale = pathnameSegments[0] as Locale;
  const hasValidLocale = (SUPPORTED_LOCALES as readonly string[]).includes(currentLocale);

  const { locale: detectedLocale, country } = detectLocale(request);

  if (pathname === '/' || !hasValidLocale) {
    const targetLocale = hasValidLocale ? currentLocale : detectedLocale;
    const targetPath = hasValidLocale ? pathname : `/${targetLocale}${pathname}`;

    const redirectUrl = new URL(targetPath, request.url);
    const response = NextResponse.redirect(redirectUrl, 302);

    response.headers.set('x-user-country', country);
    response.headers.set('x-user-locale', targetLocale);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-country', country);
  requestHeaders.set('x-user-locale', currentLocale);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|static|favicon.ico|main\\.js|.*\\.(?:js|css|json|map|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$).*)'
  ]
};
