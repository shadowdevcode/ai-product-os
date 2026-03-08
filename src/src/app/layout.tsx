import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CSPostHogProvider } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InboxPulse — AI Email Digests on WhatsApp",
  description:
    "Never miss an important email again. Get AI-summarized, prioritized email digests delivered straight to your WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <CSPostHogProvider>
        <body className={inter.variable}>{children}</body>
      </CSPostHogProvider>
    </html>
  );
}
