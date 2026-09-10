/**
 * Wrapper for the WebRTC connection linking the browser microphone
 * to the OpenAI Realtime API backend.
 */

export interface WebRTCManagerConfig {
  ephemeralToken?: string;
  exchangeSdp: (sdp: string) => Promise<string>;
  onClose?: () => void;
  onMessage?: (type: string, payload: unknown) => void;
  onTrack?: (track: MediaStreamTrack) => void;
  onDisconnect?: () => void;
  languagePolicy?: string;
}

export class WebRTCAudioManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private closed = false;
  private completedTranscripts = new Set<string>();
  private partialTranscripts = new Map<string, string>();
  private pendingUserAudioItemIds = new Set<string>();

  constructor(private config: WebRTCManagerConfig) {}

  /**
   * Initializes the connection layout:
   * 1. Creates PeerConnection
   * 2. Adds the user's local stream to the Outbound transceiver
   * 3. Sets up Data Channel for inbound JSON events
   * 4. Prepares to receive inbound AI audio
   */
  public async connect(localStream: MediaStream): Promise<void> {
    this.pc = new RTCPeerConnection();
    this.pc.onconnectionstatechange = () => {
      if (
        !this.closed &&
        ["failed", "disconnected"].includes(this.pc?.connectionState || "")
      )
        this.config.onDisconnect?.();
    };

    // 1. Play the incoming AI audio track securely
    this.pc.ontrack = (e) => {
      if (this.closed) return;
      if (e.streams && e.streams[0]) {
        const track = e.track;
        if (this.config.onTrack) {
          this.config.onTrack(track);
        }

        // If no custom handler, mount to a hidden audio element automatically
        if (!this.audioEl) {
          this.audioEl = document.createElement("audio");
          this.audioEl.autoplay = true;
          this.audioEl.volume = 0.82;
          this.audioEl.setAttribute("aria-label", "AI interviewer audio");
          document.body.appendChild(this.audioEl);
        }
        this.audioEl.srcObject = e.streams[0];
      }
    };

    // 2. Add local microphone to send to OpenAI
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        this.pc?.addTrack(track, localStream);
      });
    }

    // 3. Set up Data Channel for JSON control events
    this.dc = this.pc.createDataChannel("oai-events");
    this.dc.onclose = () => {
      if (!this.closed) this.config.onDisconnect?.();
    };
    this.dc.onmessage = (e) => {
      if (this.config.onMessage) {
        try {
          const parsed = JSON.parse(e.data);

          // Route specific known OpenAI Realtime events
          const eventType = parsed.type;

          if (
            eventType === "response.audio_transcript.delta" ||
            eventType === "response.text.delta" ||
            eventType === "response.output_audio_transcript.delta" ||
            eventType === "response.output_text.delta"
          ) {
            this.config.onMessage("transcript_delta", parsed.delta);
          } else if (
            eventType === "response.audio_transcript.done" ||
            eventType === "response.text.done" ||
            eventType === "response.output_audio_transcript.done" ||
            eventType === "response.output_text.done"
          ) {
            this.config.onMessage(
              "transcript_done",
              parsed.transcript || parsed.text
            );
          } else if (
            eventType ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            if (parsed.item_id && this.completedTranscripts.has(parsed.item_id))
              return;
            if (parsed.item_id) {
              this.completedTranscripts.add(parsed.item_id);
              this.partialTranscripts.delete(parsed.item_id);
              this.pendingUserAudioItemIds.add(parsed.item_id);
            }
            this.config.onMessage(
              "user_transcript_partial",
              [...this.partialTranscripts.values()].join(" ")
            );
            this.config.onMessage("user_transcript_done", parsed.transcript);
          } else if (
            eventType === "conversation.item.input_audio_transcription.delta"
          ) {
            if (
              parsed.item_id &&
              !this.completedTranscripts.has(parsed.item_id) &&
              typeof parsed.delta === "string"
            ) {
              this.partialTranscripts.set(
                parsed.item_id,
                (this.partialTranscripts.get(parsed.item_id) || "") +
                  parsed.delta
              );
              this.config.onMessage(
                "user_transcript_partial",
                [...this.partialTranscripts.values()].join(" ")
              );
            }
          } else if (eventType === "input_audio_buffer.speech_started") {
            this.config.onMessage("user_started_speaking", null);
          } else if (eventType === "input_audio_buffer.speech_stopped") {
            this.config.onMessage("user_stopped_speaking", null);
          } else if (
            eventType === "conversation.item.input_audio_transcription.failed"
          ) {
            this.config.onMessage("transcription_failed", null);
          } else if (eventType === "output_audio_buffer.stopped") {
            this.config.onMessage("audio_playback_done", null);
          } else if (eventType === "response.created") {
            this.config.onMessage("ai_thinking", null);
          } else if (
            eventType === "output_audio_buffer.started" ||
            eventType === "response.audio.delta" ||
            eventType === "response.output_audio.delta"
          ) {
            this.config.onMessage("ai_speaking", null);
          } else if (eventType === "response.done") {
            this.config.onMessage("ai_done", null);
          } else if (eventType === "response.function_call_arguments.done") {
            if (parsed.name === "end_interview") {
              this.config.onMessage("end_interview", null);
            }
          } else {
            // Catch-all for other debugging
            this.config.onMessage("raw_event", parsed);
          }
        } catch (err) {
          void err; // Never log raw provider events or interview content.
        }
      }
    };

    // Emit 'ready' when channel opens so the client knows it can send custom json events
    this.dc.onopen = () => {
      if (this.config.onMessage) {
        this.config.onMessage("ready", null);
      }
    };

    // 4. Create proper SDP Offer and send to OpenAI using the ephemeral token
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    if (this.config.exchangeSdp) {
      const sdp = await this.config.exchangeSdp(offer.sdp || "");
      if (this.closed || !this.pc) {
        this.config.onClose?.();
        throw Error("Connection cancelled.");
      }
      await this.pc.setRemoteDescription({ type: "answer", sdp });
      return;
    }

    throw Error("A shared realtime exchange is required.");
  }

  /**
   * Send a JSON event up the data channel (e.g. to inject a text message or trigger a tool)
   */
  public sendEvent(eventObj: Record<string, unknown>): void {
    if (this.dc && this.dc.readyState === "open") {
      const response = eventObj.response as
        | { instructions?: string }
        | undefined;
      if (
        eventObj.type === "response.create" &&
        response?.instructions &&
        this.config.languagePolicy
      )
        eventObj = {
          ...eventObj,
          response: {
            ...response,
            instructions: `${response.instructions}\n${this.config.languagePolicy}`,
          },
        };
      this.dc.send(JSON.stringify(eventObj));
    } else {
      // A disconnected room is handled by onDisconnect. Do not log interview content.
    }
  }

  /**
   * Helper to send an explicit text message to the AI
   * and immediately mandate a text response.
   */
  public sendTextMessage(text: string, instructions?: string): void {
    for (const item_id of this.pendingUserAudioItemIds)
      this.sendEvent({ type: "conversation.item.delete", item_id });
    this.pendingUserAudioItemIds.clear();
    this.sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: text }],
      },
    });

    // Trigger the AI to analyze and respond
    this.sendEvent({
      type: "response.create",
      ...(instructions ? { response: { instructions } } : {}),
    });
  }

  /**
   * Gracefully sever connection and clean up audio tags
   */
  public disconnect(): void {
    if (this.closed) return;
    this.closed = true;
    this.partialTranscripts.clear();
    this.completedTranscripts.clear();
    this.pendingUserAudioItemIds.clear();
    this.config.onClose?.();
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl.remove();
      this.audioEl = null;
    }
  }
}
