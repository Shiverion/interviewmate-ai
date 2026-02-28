import { create } from "zustand";
import type { AvatarState } from "@/components/interview/LottieAvatar";
import { WebRTCAudioManager } from "@/lib/audio/WebRTCAudioManager";
import { getSessionToken } from "@/app/actions/get-session-token";
import { getOpenAIKey } from "@/lib/keys/store";

interface InterviewState {
    status: "setup" | "connecting" | "active" | "completed" | "error";
    avatarState: AvatarState;
    transcript: Array<{ role: "user" | "assistant"; text: string }>;
    isMicMuted: boolean;
    error: string | null;

    // Audio state
    manager: WebRTCAudioManager | null;
    localStream: MediaStream | null;

    // Actions
    setStatus: (status: InterviewState["status"]) => void;
    setAvatarState: (state: AvatarState) => void;
    addTranscriptLine: (role: "user" | "assistant", text: string) => void;
    toggleMic: () => void;

    // Connection Actions
    connect: () => Promise<void>;
    disconnect: () => void;
    reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
    status: "setup",
    avatarState: "idle",
    transcript: [],
    isMicMuted: false,
    error: null,
    manager: null,
    localStream: null,

    setStatus: (status) => set({ status }),
    setAvatarState: (avatarState) => set({ avatarState }),
    addTranscriptLine: (role, text) =>
        set((state) => ({
            transcript: [...state.transcript, { role, text }],
        })),
    toggleMic: () => set((state) => {
        // If we have a local stream, toggle the actual audio tracks
        if (state.localStream) {
            state.localStream.getAudioTracks().forEach(t => {
                t.enabled = state.isMicMuted; // if previously muted, enable.
            });
        }
        return { isMicMuted: !state.isMicMuted };
    }),

    connect: async () => {
        set({ status: "connecting", error: null });
        try {
            // 1. Get BYOK api key
            const apiKey = getOpenAIKey();
            if (!apiKey) throw new Error("No OpenAI API key configured");

            // 2. Request ephemeral token using server action
            const token = await getSessionToken(apiKey);

            // 3. Request Microphone Access
            const localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // 4. Initialize WebRTC Manager
            let currentAssistantMessage = "";

            const manager = new WebRTCAudioManager({
                ephemeralToken: token,
                onMessage: (type, payload) => {
                    if (type === "user_started_speaking") {
                        set({ avatarState: "listening" });
                    } else if (type === "ai_thinking") {
                        set({ avatarState: "thinking" });
                        currentAssistantMessage = "";
                    } else if (type === "ai_speaking") {
                        // Because delta fires 50x a second, only set if state isn't already speaking
                        if (get().avatarState !== "speaking") {
                            set({ avatarState: "speaking" });
                        }
                    } else if (type === "transcript_delta") {
                        // Append to current temporary message line
                        currentAssistantMessage += payload;
                        // We can optionally display this live if we want subtitling,
                        // for now we'll wait for 'done' to add standard line.
                    } else if (type === "transcript_done") {
                        get().addTranscriptLine("assistant", payload || currentAssistantMessage);
                        currentAssistantMessage = "";
                    } else if (type === "ai_done") {
                        set({ avatarState: "listening" });
                    }
                },
                onDisconnect: () => {
                    set({ status: "completed", avatarState: "idle" });
                }
            });

            // 5. Connect!
            await manager.connect(localStream);

            // 6. Update global state
            set({
                manager,
                localStream,
                status: "active",
                avatarState: "listening"
            });

        } catch (err: any) {
            console.error("Failed to connect interview:", err);
            set({ status: "error", error: err.message || "Connection failed" });
            get().disconnect(); // ensure cleanup
        }
    },

    disconnect: () => {
        const { manager, localStream } = get();
        if (manager) manager.disconnect();
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
        }
        set({ status: "completed", avatarState: "idle", manager: null, localStream: null });
    },

    reset: () => {
        const { manager, localStream } = get();
        if (manager) manager.disconnect();
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
        }
        set({
            status: "setup",
            avatarState: "idle",
            transcript: [],
            isMicMuted: false,
            error: null,
            manager: null,
            localStream: null,
        });
    }
}));
