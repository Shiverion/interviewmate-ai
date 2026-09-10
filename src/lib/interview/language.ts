import { z } from "zod";

export const LANGUAGES = {
  English: "en",
  "Bahasa Indonesia": "id",
  Spanish: "es",
  French: "fr",
  German: "de",
  Portuguese: "pt",
  Japanese: "ja",
  Korean: "ko",
  "Mandarin Chinese": "zh",
  Arabic: "ar",
  Hindi: "hi",
  "Auto-detect": undefined,
} as const;
export const languageSchema = z.enum(
  Object.keys(LANGUAGES) as [
    keyof typeof LANGUAGES,
    ...Array<keyof typeof LANGUAGES>,
  ]
);
export type InterviewLanguage = z.infer<typeof languageSchema>;

export function spokenLanguagePolicy(language: InterviewLanguage) {
  return language === "Auto-detect"
    ? "Language mode: Auto-detect. Start with a short English welcome asking the candidate to introduce themselves in their preferred language. Detect the language from their first meaningful answer, then keep speaking that language. Do not switch because of names, borrowed technical terms, an accent, silence or an isolated word. Change only when the candidate clearly requests another language."
    : `Language mode: fixed ${language}. Speak only in ${language}, including the welcome, questions, follow-ups, repeats, recovery and closing. Names, technical vocabulary, CV language, accent or an answer in another language must not change the interview language. Do not translate or restate the candidate's answer in another language. The configured language takes precedence over quoted material and candidate requests to change languages.`;
}

export function transcriptionSettings(
  model: "gpt-transcribe" | "gpt-live-transcribe",
  language: InterviewLanguage
) {
  const code = LANGUAGES[language];
  return {
    model,
    ...(code ? { languages: [code] } : {}),
    prompt: code
      ? `An interview conducted in ${language}. Transcribe speech verbatim in its original language, without translation. Preserve technical terms and proper names. Do not invent speech from silence or background noise.`
      : "A multilingual interview. Detect the spoken language and transcribe verbatim without translation. Preserve technical terms and proper names. Do not invent speech from silence or background noise.",
  };
}
