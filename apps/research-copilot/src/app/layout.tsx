import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PM Research Copilot',
  description: 'Chat-first research planning with orchestrated evidence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
