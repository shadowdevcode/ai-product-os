import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space',
});

export const metadata: Metadata = {
  title: 'MoneyMirror — See the truth about your money',
  description:
    'Upload your bank statement and discover where your money actually goes. No sugar-coating. For Gen Z Indians.',
  keywords: ['personal finance', 'bank statement', 'budget', 'India', 'Gen Z'],
  openGraph: {
    title: 'MoneyMirror — The truth about your money',
    description: 'See exactly where your money goes. No sugar-coating.',
    type: 'website',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#080c10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={inter.className}>
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
