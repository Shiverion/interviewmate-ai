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
  DIRECT_RESPONSE_INSTRUCTIONS,
  type InterviewConfiguration,
} from "@/lib/interview/config";
import { speechKind, silenceAction } from "@/lib/interview/turn-policy";
import type { ParsingResult } from "@/lib/pdf/result";
import type { ProviderDiagnostic } from "@/lib/ai/health";
import { spokenLanguagePolicy } from "@/lib/interview/language";
import type { AtsScore } from "@/lib/firebase/interviews";
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
  /** Ledger-based voice reservation id (e.g. "demo-reviewer-<uuid>") used only
   * for the hosted realtime-voice connection's budget bookkeeping, when the
   * interview's own `sessionId` is a real Firestore document id instead. */
  voiceLeaseId?: string;
  sponsored?: boolean;
  accessMode?: "byok" | "demo" | "reviewer";
  demoExpiresAt?: number;
  configuration?: InterviewConfiguration;
  returnTo?: string;
  cvParsing?: ParsingResult;
  atsScore?: AtsScore;
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
  completionCountdown: number | null;
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
  wrapUpNow: () => boolean;
  beginCompletionCountdown: () => void;
}
const COMPLETION_GRACE_SECONDS = 30;
const CLOSE_INSTRUCTIONS =
  "The turn budget is exhausted. Return only a brief closing statement thanking the candidate and saying the interview is finished. Do not ask another question, request more information, say 'next', or invite a response. Call end_interview only after the complete closing statement has been spoken.";
let repeatRequested = false;
// Guards every response.create send against overlapping with one already
// in flight — a second trigger (a duplicate "ready" event, a race between
// repeat/skip and the natural turn flow) previously produced two distinct,
// independently generated AI turns back to back instead of being ignored.
let responsePending = false;
let connectionEpoch = 0,
  turnTimer: ReturnType<typeof setTimeout> | undefined,
  silenceTimer: ReturnType<typeof setInterval> | undefined,
  completionTimer: ReturnType<typeof setInterval> | undefined;
function clearTimers() {
  clearTimeout(turnTimer);
  clearInterval(silenceTimer);
}
function clearCompletionTimer() {
  clearInterval(completionTimer);
  completionTimer = undefined;
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
      completionCountdown: null,
      diagnostic: null,
      microphoneIssue: false,
      setStatus: (status) => set({ status }),
      setAvatarState: (avatarState) => set({ avatarState }),
      addTranscriptLine: (role, text) => {
        if (text.trim())
          set((s) => ({ transcript: [...s.transcript, { role, text }] }));
      },
      toggleMic: () => {
        if (get().completionCountdown !== null) return;
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
          get().completionCountdown !== null ||
           speechKind(text) !== "meaningful" ||
           get().avatarState === "speaking" ||
           get().avatarState === "thinking" ||
           responsePending
         )
           return;
        clearTimeout(turnTimer);
        // Lock immediately, before the provider emits ai_thinking. Without
        // this small gap two fast clicks could create two response.create
        // events and make the interviewer answer twice.
        responsePending = true;
        get().addTranscriptLine("user", text);
        set({ candidateDeltaMessage: "", turnNotice: "" });
        get().manager?.sendTextMessage(
          text,
          get().turnsAsked >=
            configurationFromContext(get()._sessionContext!).maxTurns - 1
            ? CLOSE_INSTRUCTIONS
            : DIRECT_RESPONSE_INSTRUCTIONS
        );
      },
      editCandidateDraft: (text) => set({ candidateDeltaMessage: text }),
      repeatQuestion: () => {
        if (
          get().status !== "active" ||
          get().completionCountdown !== null ||
          get().avatarState === "speaking" ||
          get().avatarState === "thinking" ||
          responsePending
        )
          return;
        set({ turnNotice: "" });
        repeatRequested = true;
        responsePending = true;
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
          get().completionCountdown !== null ||
          get().avatarState === "speaking" ||
          get().avatarState === "thinking" ||
          responsePending
        )
          return;
        get().addTranscriptLine(
          "user",
          "[No Evidence Collected — candidate skipped this question]"
        );
        set({ turnNotice: "" });
        responsePending = true;
        get().manager?.sendEvent({
          type: "response.create",
          response: {
            instructions:
              get().turnsAsked >=
              configurationFromContext(get()._sessionContext!).maxTurns - 1
                ? CLOSE_INSTRUCTIONS
                : "The candidate skipped. Record No Evidence Collected without penalty. Ask the next planned competency question.",
          },
        });
      },
      wrapUpNow: () => {
        if (
          get().status !== "active" ||
          get().completionCountdown !== null ||
          get().avatarState === "speaking" ||
          get().avatarState === "thinking" ||
          responsePending
        )
          return false;
        responsePending = true;
        get().manager?.sendEvent({
          type: "response.create",
          response: {
            instructions:
              "The session's time budget is almost up. Skip any remaining questions, deliver a brief closing statement thanking the candidate for their time, and only then call end_interview. Do not ask anything further.",
          },
        });
        return true;
      },
      beginCompletionCountdown: () => {
        if (
          get().status !== "active" ||
          get().completionCountdown !== null
        )
          return;
        clearCompletionTimer();
        get()
          .localStream?.getAudioTracks()
          .forEach((track) => (track.enabled = false));
        set({ completionCountdown: COMPLETION_GRACE_SECONDS });
        completionTimer = setInterval(() => {
          const remaining = get().completionCountdown;
          if (remaining === null) {
            clearCompletionTimer();
            return;
          }
          if (remaining <= 1) {
            clearCompletionTimer();
            set({ completionCountdown: null });
            get().endInterview();
            return;
          }
          set({ completionCountdown: remaining - 1 });
        }, 1000);
      },
      connect: async () => {
        if (get().status === "connecting" || get().status === "active") return;
        const epoch = ++connectionEpoch;
        // Reconnects start a fresh transport. Never carry the prior
        // connection's response lock into the new opening turn.
        responsePending = false;
        repeatRequested = false;
        clearTimers();
        clearCompletionTimer();
        set({
          status: "connecting",
          error: null,
          completionCountdown: null,
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
          const audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          };
          let localStream: MediaStream;
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
              audio: audioConstraints,
            });
          } catch {
            // Camera is a local self-view convenience only; never let a denied
            // or missing camera block the interview itself.
            localStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: audioConstraints,
            });
          }
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
          const recoveryInstructions = get()._resumeInstructions?.trim(),
            hasAssistantTranscript = get().transcript.some(
              (t) => t.role === "assistant"
            );
          let candidateSpeaking = false,
            waitingSince = 0,
            repeatPending = false,
            playbackActive = false,
            endAfterPlayback = false,
            candidateDraftBase = "",
            // A fresh session needs one opening response. Reconnects with
            // completed assistant content must not greet the candidate again;
            // recovery connections send only their replacement instructions.
            openingResponseSent = hasAssistantTranscript && !recoveryInstructions;
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
                  sessionId: context.voiceLeaseId || context.sessionId,
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
              const voiceId = context.voiceLeaseId || context.sessionId;
              const closeId = sponsored ? voiceId + ":" + callId : callId;
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
                  sponsored ? { sessionId: voiceId } : { callId }
                ),
              }).catch(() => {});
            },
            onMessage: (type, payload) => {
              if (epoch !== connectionEpoch) return;
              const text = typeof payload === "string" ? payload : "";
              if (type === "provider_diagnostic") {
                set({ diagnostic: payload as ProviderDiagnostic });
              } else if (type === "ready") {
                if (!openingResponseSent && !responsePending) {
                  openingResponseSent = true;
                  responsePending = true;
                  manager.sendEvent({
                    type: "response.create",
                    ...(recoveryInstructions
                      ? { response: { instructions: recoveryInstructions } }
                      : {}),
                  });
                }
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
                const normalizedMessage = message.trim();
                // The opening is requested once per connection. Some realtime
                // providers can nevertheless surface a second assistant item
                // before the candidate has submitted an answer. Treat that as
                // a duplicate opening instead of showing two questions at
                // once; subsequent turns still require a candidate message.
                const hasCandidateAnswer = get().transcript.some(
                  (t) => t.role === "user"
                );
                if (
                  normalizedMessage &&
                  !recoveryInstructions &&
                  !hasCandidateAnswer &&
                  get().turnsAsked === 0 &&
                  get().transcript.some((t) => t.role === "assistant") &&
                  !repeatRequested
                ) {
                  responsePending = false;
                  set({
                    activeDeltaMessage: "",
                    _subtitleBuffer: "",
                    _isDrainingSubtitle: false,
                  });
                  return;
                }
                const previousAssistant = get().transcript
                  .filter((t) => t.role === "assistant")
                  .at(-1)?.text.trim();
                // A provider may expose one completed response through more
                // than one transcript event. Keep a single visible bubble
                // and avoid counting an exact duplicate as another turn.
                if (
                  normalizedMessage &&
                  !repeatRequested &&
                  previousAssistant === normalizedMessage
                ) {
                  responsePending = false;
                  set({
                    activeDeltaMessage: "",
                    _subtitleBuffer: "",
                    _isDrainingSubtitle: false,
                  });
                  return;
                }
                get().addTranscriptLine("assistant", message);
                const previous = get()
                  .transcript.slice(0, -1)
                  .filter((t) => t.role === "assistant");
                repeatPending =
                  repeatRequested || previous.at(-1)?.text === message;
                repeatRequested = false;
                responsePending = false;
                // The very first assistant turn is the opening greeting —
                // exempt from the turn budget per interviewingInstructions().
                const isOpeningGreeting = previous.length === 0;
                set((s) => ({
                  activeDeltaMessage: "",
                  _subtitleBuffer: "",
                  _isDrainingSubtitle: false,
                  turnsAsked:
                    s.turnsAsked +
                    (repeatPending || isOpeningGreeting ? 0 : 1),
                }));
              } else if (type === "audio_playback_done") {
                playbackActive = false;
                if (endAfterPlayback) {
                  endAfterPlayback = false;
                  get().beginCompletionCountdown();
                  return;
                }
                // Some transports finish the response without emitting a
                // transcript_done event (for example when the provider only
                // returns audio). Release the turn lock here as well so the
                // candidate can submit the next answer.
                responsePending = false;
                setCandidateCapture(true);
                waitForCandidate();
              } else if (type === "ai_done" && !playbackActive) {
                // Keep the send guard in sync with providers that signal
                // response completion through ai_done only.
                responsePending = false;
                waitForCandidate();
              }
              else if (type === "end_interview") {
                // Providers can emit the function call while the closing audio
                // is still buffered. Keep the transport alive until playback
                // reports completion so the goodbye is not cut off.
                if (
                  playbackActive ||
                  get().avatarState === "speaking" ||
                  get().avatarState === "thinking"
                ) {
                  endAfterPlayback = true;
                } else get().beginCompletionCountdown();
              }
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
                    sessionId: context.voiceLeaseId || context.sessionId,
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
          const assistantMessageCount = get().transcript.filter(
            (t) => t.role === "assistant"
          ).length;
          set({
            manager,
            // The first assistant message is the opening greeting and is
            // explicitly outside the interview-turn budget. Recompute this
            // the same way after recovery so reconnects do not create an
            // off-by-one early closing.
            turnsAsked: Math.max(0, assistantMessageCount - 1),
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
        responsePending = false;
        clearTimers();
        clearCompletionTimer();
        const { manager, localStream } = get();
        set({
          status: "paused",
          manager: null,
          localStream: null,
          avatarState: "idle",
          completionCountdown: null,
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
        clearCompletionTimer();
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
          completionCountdown: null,
        });
      },
    }),
    {
      name: "interview-store",
      partialize: (state) => ({ _sessionContext: state._sessionContext }),
    }
  )
);
