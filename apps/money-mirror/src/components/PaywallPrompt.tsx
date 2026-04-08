'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import {
  getPosthogBrowser,
  PAYWALL_PROMPT_SEEN,
  UPGRADE_INTENT_TAPPED,
} from '@/lib/posthog-browser';
import type { UserPlan } from '@/lib/user-plan';

const STORAGE_DISMISS = 'mm_paywall_dismissed_v1';
const SESSION_SEEN_EVENT = 'mm_paywall_prompt_seen_event_v1';
const DISMISS_SYNC_EVENT = 'mm_paywall_dismiss_sync';

function getDismissedFromStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_DISMISS) === '1';
  } catch {
    return false;
  }
}

function subscribeDismissed(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => onChange();
  window.addEventListener('storage', handler);
  window.addEventListener(DISMISS_SYNC_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(DISMISS_SYNC_EVENT, handler);
  };
}

export interface PaywallPromptProps {
  /** Ref to the Money Mirror block (e.g. wrapper around `PerceivedActualMirror`). */
  anchorRef: RefObject<HTMLElement | null>;
  userPlan: UserPlan;
  /** When false, render nothing (e.g. `NEXT_PUBLIC_PAYWALL_PROMPT_ENABLED` not set). */
  featureEnabled: boolean;
}

/**
 * Soft paywall: shown after the mirror section is visible (IntersectionObserver).
 * Dismiss persists in localStorage; `paywall_prompt_seen` once per browser session.
 */
export function PaywallPrompt({ anchorRef, userPlan, featureEnabled }: PaywallPromptProps) {
  const [mirrorSeen, setMirrorSeen] = useState(false);
  const dismissedPersisted = useSyncExternalStore(
    subscribeDismissed,
    getDismissedFromStorage,
    () => false
  );

  useEffect(() => {
    if (!featureEnabled || userPlan !== 'free' || dismissedPersisted) {
      return;
    }
    const el = anchorRef.current;
    if (!el) {
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMirrorSeen(true);
        }
      },
      { threshold: 0.25, rootMargin: '0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [anchorRef, featureEnabled, userPlan, dismissedPersisted]);

  const showCard = featureEnabled && userPlan === 'free' && !dismissedPersisted && mirrorSeen;

  useEffect(() => {
    if (!showCard) {
      return;
    }
    try {
      if (
        typeof sessionStorage === 'undefined' ||
        sessionStorage.getItem(SESSION_SEEN_EVENT) === '1'
      ) {
        return;
      }
      sessionStorage.setItem(SESSION_SEEN_EVENT, '1');
    } catch {
      return;
    }
    void getPosthogBrowser().then((ph) =>
      ph?.capture(PAYWALL_PROMPT_SEEN, { surface: 'overview_mirror' })
    );
  }, [showCard]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_DISMISS, '1');
      window.dispatchEvent(new Event(DISMISS_SYNC_EVENT));
    } catch {
      /* ignore */
    }
  }, []);

  const handleUpgradeIntent = useCallback(() => {
    void (async () => {
      const ph = await getPosthogBrowser();
      ph?.capture(UPGRADE_INTENT_TAPPED, { surface: 'overview_mirror' });
    })();
  }, []);

  if (!showCard) {
    return null;
  }

  return (
    <div
      className="card animate-fade-up"
      style={{
        padding: '16px',
        border: '1px solid var(--border-accent)',
        background: 'var(--accent-dim)',
      }}
      role="region"
      aria-label="Upgrade"
    >
      <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.95rem' }}>Support MoneyMirror</p>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        We&apos;re building statement-native coaching for India. Tap below to show interest in Pro
        when billing goes live — your access stays the same on the free plan.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button type="button" className="btn-primary" onClick={handleUpgradeIntent}>
          I&apos;m interested in Pro
        </button>
        <button type="button" className="btn-ghost" onClick={handleDismiss}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
