"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import InterviewSetupForm from "@/components/interview/InterviewSetupForm";
import ProviderDiagnostics from "@/components/providers/ProviderDiagnostics";
import ReviewerSessions from "@/components/interview/ReviewerSessions";
type Access = {
  mode: string;
  reviewer?: {
    label: string;
    expiresAt: number;
    dailyStarts: number;
    budgetUnits: number;
  };
};
export default function ReviewerPage() {
  const [access, setAccess] = useState<Access | null>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = () =>
    fetch("/api/access/reviewer")
      .then((r) => r.json())
      .then(setAccess)
      .catch(() => setError("Could not check reviewer access."));
  useEffect(() => {
    void refresh();
  }, []);
  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/access/reviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setCode("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invitation unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wm-page max-w-5xl">
      <p className="wm-eyebrow">Private reviewer access</p>
      <h1 className="wm-heading">Explore the complete workflow</h1>
      {access?.mode !== "reviewer" ? (
        <form onSubmit={redeem} className="wm-panel max-w-xl mt-6">
          <p className="wm-subtitle mb-5">
            Your invitation unlocks extended voice interviews, Evaluation
            Sandbox, Human Review and diagnostics. The server checks expiration,
            revocation and usage budgets.
          </p>
          <label className="wm-field">
            Invitation code
            <input
              type="password"
              autoComplete="off"
              value={code}
              maxLength={200}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className="wm-button mt-5" disabled={busy || !code.trim()}>
            {busy ? "Checking…" : "Unlock Reviewer Mode"}
          </button>
          <p className="text-sm mt-5">
            <Link href="/demo">Try the normal demo without a code</Link>
          </p>
        </form>
      ) : (
        <>
          <div className="wm-note my-5">
            {access.reviewer?.label} · Expires{" "}
            {new Date(access.reviewer!.expiresAt).toLocaleString()} · Up to{" "}
            {access.reviewer?.dailyStarts} starts/day. Budget:{" "}
            {access.reviewer?.budgetUnits} units (voice reserves one
            unit/minute; assessments reserve up to three). Unlimited interview
            timers have a 30-minute hosted funding window.
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/review-brief/evaluation" className="wm-button">
              Evaluation Sandbox
            </Link>
            <Link href="/review-brief" className="wm-button secondary">
              Human Review · Synthetic Evaluation
            </Link>
            <Link href="/dashboard" className="wm-button secondary">
              Recruiter workspace
            </Link>
            <button
              className="wm-button secondary"
              onClick={async () => {
                await fetch("/api/access/reviewer", { method: "DELETE" });
                await refresh();
              }}
            >
              Leave Reviewer Mode
            </button>
          </div>
          <ProviderDiagnostics />
          <ReviewerSessions />
          <section className="wm-panel">
            <h2 className="text-2xl mb-5">Start a reviewer interview</h2>
            <p className="wm-subtitle mb-5">
              Use fictional candidate details. This uses the host’s credentials;
              you do not need an API key.
            </p>
            <InterviewSetupForm mode="reviewer" />
          </section>
        </>
      )}
      {error && (
        <p role="alert" className="wm-note mt-4">
          {error}
        </p>
      )}
    </div>
  );
}
