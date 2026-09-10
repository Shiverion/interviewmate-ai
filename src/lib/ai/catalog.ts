export const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    model: "gpt-5.6-luna",
    env: "OPENAI_API_KEY",
    description: "Realtime 2.1 Mini voice, GPT transcription, and evaluation",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    model: "gemini-3.5-flash-lite",
    env: "GOOGLE_GENERATIVE_AI_API_KEY",
    description: "Gemini 3.1 Flash Live voice and interview evaluation",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    model: "deepseek-flash",
    env: "DEEPSEEK_API_KEY",
    description: "Interview evaluation and model comparison",
  },
] as const;
export type AIProvider = (typeof PROVIDERS)[number]["id"];
export function isProvider(value: unknown): value is AIProvider {
  return PROVIDERS.some((p) => p.id === value);
}
