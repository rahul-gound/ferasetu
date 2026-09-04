// app/[lang]/layout.tsx
import React from 'react';

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'hi'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_METADATA: Record<
  Locale,
  { name: string; nativeName: string; dir: 'ltr' | 'rtl'; defaultCountry: string }
> = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr', defaultCountry: 'US' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr', defaultCountry: 'FR' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr', defaultCountry: 'DE' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr', defaultCountry: 'ES' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', defaultCountry: 'IN' }
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map(lang => ({ lang }));
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang;

  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : 'en';
  const { dir } = LOCALE_METADATA[locale];

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
