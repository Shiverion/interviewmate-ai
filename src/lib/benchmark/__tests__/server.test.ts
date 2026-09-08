/** @jest-environment node */
import { benchmarkPost } from "../server";
import { generateBenchmark, profiles } from "../providers";
import { loadCases } from "../dataset";
import { writeFile } from "node:fs/promises";
import { responseSchema } from "../types";
import { CRITERIA } from "../../review-brief/contract";

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn(async () => {}),
  writeFile: jest.fn(async () => {}),
}));
jest.mock("../providers", () => ({
  profiles: jest.fn(() => [
    {
      id: "openai",
      model: "test-only",
      keyName: "OPENAI_API_KEY",
      configured: true,
    },
  ]),
  configurationFor: jest.fn(() => ({
    model: "test-only",
    hash: "a".repeat(64),
    settings: { test: true },
    provenance: {
      contractVersion: "review-brief-v1",
      contractHash: "a".repeat(64),
      roleVersion: "frontend-review-v1",
      roleHash: "b".repeat(64),
      promptVersion: "review-brief-v1",
      promptHash: "c".repeat(64),
    },
  })),
  generateBenchmark: jest.fn(),
}));
const { cases } = loadCases(),
  c = cases[0];
const body = {
  caseId: c.id,
  providerId: "openai",
  referenceHash: c.referenceHash,
  referenceReviewed: true,
};
const request = (data: unknown = body, origin?: string) =>
  new Request("http://localhost:3000/api/benchmark", {
    method: "POST",
    headers: origin ? { origin } : {},
    body: JSON.stringify(data),
  });
beforeEach(() => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    NODE_ENV: "development",
  });
  jest
    .mocked(profiles)
    .mockReturnValue([
      {
        id: "openai",
        model: "test-only",
        keyName: "OPENAI_API_KEY",
        configured: true,
      },
    ] as never);
  jest.mocked(writeFile).mockClear();
  jest.mocked(generateBenchmark).mockClear();
});
afterEach(() => jest.restoreAllMocks());
test("production is closed before dataset processing and provider calls", async () => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    NODE_ENV: "production",
  });
  expect((await benchmarkPost(request())).status).toBe(404);
  expect(generateBenchmark).not.toHaveBeenCalled();
});
test("cross-origin requests cannot trigger paid generations", async () => {
  expect(
    (await benchmarkPost(request(body, "https://example.com"))).status
  ).toBe(403);
  expect(generateBenchmark).not.toHaveBeenCalled();
});
test("only known synthetic case selections are accepted", async () => {
  expect(
    (
      await benchmarkPost(
        request({ ...body, input: { text: "real transcript" } })
      )
    ).status
  ).toBe(422);
  expect(
    (await benchmarkPost(request({ ...body, caseId: "unknown" }))).status
  ).toBe(409);
  expect(
    (await benchmarkPost(request({ ...body, providerId: "arbitrary-url" })))
      .status
  ).toBe(422);
  expect(generateBenchmark).not.toHaveBeenCalled();
});
test("reference review and the exact reference hash are required", async () => {
  expect(
    (await benchmarkPost(request({ ...body, referenceReviewed: false }))).status
  ).toBe(422);
  expect(
    (await benchmarkPost(request({ ...body, referenceHash: "f".repeat(64) })))
      .status
  ).toBe(409);
});
test("streamed selection body size is bounded", async () => {
  expect((await benchmarkPost(request("x".repeat(2100)))).status).toBe(413);
});
test("missing credentials return an explicit ungenerated result with case provenance", async () => {
  jest
    .mocked(profiles)
    .mockReturnValue([
      {
        id: "openai",
        model: "test-only",
        keyName: "OPENAI_API_KEY",
        configured: false,
      },
    ] as never);
  const res = await benchmarkPost(request()),
    value = responseSchema.parse(await res.json());
  expect(res.status).toBe(503);
  expect(value.inputHash).toBe(c.inputHash);
  expect(value.result.ok).toBe(false);
  expect(generateBenchmark).not.toHaveBeenCalled();
});
test("same contract validates all providers and generation records retain provider configuration", async () => {
  const output = {
    schemaVersion: "review-brief-v1",
    criteria: Object.fromEntries(
      CRITERIA.map((id) => [
        id,
        {
          status: c.reference.criteria[id].expectedStatus,
          claims: c.reference.criteria[id].support.map((s) => ({
            text: "Authored mock statement.",
            citations: [s],
          })),
          limitation: "Self-report only.",
          followUp: "What would you verify next?",
        },
      ])
    ),
  };
  jest
    .mocked(generateBenchmark)
    .mockResolvedValue({
      output,
      rawOutput: JSON.stringify(output),
      modelReturned: "test-only",
      usage: null,
      finishReason: "stop",
      responseId: "mock",
    });
  const res = await benchmarkPost(request()),
    value = responseSchema.parse(await res.json());
  expect(res.status).toBe(200);
  expect(value.result.ok).toBe(true);
  expect(generateBenchmark).toHaveBeenCalledWith(
    "openai",
    "en",
    c.input,
    expect.any(AbortSignal)
  );
  const saved = JSON.parse(jest.mocked(writeFile).mock.calls[0][1] as string);
  expect(saved).toMatchObject({
    providerId: "openai",
    caseId: c.id,
    configurationHash: "a".repeat(64),
  });
  expect(saved.record.modelRequested).toBe("test-only");
});
test("invalid quotes fail the attempt instead of appearing in the UI", async () => {
  jest
    .mocked(generateBenchmark)
    .mockResolvedValue({
      output: { schemaVersion: "bad" },
      rawOutput: "{}",
      modelReturned: "mock",
      usage: null,
      finishReason: "stop",
      responseId: null,
    });
  const res = await benchmarkPost(request()),
    value = responseSchema.parse(await res.json());
  expect(res.status).toBe(502);
  expect(value.result.ok).toBe(false);
});
