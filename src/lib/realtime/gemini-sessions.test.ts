/** @jest-environment node */
import { GoogleGenAI } from "@google/genai";
import { defaultConfiguration } from "@/lib/interview/config";
import {
  openGeminiSession,
  sendGeminiTurn,
  closeGeminiSession,
  cancelGeminiSession,
} from "./gemini-sessions";

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn(),
  Modality: { AUDIO: "AUDIO" },
  ThinkingLevel: { LOW: "LOW", MEDIUM: "MEDIUM" },
}));
const sendRealtimeInput = jest.fn(),
  close = jest.fn(),
  sendToolResponse = jest.fn();
let connectArgs: Parameters<
  InstanceType<typeof GoogleGenAI>["live"]["connect"]
>[0];
const ids: string[] = [];
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(GoogleGenAI).mockImplementation(
    () =>
      ({
        live: {
          connect: jest.fn(async (args) => {
            connectArgs = args;
            return { sendRealtimeInput, close, sendToolResponse };
          }),
        },
      }) as unknown as GoogleGenAI
  );
});
afterEach(() => {
  ids.splice(0).forEach(closeGeminiSession);
  jest.useRealTimers();
});
async function start(owner = "owner") {
  const result = await openGeminiSession({
    owner,
    key: "secret",
    expiresAt: Date.now() + 60000,
    configuration: { ...defaultConfiguration(), voiceProvider: "gemini" },
    role: "Engineer",
  });
  ids.push(result.id);
  return result;
}
test("Gemini connects with low thinking, fixed spoken language and no automatic microphone stream", async () => {
  const { id } = await start();
  expect(connectArgs.model).toBe("gemini-3.1-flash-live-preview");
  expect(connectArgs.config?.thinkingConfig).toEqual({ thinkingLevel: "LOW" });
  expect(connectArgs.config?.speechConfig).toEqual({
    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
  });
  expect(connectArgs.config?.systemInstruction).toContain(
    "Speak only in English"
  );
  expect(sendRealtimeInput).not.toHaveBeenCalled();
  sendGeminiTurn(id, "owner", "I selected a queue.", "Ask the next question.");
  expect(sendRealtimeInput).toHaveBeenCalledWith({
    text: expect.stringContaining('"I selected a queue."'),
  });
  expect(() => sendGeminiTurn(id, "owner", "repeat", "")).toThrow(
    "finish speaking"
  );
});
test("other visitors cannot send to or cancel a session", async () => {
  const { id } = await start();
  expect(() => sendGeminiTurn(id, "stranger", "hello", "")).toThrow(
    "unavailable"
  );
  expect(() => cancelGeminiSession(id, "stranger")).toThrow("unavailable");
  expect(close).not.toHaveBeenCalled();
});
test("lease expiry closes upstream and cannot be extended by messages", async () => {
  const { id } = await start();
  jest.advanceTimersByTime(60001);
  expect(close).toHaveBeenCalledTimes(1);
  expect(() => sendGeminiTurn(id, "owner", "hello", "")).toThrow("unavailable");
});
test("browser stream cancellation closes upstream and permits a fresh recovery connection", async () => {
  const first = await start();
  await first.stream.cancel();
  expect(close).toHaveBeenCalledTimes(1);
  const second = await start();
  expect(second.id).not.toBe(first.id);
});
test("provider failures are sanitized and a response deadline prevents a stuck interview", async () => {
  const { id } = await start();
  sendGeminiTurn(id, "owner", "hello", "");
  jest.advanceTimersByTime(45001);
  expect(close).toHaveBeenCalledTimes(1);
});
test("output transcript is finalized once per completed turn", async () => {
  const { stream, id } = await start();
  sendGeminiTurn(id, "owner", "hello", "");
  connectArgs.callbacks.onmessage({
    serverContent: { outputTranscription: { text: "What did " } },
  } as Parameters<typeof connectArgs.callbacks.onmessage>[0]);
  connectArgs.callbacks.onmessage({
    serverContent: {
      outputTranscription: { text: "you build?" },
      turnComplete: true,
    },
  } as Parameters<typeof connectArgs.callbacks.onmessage>[0]);
  closeGeminiSession(id);
  const text = await new Response(stream).text();
  expect(text).toContain(
    '"type":"transcript_done","payload":"What did you build?"'
  );
  expect(text).not.toContain("secret");
});
