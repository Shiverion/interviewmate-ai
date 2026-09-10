"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import InterviewSetupForm from "./InterviewSetupForm";
export default function ReviewerSessions() {
  const [sessions, setSessions] = useState<
      Array<{ id: string; candidateName: string; status: string }>
    >([]),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  function refresh() {
    fetch("/api/reviewer/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => setError("Could not load reviewer sessions."));
  }
  useEffect(refresh, []);
  return (
    <section className="wm-panel my-6">
      <h2 className="text-xl mb-3">Scheduled reviewer sessions</h2>
      <p className="text-sm text-[var(--muted)] mb-3">
        Synthetic tests, excluded from production candidate statistics. Links
        require the reviewer invitation in the testing browser.
      </p>
      <button className="wm-button secondary" onClick={() => setOpen(!open)}>
        {open ? "Close setup" : "Schedule a reviewer session"}
      </button>
      {open && (
        <div className="mt-5">
          <InterviewSetupForm
            mode="reviewer-scheduled"
            onSuccess={() => {
              setOpen(false);
              refresh();
            }}
          />
        </div>
      )}
      {sessions.map((s) => (
        <div
          className="flex gap-4 py-4 border-b border-[var(--border)]"
          key={s.id}
        >
          <span>
            {s.candidateName} · {s.status}
          </span>
          <Link href={`/apply/${s.id}`}>Open candidate link</Link>
          <Link href={`/reviewer/session/${s.id}`}>View evidence</Link>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
