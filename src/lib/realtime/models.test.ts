/** @jest-environment node */
import {
  configurationSchema,
  configurationFromContext,
  interviewingInstructions,
} from "@/lib/interview/config";
import { transcriptionSettings } from "@/lib/interview/language";
import { createRealtimeCall } from "./service";
import {
  evaluationEffort,
  evaluationOptions,
  VOICE_NAMES,
} from "@/lib/ai/model-policy";
import { PROVIDERS } from "@/lib/ai/catalog";

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});
test.each(["gpt-transcribe", "gpt-live-transcribe"] as const)(
  "%s keeps language hints separate from auto-detect",
  (model) => {
    expect(transcriptionSettings(model, "English")).toMatchObject({
      model,
      languages: ["en"],
    });
    expect(transcriptionSettings(model, "Bahasa Indonesia")).toMatchObject({
      languages: ["id"],
    });
    expect(transcriptionSettings(model, "Japanese")).toMatchObject({
      languages: ["ja"],
    });
    expect(transcriptionSettings(model, "Auto-detect")).not.toHaveProperty(
      "languages"
    );
    expect(transcriptionSettings(model, "English")).not.toHaveProperty(
      "language"
    );
    expect(transcriptionSettings(model, "English").prompt).toContain(
      "without translation"
    );
  }
);
test("legacy sessions acquire low reasoning and current models without losing their selected language", () => {
  expect(
    configurationFromContext({ preferredLanguage: "Bahasa Indonesia" })
  ).toMatchObject({
    language: "Bahasa Indonesia",
    transcriptionModel: "gpt-transcribe",
    voiceProvider: "openai",
    reasoningEffort: "low",
  });
  expect(
    configurationSchema.safeParse({ reasoningEffort: "high" }).success
  ).toBe(false);
  const auto = interviewingInstructions(
    configurationSchema.parse({ language: "Auto-detect" }),
    "Engineer"
  );
  expect(auto).toContain("first meaningful answer");
  expect(auto).toContain("Do not switch because of names");
  expect(auto).toContain("Never expose internal reasoning");
  expect(auto).not.toContain("Sebentar, saya pikirkan cara menjawab");
  expect(auto).toContain("Do not add a preamble about preparing an answer");
  expect(
    interviewingInstructions(
      configurationSchema.parse({ language: "English" }),
      "Engineer"
    )
  ).toContain("recovery and closing");
});
test("evaluation models are current and effort is clamped to low or medium", () => {
  expect(PROVIDERS.map((p) => p.model)).toEqual([
    "gpt-5.6-luna",
    "gemini-3.5-flash-lite",
    "deepseek-flash",
  ]);
  process.env.EVALUATION_REASONING_EFFORT = "high";
  expect(evaluationEffort()).toBe("low");
  process.env.EVALUATION_REASONING_EFFORT = "medium";
  expect(evaluationOptions("openai")).toEqual({
    openai: { reasoningEffort: "medium" },
  });
  expect(evaluationOptions("gemini")).toEqual({
    google: { thinkingConfig: { thinkingLevel: "medium" } },
  });
});
test("voice identity is fixed per provider", () => {
  expect(VOICE_NAMES).toEqual({ openai: "marin", gemini: "Kore" });
});
test.each(["openai", "gemini"] as const)(
  "%s voice uses the selected transcription settings in the actual SDP request",
  async (voiceProvider) => {
    delete process.env.DEMO_VOICE_MODEL;
    delete process.env.REALTIME_FALLBACK_MODELS;
    const fetcher = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("sdp-answer", {
          status: 201,
          headers: { location: "/v1/realtime/calls/test-call" },
        })
      );
    await createRealtimeCall({
      key: "fake",
      sdp: "test-offer",
      configuration: configurationSchema.parse({
        voiceProvider,
        language: "English",
        transcriptionModel: "gpt-live-transcribe",
        reasoningEffort: "medium",
      }),
      role: "Engineer",
      host: false,
    });
    const session = JSON.parse(
      (fetcher.mock.calls[0][1]!.body as FormData).get("session") as string
    );
    expect(session.audio.input.transcription).toMatchObject({
      model: "gpt-live-transcribe",
      languages: ["en"],
    });
    if (voiceProvider === "openai") {
      expect(session).toMatchObject({
        type: "realtime",
        model: "gpt-realtime-2.1-mini",
        reasoning: { effort: "medium" },
        audio: { output: { voice: "marin" } },
      });
      expect(session.instructions).toContain("Speak only in English");
      expect(session.audio.input.turn_detection.create_response).toBe(false);
    } else {
      expect(session.type).toBe("transcription");
      expect(session).not.toHaveProperty("reasoning");
      expect(session).not.toHaveProperty("model");
      expect(session.audio).not.toHaveProperty("output");
    }
  }
);
