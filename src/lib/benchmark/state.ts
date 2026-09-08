import { CRITERIA, validateDraft } from "../review-brief/contract";
import {
  STUDY_VERSION,
  studySchema,
  type Study,
  type Attempt,
  type BenchmarkCase,
} from "./types";

export const createStudy = (datasetHash: string): Study => ({
  version: STUDY_VERSION,
  datasetHash,
  reviewer: "",
  referenceApprovals: {},
  attempts: [],
  revealed: false,
});
export function isReviewed(attempt: Attempt) {
  return (
    !attempt.response.result.ok ||
    CRITERIA.every((id) => {
      const j = attempt.judgments[id];
      return (
        j.verdict !== "unreviewed" &&
        (j.verdict !== "needs_correction" || j.issues.length > 0)
      );
    })
  );
}
export function canReveal(study: Study) {
  return study.attempts.length > 0 && study.attempts.every(isReviewed);
}
export function restoreStudy(
  value: unknown,
  cases: BenchmarkCase[],
  datasetHash: string
): Study {
  const study = studySchema.parse(value);
  if (study.datasetHash !== datasetHash)
    throw new Error(
      "Dataset changed. Keep the old export as a separate study."
    );
  if (new Set(study.attempts.map((a) => a.id)).size !== study.attempts.length)
    throw new Error("Duplicate attempts in export.");
  for (const [id, approval] of Object.entries(study.referenceApprovals)) {
    const c = cases.find((item) => item.id === id);
    if (
      !c ||
      approval.referenceHash !== c.referenceHash ||
      approval.reviewer !== study.reviewer.trim()
    )
      throw new Error("Reference approval does not match this study.");
  }
  for (const a of study.attempts) {
    const c = cases.find((item) => item.id === a.caseId);
    const r = a.response;
    if (
      !c ||
      r.caseId !== c.id ||
      r.datasetHash !== datasetHash ||
      r.language !== c.language ||
      r.inputHash !== c.inputHash ||
      r.referenceHash !== c.referenceHash ||
      !study.referenceApprovals[c.id]
    )
      throw new Error("Attempt provenance does not match its case.");
    if (
      r.result.ok &&
      (r.result.generation.inputHash !== c.inputHash ||
        r.result.generation.modelRequested !== r.modelRequested ||
        !validateDraft(c.input, r.result.draft).ok)
    )
      throw new Error("Export contains an invalid draft.");
  }
  if (study.revealed && !canReveal(study))
    throw new Error("Complete review before revealing models.");
  return study;
}
export function summarize(study: Study, cases: BenchmarkCase[]) {
  const groups = new Map<
    string,
    {
      key: string;
      provider: string;
      model: string;
      language: string;
      kind: string;
      attempts: number;
      valid: number;
      failures: number;
      reviewed: number;
      acceptable: number;
      uncertain: number;
      judgments: number;
      agreement: number;
      statusCells: number;
      latency: number[];
      cases: Set<string>;
      coverage: Map<string, number>;
    }
  >();
  for (const a of study.attempts) {
    const c = cases.find((item) => item.id === a.caseId)!;
    const r = a.response;
    const key = [
      r.providerId,
      r.modelRequested,
      r.configurationHash,
      c.language,
      c.kind,
    ].join("/");
    const row = groups.get(key) ?? {
      key,
      provider: r.providerId,
      model: r.modelRequested,
      language: c.language,
      kind: c.kind,
      attempts: 0,
      valid: 0,
      failures: 0,
      reviewed: 0,
      acceptable: 0,
      uncertain: 0,
      judgments: 0,
      agreement: 0,
      statusCells: 0,
      latency: [],
      cases: new Set<string>(),
      coverage: new Map<string, number>(),
    };
    row.attempts++;
    row.cases.add(c.id);
    row.coverage.set(c.id, (row.coverage.get(c.id) ?? 0) + 1);
    if (r.result.ok) {
      row.valid++;
      if (r.result.generation.latencyMs !== null)
        row.latency.push(r.result.generation.latencyMs);
      if (isReviewed(a)) row.reviewed++;
      for (const id of CRITERIA) {
        row.statusCells++;
        if (
          r.result.draft.criteria[id].status ===
          c.reference.criteria[id].expectedStatus
        )
          row.agreement++;
        const j = a.judgments[id];
        if (j.verdict === "uncertain") row.uncertain++;
        else if (j.verdict !== "unreviewed") {
          row.judgments++;
          if (j.verdict === "acceptable") row.acceptable++;
        }
      }
    } else row.failures++;
    groups.set(key, row);
  }
  // No single winner: unequal coverage, failures, and uncertainty must remain visible.
  return [...groups.values()].map((row) => ({
    ...row,
    cases: [...row.cases].sort(),
    coverage: Object.fromEntries(row.coverage),
    acceptanceRate: row.judgments ? row.acceptable / row.judgments : null,
    statusAgreement: row.statusCells ? row.agreement / row.statusCells : null,
  }));
}
export function comparisonRows(study: Study, cases: BenchmarkCase[]) {
  const rows = summarize(study, cases);
  return rows
    .map((row) => {
      const peers = rows.filter(
        (p) => p.language === row.language && p.kind === row.kind
      );
      const coverage = (p: typeof row) =>
        JSON.stringify(
          Object.entries(p.coverage).sort(([a], [b]) => a.localeCompare(b))
        );
      const comparable =
        peers.length >= 2 &&
        peers.every(
          (p) =>
            p.failures === 0 &&
            p.valid > 0 &&
            p.reviewed === p.valid &&
            p.uncertain === 0 &&
            coverage(p) === coverage(row)
        );
      return {
        ...row,
        observedRank: comparable
          ? 1 +
            peers.filter((p) => p.acceptanceRate! > row.acceptanceRate!).length
          : null,
      };
    })
    .sort((a, b) => {
      const track = (r: typeof a) =>
        r.language === "en" ? (r.kind === "base" ? 0 : 1) : 2;
      return (
        track(a) - track(b) ||
        (a.observedRank ?? 999) - (b.observedRank ?? 999) ||
        a.provider.localeCompare(b.provider)
      );
    });
}
