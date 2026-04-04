import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
