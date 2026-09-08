import { z } from "zod";
import { draftSchema, ROLE_VERSION, VERSION } from "./contract";

export const MODEL = "gpt-4o-2024-08-06";
export const MAX_BODY_BYTES = 65_536;
export const GENERATION_TIMEOUT_MS = 30_000;
export type Provenance = {
  contractVersion: typeof VERSION;
  contractHash: string;
  roleVersion: typeof ROLE_VERSION;
  roleHash: string;
  promptVersion: "review-brief-v1";
  promptHash: string;
};
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const generationSchema = z.strictObject({
  generationId: z.string().min(1),
  generatedAtUtc: z.string().nullable(),
  sourceType: z.enum(["live_model", "authored_example"]),
  contractVersion: z.literal(VERSION),
  contractHash: hash,
  roleVersion: z.literal(ROLE_VERSION),
  roleHash: hash,
  promptVersion: z.literal("review-brief-v1"),
  promptHash: hash,
  modelRequested: z.string().nullable(),
  modelReturned: z.string().nullable(),
  inputHash: hash,
  latencyMs: z.number().nonnegative().nullable(),
  usage: z
    .object({
      inputTokens: z.number().nonnegative().nullable(),
      outputTokens: z.number().nonnegative().nullable(),
    })
    .nullable(),
});
export type Generation = z.infer<typeof generationSchema>;
export type Warning = { code: string; message: string };
export const successSchema = z.strictObject({
  ok: z.literal(true),
  generation: generationSchema.refine(
    (value) =>
      value.sourceType === "live_model" &&
      value.generatedAtUtc !== null &&
      value.latencyMs !== null &&
      value.modelRequested === MODEL,
    "Expected a live generation envelope"
  ),
  draft: draftSchema,
  warnings: z.array(z.strictObject({ code: z.string(), message: z.string() })),
});
export type ApiError = {
  ok: false;
  attemptId: string;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    issues: { code: string; path: string; message: string }[];
  };
};
