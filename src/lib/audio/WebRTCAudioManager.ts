/**
 * Wrapper for the WebRTC connection linking the browser microphone
 * to the OpenAI Realtime API backend.
 */

export interface WebRTCManagerConfig {
    ephemeralToken: string;
    onMessage?: (type: string, payload: any) => void;
    onTrack?: (track: MediaStreamTrack) => void;
    onDisconnect?: () => void;
}

export class WebRTCAudioManager {
    private pc: RTCPeerConnection | null = null;
    private dc: RTCDataChannel | null = null;
    private audioEl: HTMLAudioElement | null = null;

    constructor(private config: WebRTCManagerConfig) { }

    /**
     * Initializes the connection layout:
     * 1. Creates PeerConnection
     * 2. Adds the user's local stream to the Outbound transceiver
     * 3. Sets up Data Channel for inbound JSON events
     * 4. Prepares to receive inbound AI audio
     */
    public async connect(localStream: MediaStream): Promise<void> {
        this.pc = new RTCPeerConnection();

        // 1. Play the incoming AI audio track securely
        this.pc.ontrack = (e) => {
            if (e.streams && e.streams[0]) {
                const track = e.track;
                if (this.config.onTrack) {
                    this.config.onTrack(track);
                }

                // If no custom handler, mount to a hidden audio element automatically
                if (!this.audioEl) {
                    this.audioEl = document.createElement("audio");
                    this.audioEl.autoplay = true;
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
        this.dc.onmessage = (e) => {
            if (this.config.onMessage) {
                try {
                    const parsed = JSON.parse(e.data);

                    // Route specific known OpenAI Realtime events
                    const eventType = parsed.type;

                    if (eventType === "response.audio_transcript.delta" || eventType === "response.text.delta") {
                        this.config.onMessage("transcript_delta", parsed.delta);
                    } else if (eventType === "response.audio_transcript.done" || eventType === "response.text.done") {
                        this.config.onMessage("transcript_done", parsed.transcript || parsed.text);
                    } else if (eventType === "conversation.item.input_audio_transcription.completed") {
                        this.config.onMessage("user_transcript_done", parsed.transcript);
                    } else if (eventType === "input_audio_buffer.speech_started") {
                        this.config.onMessage("user_started_speaking", null);
                    } else if (eventType === "response.created") {
                        this.config.onMessage("ai_thinking", null);
                    } else if (eventType === "response.audio.delta") {
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
                    console.error("Error parsing data channel message", err);
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

        const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
            method: "POST",
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${this.config.ephemeralToken}`,
                "Content-Type": "application/sdp"
            }
        });

        if (!sdpResponse.ok) {
            throw new Error(`WebRTC Connection Failed: ${sdpResponse.status}`);
        }

        const answerSdp = await sdpResponse.text();
        const answer = {
            type: "answer" as RTCSdpType,
            sdp: answerSdp
        };
        await this.pc.setRemoteDescription(answer);
    }

    /**
     * Send a JSON event up the data channel (e.g. to inject a text message or trigger a tool)
     */
    public sendEvent(eventObj: any): void {
        if (this.dc && this.dc.readyState === "open") {
            this.dc.send(JSON.stringify(eventObj));
        } else {
            console.warn("Data channel is not open. Cannot send event:", eventObj);
        }
    }

    /**
     * Helper to send an explicit text message to the AI
     * and immediately mandate a text response.
     */
    public sendTextMessage(text: string): void {
        this.sendEvent({
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: text }]
            }
        });

        // Trigger the AI to analyze and respond
        this.sendEvent({ type: "response.create" });
    }

    /**
     * Gracefully sever connection and clean up audio tags
     */
    public disconnect(): void {
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
        if (this.config.onDisconnect) {
            this.config.onDisconnect();
        }
    }
}
