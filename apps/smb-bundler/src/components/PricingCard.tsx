"use client";

import { useState } from "react";

export interface PricingData {
  monthly_price_inr: number;
  price_range_label: string;
  estimated_monthly_savings_inr: number;
  roi_points: string[];
}

interface PricingCardProps {
  pricing: PricingData;
}

export default function PricingCard({ pricing }: PricingCardProps) {
  const [copied, setCopied] = useState(false);

  const pricingText = [
    pricing.price_range_label,
    `Est. monthly savings: ₹${pricing.estimated_monthly_savings_inr.toLocaleString("en-IN")}`,
    ...pricing.roi_points.map((p) => `• ${p}`),
  ].join("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pricingText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available in some environments
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Pricing
        </h3>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition-colors hover:border-indigo-500 hover:text-indigo-300"
        >
          {copied ? "Copied!" : "Copy Pricing"}
        </button>
      </div>
      <p className="text-2xl font-bold text-white">{pricing.price_range_label}</p>
      <p className="mt-1 text-sm text-emerald-400">
        Est. savings: ₹{pricing.estimated_monthly_savings_inr.toLocaleString("en-IN")}
        /month
      </p>
      <ul className="mt-4 space-y-2">
        {pricing.roi_points.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
            <span className="mt-0.5 text-indigo-400">•</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
