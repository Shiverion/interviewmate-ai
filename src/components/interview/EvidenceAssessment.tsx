import type { EvidenceAssessment as Assessment } from "@/lib/ai/evidence";
export default function EvidenceAssessment({
  assessment,
}: {
  assessment: Assessment;
}) {
  return (
    <section
      className="text-left space-y-5"
      aria-label="Evidence-based assessment"
    >
      <div className="wm-note">
        <h2 className="text-xl font-medium">{assessment.status}</h2>
        <p className="text-sm mt-2">{assessment.feedback}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <p>
          Evidence quality:{" "}
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
              {c.status} {c.level > 0 ? `· ${c.level}/4` : ""}
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
