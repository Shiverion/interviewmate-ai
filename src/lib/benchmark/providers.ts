import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { draftSchema, type ReviewInput } from "../review-brief/contract";
import { GenerationFailure, type ModelResult } from "../review-brief/handler";
import { getBootstrap } from "../review-brief/server";
import { MODEL } from "../review-brief/types";
import { digest } from "./dataset";
import {
  STUDY_VERSION,
  type Language,
  type ProviderId,
  type ProviderProfile,
} from "./types";

const definitions = [
  {
    id: "openai",
    label: "OpenAI",
    keyName: "OPENAI_API_KEY",
    modelEnv: "BENCHMARK_OPENAI_MODEL",
    fallback: MODEL,
  },
  {
    id: "gemini",
    label: "Gemini",
    keyName: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelEnv: "BENCHMARK_GEMINI_MODEL",
    fallback: "gemini-2.5-flash",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    keyName: "DEEPSEEK_API_KEY",
    modelEnv: "BENCHMARK_DEEPSEEK_MODEL",
    fallback: "deepseek-v4-flash",
  },
] as const;
export function systemFor(language: Language) {
  return (
    getBootstrap().system +
    "\n\nBENCHMARK_LANGUAGE_POLICY:\n" +
    (language === "en"
      ? "Write claims, limitations and follow-up questions in English."
      : "Write claims, limitations and follow-up questions in Bahasa Indonesia.") +
    " Keep field names and evidence-status enum values unchanged. Copy quotations exactly in their original language.\n" +
    "Return one JSON object matching this JSON Schema:\n" +
    JSON.stringify(z.toJSONSchema(draftSchema))
  );
}
export function configurationFor(id: ProviderId, language: Language) {
  const definition = definitions.find((p) => p.id === id)!;
  const model = process.env[definition.modelEnv]?.trim() || definition.fallback;
  const system = systemFor(language);
  const bootstrap = getBootstrap();
  const promptHash = createHash("sha256").update(system).digest("hex");
  // Separate experiment identity; legacy v1 records and configuration are never rewritten.
  const settings = {
    studyVersion: STUDY_VERSION,
    adapterVersion: 1,
    provider: id,
    model,
    language,
    adapterHash: digest(
      readFileSync(
        path.join(process.cwd(), "src/lib/benchmark/providers.ts"),
        "utf8"
      )
    ),
    temperature: 0,
    maxOutputTokens: 4000,
    timeoutMs: 30000,
    maxRetries: 0,
    responseMode: id === "deepseek" ? "json_object" : "json_schema",
    thinking:
      id === "gemini"
        ? "budget_zero"
        : id === "deepseek"
          ? "disabled"
          : "provider_default",
    ...bootstrap.provenance,
    promptHash,
  };
  return {
    definition,
    model,
    system,
    settings,
    hash: digest(settings),
    provenance: { ...bootstrap.provenance, promptHash },
  };
}
export function profiles(): ProviderProfile[] {
  return definitions.map((d) => {
    const en = configurationFor(d.id, "en"),
      id = configurationFor(d.id, "id");
    return {
      id: d.id,
      label: d.label,
      keyName: d.keyName,
      model: en.model,
      configured: !!process.env[d.keyName]?.trim(),
      configurations: {
        en: { hash: en.hash, promptHash: en.provenance.promptHash },
        id: { hash: id.hash, promptHash: id.provenance.promptHash },
      },
    };
  });
}
export function mapProviderError(error: unknown): GenerationFailure {
  if (error instanceof GenerationFailure) return error;
  if (NoObjectGeneratedError.isInstance(error))
    return new GenerationFailure(
      error.finishReason === "content-filter"
        ? "MODEL_REFUSAL"
        : "INVALID_OUTPUT",
      502,
      "The provider returned no complete valid draft.",
      true,
      error.text ?? null
    );
  if (APICallError.isInstance(error))
    return statusFailure(error.statusCode ?? 502);
  return new GenerationFailure(
    "PROVIDER_ERROR",
    502,
    "The provider could not complete the attempt.",
    true
  );
}
function statusFailure(status: number) {
  if (status === 429)
    return new GenerationFailure(
      "RATE_LIMITED",
      429,
      "Provider rate limit reached. Retry explicitly later.",
      true
    );
  if ([401, 402, 403, 404].includes(status))
    return new GenerationFailure(
      "AI_UNAVAILABLE",
      503,
      "Provider credentials, billing, or model access are unavailable. Check server configuration.",
      true
    );
  return new GenerationFailure(
    "PROVIDER_ERROR",
    502,
    "Provider request failed. No draft was substituted.",
    true
  );
}
const deepseekResponse = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({ content: z.string().nullable() }),
      })
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().nonnegative().optional(),
      completion_tokens: z.number().nonnegative().optional(),
    })
    .optional(),
});
export async function generateBenchmark(
  id: ProviderId,
  language: Language,
  input: ReviewInput,
  signal: AbortSignal
): Promise<ModelResult> {
  const c = configurationFor(id, language);
  try {
    if (id === "deepseek") {
      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          signal,
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.DEEPSEEK_API_KEY,
          },
          body: JSON.stringify({
            model: c.model,
            temperature: 0,
            max_tokens: 4000,
            stream: false,
            thinking: { type: "disabled" },
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: c.system },
              { role: "user", content: JSON.stringify(input) },
            ],
          }),
        }
      );
      if (!response.ok) throw statusFailure(response.status);
      const parsed = deepseekResponse.safeParse(await response.json());
      if (!parsed.success)
        throw new GenerationFailure(
          "INVALID_OUTPUT",
          502,
          "Provider response shape was invalid.",
          true
        );
      const data = parsed.data,
        first = data.choices[0],
        raw = first.message.content ?? "";
      if (first.finish_reason !== "stop")
        throw new GenerationFailure(
          "INVALID_OUTPUT",
          502,
          "Provider output was incomplete or refused.",
          true,
          raw
        );
      let output: unknown;
      try {
        output = JSON.parse(raw);
      } catch {
        throw new GenerationFailure(
          "INVALID_OUTPUT",
          502,
          "Provider returned invalid or empty JSON.",
          true,
          raw
        );
      }
      return {
        output,
        rawOutput: raw,
        modelReturned: data.model ?? null,
        responseId: data.id ?? null,
        finishReason: first.finish_reason,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? null,
          outputTokens: data.usage?.completion_tokens ?? null,
        },
      };
    }
    const model =
      id === "openai"
        ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).chat(c.model)
        : createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          })(c.model);
    const result = await generateText({
      model,
      system: c.system,
      prompt: JSON.stringify(input),
      output: Output.object({ schema: draftSchema }),
      temperature: 0,
      maxOutputTokens: 4000,
      maxRetries: 0,
      abortSignal: signal,
      ...(id === "gemini"
        ? {
            providerOptions: {
              google: { thinkingConfig: { thinkingBudget: 0 } },
            },
          }
        : {}),
    });
    if (result.finishReason !== "stop")
      throw new GenerationFailure(
        "INVALID_OUTPUT",
        502,
        "Provider output was incomplete or refused.",
        true,
        result.text
      );
    return {
      output: result.output,
      rawOutput: result.text,
      modelReturned: result.response.modelId ?? null,
      responseId: result.response.id ?? null,
      finishReason: result.finishReason,
      usage: {
        inputTokens: result.usage.inputTokens ?? null,
        outputTokens: result.usage.outputTokens ?? null,
      },
    };
  } catch (error) {
    throw mapProviderError(error);
  }
}
