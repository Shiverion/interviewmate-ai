import {
  WebRTCAudioManager,
  type WebRTCManagerConfig,
} from "./WebRTCAudioManager";

// OpenAI handles microphone transcription; Gemini Live receives committed text
// only after the shared controller accepts an answer and requests the next turn.
export class GeminiAudioManager {
  private transcriber: WebRTCAudioManager;
  private abort = new AbortController();
  private audio: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextAudioTime = 0;
  private id = "";
  private closed = false;
  private pendingText = "";
  private inFlight = false;
  private suppressAudio = false;
  private queuedResponse: Record<string, unknown> | null = null;
  private turnComplete = false;
  private endAfterPlayback = false;
  private ready = false;
  private rejectReady?: (error: Error) => void;

  constructor(
    private config: WebRTCManagerConfig & {
      geminiKey?: string;
      body: Record<string, unknown>;
    }
  ) {
    this.transcriber = new WebRTCAudioManager({
      ...config,
      onMessage: (type, payload) => {
        if (type === "ready") return;
        if (type === "user_transcript_done" && typeof payload === "string")
          this.pendingText += (this.pendingText ? "\n" : "") + payload;
        config.onMessage?.(type, payload);
      },
    });
  }
  private headers() {
    return {
      "Content-Type": "application/json",
      ...(this.config.geminiKey
        ? { "x-gemini-key": this.config.geminiKey }
        : {}),
    };
  }
  public async connect(stream: MediaStream) {
    this.audio = new AudioContext();
    await this.audio.resume();
    await this.transcriber.connect(stream);
    if (this.closed) throw Error("Connection cancelled.");
    const response = await fetch("/api/realtime/gemini", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ ...this.config.body, action: "connect" }),
      signal: this.abort.signal,
    });
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => ({}));
      throw Error(body.error || "Gemini voice could not connect.");
    }
    const reader = response.body.getReader();
    await new Promise<void>((resolve, reject) => {
      this.rejectReady = reject;
      const timeout = setTimeout(() => {
        reject(Error("Gemini voice connection timed out."));
        this.disconnect();
      }, 35000);
      const read = async () => {
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (!this.closed) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newline;
            while ((newline = buffer.indexOf("\n")) >= 0) {
              const event = JSON.parse(buffer.slice(0, newline));
              buffer = buffer.slice(newline + 1);
              if (event.type === "ready") {
                this.id = event.payload.id;
                this.ready = true;
                clearTimeout(timeout);
                resolve();
                this.config.onMessage?.(
                  "provider_diagnostic",
                  event.payload.diagnostic
                );
                this.config.onMessage?.("ready", null);
              } else if (event.type === "error")
                throw Error(event.payload || "Gemini voice failed.");
              else if (event.type === "audio")
                this.play(event.payload.data, event.payload.mimeType);
              else if (event.type === "turn_complete") {
                this.inFlight = false;
                this.turnComplete = true;
                this.endAfterPlayback = event.payload?.endInterview === true;
                this.finishPlayback();
                if (this.queuedResponse) {
                  const next = this.queuedResponse;
                  this.queuedResponse = null;
                  this.sendEvent(next);
                }
              } else if (event.type !== "heartbeat")
                this.config.onMessage?.(event.type, event.payload);
            }
          }
          if (!this.closed) throw Error("Gemini voice disconnected.");
        } catch (error) {
          if (!this.closed) {
            reject(error);
            if (this.ready) this.config.onDisconnect?.();
          }
        } finally {
          clearTimeout(timeout);
          reader.releaseLock();
        }
      };
      void read();
    });
  }
  private play(base64: string, mimeType: string) {
    if (!this.audio || this.closed || this.suppressAudio) return;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const samples = new DataView(bytes.buffer);
    const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] || 24000);
    if (rate < 8000 || rate > 48000 || !bytes.length || bytes.length % 2)
      return;
    const buffer = this.audio.createBuffer(1, bytes.length / 2, rate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < output.length; i++)
      output[i] = samples.getInt16(i * 2, true) / 32768;
    const source = this.audio.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audio.destination);
    this.sources.add(source);
    this.turnComplete = false;
    this.config.onMessage?.("ai_speaking", null);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      this.finishPlayback();
    };
    const start = Math.max(this.audio.currentTime, this.nextAudioTime);
    source.start(start);
    this.nextAudioTime = start + buffer.duration;
  }
  private finishPlayback() {
    if (this.closed || !this.turnComplete || this.sources.size) return;
    this.turnComplete = false;
    this.config.onMessage?.("ai_done", null);
    this.config.onMessage?.("audio_playback_done", null);
    if (this.endAfterPlayback) this.config.onMessage?.("end_interview", null);
    this.endAfterPlayback = false;
  }
  private clearAudio() {
    for (const source of this.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.sources.clear();
    this.nextAudioTime = 0;
  }
  public sendEvent(event: Record<string, unknown>) {
    if (this.closed) return;
    if (event.type === "response.cancel") {
      this.suppressAudio = true;
      return;
    }
    if (event.type === "output_audio_buffer.clear") {
      this.clearAudio();
      return;
    }
    if (event.type !== "response.create" || !this.id) return;
    if (this.inFlight) {
      this.queuedResponse = event;
      return;
    }
    this.inFlight = true;
    this.suppressAudio = false;
    const instructions =
      (event.response as { instructions?: string } | undefined)?.instructions ||
      "";
    const text = this.pendingText;
    this.pendingText = "";
    void fetch("/api/realtime/gemini", {
      method: "POST",
      headers: this.headers(),
      signal: this.abort.signal,
      body: JSON.stringify({
        action: "send",
        id: this.id,
        text,
        instructions:
          instructions ||
          (text
            ? "Ask the next planned question based on this answer."
            : "Begin with the configured welcome and first question."),
      }),
    })
      .then((r) => {
        if (!r.ok && !this.closed) this.config.onDisconnect?.();
      })
      .catch(() => {
        if (!this.closed) this.config.onDisconnect?.();
      });
  }
  public sendTextMessage(text: string, instructions?: string) {
    this.pendingText = text;
    this.sendEvent({ type: "response.create", response: { instructions } });
  }
  public disconnect() {
    if (this.closed) return;
    this.closed = true;
    this.rejectReady?.(Error("Connection cancelled."));
    this.abort.abort();
    this.clearAudio();
    void this.audio?.close();
    this.audio = null;
    this.transcriber.disconnect();
    if (this.id)
      void fetch("/api/realtime/gemini", {
        method: "POST",
        keepalive: true,
        headers: this.headers(),
        body: JSON.stringify({ action: "close", id: this.id }),
      }).catch(() => {});
  }
}
