import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FeraSetu — Grow Your Business Online in 2 Minutes',
  description: 'Build your shop website, manage products, and grow orders with AI. Dukaan ko online lao, orders WhatsApp par pao.',
  keywords: ['online shop', 'ecommerce India', 'shopkeeper app', 'whatsapp business', 'AI analytics', 'kirana store online'],
  openGraph: {
    title: 'FeraSetu — Grow Your Business Online',
    description: 'Build your shop website, manage products, and grow orders with AI.',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FeraSetu — Grow Your Business Online',
    description: 'Build your shop website, manage products, and grow orders with AI.',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
