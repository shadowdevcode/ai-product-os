'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

type LoginStep = 'email' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getNextPath(fallbackPath: string): string {
    if (typeof window === 'undefined') {
      return fallbackPath;
    }

    return new URLSearchParams(window.location.search).get('next') ?? fallbackPath;
  }

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(getNextPath('/dashboard'));
    }
  }, [isPending, router, session]);

  async function handleSendOtp(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? 'Failed to send sign-in code.');
      return;
    }

    setStep('otp');
  }

  async function handleVerifyOtp(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    const result = await authClient.signIn.emailOtp({
      email,
      otp,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? 'Invalid verification code.');
      return;
    }

    router.replace(getNextPath('/onboarding'));
    router.refresh();
  }

  return (
    <main className="page-container">
      <div className="content-center" style={{ gap: '28px' }}>
        <div
          className="animate-fade-up"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <span
            style={{
              fontSize: '1.5rem',
              letterSpacing: '-0.02em',
              fontWeight: 800,
              color: 'var(--accent)',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            MoneyMirror
          </span>

          <div>
            <h1 style={{ fontSize: '1.7rem', margin: 0, lineHeight: 1.2 }}>
              Sign in to see your money clearly
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '10px' }}>
              We use Neon Auth email OTP for private dashboard access, statement uploads, and weekly
              recap ownership.
            </p>
          </div>
        </div>

        <div
          className="card animate-fade-up"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.08s' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Email</span>
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value.trim())}
              disabled={step === 'otp' || isSubmitting}
            />
          </label>

          {step === 'otp' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                6-digit code
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(event) => setOtp(event.target.value.trim())}
                disabled={isSubmitting}
              />
            </label>
          )}

          {error && (
            <div
              className="badge-danger"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 16px',
                borderRadius: '12px',
              }}
            >
              {error}
            </div>
          )}

          {step === 'email' ? (
            <button
              className="btn-primary"
              onClick={() => {
                handleSendOtp().catch(() => {
                  setError('Failed to send sign-in code.');
                  setIsSubmitting(false);
                });
              }}
              disabled={!email || isSubmitting}
            >
              {isSubmitting ? 'Sending code...' : 'Email me a sign-in code'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  handleVerifyOtp().catch(() => {
                    setError('Sign-in failed.');
                    setIsSubmitting(false);
                  });
                }}
                disabled={!email || !otp || isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Verify and continue'}
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
          By continuing, you agree to receive a one-time sign-in code. Your statement data stays
          private and account access is tied to this email address.
        </p>

        <Link
          href="/"
          style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', textDecoration: 'none' }}
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
