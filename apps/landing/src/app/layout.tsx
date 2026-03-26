import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Product OS - Command-Driven Development Framework',
  description:
    'Ship AI-assisted products faster with specialized agents, quality gates, and systematic learning. A 12-step pipeline from idea to deployed product.',
  openGraph: {
    title: 'AI Product OS - Command-Driven Development Framework',
    description:
      'Ship AI-assisted products faster with specialized agents, quality gates, and systematic learning.',
    siteName: 'AI Product OS',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'AI Product OS - Command-Driven Development Framework',
    description:
      'Ship AI-assisted products faster with specialized agents, quality gates, and systematic learning.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-neutral-950 text-neutral-50 antialiased selection:bg-indigo-500/30`}
      >
        {children}
      </body>
    </html>
  );
}
