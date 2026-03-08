"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Settings {
    email: string;
    phone: string;
    frequency: string;
    isActive: boolean;
    connected: boolean;
}

export default function SettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Editable fields
    const [phone, setPhone] = useState("");
    const [frequency, setFrequency] = useState("3x_day");

    const frequencies = [
        { value: "2h", label: "Every 2h", desc: "12 digests/day" },
        { value: "3x_day", label: "3× / day", desc: "Morning, noon, evening" },
        { value: "daily", label: "Daily", desc: "One morning digest" },
    ];

    // Fetch settings on mount
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/settings");
                if (res.status === 401) {
                    router.push("/");
                    return;
                }
                const data = await res.json();
                setSettings(data);
                setPhone(data.phone || "");
                setFrequency(data.frequency || "3x_day");
            } catch {
                showToast("Failed to load settings", "error");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [router]);

    function showToast(message: string, type: "success" | "error") {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, frequency }),
            });

            if (res.ok) {
                showToast("Settings saved!", "success");
                setSettings((prev) => prev ? { ...prev, phone, frequency } : null);
            } else {
                const data = await res.json();
                showToast(data.error || "Failed to save", "error");
            }
        } catch {
            showToast("Network error", "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleDisconnect() {
        if (!confirm("Are you sure? This will stop all digests and disconnect your Gmail.")) return;

        try {
            const res = await fetch("/api/settings/disconnect", { method: "DELETE" });
            if (res.ok) {
                router.push("/");
            } else {
                showToast("Failed to disconnect", "error");
            }
        } catch {
            showToast("Network error", "error");
        }
    }

    async function handleTestDigest() {
        showToast("Sending test digest…", "success");
        try {
            const res = await fetch("/api/digest/test", { method: "POST" });
            const data = await res.json();
            if (data.sent) {
                showToast(data.message || "Test digest sent!", "success");
            } else {
                showToast(data.error || "Failed to send", "error");
            }
        } catch {
            showToast("Network error", "error");
        }
    }

    if (loading) {
        return (
            <div className="page page-centered">
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            </div>
        );
    }

    return (
        <div className="page" style={{ gap: "24px", paddingTop: "60px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>⚙️ Settings</h2>
                <div className="status-active">
                    <span className="status-dot" />
                    {settings?.isActive ? "Active" : "Paused"}
                </div>
            </div>

            {/* Connected account */}
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
                <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Connected Gmail
                    </span>
                    <div style={{ fontWeight: 600, marginTop: "4px" }}>{settings?.email}</div>
                </div>
                <span style={{ color: "var(--success)", fontSize: "1.2rem" }}>✓</span>
            </div>

            {/* Settings Form */}
            <form onSubmit={handleSave} className="card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Phone */}
                <div className="form-group">
                    <label className="form-label" htmlFor="settings-phone">
                        WhatsApp Number
                    </label>
                    <input
                        id="settings-phone"
                        type="tel"
                        className="form-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                    />
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

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ width: "100%" }}
                    id="btn-save-settings"
                >
                    {saving ? <span className="spinner" /> : null}
                    {saving ? "Saving…" : "Save Changes"}
                </button>
            </form>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                    onClick={handleTestDigest}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    id="btn-test-digest"
                >
                    📨 Send Test Digest
                </button>
                <button
                    onClick={handleDisconnect}
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    id="btn-disconnect"
                >
                    🔌 Disconnect Gmail
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>{toast.message}</div>
            )}
        </div>
    );
}
