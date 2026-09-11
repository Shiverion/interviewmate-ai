import type { AtsScore } from "@/lib/firebase/interviews";
export type { AtsScore } from "@/lib/firebase/interviews";

function scoreColor(value: number) {
  if (value >= 75) return "text-emerald-400";
  if (value >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function AtsScoreSummary({ score }: { score?: AtsScore }) {
  if (!score) return null;
  const metrics = [
    ["Keyword match", score.keyword_match ?? 0],
    ["Skills coverage", score.skills_coverage ?? 0],
    ["Experience fit", score.experience_alignment ?? 0],
  ] as const;
  return (
    <section className="wm-panel space-y-4" aria-label="ATS screening score">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="wm-eyebrow">ATS screening snapshot</p>
          <h2 className="mt-1 text-xl font-semibold">Resume match</h2>
          {score.summary && (
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{score.summary}</p>
          )}
        </div>
        <strong className={`text-3xl font-semibold ${scoreColor(score.overall_match)}`}>
          {score.overall_match}%
        </strong>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className={`mt-1 text-xl font-semibold ${scoreColor(value)}`}>{value}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}
