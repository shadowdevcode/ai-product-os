import Link from "next/link";

export default function ConfirmationPage() {
    return (
        <div className="page page-centered" style={{ gap: "32px" }}>
            {/* Success Animation */}
            <div className="confetti">
                <div className="success-icon">✓</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                <h2>You&apos;re all set! 🎉</h2>
                <p className="subtitle" style={{ fontSize: "1rem" }}>
                    Your first email digest is on its way to WhatsApp.
                    <br />
                    Sit back — we&apos;ll keep you posted.
                </p>
            </div>

            {/* What to expect card */}
            <div className="card" style={{ width: "100%" }}>
                <h3 style={{ marginBottom: "16px" }}>What happens next</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "20px", flexShrink: 0 }}>📨</span>
                        <div>
                            <strong style={{ fontSize: "0.95rem" }}>Test digest incoming</strong>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                We&apos;re sending your first digest right now — check WhatsApp in ~1 minute.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "20px", flexShrink: 0 }}>🤖</span>
                        <div>
                            <strong style={{ fontSize: "0.95rem" }}>AI-prioritized summaries</strong>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                Each digest labels emails as 🔴 Urgent, 🟡 Important, or 🟢 FYI.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "20px", flexShrink: 0 }}>⚙️</span>
                        <div>
                            <strong style={{ fontSize: "0.95rem" }}>Full control</strong>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                Change your schedule or disconnect anytime from settings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                <Link href="/settings" className="btn btn-secondary" id="link-settings">
                    ⚙️ Manage Settings
                </Link>
                <Link href="/" className="btn btn-secondary" id="link-home">
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}
