/** @jest-environment node */
import { GeminiAudioManager } from "./GeminiAudioManager";
import type { WebRTCManagerConfig } from "./WebRTCAudioManager";
let transcriber: WebRTCManagerConfig;
const closeTranscriber = jest.fn(),
  audioBuffer = jest.fn();
jest.mock("./WebRTCAudioManager", () => ({
  WebRTCAudioManager: jest.fn((config: WebRTCManagerConfig) => {
    transcriber = config;
    return {
      connect: async () => config.onMessage?.("ready", null),
      disconnect: () => closeTranscriber(),
    };
  }),
}));
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
test("Gemini waits for readiness, sends only completed speech and queues interruption until the provider finishes", async () => {
  let streamController!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      streamController = c;
    },
  });
  const encoder = new TextEncoder();
  const emit = (type: string, payload: unknown) =>
    streamController.enqueue(
      encoder.encode(JSON.stringify({ type, payload }) + "\n")
    );
  const requests: Record<string, unknown>[] = [];
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    requests.push(body);
    return body.action === "connect"
      ? new Response(stream)
      : Response.json({ sent: true });
  });
  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: jest.fn(() => ({
      resume: async () => {},
      close: async () => {},
      createBuffer: audioBuffer,
    })),
  });
  const onMessage = jest.fn();
  const manager = new GeminiAudioManager({
    exchangeSdp: async () => "sdp",
    onMessage,
    body: { sessionId: "demo-test" },
  });
  try {
    const connected = manager.connect({
      getTracks: () => [],
    } as unknown as MediaStream);
    await tick();
    expect(onMessage).not.toHaveBeenCalledWith("ready", null);
    emit("ready", { id: "gemini-test" });
    await connected;
    manager.sendEvent({ type: "response.create" });
    transcriber.onMessage?.("user_transcript_partial", "unfinished");
    transcriber.onMessage?.("user_transcript_done", "I built a queue.");
    manager.sendEvent({ type: "response.cancel" });
    manager.sendEvent({ type: "output_audio_buffer.clear" });
    manager.sendEvent({ type: "response.create" });
    expect(requests.filter((r) => r.action === "send")).toHaveLength(1);
    emit("audio", { data: "AAA=", mimeType: "audio/pcm;rate=24000" });
    await tick();
    expect(audioBuffer).not.toHaveBeenCalled();
    emit("turn_complete", {});
    await tick();
    const sends = requests.filter((r) => r.action === "send");
    expect(sends).toHaveLength(2);
    expect(sends[1].text).toBe("I built a queue.");
    expect(JSON.stringify(sends)).not.toContain("unfinished");
    manager.disconnect();
    expect(closeTranscriber).toHaveBeenCalled();
    expect(requests.at(-1)?.action).toBe("close");
  } finally {
    manager.disconnect();
    streamController.close();
    await tick();
    global.fetch = originalFetch;
  }
});
