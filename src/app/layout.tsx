import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const inter = Inter({
  variable: '--font-sans-stack',
  subsets: ['latin'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  variable: '--font-mono-stack',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://glyphra.vercel.app'),
  title: {
    default: 'Glyphra — cryptography practice, generated on demand',
    template: '%s · Glyphra',
  },
  description:
    'A practice range for classical and modern cryptography. Press one button and get a fresh, ' +
    'verified problem drawn from 101 techniques. Answer keys and full worked solutions stay behind ' +
    'the instructor sign-in.',
  keywords: [
    'cryptography', 'cipher', 'kriptografi', 'Vigenere', 'Playfair', 'Enigma',
    'AES', 'cryptanalysis', 'CTF', 'practice problems', '教学',
  ],
  authors: [{ name: 'Bryan Kwandou' }],
  openGraph: {
    title: 'Glyphra — cryptography practice, generated on demand',
    description:
      'One button, a fresh problem, 101 techniques from Caesar to ChaCha20. Every technique is ' +
      'round-trip verified before it ever reaches a student.',
    type: 'website',
    siteName: 'Glyphra',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Glyphra',
    description: 'Cryptography practice problems, generated and verified on demand.',
  },
  icons: {
    icon: [{ url: '/mark.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFCFD' },
    { media: '(prefers-color-scheme: dark)', color: '#080B14' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-text"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
