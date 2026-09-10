import type { EvidenceAssessment as Assessment } from "@/lib/ai/evidence";
export default function EvidenceAssessment({
  assessment,
}: {
  assessment: Assessment;
}) {
  const evidenceScore =
    typeof assessment.dimensions.evidenceScore === "number"
      ? assessment.dimensions.evidenceScore
      : assessment.dimensions.evidenceQuality !== null &&
          assessment.dimensions.competencyCoverage.total > 0
        ? Math.round(
            (assessment.dimensions.evidenceQuality / 4) *
              (assessment.dimensions.competencyCoverage.assessed /
                assessment.dimensions.competencyCoverage.total) *
              100
          )
        : null;
  return (
    <section
      className="text-left space-y-5"
      aria-label="Evidence-based assessment"
    >
      <div className="wm-note">
        <h2 className="text-xl font-medium">{assessment.status}</h2>
        <p className="text-sm mt-2">{assessment.feedback}</p>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Evidence score
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              A review aid based on the evidence supported by the interview.
            </p>
          </div>
          <strong className="text-3xl font-semibold">
            {evidenceScore === null
              ? "—"
              : `${evidenceScore}/100`}
          </strong>
        </div>
        {evidenceScore !== null && (
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--background)]"
            role="progressbar"
            aria-label="Evidence score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={evidenceScore}
          >
            <div
              className="h-full rounded-full bg-primary-500 transition-[width]"
              style={{ width: `${evidenceScore}%` }}
            />
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--muted)]">
          Each competency is scored from 0–4 and converted to a percentage.
          Missing evidence stays at 0, so the coverage count remains visible.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <p>
          Average evidence level:{" "}
          <strong>
            {assessment.dimensions.evidenceQuality ?? "Not assessed"}
          </strong>
          {assessment.dimensions.evidenceQuality !== null ? " / 4" : ""}
        </p>
        <p>
          Competency coverage:{" "}
          <strong>
            {assessment.dimensions.competencyCoverage.assessed} /{" "}
            {assessment.dimensions.competencyCoverage.total}
          </strong>
        </p>
        <p>
          Response relevance: {assessment.dimensions.responseRelevance.direct}{" "}
          directly relevant assessed competencies
        </p>
        <p>Consistency: {assessment.dimensions.consistency}</p>
        <p className="sm:col-span-2">
          Assessment confidence: {assessment.dimensions.assessmentConfidence}
        </p>
      </div>
      {assessment.competencies.map((c) => (
        <article key={c.id} className="wm-panel">
          <h3 className="font-medium">
            {c.label}{" "}
            <span className="wm-tag ml-2">
              {c.status} {c.level > 0 ? `· ${c.level}/4 · ${Math.round((c.level / 4) * 100)}%` : ""}
            </span>
          </h3>
          <p className="text-sm my-3">{c.rationale}</p>
          {c.quotes.map((q, i) => (
            <blockquote key={i} className="border-l-2 pl-3 my-2 text-sm">
              Turn {q.turn}: “{q.quote}”
            </blockquote>
          ))}
        </article>
      ))}
      <p className="text-xs text-[var(--muted)]">
        Completion is separate from evidence quality. Skipped, unreached and
        technical-failure answers do not lower assessed competency evidence.
        This is not a hiring decision.
      </p>
    </section>
  );
}
