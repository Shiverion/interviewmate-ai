import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { PROVIDERS, type AIProvider } from "./catalog";
import { evaluationOptions } from "./model-policy";

export async function evaluateWithProvider<T>(
  provider: AIProvider,
  key: string,
  schema: z.ZodType<T>,
  system: string,
  prompt: string
) {
  const definition = PROVIDERS.find((p) => p.id === provider)!;
  const model =
    process.env[`EVALUATION_${provider.toUpperCase()}_MODEL`] ||
    definition.model;
  const signal = AbortSignal.timeout(45000);
  if (provider === "deepseek") {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      signal,
      redirect: "error",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 6000,
        temperature: 0,
        thinking: { type: "enabled" },
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              system +
              "\nReturn JSON matching this schema: " +
              JSON.stringify(z.toJSONSchema(schema)),
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok)
      throw Error(
        `DeepSeek request failed (${response.status}). Check model access and billing.`
      );
    const data = await response.json();
    return {
      object: schema.parse(
        JSON.parse(data.choices?.[0]?.message?.content || "")
      ),
      provider,
      model,
    };
  }
  const result = await generateObject({
    model:
      provider === "gemini"
        ? createGoogleGenerativeAI({ apiKey: key })(model)
        : createOpenAI({ apiKey: key })(model),
    providerOptions: evaluationOptions(provider),
    schema,
    system,
    prompt,
    abortSignal: signal,
    maxRetries: 0,
    maxOutputTokens: 6000,
  });
  return { object: result.object, provider, model };
}
