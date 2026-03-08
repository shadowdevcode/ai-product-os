'use client';

import Link from "next/link";
import { useEffect } from "react";
import posthog from "posthog-js";

export default function LandingPage() {
  useEffect(() => {
    posthog.capture("landing_page_view", { source: "direct", campaign: "none" });
  }, []);

  const handleSignupStart = () => {
    posthog.capture("signup_started");
  };

  return (
    <div className="page page-centered" style={{ gap: "40px" }}>
      {/* Hero */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "8px" }}>📬</div>
        <h1>
          Never miss an
          <br />
          <span className="gradient-text">important email</span>
        </h1>
        <p className="subtitle" style={{ margin: "0 auto" }}>
          AI-summarized email digests delivered straight to your WhatsApp.
          Stay on top of your inbox without ever opening it.
        </p>
      </div>

      {/* Privacy Badge */}
      <div className="privacy-badge">
        🔒 Read-only access · Your data stays private
      </div>

      {/* CTA */}
      <Link href="/api/auth/google" className="btn btn-google" id="cta-connect-gmail" onClick={handleSignupStart}>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Connect Gmail &amp; Get Started
      </Link>

      {/* Feature Pills */}
      <div className="features">
        <div className="feature-pill">🤖 AI Summaries</div>
        <div className="feature-pill">🔴🟡🟢 Priority Tags</div>
        <div className="feature-pill">📱 WhatsApp Delivery</div>
        <div className="feature-pill">⏰ Custom Schedule</div>
      </div>

      {/* How it works */}
      <div className="card" style={{ width: "100%", marginTop: "20px" }}>
        <h3 style={{ marginBottom: "20px", textAlign: "center" }}>How it works</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { step: "1", icon: "🔗", text: "Connect your Gmail (read-only)" },
            { step: "2", icon: "📱", text: "Add your WhatsApp number" },
            { step: "3", icon: "⏰", text: "Choose your digest schedule" },
            { step: "4", icon: "✨", text: "Receive AI-prioritized summaries" },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--accent-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  flexShrink: 0,
                }}
              >
                {item.step}
              </div>
              <span style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
                {item.icon} {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "20px" }}>
        Powered by InboxPulse · Built with Gmail API, Gemini AI &amp; Twilio
      </p>
    </div>
  );
}
