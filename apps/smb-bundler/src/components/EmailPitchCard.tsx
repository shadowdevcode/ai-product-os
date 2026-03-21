"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";

interface EmailPitchCardProps {
  pitch: string;
  sessionId: string;
}

export default function EmailPitchCard({ pitch, sessionId }: EmailPitchCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const posthog = usePostHog();

  async function handleCopy() {
    setCopyError(false);
    let success = false;

    try {
      await navigator.clipboard.writeText(pitch);
      success = true;
    } catch {
      // Fallback for non-HTTPS or restricted browser contexts
      try {
        const textarea = document.createElement("textarea");
        textarea.value = pitch;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      posthog?.capture("pitch_copied", {
        session_id: sessionId,
      });

      // Mark pitch_copied in DB — fire-and-forget is acceptable here (analytics signal, not business logic)
      fetch(`/api/bundle-sessions/${sessionId}/copied`, { method: "PATCH" }).catch(
        (err) => console.warn("pitch_copied PATCH failed (non-critical):", err)
      );
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 4000);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Email Pitch
        </h3>
        <button
          type="button"
          onClick={handleCopy}
          className={`rounded-md border px-3 py-1 text-xs transition-colors ${copyError ? "border-red-700 text-red-400" : "border-neutral-700 text-neutral-300 hover:border-indigo-500 hover:text-indigo-300"}`}
        >
          {copied ? "Copied!" : copyError ? "Copy failed" : "Copy Email"}
        </button>
      </div>
      <p className="mb-3 text-xs text-amber-500/80">
        Replace <span className="font-mono">[First Name]</span> with the prospect&apos;s name before sending.
      </p>
      {copyError && (
        <p className="mb-3 text-xs text-red-400">
          Copy failed — please select the text below and copy manually.
        </p>
      )}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
        {pitch}
      </p>
    </div>
  );
}
