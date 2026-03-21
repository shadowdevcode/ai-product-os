import type { Metadata } from "next";
import "./globals.css";
import PostHogProvider from "@/components/PostHogProvider";

export const metadata: Metadata = {
  title: "Ozi Reorder Experiment",
  description:
    "21-day A/B experiment: does a timely reorder reminder improve repeat purchase rate for baby essential buyers?",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
