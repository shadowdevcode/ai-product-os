import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PostHogProvider } from '@/components/PostHogProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nykaa Fashion — Personalised Style Concierge',
  description:
    'AI-driven personalised product discovery for Nykaa Fashion. Get recommendations tailored to your style, powered by affinity scoring and intent tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
