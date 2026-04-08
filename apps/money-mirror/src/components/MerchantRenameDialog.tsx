'use client';

import { type RefObject } from 'react';
import type { RenameTarget } from './MerchantRollups';

interface MerchantRenameDialogProps {
  rename: RenameTarget;
  renameBusy: boolean;
  renameInputRef: RefObject<HTMLInputElement | null>;
  onChange: (draft: string) => void;
  onClose: () => void;
  onSave: () => void;
  onAcceptSuggestion: (merchantKey: string) => void;
}

export function MerchantRenameDialog({
  rename,
  renameBusy,
  renameInputRef,
  onChange,
  onClose,
  onSave,
  onAcceptSuggestion,
}: MerchantRenameDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merchant-rename-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={() => !renameBusy && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          padding: '18px 16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="merchant-rename-title" style={{ margin: '0 0 10px', fontSize: '1rem' }}>
          Rename merchant
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          This label is shown on transactions and top merchants for this account.
        </p>
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Display name
          <input
            ref={renameInputRef}
            type="text"
            value={rename.draft}
            onChange={(e) => onChange(e.target.value)}
            maxLength={120}
            style={{
              marginTop: '6px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
            }}
          />
        </label>
        {rename.suggestedLabel ? (
          <button
            type="button"
            className="btn-ghost"
            style={{ marginTop: '10px', fontSize: '0.8rem' }}
            disabled={renameBusy}
            onClick={() => onAcceptSuggestion(rename.merchantKey)}
          >
            Use AI suggestion: {rename.suggestedLabel}
          </button>
        ) : null}
        <div
          style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}
        >
          <button type="button" className="btn-ghost" disabled={renameBusy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={renameBusy || rename.draft.trim().length < 1}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
