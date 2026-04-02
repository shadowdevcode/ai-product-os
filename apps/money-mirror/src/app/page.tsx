import Link from 'next/link';

/**
 * T11 — Landing Page
 *
 * The first thing a user sees. Warikoo-style brutal honesty positioning.
 * No login required — landing page pushes to sign-in.
 */

export default function LandingPage() {
  return (
    <main className="page-container">
      <div className="content-center" style={{ gap: '40px' }}>
        {/* Hero */}
        <div
          className="animate-fade-up"
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Logo */}
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              fontFamily: 'Space Grotesk, sans-serif',
              letterSpacing: '-0.03em',
              color: 'var(--accent)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Money
            <br />
            Mirror
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              margin: 0,
            }}
          >
            See the truth about
            <br />
            where your money goes.
          </p>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Upload your bank statement. Get a{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              brutally honest breakdown
            </span>{' '}
            of your spending — needs vs wants vs leaks. No sugar‑coating. No judgement. Just facts.
          </p>
        </div>

        {/* Stats Strip */}
        <div
          className="card animate-fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            textAlign: 'center',
            gap: '8px',
            padding: '20px 16px',
            animationDelay: '0.1s',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--danger)',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            >
              67%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              underestimate
              <br />
              their spending
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--warning)',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            >
              ₹12k
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              avg hidden leaks
              <br />
              per month
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--accent)',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            >
              2 min
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              to see
              <br />
              the truth
            </div>
          </div>
        </div>

        {/* How it works */}
        <div
          className="animate-fade-up"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animationDelay: '0.2s',
          }}
        >
          <h2
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0,
            }}
          >
            How it works
          </h2>

          {[
            { step: '01', text: 'Answer 5 quick questions about your money habits' },
            { step: '02', text: 'Upload your HDFC bank statement (PDF)' },
            { step: '03', text: 'See exactly where every rupee went' },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontFamily: 'Space Grotesk, sans-serif',
                  minWidth: '24px',
                  paddingTop: '2px',
                }}
              >
                {item.step}
              </span>
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="animate-fade-up"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            animationDelay: '0.3s',
          }}
        >
          <Link href="/login" style={{ textDecoration: 'none', width: '100%' }}>
            <button id="get-started-cta" className="btn-primary">
              Show Me The Truth →
            </button>
          </Link>
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            🔒 Your data never leaves your browser until you upload.
            <br />
            PDFs are deleted immediately after processing.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            borderTop: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Inspired by Ankur Warikoo&apos;s Money Matters series.
            <br />
            Built for Gen Z Indians.
          </p>
        </div>
      </div>
    </main>
  );
}
