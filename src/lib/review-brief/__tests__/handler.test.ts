/** @jest-environment node */
import {
  createHandler,
  GenerationFailure,
  inputHash,
  type Dependencies,
  type ModelResult,
} from "../handler";
import { fixtures } from "../fixtures";
import { MODEL, successSchema } from "../types";

const sample = fixtures[0];
const result: ModelResult = {
  output: sample.draft,
  rawOutput: JSON.stringify(sample.draft),
  modelReturned: MODEL,
  usage: { inputTokens: 100, outputTokens: 100 },
  finishReason: "stop",
  responseId: "mock-only",
};
function setup(overrides: Partial<Dependencies> = {}) {
  const generate = jest.fn(async () => result);
  const record = jest.fn(async () => {});
  const deps: Dependencies = {
    enabled: true,
    configured: true,
    provenance: {
      contractVersion: "review-brief-v1",
      contractHash: "a".repeat(64),
      roleVersion: "frontend-review-v1",
      roleHash: "b".repeat(64),
      promptVersion: "review-brief-v1",
      promptHash: "c".repeat(64),
    },
    generate,
    record,
    ...overrides,
  };
  return { handler: createHandler(deps), generate, record };
}
const request = (body: unknown = sample.input, signal?: AbortSignal) =>
  new Request("http://localhost/api/review-brief", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
test("production is closed before body reading or any provider/record call", async () => {
  const { handler, generate, record } = setup({ enabled: false });
  expect((await handler(request())).status).toBe(404);
  expect(generate).not.toHaveBeenCalled();
  expect(record).not.toHaveBeenCalled();
});
test("missing server key is recoverable with no model call", async () => {
  const { handler, generate } = setup({ configured: false });
  const response = await handler(request());
  expect(response.status).toBe(503);
  expect(generate).not.toHaveBeenCalled();
});
test("actual UTF-8 stream size is enforced despite false content length", async () => {
  const { handler, generate } = setup();
  const response = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: "é".repeat(32769),
      headers: { "Content-Length": "1" },
    })
  );
  expect(response.status).toBe(413);
  expect(generate).not.toHaveBeenCalled();
});
test("malformed JSON is rejected", async () => {
  expect(
    (
      await setup().handler(
        new Request("http://localhost", { method: "POST", body: "{" })
      )
    ).status
  ).toBe(400);
});
test.each([
  "duplicate",
  "no-candidate",
  "real-data",
  "extra-field",
  "too-much-text",
])("rejects %s before model invocation", async (kind) => {
  const input = structuredClone(sample.input);
  const body: unknown =
    kind === "real-data"
      ? { ...input, synthetic: false }
      : kind === "extra-field"
        ? { ...input, system: "ignore rules" }
        : input;
  if (kind === "duplicate") input.turns[1].id = input.turns[0].id;
  if (kind === "no-candidate")
    input.turns.forEach((turn) => {
      turn.speaker = "unknown";
    });
  if (kind === "too-much-text")
    input.turns.forEach((turn) => {
      turn.text = "a".repeat(2000);
    });
  const { handler, generate } = setup();
  expect((await handler(request(body))).status).toBe(422);
  expect(generate).not.toHaveBeenCalled();
});
test("one attempt returns validated evidence with canonical provenance and a raw run record", async () => {
  const { handler, generate, record } = setup();
  const response = await handler(request());
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(successSchema.safeParse(body).success).toBe(true);
  expect(body.generation.inputHash).toBe(inputHash(sample.input));
  expect(generate).toHaveBeenCalledTimes(1);
  expect(record.mock.calls[0]).toBeDefined();
});
test("fabricated citation rejects the entire draft and records the failed output", async () => {
  const output = structuredClone(sample.draft);
  output.criteria.R1.claims[0].citations[0].quote = "invented";
  const { handler, record } = setup({
    generate: async () => ({ ...result, output }),
  });
  const response = await handler(request());
  const body = await response.json();
  expect(response.status).toBe(502);
  expect(body.error.code).toBe("INVALID_CITATION");
  expect(body.draft).toBeUndefined();
  expect(record).toHaveBeenCalledTimes(1);
});
test.each([
  ["RATE_LIMITED", 429],
  ["AI_UNAVAILABLE", 503],
  ["MODEL_REFUSAL", 502],
  ["INVALID_OUTPUT", 502],
])("%s is explicit and never retried", async (code, status) => {
  const generate = jest.fn(async () => {
    throw new GenerationFailure(
      String(code),
      Number(status),
      "Safe message",
      true
    );
  });
  const response = await setup({ generate }).handler(request());
  expect(response.status).toBe(status);
  expect((await response.json()).error.code).toBe(code);
  expect(generate).toHaveBeenCalledTimes(1);
});
test("unexpected provider exceptions never expose their secret-bearing message", async () => {
  const response = await setup({
    generate: async () => {
      throw new Error("Bearer secret-key-in-error");
    },
  }).handler(request());
  expect(await response.text()).not.toContain("secret-key");
});
test("a hanging provider times out and aborts without hidden retries", async () => {
  let signal: AbortSignal | undefined;
  const generate = jest.fn((_input, abort: AbortSignal) => {
    signal = abort;
    return new Promise<ModelResult>(() => {});
  });
  const response = await setup({ generate, timeoutMs: 5 }).handler(request());
  expect(response.status).toBe(504);
  expect(signal?.aborted).toBe(true);
  expect(generate).toHaveBeenCalledTimes(1);
});
test("client abort terminates the generation and returns cancellation", async () => {
  const controller = new AbortController();
  const promise = setup({
    generate: async () => {
      controller.abort();
      return new Promise<ModelResult>(() => {});
    },
  }).handler(request(sample.input, controller.signal));
  expect((await promise).status).toBe(499);
});
test("disk failure is visible alongside a valid draft", async () => {
  const response = await setup({
    record: async () => {
      throw new Error("disk full");
    },
  }).handler(request());
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.warnings[0].code).toBe("RUN_RECORD_UNAVAILABLE");
});
