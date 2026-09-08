import { z } from "zod";
import {
  draftSchema,
  CRITERIA,
  type ReviewInput,
} from "../review-brief/contract";
import { generationSchema } from "../review-brief/types";

export const STUDY_VERSION = "english-first-pilot-v1";
export const providerIdSchema = z.enum(["openai", "gemini", "deepseek"]);
export type ProviderId = z.infer<typeof providerIdSchema>;
export type Language = "en" | "id";
export type Reference = {
  scenario: string;
  criteria: Record<
    (typeof CRITERIA)[number],
    {
      expectedStatus: string;
      rationale: string;
      unknowns: string[];
      support: { turnId: string; quote: string }[];
    }
  >;
};
export type BenchmarkCase = {
  id: string;
  language: Language;
  kind: "base" | "variant" | "adaptation";
  pairedWith: string | null;
  split: string;
  input: ReviewInput;
  inputHash: string;
  reference: Reference;
  referenceHash: string;
};
export type ProviderProfile = {
  id: ProviderId;
  label: string;
  model: string;
  configured: boolean;
  keyName: string;
  configurations: Record<Language, { hash: string; promptHash: string }>;
};
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const failureSchema = z.strictObject({
  ok: z.literal(false),
  attemptId: z.string(),
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    issues: z.array(
      z.strictObject({
        code: z.string(),
        path: z.string(),
        message: z.string(),
      })
    ),
  }),
});
export const resultSchema = z.union([
  z.strictObject({
    ok: z.literal(true),
    generation: generationSchema.refine(
      (g) =>
        g.sourceType === "live_model" &&
        !!g.modelRequested &&
        g.generatedAtUtc !== null &&
        g.latencyMs !== null
    ),
    draft: draftSchema,
    warnings: z.array(
      z.strictObject({ code: z.string(), message: z.string() })
    ),
  }),
  failureSchema,
]);
export const responseSchema = z.strictObject({
  studyVersion: z.literal(STUDY_VERSION),
  datasetHash: hash,
  caseId: z.string(),
  language: z.enum(["en", "id"]),
  inputHash: hash,
  referenceHash: hash,
  configurationHash: hash,
  providerId: providerIdSchema,
  modelRequested: z.string(),
  result: resultSchema,
});
export type BenchmarkResponse = z.infer<typeof responseSchema>;
export const judgmentSchema = z.strictObject({
  verdict: z.enum([
    "unreviewed",
    "acceptable",
    "needs_correction",
    "uncertain",
  ]),
  issues: z.array(
    z.enum([
      "unsupported_claim",
      "missed_uncertainty",
      "wrong_status",
      "poor_followup",
      "language_issue",
    ])
  ),
});
export type Judgment = z.infer<typeof judgmentSchema>;
export const attemptSchema = z.strictObject({
  id: z.string(),
  caseId: z.string(),
  alias: z.string(),
  response: responseSchema,
  judgments: z.strictObject({
    R1: judgmentSchema,
    R2: judgmentSchema,
    R3: judgmentSchema,
    R4: judgmentSchema,
  }),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const studySchema = z.strictObject({
  version: z.literal(STUDY_VERSION),
  datasetHash: hash,
  reviewer: z.string().max(80),
  referenceApprovals: z.record(
    z.string(),
    z.strictObject({
      reviewer: z.string().min(1).max(80),
      referenceHash: hash,
      reviewedAt: z.string().datetime(),
    })
  ),
  attempts: z.array(attemptSchema).max(300),
  revealed: z.boolean(),
});
export type Study = z.infer<typeof studySchema>;
export function emptyJudgments(): Attempt["judgments"] {
  const blank = (): Judgment => ({ verdict: "unreviewed", issues: [] });
  return { R1: blank(), R2: blank(), R3: blank(), R4: blank() };
}
