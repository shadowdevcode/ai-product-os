'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { calculateMoneyHealthScore, type OnboardingAnswers } from '@/lib/scoring';

// ─── Question Config ─────────────────────────────────────────────────────

type QuestionId = 'income' | 'perceived_spend' | 'emergency_fund' | 'invests_sip' | 'has_emi';

interface Question {
  id: QuestionId;
  step: number;
  label: string;
  sublabel: string;
  type: 'number' | 'boolean';
}

const QUESTIONS: Question[] = [
  {
    id: 'income',
    step: 1,
    label: 'What is your monthly take-home salary?',
    sublabel: 'After taxes and PF deductions.',
    type: 'number',
  },
  {
    id: 'perceived_spend',
    step: 2,
    label: 'How much do you think you spend per month?',
    sublabel: 'Your gut feeling — before you see the bank statement.',
    type: 'number',
  },
  {
    id: 'emergency_fund',
    step: 3,
    label: 'Do you have 3+ months of expenses saved as an emergency fund?',
    sublabel: 'Liquid money you can access in 24 hours.',
    type: 'boolean',
  },
  {
    id: 'invests_sip',
    step: 4,
    label: 'Do you invest in a SIP or mutual fund every month?',
    sublabel: 'Even ₹500/month counts.',
    type: 'boolean',
  },
  {
    id: 'has_emi',
    step: 5,
    label: 'Do you have any active EMIs, BNPL, or credit card dues?',
    sublabel: 'Phone EMI, Zest Money, Lazy Pay, etc.',
    type: 'boolean',
  },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, string | boolean>>>({});
  const [inputVal, setInputVal] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const current = QUESTIONS[step];
  const progressPct = (step / QUESTIONS.length) * 100;

  const handleNext = useCallback(
    async (value: string | boolean) => {
      if (isAnimating) return;
      setIsAnimating(true);

      const updated = { ...answers, [current.id]: value };
      setAnswers(updated);

      if (step < QUESTIONS.length - 1) {
        // Brief pause for animation, then advance
        setTimeout(() => {
          setStep((s) => s + 1);
          setInputVal('');
          setIsAnimating(false);
        }, 200);
      } else {
        // Last answer — calculate score and redirect
        const finalAnswers: OnboardingAnswers = {
          monthly_income_paisa: Math.round(Number(updated.income ?? 0) * 100),
          perceived_spend_paisa: Math.round(Number(updated.perceived_spend ?? 0) * 100),
          has_emergency_fund: Boolean(updated.emergency_fund),
          invests_in_sip: Boolean(updated.invests_sip),
          has_emi_or_bnpl: Boolean(updated.has_emi),
        };

        const result = calculateMoneyHealthScore(finalAnswers);

        // Store for score reveal page (survives navigation)
        try {
          sessionStorage.setItem('mm_score', JSON.stringify(result));
          sessionStorage.setItem('mm_perceived_spend', String(updated.perceived_spend ?? 0));
        } catch {
          // sessionStorage unavailable (private/incognito fallback)
          console.warn('[MoneyMirror] sessionStorage unavailable');
        }

        // Fire onboarding_completed server-side (single emission source)
        fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            monthly_income_paisa: finalAnswers.monthly_income_paisa,
            money_health_score: result.score,
            perceived_spend_paisa: finalAnswers.perceived_spend_paisa,
          }),
        }).catch(() => {
          // Non-fatal — score reveal must not be blocked
        });

        // Navigate to score reveal
        router.push('/score');
      }
    },
    [step, answers, current, isAnimating, router]
  );

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      setInputVal('');
    }
  };

  return (
    <main className="page-container">
      {/* Progress bar */}
      <div style={{ paddingTop: '24px' }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            marginTop: '8px',
            textAlign: 'right',
          }}
        >
          {step + 1} of {QUESTIONS.length}
        </p>
      </div>

      {/* Question */}
      <div className="content-center">
        <div
          key={step}
          className="animate-fade-up"
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* Logo */}
          <span
            style={{
              fontSize: '1.5rem',
              letterSpacing: '-0.02em',
              fontWeight: 800,
              color: 'var(--accent)',
              fontFamily: 'var(--font-space), sans-serif',
            }}
          >
            MoneyMirror
          </span>

          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                lineHeight: 1.25,
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              {current.label}
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                marginTop: '8px',
              }}
            >
              {current.sublabel}
            </p>
          </div>

          {/* Input */}
          {current.type === 'number' ? (
            <div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '16px',
                    color: 'var(--text-secondary)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    pointerEvents: 'none',
                  }}
                >
                  ₹
                </span>
                <input
                  id={`q-${current.id}`}
                  type="number"
                  placeholder="0"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && Number(inputVal) > 0) {
                      handleNext(inputVal);
                    }
                  }}
                  min={0}
                  style={{ paddingLeft: '36px' }}
                  autoFocus
                />
              </div>
              <button
                className="btn-primary"
                onClick={() => handleNext(inputVal)}
                disabled={!inputVal || Number(inputVal) <= 0}
                style={{ marginTop: '16px' }}
              >
                Continue →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                id={`q-${current.id}-yes`}
                className="btn-primary"
                onClick={() => handleNext(true)}
              >
                Yes
              </button>
              <button
                id={`q-${current.id}-no`}
                className="btn-ghost"
                onClick={() => handleNext(false)}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      {step > 0 && (
        <div style={{ paddingBottom: '32px' }}>
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '8px 0',
            }}
          >
            ← Back
          </button>
        </div>
      )}
    </main>
  );
}
