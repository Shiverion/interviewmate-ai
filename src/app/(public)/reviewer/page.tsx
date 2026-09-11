"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import InterviewSetupForm from "@/components/interview/InterviewSetupForm";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { checkpointKey } from "@/lib/integrity/control-store";

/** A resumable in-progress interview for this browser, if any: an existing
 * reviewer-sourced session whose recovery checkpoint hasn't reached "setup"
 * (never actually connected) or "ended"/"completed" (already finished). */
function resumableReviewerSession(): string | null {
  if (typeof window === "undefined") return null;
  const ctx = useInterviewStore.getState()._sessionContext;
  if (!ctx || ctx.accessMode !== "reviewer") return null;
  try {
    const raw = localStorage.getItem(checkpointKey(ctx.sessionId));
    if (!raw) return null;
    const phase = JSON.parse(raw)?.phase;
    if (["setup", "ended", "completed"].includes(phase)) return null;
    return ctx.sessionId;
  } catch {
    return null;
  }
}
type Access = {
  mode: string;
  reviewer?: {
    id: string;
    label: string;
    expiresAt: number;
    dailyStarts: number;
    budgetUnits: number;
  };
};
export default function ReviewerPage() {
  const { user, loading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const [resumableSessionId, setResumableSessionId] = useState<string | null>(
    null
  );
  useEffect(() => {
    setResumableSessionId(resumableReviewerSession());
  }, []);
  const [access, setAccess] = useState<Access | null>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const autoAttempted = useRef(false);
  const refresh = () =>
    fetch("/api/access/reviewer")
      .then((r) => r.json())
      .then(setAccess)
      .catch(() => setError("Could not check reviewer access."));
  useEffect(() => {
    void refresh();
  }, []);
  async function redeem(codeToRedeem: string) {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const r = await fetch("/api/access/reviewer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: codeToRedeem }),
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
  const codeFromLink =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("code")
      : null;
  useEffect(() => {
    if (
      user &&
      codeFromLink &&
      access?.mode !== "reviewer" &&
      !busy &&
      !autoAttempted.current
    ) {
      autoAttempted.current = true;
      void redeem(codeFromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, codeFromLink, access?.mode]);
  if (!user)
    return (
      <div className="wm-page max-w-lg">
        <p className="wm-eyebrow">Private reviewer access</p>
        <h1 className="wm-heading">Sign in to continue</h1>
        <p className="wm-subtitle mb-5">
          Redeeming an invitation requires a Google sign-in so your result can
          be attributed to you and shown back to you afterward.
        </p>
        {!loading && (
          <Link
            className="wm-button"
            href={`/login?returnUrl=${encodeURIComponent(
              pathname + (typeof window === "undefined" ? "" : window.location.search)
            )}`}
          >
            Sign in to continue
          </Link>
        )}
      </div>
    );
  return (
    <div className="wm-page max-w-5xl">
      <p className="wm-eyebrow">Private reviewer access</p>
      <h1 className="wm-heading">Complete your invited interview</h1>
      {access?.mode !== "reviewer" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void redeem(code);
          }}
          className="wm-panel max-w-xl mt-6"
        >
          <p className="wm-subtitle mb-5">
            {codeFromLink
              ? "Unlocking your invitation link…"
              : "Your administrator created this private invitation. Enter the code to set up one interview journey; the host provides the AI service so you do not need to configure an API key."}
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
          {resumableSessionId ? (
            <section className="wm-panel">
              <p className="wm-eyebrow">Interview in progress</p>
              <h2 className="text-2xl mb-5">Continue your interview</h2>
              <p className="wm-subtitle mb-5">
                You already started this interview — a network drop or a
                refresh doesn’t lose your progress. Continue picks up right
                where you left off instead of setting up a new one.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="wm-button"
                  onClick={() => router.push("/interview")}
                >
                  Continue your interview
                </button>
                <button
                  className="wm-button quiet"
                  onClick={() => setResumableSessionId(null)}
                >
                  Start a different interview instead
                </button>
              </div>
            </section>
          ) : (
            <section className="wm-panel">
              <p className="wm-eyebrow">Invitation interview</p>
              <h2 className="text-2xl mb-5">Set up your interview</h2>
              <p className="wm-subtitle mb-5">
                This invitation starts at interview setup. Add your role
                details, language, voice, transcription, rubric and optional
                CV, then use the voice-and-text answer composer during the
                interview. The host’s server credentials power the interview
                and evaluation.
              </p>
              <InterviewSetupForm
                mode="reviewer"
                invitationId={access.reviewer?.id}
              />
            </section>
          )}
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
