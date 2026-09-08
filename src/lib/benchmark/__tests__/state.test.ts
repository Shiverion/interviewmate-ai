/** @jest-environment node */
import {
  CRITERIA,
  validateDraft,
  type ReviewDraft as Draft,
} from "../../review-brief/contract";
import { loadCases } from "../dataset";
import {
  createStudy,
  restoreStudy,
  summarize,
  canReveal,
  isReviewed,
  comparisonRows,
} from "../state";
import { emptyJudgments, STUDY_VERSION, type Attempt } from "../types";

const { cases, datasetHash } = loadCases();

test("ranking requires matched coverage and fully resolved review; ties share rank", () => {
  const a = attempt(),
    b = attempt("C01", "gemini");
  for (const sample of [a, b])
    for (const id of CRITERIA) sample.judgments[id].verdict = "acceptable";
  expect(
    comparisonRows(studyWith(a, b), cases).map((r) => r.observedRank)
  ).toEqual([1, 1]);
  b.judgments.R1 = {
    verdict: "needs_correction",
    issues: ["unsupported_claim"],
  };
  expect(
    comparisonRows(studyWith(a, b), cases).map((r) => r.observedRank)
  ).toEqual([1, 2]);
  b.judgments.R1.verdict = "uncertain";
  expect(
    comparisonRows(studyWith(a, b), cases).every((r) => r.observedRank === null)
  ).toBe(true);
});
test("unequal case coverage is never ranked", () => {
  const a = attempt(),
    b = attempt("C01", "gemini"),
    extra = attempt("C02", "gemini");
  for (const sample of [a, b, extra])
    for (const id of CRITERIA) sample.judgments[id].verdict = "acceptable";
  expect(
    comparisonRows(studyWith(a, b, extra), cases).every(
      (r) => r.observedRank === null
    )
  ).toBe(true);
});
function attempt(
  caseId = "C01",
  providerId: "openai" | "gemini" = "openai"
): Attempt {
  const c = cases.find((c) => c.id === caseId)!;
  const draft: Draft = {
    schemaVersion: "review-brief-v1",
    criteria: Object.fromEntries(
      CRITERIA.map((id) => [
        id,
        {
          status: c.reference.criteria[id].expectedStatus,
          claims: c.reference.criteria[id].support.map((s) => ({
            text: "Authored test-only claim.",
            citations: [s],
          })),
          limitation: "Not independently verified.",
          followUp: "What would you check next?",
        },
      ])
    ) as Draft["criteria"],
  };
  return {
    id: caseId + "-" + providerId,
    alias: "Output 1",
    caseId,
    judgments: emptyJudgments(),
    response: {
      studyVersion: STUDY_VERSION,
      datasetHash,
      caseId,
      language: c.language,
      inputHash: c.inputHash,
      referenceHash: c.referenceHash,
      configurationHash: "d".repeat(64),
      providerId,
      modelRequested: "test-only",
      result: {
        ok: true,
        draft,
        warnings: [],
        generation: {
          sourceType: "live_model",
          generationId: "test-only",
          generatedAtUtc: "2026-09-08T00:00:00.000Z",
          contractVersion: "review-brief-v1",
          contractHash: "a".repeat(64),
          roleVersion: "frontend-review-v1",
          roleHash: "b".repeat(64),
          promptVersion: "review-brief-v1",
          promptHash: "c".repeat(64),
          modelRequested: "test-only",
          modelReturned: "test-only",
          inputHash: c.inputHash,
          latencyMs: 100,
          usage: null,
        },
      },
    },
  };
}
function studyWith(...attempts: Attempt[]) {
  const s = createStudy(datasetHash);
  s.reviewer = "reviewer-1";
  s.attempts = attempts;
  for (const a of attempts)
    s.referenceApprovals[a.caseId] = {
      reviewer: s.reviewer,
      referenceHash: a.response.referenceHash,
      reviewedAt: "2026-09-08T00:00:00.000Z",
    };
  return s;
}
test("English stays primary: 8 original bases, 2 variants, 3 separate Indonesian adaptations", () => {
  expect(
    cases.filter((c) => c.language === "en" && c.kind === "base")
  ).toHaveLength(8);
  expect(cases.filter((c) => c.kind === "variant")).toHaveLength(2);
  expect(cases.filter((c) => c.language === "id")).toHaveLength(3);
  for (const c of cases.filter((c) => c.language === "id")) {
    expect(c.pairedWith).toBeTruthy();
    const en = cases.find((x) => x.id === c.pairedWith)!;
    expect(c.input.turns.map((t) => t.speaker)).toEqual(
      en.input.turns.map((t) => t.speaker)
    );
    for (const id of CRITERIA) {
      expect(c.reference.criteria[id].expectedStatus).toBe(
        en.reference.criteria[id].expectedStatus
      );
      for (const s of c.reference.criteria[id].support) {
        const t = c.input.turns.find((t) => t.id === s.turnId)!;
        expect(t.speaker).toBe("candidate");
        expect(t.text).toContain(s.quote);
      }
    }
  }
});
test("same model never pools English, variants, or Indonesian", () => {
  const rows = summarize(
    studyWith(attempt(), attempt("C01-NAME"), attempt("ID-C01")),
    cases
  );
  expect(rows).toHaveLength(3);
  expect(rows.map((r) => r.kind).sort()).toEqual([
    "adaptation",
    "base",
    "variant",
  ]);
});
test("failure is an attempt, not a zero-quality draft or a missing row", () => {
  const a = attempt();
  a.response.result = {
    ok: false,
    attemptId: "mock",
    error: {
      code: "AI_UNAVAILABLE",
      message: "mock failure",
      retryable: true,
      issues: [],
    },
  };
  const [row] = summarize(studyWith(a), cases);
  expect(row).toMatchObject({
    attempts: 1,
    valid: 0,
    failures: 1,
    statusCells: 0,
    acceptanceRate: null,
    statusAgreement: null,
  });
});
test("unreviewed and uncertain criteria are not silently counted as correct or wrong", () => {
  const a = attempt();
  a.judgments.R1.verdict = "acceptable";
  a.judgments.R2.verdict = "uncertain";
  a.judgments.R3 = {
    verdict: "needs_correction",
    issues: ["unsupported_claim"],
  };
  expect(summarize(studyWith(a), cases)[0]).toMatchObject({
    judgments: 2,
    acceptable: 1,
    uncertain: 1,
    acceptanceRate: 0.5,
  });
});
test("model configuration changes remain separate", () => {
  const a = attempt(),
    b = attempt();
  b.id = "second";
  b.response.configurationHash = "e".repeat(64);
  expect(summarize(studyWith(a, b), cases)).toHaveLength(2);
});
test("reveal requires all valid outputs reviewed, including reasons for corrections", () => {
  const a = attempt();
  expect(canReveal(studyWith(a))).toBe(false);
  for (const id of CRITERIA) a.judgments[id].verdict = "acceptable";
  a.judgments.R4.verdict = "needs_correction";
  expect(isReviewed(a)).toBe(false);
  a.judgments.R4.issues = ["wrong_status"];
  expect(canReveal(studyWith(a))).toBe(true);
});
test("repeated runs retain attempt counts and exact per-case coverage", () => {
  const a = attempt(),
    b = attempt();
  b.id = "repeat";
  expect(summarize(studyWith(a, b), cases)[0].coverage).toEqual({ C01: 2 });
});
test("exports restore review progress without requiring provider credentials", () => {
  const s = studyWith(attempt());
  expect(
    restoreStudy(JSON.parse(JSON.stringify(s)), cases, datasetHash)
  ).toEqual(s);
});
test("imports reject dataset drift, duplicate attempts, and a stale reference approval", () => {
  const s = studyWith(attempt());
  expect(() => restoreStudy(s, cases, "f".repeat(64))).toThrow();
  expect(() =>
    restoreStudy(
      { ...s, attempts: [...s.attempts, ...s.attempts] },
      cases,
      datasetHash
    )
  ).toThrow();
  s.referenceApprovals.C01.referenceHash = "f".repeat(64);
  expect(() => restoreStudy(s, cases, datasetHash)).toThrow();
});
test("imports reject invented quotes even in a structurally valid envelope", () => {
  const a = attempt();
  if (!a.response.result.ok) throw Error();
  expect(validateDraft(cases[0].input, a.response.result.draft).ok).toBe(true);
  a.response.result.draft.criteria.R1.claims[0].citations[0].quote =
    "Invented quote";
  expect(() => restoreStudy(studyWith(a), cases, datasetHash)).toThrow();
});
test("imports reject false reveal state and mismatched input provenance", () => {
  const s = studyWith(attempt());
  expect(() =>
    restoreStudy({ ...s, revealed: true }, cases, datasetHash)
  ).toThrow();
  s.attempts[0].response.inputHash = "f".repeat(64);
  expect(() => restoreStudy(s, cases, datasetHash)).toThrow();
});
