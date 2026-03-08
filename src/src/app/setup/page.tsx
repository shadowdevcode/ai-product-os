"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [frequency, setFrequency] = useState("3x_day");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const frequencies = [
        { value: "2h", label: "Every 2h", desc: "12 digests/day" },
        { value: "3x_day", label: "3× / day", desc: "Morning, noon, evening" },
        { value: "daily", label: "Daily", desc: "One morning digest" },
    ];

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, frequency }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            // Trigger test digest in background
            fetch("/api/digest/test", { method: "POST" }).catch(() => { });

            router.push("/confirmation");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page page-centered" style={{ gap: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                <div style={{ fontSize: "48px" }}>📱</div>
                <h2>Set up your digest</h2>
                <p className="subtitle" style={{ fontSize: "1rem" }}>
                    Tell us where to send your email summaries and how often.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="card"
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: "28px" }}
            >
                {/* WhatsApp Number */}
                <div className="form-group">
                    <label className="form-label" htmlFor="phone">
                        WhatsApp Number
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        className="form-input"
                        placeholder="+1 (415) 555-1234"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                    />
                    <span className="form-hint">
                        Include country code. We&apos;ll send a test message to verify.
                    </span>
                </div>

                {/* Frequency */}
                <div className="form-group">
                    <label className="form-label">Digest Frequency</label>
                    <div className="freq-group">
                        {frequencies.map((f) => (
                            <label
                                key={f.value}
                                className={`freq-option ${frequency === f.value ? "active" : ""}`}
                            >
                                <input
                                    type="radio"
                                    name="frequency"
                                    value={f.value}
                                    checked={frequency === f.value}
                                    onChange={() => setFrequency(f.value)}
                                />
                                <span className="freq-label">{f.label}</span>
                                <span className="freq-desc">{f.desc}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ color: "var(--error)", fontSize: "0.9rem", textAlign: "center" }}>
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !phone}
                    style={{ width: "100%" }}
                    id="btn-setup-submit"
                >
                    {loading ? <span className="spinner" /> : null}
                    {loading ? "Setting up…" : "Start Receiving Digests"}
                </button>
            </form>
        </div>
    );
}
