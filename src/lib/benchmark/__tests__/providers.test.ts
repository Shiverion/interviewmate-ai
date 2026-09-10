/** @jest-environment node */
import { APICallError, generateText, NoObjectGeneratedError } from "ai";
import { generateBenchmark, profiles, configurationFor } from "../providers";
import { fixtures } from "../../review-brief/fixtures";

jest.mock("ai", () => ({
  generateText: jest.fn(),
  Output: { object: jest.fn(() => ({})) },
  APICallError: { isInstance: jest.fn(() => false) },
  NoObjectGeneratedError: { isInstance: jest.fn(() => false) },
}));
jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => ({
    chat: jest.fn(() => ({ provider: "openai" })),
  })),
}));
jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: jest.fn(() =>
    jest.fn(() => ({ provider: "google" }))
  ),
}));
const mockGenerate = jest.mocked(generateText);
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});
test("only key presence and configuration metadata reach the browser profile", () => {
  const previous = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-secret-do-not-export";
  const p = profiles();
  expect(p.find((x) => x.id === "gemini")?.configured).toBe(true);
  expect(JSON.stringify(p)).not.toContain("test-secret");
  if (previous === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  else process.env.GOOGLE_GENERATIVE_AI_API_KEY = previous;
});
test("language settings change experiment hash while preserving the legacy role", () => {
  const en = configurationFor("gemini", "en"),
    id = configurationFor("gemini", "id");
  expect(en.hash).not.toBe(id.hash);
  expect(en.provenance.roleHash).toBe(id.provenance.roleHash);
  expect(id.system).toContain("Bahasa Indonesia");
  expect(id.system).toContain("Copy quotations exactly");
});
test.each(["openai", "gemini"] as const)(
  "%s sends only transcript data in user prompt with no hidden retries",
  async (provider) => {
    mockGenerate.mockResolvedValue({
      output: fixtures[0].draft,
      text: JSON.stringify(fixtures[0].draft),
      finishReason: "stop",
      response: { modelId: "mock", id: "mock" },
      usage: {},
    } as never);
    const result = await generateBenchmark(
      provider,
      "en",
      fixtures[0].input,
      new AbortController().signal
    );
    expect(result.output).toEqual(fixtures[0].draft);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const arg = mockGenerate.mock.calls[0][0];
    expect(arg.prompt).toBe(JSON.stringify(fixtures[0].input));
    expect(arg.maxRetries).toBe(0);
    expect(arg.system).not.toContain("expectedStatus");
  }
);
test("DeepSeek uses JSON mode; schema and citation validation remain application responsibilities", async () => {
  global.fetch = jest.fn(async () =>
    Response.json({
      model: "mock",
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify(fixtures[0].draft) },
        },
      ],
    })
  );
  const result = await generateBenchmark(
    "deepseek",
    "id",
    fixtures[0].input,
    new AbortController().signal
  );
  expect(result.output).toEqual(fixtures[0].draft);
  const request = JSON.parse(
    jest.mocked(global.fetch).mock.calls[0][1]?.body as string
  );
  expect(request.response_format).toEqual({ type: "json_object" });
  expect(request.thinking).toEqual({ type: "enabled" });
  expect(request.reasoning_effort).toBe("low");
  expect(request.messages[1].content).toBe(JSON.stringify(fixtures[0].input));
});
test("DeepSeek rejects empty JSON and truncation rather than repairing an output", async () => {
  global.fetch = jest.fn(async () =>
    Response.json({
      choices: [{ finish_reason: "stop", message: { content: "" } }],
    })
  );
  await expect(
    generateBenchmark(
      "deepseek",
      "en",
      fixtures[0].input,
      new AbortController().signal
    )
  ).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
  global.fetch = jest.fn(async () =>
    Response.json({
      choices: [{ finish_reason: "length", message: { content: "{}" } }],
    })
  );
  await expect(
    generateBenchmark(
      "deepseek",
      "en",
      fixtures[0].input,
      new AbortController().signal
    )
  ).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
});
test("provider credentials and raw HTTP error bodies are never returned", async () => {
  global.fetch = jest.fn(
    async () => new Response("secret-server-error", { status: 401 })
  );
  await expect(
    generateBenchmark(
      "deepseek",
      "en",
      fixtures[0].input,
      new AbortController().signal
    )
  ).rejects.toMatchObject({ code: "AI_UNAVAILABLE", status: 503 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
test("SDK access errors are sanitized", async () => {
  jest.mocked(APICallError.isInstance).mockReturnValueOnce(true);
  jest.mocked(NoObjectGeneratedError.isInstance).mockReturnValue(false);
  mockGenerate.mockRejectedValue({ statusCode: 403, message: "secret" });
  await expect(
    generateBenchmark(
      "gemini",
      "en",
      fixtures[0].input,
      new AbortController().signal
    )
  ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
});
