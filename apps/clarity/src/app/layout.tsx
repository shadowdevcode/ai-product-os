import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CSPostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clarity - PM To-Do List",
  description: "Reduce cognitive load by instantly organizing raw thoughts into a structured, PM-focused workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-neutral-950 text-neutral-50 antialiased selection:bg-indigo-500/30`}>
        <CSPostHogProvider>
          {children}
        </CSPostHogProvider>
      </body>
    </html>
  );
}
