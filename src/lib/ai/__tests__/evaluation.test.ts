/** @jest-environment node */
import { z } from "zod";
import { evaluateWithProvider } from "../evaluation";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
jest.mock("ai", () => ({
  generateObject: jest.fn().mockResolvedValue({ object: { score: 3 } }),
}));
jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => jest.fn(() => "openai-model")),
}));
jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: jest.fn(() => jest.fn(() => "gemini-model")),
}));
const schema = z.object({ score: z.number().min(1).max(5) });
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
test("OpenAI and Gemini use only the supplied provider key", async () => {
  expect(
    (
      await evaluateWithProvider(
        "openai",
        "openai-test",
        schema,
        "review",
        "answer"
      )
    ).provider
  ).toBe("openai");
  expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "openai-test" });
  expect(createGoogleGenerativeAI).not.toHaveBeenCalled();
  expect(
    (
      await evaluateWithProvider(
        "gemini",
        "gemini-test",
        schema,
        "review",
        "answer"
      )
    ).provider
  ).toBe("gemini");
  expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
    apiKey: "gemini-test",
  });
  expect(generateObject).toHaveBeenLastCalledWith(
    expect.objectContaining({ model: "gemini-model", maxRetries: 0 })
  );
});
test("DeepSeek validates JSON against the same score bounds", async () => {
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"score":3}' } }] })
      )
    );
  expect(
    (
      await evaluateWithProvider(
        "deepseek",
        "deepseek-test",
        schema,
        "review",
        "answer"
      )
    ).object
  ).toEqual({ score: 3 });
  expect(fetcher.mock.calls[0][1]?.headers).toEqual(
    expect.objectContaining({ Authorization: "Bearer deepseek-test" })
  );
  fetcher.mockResolvedValue(
    new Response(
      JSON.stringify({ choices: [{ message: { content: '{"score":99}' } }] })
    )
  );
  await expect(
    evaluateWithProvider(
      "deepseek",
      "deepseek-test",
      schema,
      "review",
      "answer"
    )
  ).rejects.toThrow();
});
