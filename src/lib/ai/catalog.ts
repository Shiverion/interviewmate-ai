export const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    model: "gpt-4o",
    env: "OPENAI_API_KEY",
    description: "Live voice, Whisper transcription, and evaluation",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    model: "gemini-2.5-flash",
    env: "GOOGLE_GENERATIVE_AI_API_KEY",
    description: "Interview evaluation and model comparison",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    model: "deepseek-v4-flash",
    env: "DEEPSEEK_API_KEY",
    description: "Interview evaluation and model comparison",
  },
] as const;
export type AIProvider = (typeof PROVIDERS)[number]["id"];
export function isProvider(value: unknown): value is AIProvider {
  return PROVIDERS.some((p) => p.id === value);
}
