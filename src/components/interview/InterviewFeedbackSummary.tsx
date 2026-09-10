import type { InterviewFeedback } from "./InterviewFeedbackForm";

const metrics: Array<{ key: keyof Omit<InterviewFeedback, "comments">; label: string }> = [
  { key: "overall_experience", label: "Overall experience" },
  { key: "interviewer_clarity", label: "Interviewer clarity" },
  { key: "transcription_accuracy", label: "Transcript accuracy" },
  { key: "question_relevance", label: "Question relevance" },
  { key: "technical_reliability", label: "Technical reliability" },
];

export default function InterviewFeedbackSummary({
  value,
}: {
  value?: Partial<InterviewFeedback> & { submitted_at?: unknown };
}) {
  if (!value) return null;
  return (
    <section className="wm-panel space-y-4" aria-label="Candidate interview feedback">
      <div>
        <p className="wm-eyebrow">Candidate feedback</p>
        <h2 className="mt-1 text-xl font-semibold">Session experience metrics</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Product feedback is separate from the candidate assessment and is used to improve future sessions.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-xl font-semibold text-primary-300">
              {typeof value[key] === "number" ? `${value[key]}/5` : "—"}
            </p>
          </div>
        ))}
      </div>
      {value.comments && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Additional comments</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{value.comments}</p>
        </div>
      )}
    </section>
  );
}
