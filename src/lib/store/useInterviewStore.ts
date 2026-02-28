import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AvatarState } from "@/components/interview/LottieAvatar";
import { WebRTCAudioManager } from "@/lib/audio/WebRTCAudioManager";
import { getSessionToken } from "@/app/actions/get-session-token";
import { getOpenAIKey } from "@/lib/keys/store";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export interface InterviewContext {
    sessionId: string;
    candidateName: string;
    jobTitle: string;
    resumeUrl?: string;
    resumeText?: string;
    startedAt: number;
    interviewMode: "voice" | "text";
    allowedModes: "audio_only" | "audio_and_text";
}

interface InterviewState {
    status: "setup" | "connecting" | "active" | "completed" | "error";
    avatarState: AvatarState;
    transcript: Array<{ role: "user" | "assistant"; text: string }>;
    activeDeltaMessage: string;
    isMicMuted: boolean;
    error: string | null;

    // Injected Context from /apply
    _sessionContext?: InterviewContext;

    // Audio state
    manager: WebRTCAudioManager | null;
    localStream: MediaStream | null;

    // Subtitle Sync Helpers
    _subtitleBuffer: string;
    _isDrainingSubtitle: boolean;

    // Actions
    setStatus: (status: "setup" | "connecting" | "active" | "completed" | "error") => void;
    setAvatarState: (state: AvatarState) => void;
    addTranscriptLine: (role: "user" | "assistant", text: string) => void;
    toggleMic: () => void;
    sendTextMessage: (text: string) => void;

    // Connection Actions
    connect: () => Promise<void>;
    disconnect: () => void;
    reset: () => void;
    endInterview: () => void;
}

// Typing constant (chars per interval)
const CHARS_PER_TICK = 1;
const TICK_MS = 77; // ~13 characters per second - user requested sweet spot

export const useInterviewStore = create<InterviewState>()(
    persist(
        (set, get) => ({
            status: "setup",
            avatarState: "idle",
            transcript: [],
            activeDeltaMessage: "",
            isMicMuted: false,
            error: null,
            manager: null,
            localStream: null,
            _subtitleBuffer: "",
            _isDrainingSubtitle: false,

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

                    // Build dynamic AI context if available
                    const sessionCtx = get()._sessionContext;
                    let instructions = "";
                    if (sessionCtx) {
                        console.log(`[AI DIAGNOSTICS] Building session context. Candidate: ${sessionCtx.candidateName}`);
                        console.log(`[AI DIAGNOSTICS] Resume URL present? ${!!sessionCtx.resumeUrl}`);
                        console.log(`[AI DIAGNOSTICS] Parsed Resume Text Length: ${sessionCtx.resumeText ? sessionCtx.resumeText.length : 0} characters`);

                        // 1. TOP-HEAVY CONTEXT:
                        // Models pay the most attention to the beginning of the prompt. We inject the resume here.
                        // We also truncate the parsed text to roughly 2000 words (12,000 chars) to ensure we don't 
                        // blow past the Realtime API's context token limits, which can cause prompt truncation.
                        const safeResumeText = sessionCtx.resumeText
                            ? sessionCtx.resumeText.substring(0, 12000)
                            : "";

                        if (!safeResumeText) {
                            console.warn("[AI DIAGNOSTICS] WARNING: No resume text was provided to the AI instructions!");
                        } else {
                            console.log("[AI DIAGNOSTICS] Successfully injecting resume text into AI prompt.");
                        }

                        instructions = `You are an AI recruiter conducting a screening interview for the role of ${sessionCtx.jobTitle}. You are interviewing ${sessionCtx.candidateName}.

${safeResumeText ? `CANDIDATE BACKGROUND CONTEXT (from resume):
"""
${safeResumeText}
"""

CRITICAL MANDATE: You MUST NOT ask generic interview questions (like "tell me about yourself"). Your VERY FIRST question MUST reference a specific past role or project listed in the resume above. You must ask at least 3 questions diving deep into their documented past experience.` : ''}

STRICT INSTRUCTIONS:
1. Conduct the interview within a 30-minute window.
2. PERSONALITY: You are a charismatic senior recruiter. Speak at a moderate, natural human pace. You are NOT a robot. Use warm intonation and natural conversational fillers.
3. CLOSING PROTOCOL: When concluding, provide a definitive summary of EXACTLY 2-3 professional sentences. Thank the candidate and inform them the team will reach out.
4. STRICT NEGATIVE CONSTRAINT: Under NO CIRCUMSTANCES should you ask the candidate "Do you have any questions," "Is there anything else," or request final remarks. End with your 2-3 sentence speech ONLY.
5. IMMEDIATELY call the 'end_interview' tool the second you finish speaking your closing sentence.`;

                        if (safeResumeText) {
                            instructions += `\n\nLANGUAGE INSTRUCTION: The default language for this interview is English. You MUST address the candidate and conduct the interview in English, UNLESS the resume above is explicitly written in another primary language. If the resume is in another language, conduct the interview in that exact language. If the candidate switches languages during the interview, gently remind them to stick to a professional environment and respond back in the expected language. Flag any deviations internally.`;
                        }
                    }

                    // 2. Request ephemeral token using server action
                    const ephemeralToken = await getSessionToken(apiKey, instructions);

                    // 3. Request Microphone & Camera Access conditionally
                    // In "text" mode, we still want video for the PIP experience, but disable audio capturing natively.
                    const isTextMode = sessionCtx?.interviewMode === "text";

                    const localStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            facingMode: "user"
                        },
                        audio: isTextMode ? false : {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    });

                    // 4. Initialize WebRTC Manager
                    let currentAssistantMessage = "";

                    const manager = new WebRTCAudioManager({
                        ephemeralToken: ephemeralToken,
                        onMessage: (type, payload) => {
                            const sessionCtx = get()._sessionContext;

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
                                // Append to buffer instead of setting directly
                                set(state => ({ _subtitleBuffer: state._subtitleBuffer + payload }));
                                currentAssistantMessage += payload;

                                // Start drain if not already running
                                if (!get()._isDrainingSubtitle) {
                                    set({ _isDrainingSubtitle: true });
                                    const drain = () => {
                                        const state = get();
                                        if (state._subtitleBuffer.length === 0) {
                                            set({ _isDrainingSubtitle: false });
                                            return;
                                        }

                                        const toAdd = state._subtitleBuffer.slice(0, CHARS_PER_TICK);
                                        const remaining = state._subtitleBuffer.slice(CHARS_PER_TICK);

                                        set(s => ({
                                            activeDeltaMessage: s.activeDeltaMessage + toAdd,
                                            _subtitleBuffer: remaining
                                        }));

                                        setTimeout(drain, TICK_MS);
                                    };
                                    setTimeout(drain, TICK_MS);
                                }
                            } else if (type === "transcript_done") {
                                // We wait for the buffer to drain before fully finalizing
                                const waitAndFinalize = () => {
                                    if (get()._subtitleBuffer.length > 0) {
                                        setTimeout(waitAndFinalize, TICK_MS);
                                    } else {
                                        get().addTranscriptLine("assistant", payload || currentAssistantMessage);
                                        currentAssistantMessage = "";
                                        set({ activeDeltaMessage: "", _subtitleBuffer: "" });
                                    }
                                };
                                waitAndFinalize();
                            } else if (type === "user_transcript_done") {
                                get().addTranscriptLine("user", payload);
                            } else if (type === "ai_done") {
                                set({ avatarState: "listening" });
                            } else if (type === "end_interview") {
                                get().endInterview();
                            } else if (type === "ready") {
                                // First, tell OpenAI explicit modalities
                                manager.sendEvent({
                                    type: "session.update",
                                    session: {
                                        modalities: sessionCtx?.interviewMode === "text" ? ["text"] : ["audio", "text"],
                                        input_audio_transcription: { model: "whisper-1" }
                                    }
                                });

                                // Instruct the AI to initiate the conversation right away
                                let greetingPrompt = sessionCtx
                                    ? `Start the interview by warmly greeting ${sessionCtx.candidateName} and introducing yourself as the AI Interviewer for the ${sessionCtx.jobTitle} position.`
                                    : "Greet the user warmly, introduce yourself as the AI Interviewer, and ask them how they are doing to kick off the interview.";

                                if (sessionCtx?.resumeText) {
                                    greetingPrompt += " Mention that you have reviewed their resume and acknowledge a specific, interesting detail (e.g., a past company, a project, or a specific skill) right in this greeting to show you are prepared.";
                                }

                                manager.sendEvent({
                                    type: "response.create",
                                    response: {
                                        instructions: greetingPrompt
                                    }
                                });
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

            endInterview: () => {
                const sessionCtx = get()._sessionContext;
                if (sessionCtx?.sessionId) {
                    console.log("[STORE] endInterview triggered. Waiting for subtitle drain...");
                    const monitorDrainAndFinish = () => {
                        if (get()._subtitleBuffer.length > 0 || get()._isDrainingSubtitle) {
                            setTimeout(monitorDrainAndFinish, 500);
                        } else {
                            console.log("[STORE] Subtitles drained. Terminating in 2.5s...");
                            setTimeout(() => {
                                const finalTranscript = get().transcript;
                                const sessionRef = doc(db, "interview_sessions", sessionCtx.sessionId);
                                updateDoc(sessionRef, {
                                    status: "completed",
                                    final_transcript: finalTranscript,
                                    completed_at: serverTimestamp()
                                }).then(() => {
                                    get().disconnect();
                                }).catch(err => {
                                    console.error("Error saving transcript:", err);
                                    get().disconnect();
                                });
                            }, 2500);
                        }
                    };
                    monitorDrainAndFinish();
                } else {
                    get().disconnect();
                }
            },

            sendTextMessage: (text: string) => {
                const { manager } = get();
                if (manager) {
                    manager.sendTextMessage(text);
                    get().addTranscriptLine("user", text);
                }
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
                    activeDeltaMessage: "",
                    isMicMuted: false,
                    error: null,
                    manager: null,
                    localStream: null,
                });
            }
        }),
        {
            name: "interview-store",
            partialize: (state) => ({ _sessionContext: state._sessionContext }) // Only persist the context between reloads
        })
);
