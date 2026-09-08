import { createHash, randomUUID } from "node:crypto";
import {
  validateRequest,
  validateDraft,
  type ReviewInput,
  type ValidationIssue,
} from "./contract";
import {
  GENERATION_TIMEOUT_MS,
  MAX_BODY_BYTES,
  MODEL,
  type Generation,
  type Provenance,
} from "./types";

export class GenerationFailure extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public retryable = false,
    public rawOutput: string | null = null
  ) {
    super(message);
  }
}
export type ModelResult = {
  output: unknown;
  rawOutput: string;
  modelReturned: string | null;
  usage: Generation["usage"];
  finishReason: string | null;
  responseId: string | null;
};
export type RunRecord = {
  attemptId: string;
  startedAtUtc: string;
  input?: ReviewInput;
  inputHash?: string;
  provenance: Provenance;
  modelRequested: string;
  result?: ModelResult;
  outcome?: unknown;
  rawOutput?: string | null;
};
export type Dependencies = {
  enabled: boolean;
  configured: boolean;
  provenance: Provenance;
  generate: (input: ReviewInput, signal: AbortSignal) => Promise<ModelResult>;
  record: (record: RunRecord) => Promise<void>;
  timeoutMs?: number;
};
export const inputHash = (input: ReviewInput) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader)
    throw new GenerationFailure(
      "INVALID_JSON",
      400,
      "Supply a JSON transcript."
    );
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new GenerationFailure(
          "INPUT_TOO_LARGE",
          413,
          "The JSON body exceeds 65,536 bytes."
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof GenerationFailure) throw error;
    throw new GenerationFailure(
      "INVALID_JSON",
      400,
      "Supply valid UTF-8 JSON."
    );
  } finally {
    reader.releaseLock();
  }
}

export function createHandler(deps: Dependencies) {
  return async function POST(request: Request): Promise<Response> {
    const attemptId = randomUUID();
    const fail = (failure: GenerationFailure, issues: ValidationIssue[] = []) =>
      json(
        {
          ok: false,
          attemptId,
          error: {
            code: failure.code,
            message: failure.message,
            retryable: failure.retryable,
            issues,
          },
        },
        failure.status
      );
    if (!deps.enabled)
      return fail(
        new GenerationFailure(
          "NOT_ENABLED",
          404,
          "This prototype is available only in local development."
        )
      );
    let input: ReviewInput;
    try {
      const parsed = validateRequest(await readBody(request));
      if (!parsed.ok) {
        const code = parsed.issues.some(
          (issue) => issue.code === "NO_CANDIDATE_TURNS"
        )
          ? "NO_CANDIDATE_TURNS"
          : "INVALID_INPUT";
        return fail(
          new GenerationFailure(
            code,
            422,
            "Check the transcript format and candidate turns."
          ),
          parsed.issues
        );
      }
      input = parsed.data;
    } catch (error) {
      return fail(
        error instanceof GenerationFailure
          ? error
          : new GenerationFailure(
              "INVALID_INPUT",
              422,
              "The transcript could not be read."
            )
      );
    }
    if (!deps.configured)
      return fail(
        new GenerationFailure(
          "AI_UNAVAILABLE",
          503,
          "Configure OPENAI_API_KEY on the local server, then restart it.",
          true
        )
      );
    const started = Date.now();
    const hash = inputHash(input);
    const record: RunRecord = {
      attemptId,
      startedAtUtc: new Date(started).toISOString(),
      input,
      inputHash: hash,
      provenance: deps.provenance,
      modelRequested: MODEL,
    };
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rejectInterrupted: (reason: GenerationFailure) => void = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      rejectInterrupted = reject;
    });
    const cancel = () => {
      controller.abort();
      rejectInterrupted(
        new GenerationFailure(
          "GENERATION_CANCELLED",
          499,
          "Generation was cancelled. You can start a new attempt.",
          true
        )
      );
    };
    request.signal.addEventListener("abort", cancel, { once: true });
    try {
      if (request.signal.aborted)
        throw new GenerationFailure(
          "GENERATION_CANCELLED",
          499,
          "Generation was cancelled.",
          true
        );
      timer = setTimeout(() => {
        controller.abort();
        rejectInterrupted(
          new GenerationFailure(
            "GENERATION_TIMEOUT",
            504,
            "Generation exceeded 30 seconds. Retry explicitly when ready.",
            true
          )
        );
      }, deps.timeoutMs ?? GENERATION_TIMEOUT_MS);
      const result = await Promise.race([
        deps.generate(input, controller.signal),
        interrupted,
      ]);
      record.result = result;
      const checked = validateDraft(input, result.output);
      if (!checked.ok) {
        const citation = checked.issues.some((issue) =>
          [
            "UNKNOWN_TURN",
            "WRONG_SPEAKER",
            "QUOTE_MISMATCH",
            "CONFLICT_NEEDS_TWO_TURNS",
          ].includes(issue.code)
        );
        const failure = new GenerationFailure(
          citation ? "INVALID_CITATION" : "INVALID_OUTPUT",
          502,
          "The model draft failed validation. No partial draft was opened.",
          true
        );
        record.outcome = { code: failure.code, issues: checked.issues };
        await deps.record(record).catch(() => {});
        return fail(failure, checked.issues);
      }
      const generation: Generation = {
        ...deps.provenance,
        generationId: attemptId,
        generatedAtUtc: new Date().toISOString(),
        sourceType: "live_model",
        inputHash: hash,
        modelRequested: MODEL,
        modelReturned: result.modelReturned,
        latencyMs: Date.now() - started,
        usage: result.usage,
      };
      const warnings = input.turns.some((turn) => turn.speaker === "unknown")
        ? [
            {
              code: "UNKNOWN_SPEAKER",
              message:
                "Unknown-speaker turns are retained as context and cannot support candidate claims.",
            },
          ]
        : [];
      record.outcome = { ok: true, generation, draft: checked.data };
      try {
        await deps.record(record);
      } catch {
        warnings.push({
          code: "RUN_RECORD_UNAVAILABLE",
          message:
            "The server could not save this generation record. Keep the JSON export for provenance.",
        });
      }
      return json({ ok: true, generation, draft: checked.data, warnings });
    } catch (error) {
      const failure =
        error instanceof GenerationFailure
          ? error
          : new GenerationFailure(
              "PROVIDER_ERROR",
              502,
              "The provider could not complete this attempt. Retry explicitly when ready.",
              true
            );
      record.outcome = { code: failure.code };
      record.rawOutput = failure.rawOutput;
      await deps.record(record).catch(() => {});
      return fail(failure);
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", cancel);
    }
  };
}
