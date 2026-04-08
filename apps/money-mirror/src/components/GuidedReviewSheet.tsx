'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GUIDED_REVIEW_STARTED, getPosthogBrowser } from '@/lib/posthog-browser';
import { Step1, Step2, Step3, DoneState } from './GuidedReviewSteps';

interface GuidedReviewSheetProps {
  open: boolean;
  onClose: () => void;
  statementId?: string | null;
}

type Step = 1 | 2 | 3;

export function GuidedReviewSheet({ open, onClose, statementId }: GuidedReviewSheetProps) {
  const [step, setStep] = useState<Step>(1);
  const [saveCommitment, setSaveCommitment] = useState(false);
  const [commitmentText, setCommitmentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      void getPosthogBrowser().then((ph) => {
        if (!ph) return;
        ph.capture(GUIDED_REVIEW_STARTED, { statement_id: statementId ?? null });
      });
    }
    if (!open) {
      startedRef.current = false;
      setStep(1);
      setSaveCommitment(false);
      setCommitmentText('');
      setSubmitError(null);
      setDone(false);
    }
  }, [open, statementId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const submit = useCallback(
    async (dismissed: boolean) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const response = await fetch('/api/guided-review/outcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statement_id: statementId ?? null,
            dismissed,
            commitment_text: dismissed ? null : commitmentText.trim() || null,
          }),
        });
        if (!response.ok) {
          setSubmitError("Couldn't save yet. Please try again.");
          return;
        }
        setDone(true);
      } catch {
        setSubmitError("Couldn't save yet. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [statementId, commitmentText]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Guided review — step ${step} of 3`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.55)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px 20px 0 0',
          padding: '28px 24px 36px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '99px',
            background: 'var(--border)',
            margin: '0 auto 20px',
          }}
        />

        <p
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 8px',
            fontWeight: 600,
          }}
        >
          Step {step} of 3
        </p>

        {done ? (
          <DoneState
            onClose={onClose}
            savedCommitment={saveCommitment && Boolean(commitmentText.trim())}
          />
        ) : step === 1 ? (
          <Step1 onNext={() => setStep(2)} />
        ) : step === 2 ? (
          <Step2
            saveCommitment={saveCommitment}
            commitmentText={commitmentText}
            onToggleSave={setSaveCommitment}
            onTextChange={setCommitmentText}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        ) : (
          <Step3
            saveCommitment={saveCommitment}
            commitmentText={commitmentText}
            submitting={submitting}
            submitError={submitError}
            onDismiss={() => submit(true)}
            onSave={() => submit(false)}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
}
