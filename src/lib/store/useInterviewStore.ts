import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AvatarState } from "@/components/interview/LottieAvatar";
import {
  WebRTCAudioManager,
  type WebRTCManagerConfig,
} from "@/lib/audio/WebRTCAudioManager";
import { GeminiAudioManager } from "@/lib/audio/GeminiAudioManager";
import { getOpenAIKey, getProviderKey } from "@/lib/keys/store";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  configurationFromContext,
  type InterviewConfiguration,
} from "@/lib/interview/config";
import { speechKind, silenceAction } from "@/lib/interview/turn-policy";
import type { ParsingResult } from "@/lib/pdf/result";
import type { ProviderDiagnostic } from "@/lib/ai/health";
import { spokenLanguagePolicy } from "@/lib/interview/language";
export interface GitHubEnrichment {
  profile: {
    name: string | null;
    bio: string | null;
    public_repos: number;
    followers: number;
    company: string | null;
  };
  top_repos: Array<{
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    topics: string[];
    readme?: string;
    reasons?: string[];
  }>;
  top_languages: string[];
  github_url: string;
}
export interface InterviewContext {
  reviewSourceId?: string;
  sponsored?: boolean;
  accessMode?: "byok" | "demo" | "reviewer";
  demoExpiresAt?: number;
  configuration?: InterviewConfiguration;
  returnTo?: string;
  cvParsing?: ParsingResult;
  sessionId: string;
  candidateName: string;
  jobTitle: string;
  jobDescription?: string;
  questionTopic?: string;
  questionLevel?: "easy" | "medium" | "hard" | "";
  questionCount?: number | "";
  customQuestions?: string[];
  preferredLanguage?: string;
  resumeUrl?: string;
  resumeText?: string;
  githubEnrichment?: GitHubEnrichment;
  startedAt: number;
  interviewMode: "voice" | "text";
  allowedModes: "audio_only" | "audio_and_text";
  visualPanel?: "none" | "code" | "whiteboard" | "code_review";
  codeDiff?: string;
}
type Status =
  | "setup"
  | "connecting"
  | "active"
  | "paused"
  | "completed"
  | "error";
interface InterviewState {
  status: Status;
  avatarState: AvatarState;
  transcript: Array<{ role: "user" | "assistant"; text: string }>;
  activeDeltaMessage: string;
  candidateDeltaMessage: string;
  isMicMuted: boolean;
  error: string | null;
  _sessionContext?: InterviewContext;
  manager: WebRTCAudioManager | GeminiAudioManager | null;
  localStream: MediaStream | null;
  _subtitleBuffer: string;
  _isDrainingSubtitle: boolean;
  _resumeInstructions?: string;
  turnNotice: string;
  turnsAsked: number;
  diagnostic: ProviderDiagnostic | null;
  microphoneIssue: boolean;
  setStatus: (status: Status) => void;
  setAvatarState: (state: AvatarState) => void;
  addTranscriptLine: (role: "user" | "assistant", text: string) => void;
  toggleMic: () => void;
  sendTextMessage: (text: string) => void;
  editCandidateDraft: (text: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
  reset: () => void;
  endInterview: () => void;
  repeatQuestion: () => void;
  skipQuestion: () => void;
}
const CLOSE_INSTRUCTIONS =
  "The turn budget is exhausted. Do not ask another question. Thank the candidate and call end_interview.";
let repeatRequested = false;
let connectionEpoch = 0,
  turnTimer: ReturnType<typeof setTimeout> | undefined,
  silenceTimer: ReturnType<typeof setInterval> | undefined;
function clearTimers() {
  clearTimeout(turnTimer);
  clearInterval(silenceTimer);
}
export const useInterviewStore = create<InterviewState>()(
  persist(
    (set, get) => ({
      status: "setup",
      avatarState: "idle",
      transcript: [],
      activeDeltaMessage: "",
      candidateDeltaMessage: "",
      isMicMuted: false,
      error: null,
      manager: null,
      localStream: null,
      _subtitleBuffer: "",
      _isDrainingSubtitle: false,
      turnNotice: "",
      turnsAsked: 0,
      diagnostic: null,
      microphoneIssue: false,
      setStatus: (status) => set({ status }),
      setAvatarState: (avatarState) => set({ avatarState }),
      addTranscriptLine: (role, text) => {
        if (text.trim())
          set((s) => ({ transcript: [...s.transcript, { role, text }] }));
      },
      toggleMic: () => {
        const next = !get().isMicMuted;
        get()
          .localStream?.getAudioTracks()
          .forEach((t) => {
            t.enabled =
              !next &&
              get().avatarState !== "speaking" &&
              get().avatarState !== "thinking";
          });
        set({
          isMicMuted: next,
          turnNotice: next
            ? "Microphone muted. This is not scored."
            : get().avatarState === "speaking" ||
                get().avatarState === "thinking"
              ? "Please wait until the interviewer finishes speaking."
              : "",
        });
      },
      sendTextMessage: (text) => {
        if (
          get().status !== "active" ||
          speechKind(text) !== "meaningful" ||
          get().avatarState === "speaking" ||
          get().avatarState === "thinking"
        )
          return;
        clearTimeout(turnTimer);
        get().addTranscriptLine("user", text);
        set({ candidateDeltaMessage: "", turnNotice: "" });
        get().manager?.sendTextMessage(
          text,
          get().turnsAsked >=
            configurationFromContext(get()._sessionContext!).maxTurns
            ? CLOSE_INSTRUCTIONS
            : undefined
        );
      },
      editCandidateDraft: (text) => set({ candidateDeltaMessage: text }),
      repeatQuestion: () => {
        if (
          get().status !== "active" ||
          get().avatarState === "speaking" ||
          get().avatarState === "thinking"
        )
          return;
        set({ turnNotice: "" });
        repeatRequested = true;
        clearTimeout(turnTimer);
        const question = [...get().transcript]
          .reverse()
          .find((t) => t.role === "assistant")?.text;
        get().manager?.sendEvent({
          type: "response.create",
          response: {
            instructions: `Repeat this question without advancing the interview or counting a new turn: ${JSON.stringify(question || "Ask the current core question")}`,
          },
        });
      },
      skipQuestion: () => {
        if (
          get().status !== "active" ||
          get().avatarState === "speaking" ||
          get().avatarState === "thinking"
        )
          return;
        get().addTranscriptLine(
          "user",
          "[No Evidence Collected — candidate skipped this question]"
        );
        set({ turnNotice: "" });
        get().manager?.sendEvent({
          type: "response.create",
          response: {
            instructions:
              get().turnsAsked >=
              configurationFromContext(get()._sessionContext!).maxTurns
                ? CLOSE_INSTRUCTIONS
                : "The candidate skipped. Record No Evidence Collected without penalty. Ask the next planned competency question.",
          },
        });
      },
      connect: async () => {
        if (get().status === "connecting" || get().status === "active") return;
        const epoch = ++connectionEpoch;
        clearTimers();
        set({
          status: "connecting",
          error: null,
          turnNotice: "",
          microphoneIssue: false,
        });
        let callId = "",
          closedCall = "";
        try {
          const context = get()._sessionContext;
          if (!context)
            throw Error(
              "Interview configuration is missing. Return to Setup to create or restore it."
            );
          const sponsored = context.sponsored === true,
            key = sponsored ? null : getOpenAIKey();
          if (!sponsored && !key)
            throw Error(
              "Add your OpenAI key in Settings, then retry. Your interview configuration is preserved."
            );
          const configuration = configurationFromContext(context);
          const geminiKey =
            !sponsored && configuration.voiceProvider === "gemini"
              ? getProviderKey("gemini")
              : undefined;
          if (
            !sponsored &&
            configuration.voiceProvider === "gemini" &&
            !geminiKey
          )
            throw Error(
              "Add a Gemini key in Settings for this voice option. OpenAI is also required for transcription."
            );
          if (!navigator.mediaDevices?.getUserMedia)
            throw Error(
              "Microphone access requires HTTPS or localhost and a supported browser."
            );
          const localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
          });
          if (epoch !== connectionEpoch) {
            localStream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStream.getAudioTracks().forEach((t) => {
            t.enabled = !get().isMicMuted;
            t.onended = () => {
              if (epoch === connectionEpoch) {
                get().interrupt();
                set({
                  microphoneIssue: true,
                  error:
                    "Microphone disconnected. Check your device and retry; this does not affect competency scoring.",
                });
              }
            };
          });
          set({ localStream });
          let candidateSpeaking = false,
            waitingSince = 0,
            repeatPending = false,
            playbackActive = false,
            candidateDraftBase = "";
          const setCandidateCapture = (enabled: boolean) => {
            localStream.getAudioTracks().forEach((track) => {
              track.enabled = enabled && !get().isMicMuted;
            });
          };
          const waitForCandidate = () => {
            waitingSince = Date.now();
            setCandidateCapture(true);
            set({ avatarState: "listening", turnNotice: "" });
          };
          const managerConfig: WebRTCManagerConfig = {
            languagePolicy: spokenLanguagePolicy(configuration.language),
            ephemeralToken: "",
            exchangeSdp: async (sdp) => {
              const response = await fetch("/api/realtime", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(!sponsored ? { "x-openai-key": key! } : {}),
                },
                body: JSON.stringify({
                  sdp,
                  sessionId: context.sessionId,
                  language: configuration.language,
                  configuration,
                  role:
                    context.jobTitle + "\n" + (context.jobDescription || ""),
                  cv: context.resumeText?.slice(0, 24000),
                  projects: context.githubEnrichment
                    ? JSON.stringify(context.githubEnrichment.top_repos).slice(
                        0,
                        12000
                      )
                    : undefined,
                  recovery: get()._resumeInstructions?.slice(0, 8000),
                }),
              });
              const data = await response.json();
              if (data.diagnostic) set({ diagnostic: data.diagnostic });
              if (!response.ok)
                throw Error(data.error || "Voice initialization failed.");
              callId = data.callId || "";
              return data.sdp;
            },
            onClose: () => {
              const closeId = sponsored
                ? context.sessionId + ":" + callId
                : callId;
              if (!closeId || closedCall === closeId) return;
              closedCall = closeId;
              void fetch("/api/realtime", {
                method: "DELETE",
                keepalive: true,
                headers: {
                  "Content-Type": "application/json",
                  ...(!sponsored ? { "x-openai-key": key! } : {}),
                },
                body: JSON.stringify(
                  sponsored ? { sessionId: context.sessionId } : { callId }
                ),
              }).catch(() => {});
            },
            onMessage: (type, payload) => {
              if (epoch !== connectionEpoch) return;
              const text = typeof payload === "string" ? payload : "";
              if (type === "provider_diagnostic") {
                set({ diagnostic: payload as ProviderDiagnostic });
              } else if (type === "ready") {
                manager.sendEvent({ type: "response.create" });
              } else if (type === "user_started_speaking") {
                if (playbackActive || get().avatarState === "thinking") {
                  set({
                    turnNotice:
                      "Please wait until the interviewer finishes speaking.",
                  });
                  return;
                }
                if (!candidateSpeaking)
                  candidateDraftBase = get().candidateDeltaMessage.trim();
                candidateSpeaking = true;
                clearTimeout(turnTimer);
                set({ turnNotice: "", avatarState: "listening" });
              } else if (type === "user_stopped_speaking") {
                candidateSpeaking = false;
              } else if (type === "user_transcript_partial") {
                if (playbackActive || get().avatarState === "thinking") return;
                const combined = [candidateDraftBase, text.trim()]
                  .filter(Boolean)
                  .join(" ");
                set({ candidateDeltaMessage: combined });
              } else if (type === "user_transcript_done") {
                if (playbackActive || get().avatarState === "thinking") return;
                if (speechKind(text) !== "meaningful") {
                  if (!candidateSpeaking)
                    set({
                      turnNotice:
                        "That sounded like a filler. Add more detail, or type an answer before sending.",
                    });
                  return;
                }
                waitingSince = 0;
                clearTimeout(turnTimer);
                candidateDraftBase = [candidateDraftBase, text.trim()]
                  .filter(Boolean)
                  .join(" ");
                set({
                  candidateDeltaMessage: candidateDraftBase,
                  turnNotice:
                    "Review your transcript. Edit it if needed, then choose Send answer.",
                  avatarState: "listening",
                });
              } else if (type === "ai_thinking") {
                waitingSince = 0;
                setCandidateCapture(false);
                set({
                  avatarState: "thinking",
                  activeDeltaMessage: "",
                  turnNotice: "",
                });
              } else if (type === "ai_speaking") {
                waitingSince = 0;
                playbackActive = true;
                setCandidateCapture(false);
                set({ avatarState: "speaking" });
              } else if (type === "transcript_delta")
                set((s) => ({
                  activeDeltaMessage: s.activeDeltaMessage + text,
                }));
              else if (type === "transcript_done") {
                const message = text || get().activeDeltaMessage;
                get().addTranscriptLine("assistant", message);
                const previous = get()
                  .transcript.slice(0, -1)
                  .filter((t) => t.role === "assistant");
                repeatPending =
                  repeatRequested || previous.at(-1)?.text === message;
                repeatRequested = false;
                set((s) => ({
                  activeDeltaMessage: "",
                  _subtitleBuffer: "",
                  _isDrainingSubtitle: false,
                  turnsAsked: s.turnsAsked + (repeatPending ? 0 : 1),
                }));
              } else if (type === "audio_playback_done") {
                playbackActive = false;
                setCandidateCapture(true);
                waitForCandidate();
              } else if (type === "ai_done" && !playbackActive)
                waitForCandidate();
              else if (type === "end_interview") get().endInterview();
              else if (type === "transcription_failed") {
                get().interrupt();
                set({
                  microphoneIssue: true,
                  error:
                    "Transcription failed. Retry the connection; this answer is not scored.",
                });
              }
            },
            onDisconnect: () => {
              if (epoch === connectionEpoch) {
                get().interrupt();
                set({
                  error:
                    "Connection interrupted. Retry Connection will preserve completed answers.",
                });
              }
            },
          };
          const manager =
            configuration.voiceProvider === "gemini"
              ? new GeminiAudioManager({
                  ...managerConfig,
                  geminiKey: geminiKey || undefined,
                  body: {
                    sessionId: context.sessionId,
                    configuration,
                    role:
                      context.jobTitle + "\n" + (context.jobDescription || ""),
                    cv: context.resumeText?.slice(0, 24000),
                    projects: context.githubEnrichment
                      ? JSON.stringify(
                          context.githubEnrichment.top_repos
                        ).slice(0, 12000)
                      : undefined,
                    recovery: get()._resumeInstructions?.slice(0, 8000),
                  },
                })
              : new WebRTCAudioManager(managerConfig);
          set({
            manager,
            turnsAsked: get().transcript.filter((t) => t.role === "assistant")
              .length,
          });
          await manager.connect(localStream);
          if (epoch !== connectionEpoch) {
            manager.disconnect();
            localStream.getTracks().forEach((t) => t.stop());
            return;
          }
          set({ status: "active", avatarState: "listening" });
          silenceTimer = setInterval(() => {
            if (epoch !== connectionEpoch || get().status !== "active") return;
            const healthy =
              !get().isMicMuted &&
              localStream
                .getAudioTracks()
                .some((t) => t.readyState !== "ended");
            if (!healthy) {
              set({
                turnNotice:
                  "Check your microphone or unmute. Technical silence is not scored.",
                microphoneIssue: true,
              });
              return;
            }
            if (!waitingSince) return;
            const action = silenceAction(
              Date.now() - waitingSince,
              true,
              candidateSpeaking
            );
            set({
              microphoneIssue: false,
              turnNotice:
                action === "take_your_time"
                  ? "Take your time."
                  : action === "offer_repeat_skip"
                    ? "Would you like the question repeated, or skip it? Skipping collects no evidence."
                    : "",
            });
          }, 500);
        } catch (e) {
          if (epoch !== connectionEpoch) return;
          get().interrupt();
          set({
            error:
              e instanceof Error
                ? e.message
                : "Unable to initialize. Retry or return to setup.",
          });
        }
      },
      interrupt: () => {
        ++connectionEpoch;
        repeatRequested = false;
        clearTimers();
        const { manager, localStream } = get();
        set({
          status: "paused",
          manager: null,
          localStream: null,
          avatarState: "idle",
          _isDrainingSubtitle: false,
          turnNotice: "",
          candidateDeltaMessage: "",
        });
        manager?.disconnect();
        localStream?.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
      },
      disconnect: () => {
        get().interrupt();
        set({ status: "completed" });
      },
      endInterview: () => {
        const context = get()._sessionContext,
          transcript = get().transcript;
        get().disconnect();
        if (context?.reviewSourceId)
          void fetch("/api/reviewer/sessions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: context.reviewSourceId, transcript }),
          }).catch(() =>
            set({
              error:
                "Interview ended; reviewer transcript saving failed. Local recovery is available.",
            })
          );
        if (
          context &&
          !context.sessionId.startsWith("demo-") &&
          !context.sessionId.startsWith("reviewer-")
        ) {
          void updateDoc(doc(db, "interview_sessions", context.sessionId), {
            status: "completed",
            final_transcript: transcript,
            completed_at: serverTimestamp(),
          }).catch(() =>
            set({
              error:
                "Interview ended. Report saving failed; your local recovery record is preserved.",
            })
          );
        }
      },
      reset: () => {
        get().interrupt();
        set({
          status: "setup",
          transcript: [],
          activeDeltaMessage: "",
          candidateDeltaMessage: "",
          _subtitleBuffer: "",
          _isDrainingSubtitle: false,
          _resumeInstructions: undefined,
          error: null,
          isMicMuted: false,
          turnNotice: "",
          turnsAsked: 0,
          microphoneIssue: false,
        });
      },
    }),
    {
      name: "interview-store",
      partialize: (state) => ({ _sessionContext: state._sessionContext }),
    }
  )
);
