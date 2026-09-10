"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import InterviewSetupForm from "@/components/interview/InterviewSetupForm";
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
      <h1 className="wm-heading">Complete your invited interview</h1>
      {access?.mode !== "reviewer" ? (
        <form onSubmit={redeem} className="wm-panel max-w-xl mt-6">
          <p className="wm-subtitle mb-5">
            Your administrator created this private invitation. Enter the code
            to set up one interview journey; the host provides the AI service so
            you do not need to configure an API key.
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
          <section className="wm-panel">
            <p className="wm-eyebrow">Invitation interview</p>
            <h2 className="text-2xl mb-5">Set up your interview</h2>
            <p className="wm-subtitle mb-5">
              This invitation starts at interview setup. Add your role details,
              language, voice, transcription, rubric and optional CV, then use
              the voice-and-text answer composer during the interview. The
              host’s server credentials power the interview and evaluation.
            </p>
            <InterviewSetupForm mode="reviewer" />
          </section>
          <p className="text-sm text-[var(--muted)] mt-5">
            After the interview, your evidence-based evaluation is shown once
            and the result is sent to the administrator’s dashboard. This path
            has no recruiter dashboard, sandbox or human-review controls.
          </p>
          <button
            className="wm-button secondary mt-4"
            onClick={async () => {
              await fetch("/api/access/reviewer", { method: "DELETE" });
              await refresh();
            }}
          >
            Leave invitation
          </button>
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
