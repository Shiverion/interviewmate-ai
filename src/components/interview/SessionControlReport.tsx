import { checkpointSchema } from "@/lib/integrity/session-control";
export default function SessionControlReport({ value }: { value: unknown }) {
  const parsed = checkpointSchema.safeParse(value);
  if (!parsed.success) return null;
  const r = parsed.data;
  return (
    <section
      className="glass-card p-5 mb-6 space-y-3"
      aria-label="Session recovery review"
    >
      <h2 className="text-xl font-semibold">Session pauses and recovery</h2>
      <p>
        Status: {r.phase.replaceAll("_", " ")} · Page interruptions:{" "}
        {r.interruptions} · Technical recoveries: {r.recoveries}
      </p>
      <p>
        Time remaining: {Math.ceil(r.remainingMs / 1000)}s · Replacement
        questions: {r.replacementIndex}
      </p>
      <p>
        Client-reported record. An ended session is not an automatic rejection.
        Review context and technical issues with the candidate.
      </p>
      <details>
        <summary>Session events and retired questions</summary>
        <ul>
          {r.events.map((e, i) => (
            <li key={i}>{e.type.replaceAll("_", " ")}</li>
          ))}
        </ul>
        <p>
          Retired material is preserved here and excluded from automatic
          evaluation inputs.
        </p>
        {r.retired.map((e, i) => (
          <blockquote key={i} className="border-l pl-3 my-3">
            {e.lines.map((l, j) => (
              <p key={j}>
                {l.role}: {l.text}
              </p>
            ))}
          </blockquote>
        ))}
      </details>
    </section>
  );
}
