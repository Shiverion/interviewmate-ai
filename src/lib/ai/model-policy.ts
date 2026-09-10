import type { SharedV3ProviderOptions } from "@ai-sdk/provider";
export const DEFAULT_REASONING = "low" as const;
export const VOICE_MODELS = {
  openai: "gpt-realtime-2.1-mini",
  gemini: "gemini-3.1-flash-live-preview",
} as const;
export function evaluationEffort() {
  return process.env.EVALUATION_REASONING_EFFORT === "medium"
    ? ("medium" as const)
    : DEFAULT_REASONING;
}
export function evaluationOptions(
  provider: "openai" | "gemini"
): SharedV3ProviderOptions {
  return provider === "openai"
    ? { openai: { reasoningEffort: evaluationEffort() } }
    : { google: { thinkingConfig: { thinkingLevel: evaluationEffort() } } };
}
