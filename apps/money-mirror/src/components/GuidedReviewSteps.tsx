'use client';

export function Step1({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px' }}>
        Let&apos;s check in
      </h2>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
          lineHeight: 1.6,
          margin: '0 0 24px',
        }}
      >
        Your statement tells a story. Spending patterns aren&apos;t good or bad — they&apos;re just
        information. The goal is clarity, not judgment.
      </p>
      <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onNext}>
        I&apos;m ready
      </button>
    </>
  );
}

export function Step2({
  saveCommitment,
  commitmentText,
  onToggleSave,
  onTextChange,
  onNext,
  onBack,
}: {
  saveCommitment: boolean;
  commitmentText: string;
  onToggleSave: (v: boolean) => void;
  onTextChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px' }}>
        Pick one next step
      </h2>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
          lineHeight: 1.6,
          margin: '0 0 16px',
        }}
      >
        Not a life overhaul — just one small thing for the next statement cycle. Or skip this
        entirely.
      </p>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          marginBottom: '12px',
        }}
      >
        <input
          type="checkbox"
          checked={saveCommitment}
          onChange={(e) => onToggleSave(e.target.checked)}
          style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }}
        />
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Save my commitment (optional)</span>
      </label>

      {saveCommitment && (
        <textarea
          value={commitmentText}
          onChange={(e) => onTextChange(e.target.value)}
          maxLength={500}
          placeholder="e.g. Audit one recurring subscription"
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            resize: 'vertical',
            marginBottom: '12px',
          }}
        />
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={onNext}>
          Next
        </button>
      </div>
    </>
  );
}

export function Step3({
  saveCommitment,
  commitmentText,
  submitting,
  submitError,
  onDismiss,
  onSave,
  onBack,
}: {
  saveCommitment: boolean;
  commitmentText: string;
  submitting: boolean;
  submitError: string | null;
  onDismiss: () => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const hasText = saveCommitment && commitmentText.trim().length > 0;

  return (
    <>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px' }}>Wrap up</h2>
      {hasText ? (
        <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Your commitment
          </p>
          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>{commitmentText.trim()}</p>
        </div>
      ) : (
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            margin: '0 0 16px',
          }}
        >
          No commitment saved — that&apos;s fine. Awareness counts.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {submitError ? (
          <p
            role="alert"
            style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger, #dc2626)' }}
          >
            {submitError}
          </p>
        ) : null}
        {hasText ? (
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={onSave}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save & finish'}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-ghost"
          style={{ width: '100%' }}
          onClick={onDismiss}
          disabled={submitting}
        >
          {submitting ? 'Finishing…' : hasText ? 'Skip saving' : 'Done'}
        </button>
        <button
          type="button"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            padding: '4px',
          }}
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>
      </div>
    </>
  );
}

export function DoneState({
  onClose,
  savedCommitment,
}: {
  onClose: () => void;
  savedCommitment: boolean;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <span style={{ fontSize: '2.5rem' }}>✅</span>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '16px 0 8px' }}>Review complete</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 24px' }}>
        {savedCommitment
          ? 'Your commitment is saved. Come back next month to see how it went.'
          : 'Clarity is the first step. Upload your next statement when it arrives.'}
      </p>
      <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
        Back to dashboard
      </button>
    </div>
  );
}
