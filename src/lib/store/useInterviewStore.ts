import { create } from "zustand";
import type { AvatarState } from "@/components/interview/LottieAvatar";

interface InterviewState {
    status: "setup" | "active" | "completed" | "error";
    avatarState: AvatarState;
    transcript: Array<{ role: "user" | "assistant"; text: string }>;
    isMicMuted: boolean;

    // Actions
    setStatus: (status: InterviewState["status"]) => void;
    setAvatarState: (state: AvatarState) => void;
    addTranscriptLine: (role: "user" | "assistant", text: string) => void;
    toggleMic: () => void;
    reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
    status: "setup",
    avatarState: "idle",
    transcript: [],
    isMicMuted: false,

    setStatus: (status) => set({ status }),
    setAvatarState: (avatarState) => set({ avatarState }),
    addTranscriptLine: (role, text) =>
        set((state) => ({
            transcript: [...state.transcript, { role, text }],
        })),
    toggleMic: () => set((state) => ({ isMicMuted: !state.isMicMuted })),
    reset: () =>
        set({
            status: "setup",
            avatarState: "idle",
            transcript: [],
            isMicMuted: false,
        }),
}));
