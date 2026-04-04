'use client';

import { useRef } from 'react';
import type { StatementType } from '@/lib/statements';

interface UploadPanelProps {
  error: string | null;
  statementType: StatementType;
  onStatementTypeChange: (statementType: StatementType) => void;
  onUpload: (file: File, statementType: StatementType) => void;
}

export function UploadPanel({
  error,
  statementType,
  onStatementTypeChange,
  onUpload,
}: UploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file, statementType);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file, statementType);
  };

  return (
    <div
      className="animate-fade-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
          Upload your statement
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '8px 0 0' }}>
          Upload a password-free PDF from your bank account or credit card. We&apos;ll show you
          exactly where your money is going.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          className={statementType === 'bank_account' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => onStatementTypeChange('bank_account')}
        >
          Bank Account Statement
        </button>
        <button
          type="button"
          className={statementType === 'credit_card' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => onStatementTypeChange('credit_card')}
        >
          Credit Card Statement
        </button>
      </div>

      <div
        id="drop-zone"
        role="button"
        tabIndex={0}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'var(--bg-card)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📄</div>
        <p
          style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, margin: 0 }}
        >
          Drag &amp; drop your PDF, or tap to browse
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '8px 0 0' }}>
          PDF only • Password removed • Max 10 MB
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-label="Upload bank statement PDF"
        />
      </div>

      {error && (
        <div
          className="badge-danger"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '14px 16px',
          background: 'var(--bg-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>
          Your PDF is processed in memory and{' '}
          <strong style={{ color: 'var(--text-secondary)' }}>deleted immediately</strong> after
          parsing. We never store your statement file.
        </p>
      </div>
    </div>
  );
}
