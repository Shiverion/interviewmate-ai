"use client";
import { useEffect, useState } from "react";
import type { EvidenceAssessment } from "@/lib/ai/evidence";
type Source = {
  sessionId?: string;
  fixtureId?: string;
  transcriptVersion: string;
  model: string;
  provider: string;
  synthetic: boolean;
};
export default function HumanReviewPanel({
  assessment,
  transcript,
  source,
}: {
  assessment: EvidenceAssessment;
  transcript: unknown;
  source: Source;
}) {
  const [checks, setChecks] = useState<Record<string, string>>({}),
    [reviewer, setReviewer] = useState(""),
    [notes, setNotes] = useState(""),
    [record, setRecord] = useState<unknown>(null),
    [message, setMessage] = useState("");
  const identity = JSON.stringify({ transcript, source, assessment });
  const [loadedIdentity, setLoadedIdentity] = useState("");
  const storageKey =
    "interviewmate-human-draft-" + (source.sessionId || source.fixtureId);
  useEffect(() => {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      /* Storage is optional until submit. */
    }
    const matches = saved?.identity === identity;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a source-specific persisted form.
    setChecks(matches ? saved.checks : {});
    setReviewer(matches ? saved.reviewer : "");
    setNotes(matches ? saved.notes : "");
    setRecord(matches ? saved.record : null);
    setMessage(
      matches && saved.record
        ? "Completed review restored. Export it or explicitly start a new review."
        : ""
    );
    setLoadedIdentity(identity);
  }, [identity, storageKey]);
  useEffect(() => {
    if (loadedIdentity !== identity) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ identity, checks, reviewer, notes, record })
      );
    } catch {
      /* Submission reports storage failures. */
    }
  }, [identity, loadedIdentity, storageKey, checks, reviewer, notes, record]);
  async function submit() {
    try {
      const input = JSON.stringify({ transcript, source, assessment });
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(input)
      );
      const hash = Array.from(new Uint8Array(digest), (v) =>
        v.toString(16).padStart(2, "0")
      ).join("");
      const result = {
        version: "human-ground-truth-v2",
        source,
        sourceHash: hash,
        rubricVersion: assessment.schemaVersion,
        evaluation: assessment,
        transcript,
        reviewerId: reviewer.trim(),
        criteriaJudgments: checks,
        notes,
        submittedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `interviewmate-ground-truth-${hash}-${Date.now()}`,
        JSON.stringify(result)
      );
      setRecord(result);
      setMessage(
        "Completed review saved in this browser. Export it for your evaluation dataset."
      );
      const access = await fetch("/api/access/reviewer")
        .then((r) => r.json())
        .catch(() => ({ mode: "offline" }));
      if (access.mode === "reviewer") {
        const response = await fetch("/api/reviewer/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
        setMessage(
          response.ok
            ? "Completed review saved to reviewer storage and this browser."
            : "Saved in this browser. Server saving failed; export the record."
        );
      }
    } catch {
      setMessage(
        "Could not save this review. Check browser storage and retry."
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(record, null, 2)], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "human-review.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="wm-panel mt-6" aria-label="Human review">
      <p className="wm-eyebrow">
        Human Review ·{" "}
        {source.synthetic ? "Synthetic Evaluation" : "Candidate session"}
      </p>
      <h2 className="text-xl my-3">
        Check the evidence against the assessment
      </h2>
      <p className="text-xs mb-4">
        Source: {source.sessionId || source.fixtureId} ·{" "}
        {source.transcriptVersion} · {source.model}
      </p>
      <fieldset disabled={!!record} className="space-y-4">
        {assessment.competencies.map((c) => (
          <label className="wm-field" key={c.id}>
            {c.label}
            <select
              aria-label={`${c.label} judgment`}
              value={checks[c.id] || ""}
              onChange={(e) => setChecks({ ...checks, [c.id]: e.target.value })}
            >
              <option value="">Select a judgment</option>
              <option value="supported">Supported by evidence</option>
              <option value="overstated">Overstated or unsupported</option>
              <option value="understated">Relevant evidence missed</option>
              <option value="not_assessable">
                Cannot assess from this transcript
              </option>
            </select>
          </label>
        ))}
        <label className="wm-field">
          Reviewer ID
          <input
            aria-label="Human reviewer ID"
            maxLength={80}
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
          />
        </label>
        <label className="wm-field">
          Notes
          <textarea
            aria-label="Human review notes"
            maxLength={3000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          className="wm-button"
          disabled={
            !reviewer.trim() ||
            assessment.competencies.some((c) => !checks[c.id])
          }
          onClick={() => void submit()}
        >
          Submit human review
        </button>
      </fieldset>
      {message && (
        <p role="status" className="text-sm mt-4">
          {message}
        </p>
      )}
      {!!record && (
        <div className="flex gap-3 mt-4">
          <button className="wm-button secondary" onClick={download}>
            Export completed review
          </button>
          <button
            className="wm-button secondary"
            onClick={() => {
              setRecord(null);
              setChecks({});
              setNotes("");
              setMessage("");
            }}
          >
            Start a new review
          </button>
        </div>
      )}
    </section>
  );
}
