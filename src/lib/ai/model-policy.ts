import type { SharedV3ProviderOptions } from "@ai-sdk/provider";
export const DEFAULT_REASONING = "low" as const;
export const VOICE_MODELS = {
  openai: "gpt-realtime-2.1-mini",
  gemini: "gemini-3.1-flash-live-preview",
} as const;

// Keep the interviewer identity explicit and stable across reconnects. Voice
// providers have separate catalogs, so each provider gets one fixed voice.
export const VOICE_NAMES = {
  openai: "marin",
  gemini: "Kore",
} as const;

export const VOICE_DELIVERY_INSTRUCTIONS =
  "Voice delivery: keep one calm, warm and professional interviewer persona across every turn and reconnect. Use a steady pace, moderate energy and natural pronunciation for the selected language. Do not change accent, persona or emotional intensity between turns; do not sing, whisper, laugh or use dramatic delivery.";
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
