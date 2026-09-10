"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LottieAvatar from "@/components/interview/LottieAvatar";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import {
  getOpenAIKey,
  getEvaluationProvider,
  evaluationHeaders,
} from "@/lib/keys/store";
import Link from "next/link";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import EvidenceAssessment from "@/components/interview/EvidenceAssessment";
import HumanReviewPanel from "@/components/interview/HumanReviewPanel";
import RecoveryActions from "@/components/interview/RecoveryActions";
import { type EvidenceAssessment as EvidenceResult } from "@/lib/ai/evidence";
import {
  configurationFromContext,
  defaultConfiguration,
} from "@/lib/interview/config";
import { useSessionIntegrity } from "@/lib/integrity/useSessionIntegrity";
import {
  useInterviewControl,
  resumeControlled,
} from "@/lib/integrity/useInterviewControl";
import {
  IntegrityNotice,
  IntegrityPanel,
} from "@/components/interview/SessionIntegrity";
import IntegrityAlert from "@/components/interview/IntegrityAlert";
import dynamic from "next/dynamic";

const CodeEditor = dynamic(() => import("@/components/interview/CodeEditor"), {
  ssr: false,
});
const Whiteboard = dynamic(() => import("@/components/interview/Whiteboard"), {
  ssr: false,
});
const CodeReview = dynamic(() => import("@/components/interview/CodeReview"), {
  ssr: false,
});

interface EvaluationResult {
  scores: {
    communication: number;
    reasoning: number;
    relevance: number;
    technical_depth?: number;
    production_experience?: number;
    skill_match?: number;
    confidence?: number;
  };
  evidence?: {
    strengths: string[];
    weaknesses: string[];
    notable_moments: string[];
  };
  recommendation?: "strong_hire" | "hire" | "borderline" | "no_hire";
  feedback: string;
  overallScore: number;
  is_passing: boolean;
}

export default function InterviewRoomPage() {
  const language = useInterviewStore(
    (s) => s._sessionContext?.preferredLanguage
  );
  return (
    <div className="wm-interview">
      <InterviewRoomContent />
      <IntegrityAlert
        language={language}
        floatingControls
        recoveryActions={<RecoveryActions retry={false} />}
        onResume={() => resumeControlled(true, language)}
      />
    </div>
  );
}

function InterviewRoomContent() {
  const [evidenceResult, setEvidenceResult] = useState<EvidenceResult | null>(
    null
  );
  const [evaluationModel, setEvaluationModel] = useState("not recorded");
  const [evaluationProvider, setEvaluationProvider] = useState("not recorded");
  const turnNotice = useInterviewStore((s) => s.turnNotice);
  const router = useRouter();
  const {
    avatarState,
    isMicMuted,
    toggleMic,
    status,
    error,
    localStream,
    transcript,
    activeDeltaMessage,
    _sessionContext,
    sendTextMessage,
  } = useInterviewStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationDone, setEvaluationDone] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const sessionId = _sessionContext?.sessionId;
  const candidateName = _sessionContext?.candidateName;
  const jobTitle = _sessionContext?.jobTitle;
  const jobDescription = _sessionContext?.jobDescription;
  const visualPanel = _sessionContext?.visualPanel ?? "none";
  const codeDiff = _sessionContext?.codeDiff ?? "";
  const isDemoSession = !!sessionId && sessionId.startsWith("demo-");
  const hasVisualPanel = visualPanel !== "none" && status === "active";
  const control = useInterviewControl(
    sessionId || "standalone-interview",
    status,
    true,
    sessionId
  );
  const timeLeft = Math.ceil((control.record?.remainingMs ?? 1800000) / 1000);
  const [demoSeconds, setDemoSeconds] = useState<number | null>(null);
  useEffect(() => {
    const expiry = _sessionContext?.demoExpiresAt;
    if (!expiry) return;
    const update = () =>
      setDemoSeconds(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [_sessionContext?.demoExpiresAt]);
  const monitorStatus =
    control.record &&
    ["running", "paused", "final_warning"].includes(control.record.phase)
      ? "active"
      : status;
  const integrity = useSessionIntegrity(
    sessionId || "standalone-interview",
    monitorStatus,
    sessionId
  );

  // Attach local stream to video element PIP when it becomes available
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Control hook checkpoints and stops transport on unmount; answers survive recovery.

  const evaluationRequested = useRef<string | null>(null);
  // Trigger automated evaluation asynchronously on completion
  useEffect(() => {
    // The moment the state transitions to 'completed' and we haven't already hit this toggle
    if (
      status === "completed" &&
      control.record?.phase !== "ended" &&
      sessionId &&
      !isEvaluating &&
      !evaluationDone &&
      evaluationRequested.current !== sessionId
    ) {
      evaluationRequested.current = sessionId;
      queueMicrotask(() => setIsEvaluating(true));
      const sponsored = _sessionContext?.sponsored === true;

      fetch(sponsored ? "/api/demo/evaluate" : "/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(!sponsored ? evaluationHeaders() : {}),
        },
        body: JSON.stringify({
          sessionId,
          provider: getEvaluationProvider(),
          configuration: _sessionContext
            ? configurationFromContext(_sessionContext)
            : defaultConfiguration(),
          allowFallback:
            localStorage.getItem("interviewmate_allow_fallback") === "true",
          transcript,
          candidateName,
          jobTitle,
          jobDescription: jobDescription || "",
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || `Evaluation failed (${res.status})`);
          }
          return data;
        })
        .then((data) => {
          if (data?.evaluation) {
            if (data.evaluation.schemaVersion === "competency-evidence-v2") {
              setEvidenceResult(data.evaluation);
              setEvaluationModel(data.model || "unknown");
              setEvaluationProvider(data.provider || "unknown");
              if (_sessionContext?.reviewSourceId)
                void fetch("/api/reviewer/sessions", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: _sessionContext.reviewSourceId,
                    evaluation: data.evaluation,
                    transcript,
                    model: data.model,
                    provider: data.provider,
                  }),
                }).then((r) => {
                  if (!r.ok)
                    setEvaluationError(
                      "Assessment saved locally; reviewer report saving failed."
                    );
                });
              localStorage.setItem(
                `interviewmate-assessment-${sessionId}`,
                JSON.stringify({
                  evaluation: data.evaluation,
                  transcript,
                  model: data.model,
                  provider: data.provider,
                  source: sessionId,
                })
              );
              if (!isDemoSession && isFirebaseReady())
                void updateDoc(doc(db, "interview_sessions", sessionId), {
                  evaluation: data.evaluation,
                  evaluation_model: data.model,
                  evaluation_provider: data.provider,
                  status: "evaluated",
                }).catch(() =>
                  setEvaluationError(
                    "Assessment saved locally; hosted report saving failed."
                  )
                );
            } else setEvaluationResult(data.evaluation as EvaluationResult);
          }
          setIsEvaluating(false);
          setEvaluationDone(true);
        })
        .catch((err) => {
          console.error("Eval Error:", err);
          setEvaluationError(err?.message || "Failed to generate evaluation.");
          // Fail gracefully so the user isn't stuck waiting forever
          setIsEvaluating(false);
          setEvaluationDone(true);
        });
    }
  }, [
    status,
    control.record?.phase,
    sessionId,
    transcript,
    candidateName,
    jobTitle,
    jobDescription,
    isDemoSession,
    isEvaluating,
    evaluationDone,
    _sessionContext?.sponsored,
    _sessionContext,
  ]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, activeDeltaMessage]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendTextMessage(chatInput.trim());
    setChatInput("");
  };

  const isTextMode = _sessionContext?.interviewMode === "text";
  if (status === "completed" && evidenceResult)
    return (
      <div className="wm-page max-w-4xl">
        <h1 className="wm-heading">Interview evidence</h1>
        <EvidenceAssessment assessment={evidenceResult} />
        {_sessionContext?.accessMode === "reviewer" && (
          <HumanReviewPanel
            assessment={evidenceResult}
            transcript={transcript}
            source={{
              sessionId: _sessionContext?.reviewSourceId || sessionId,
              transcriptVersion: "live-transcript-v2",
              model: evaluationModel,
              provider: evaluationProvider,
              synthetic: true,
            }}
          />
        )}
        {evaluationError && <p role="alert">{evaluationError}</p>}
        <RecoveryActions retry={false} />
      </div>
    );

  if (status === "setup" || status === "error" || status === "paused") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="max-w-md w-full glass-card p-8 space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7.5 7.5 0 01-14.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632zM8 11V7a4 4 0 118 0v4M8 11h8"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-heading">
            Ready for your interview?
          </h1>
          <p className="text-[var(--muted)] text-sm">
            You will be speaking with an AI interviewer. Please ensure you are
            in a quiet environment and your microphone is working.
          </p>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-md text-sm text-error text-left content-start">
              ⚠️ {error}
            </div>
          )}

          <IntegrityNotice language={_sessionContext?.preferredLanguage} />
          <IntegrityPanel
            language={_sessionContext?.preferredLanguage}
            showAlert={false}
          />
          {!_sessionContext?.sponsored && !getOpenAIKey() && (
            <p className="wm-note">
              Live voice needs an OpenAI key.{" "}
              <Link href="/settings">Add one in Models & access</Link> or{" "}
              <Link href="/demo">try the free reviewer demo</Link>.
            </p>
          )}
          {_sessionContext?.sponsored && (
            <p className="wm-note">
              Hosted voice · The displayed funding deadline includes pauses.
              Microphone only; no camera required.
            </p>
          )}

          <button
            onClick={() => {
              void resumeControlled(
                true,
                _sessionContext?.preferredLanguage
              ).catch(() => {});
            }}
            disabled={
              !_sessionContext ||
              (!_sessionContext?.sponsored && !getOpenAIKey()) ||
              integrity.record?.acknowledgedAt == null ||
              ["ended", "completed"].includes(control.record?.phase || "")
            }
            className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 transition-transform"
          >
            Start Interview
          </button>
          <RecoveryActions retry={status === "paused" || status === "error"} />
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <RecoveryActions retry={false} />
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
        <p className="text-[var(--muted)] animate-pulse">
          Connecting to AI Server...
        </p>
      </div>
    );
  }

  // Completion State & Evaluation Loading Screen
  if (status === "completed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <IntegrityPanel
          language={_sessionContext?.preferredLanguage}
          showAlert={false}
        />
        <div className="max-w-2xl w-full glass-card p-8 md:p-10 space-y-6 relative overflow-hidden">
          {control.record?.phase === "ended" ? (
            <>
              <h2 className="text-2xl font-bold">
                Session ended — recruiter review needed
              </h2>
              <p>
                Completed answers are retained. Automatic evaluation was skipped
                for this interrupted session; contact your recruiter to discuss
                what happened.
              </p>
            </>
          ) : isEvaluating ? (
            <>
              <div className="mx-auto w-16 h-16 relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                <svg
                  className="w-6 h-6 text-primary-500 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold font-heading">
                Analyzing Interview...
              </h2>
              <p className="text-[var(--muted)] text-sm">
                The AI is currently compiling your results and evaluating your
                responses. Please do not close this window just yet.
              </p>
            </>
          ) : isDemoSession ? (
            <>
              <h2 className="text-2xl font-bold font-heading">
                Demo Interview Complete
              </h2>

              {evaluationResult ? (
                <div className="space-y-5 text-left">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[var(--muted)]">
                        Overall Score
                      </p>
                      <span
                        className={`text-sm font-semibold ${evaluationResult.is_passing ? "text-green-500" : "text-red-500"}`}
                      >
                        {_sessionContext?.sponsored
                          ? "For human review"
                          : evaluationResult.is_passing
                            ? "Pass"
                            : "Needs Improvement"}
                      </span>
                    </div>
                    <p className="mt-2 text-4xl font-bold font-heading gradient-text">
                      {Math.round(evaluationResult.overallScore)}%
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(evaluationResult.scores).map(
                      ([key, score]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
                        >
                          <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p
                            className={`mt-1 text-lg font-semibold ${Number(score) >= 80 ? "text-green-400" : Number(score) >= 60 ? "text-yellow-400" : "text-red-400"}`}
                          >
                            {Math.round(Number(score))}%
                          </p>
                        </div>
                      )
                    )}
                  </div>
                  {evaluationResult.recommendation && (
                    <div
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold uppercase tracking-wider self-start ${
                        evaluationResult.recommendation === "strong_hire"
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : evaluationResult.recommendation === "hire"
                            ? "bg-accent-500/10 text-accent-400 border-accent-500/30"
                            : evaluationResult.recommendation === "borderline"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                              : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      {evaluationResult.recommendation.replace(/_/g, " ")}
                    </div>
                  )}

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">
                      AI Feedback
                    </p>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {evaluationResult.feedback}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                  {evaluationError ||
                    "Evaluation could not be generated for this demo interview."}
                </div>
              )}

              <button
                onClick={() =>
                  router.push(
                    _sessionContext?.sponsored ? "/demo" : "/dashboard"
                  )
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white font-medium shadow-lg hover:-translate-y-0.5 transition-all"
              >
                {_sessionContext?.sponsored
                  ? "Back to reviewer demo"
                  : "Back to Dashboard"}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-lg shadow-green-500/20">
                <svg
                  className="w-10 h-10 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold font-heading">
                Interview Complete!
              </h2>
              <p className="text-[var(--muted)] text-sm">
                Thank you for your time. Your interview has been successfully
                recorded and processed. You may now close this tab safely.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Calculate dynamic classes
  let dotColor = "bg-primary-500";
  if (avatarState === "idle") dotColor = "bg-gray-400";
  if (avatarState === "thinking") dotColor = "bg-accent-400";

  const micClass = isMicMuted
    ? "bg-error/10 text-error hover:bg-error/20 border-error/20"
    : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)] border-[var(--border)]";

  return (
    <div className="relative flex flex-col h-[calc(100vh-4rem)] bg-[var(--background)] overflow-hidden">
      {turnNotice && (
        <div role="status" className="wm-note text-center m-3">
          {turnNotice}
          <div className="flex justify-center gap-3 mt-2">
            <button
              onClick={() => useInterviewStore.getState().repeatQuestion()}
            >
              Repeat question
            </button>
            <button onClick={() => useInterviewStore.getState().skipQuestion()}>
              Skip · No Evidence Collected
            </button>
          </div>
        </div>
      )}
      <IntegrityPanel
        language={_sessionContext?.preferredLanguage}
        showAlert={false}
      />
      {demoSeconds !== null && (
        <p
          className="text-center text-xs text-[var(--muted)] py-2"
          role="timer"
        >
          Free window: {Math.floor(demoSeconds / 60)}:
          {String(demoSeconds % 60).padStart(2, "0")} · Includes pauses
        </p>
      )}
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Stage — split layout when visual panel is active */}
      <div
        className={`flex-1 min-h-0 flex ${hasVisualPanel ? "flex-row gap-0" : "flex-col items-center justify-center"} p-4 overflow-hidden`}
      >
        {/* AI Interviewer Column */}
        <div
          className={`flex flex-col items-center justify-center ${hasVisualPanel ? "w-72 shrink-0 border-r border-[var(--border)] pr-4" : "flex-1 min-h-0 w-full"}`}
        >
          <div className="relative w-40 h-40 sm:w-56 sm:h-56 mb-6 shrink-0">
            {/* Subtle pulse ring when active */}
            {status === "active" && avatarState === "speaking" && (
              <div className="absolute inset-0 rounded-full border-2 border-primary-500/50 animate-ping opacity-20" />
            )}

            <LottieAvatar
              state={avatarState}
              className="w-full h-full drop-shadow-2xl"
            />
          </div>

          {/* Current State Label */}
          <div className="text-center mb-4 shrink-0">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-medium capitalize text-primary-400">
              <span className="relative flex h-2 w-2">
                {(avatarState === "listening" ||
                  avatarState === "speaking") && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}
                ></span>
              </span>
              {avatarState}
            </span>
          </div>

          {/* Timer Display */}
          {status === "active" && (
            <div
              className={`mt-2 font-mono text-sm px-3 py-1 rounded-md border ${
                timeLeft < 120
                  ? "bg-error/10 border-error/20 text-error animate-pulse"
                  : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {control.record?.unlimited
                ? "Unlimited"
                : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")} left`}
            </div>
          )}

          {/* Conditional View: Voice Subtitles vs Text Chat — inside AI column */}
          {isTextMode ? (
            <div
              className={`${hasVisualPanel ? "w-full flex-1 min-h-0" : "w-full max-w-2xl flex-1 min-h-0"} flex flex-col bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden mt-4 shadow-xl z-10 relative`}
            >
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
              >
                {transcript.map((item, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${item.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <span className="text-xs text-[var(--muted)] mb-1 px-1 uppercase tracking-wider opacity-70">
                      {item.role === "user" ? "You" : "AI"}
                    </span>
                    <div
                      className={`px-4 py-2.5 rounded-2xl max-w-[85%] ${item.role === "user" ? "bg-primary-500 text-white rounded-br-sm" : "bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-sm"}`}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}
                {activeDeltaMessage && (
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-[var(--muted)] mb-1 px-1 uppercase tracking-wider opacity-70">
                      AI
                    </span>
                    <div className="px-4 py-2.5 rounded-2xl max-w-[85%] bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-sm">
                      {activeDeltaMessage}
                      <span className="inline-block w-1 h-3 ml-1 bg-primary-400 animate-pulse" />
                    </div>
                  </div>
                )}
                {transcript.length === 0 && !activeDeltaMessage && (
                  <div className="text-center p-8 opacity-50 italic text-[var(--muted)]">
                    Conversation started. Introduce yourself to begin!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`${hasVisualPanel ? "w-full" : "w-full max-w-2xl"} h-32 shrink-0 relative flex flex-col justify-end overflow-hidden mask-image-b-to-t`}
            >
              <div className="flex flex-col gap-2 p-4 text-center">
                {transcript.slice(-3).map((item, i) => (
                  <p
                    key={i}
                    className={`text-lg transition-all duration-300 ${
                      i === transcript.slice(-3).length - 1
                        ? "text-[var(--foreground)] opacity-100 font-medium translate-y-0"
                        : "text-[var(--muted)] opacity-40 -translate-y-2 scale-95"
                    }`}
                  >
                    <span className="opacity-50 text-xs uppercase tracking-wider block mb-1">
                      {item.role === "assistant" ? "AI Interviewer" : "You"}
                    </span>
                    {item.text}
                  </p>
                ))}
                {activeDeltaMessage && (
                  <p className="text-lg text-[var(--foreground)] opacity-100 font-medium translate-y-0 transition-all">
                    <span className="opacity-50 text-xs uppercase tracking-wider block mb-1 text-primary-400">
                      AI Interviewer
                    </span>
                    {activeDeltaMessage}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-primary-400 animate-pulse" />
                  </p>
                )}
                {transcript.length === 0 && !activeDeltaMessage && (
                  <p className="text-[var(--muted)] opacity-50 italic">
                    Listening for conversation...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Visual Panel Column (code editor / whiteboard / code review) */}
        {hasVisualPanel && sessionId && (
          <div className="flex-1 min-h-0 pl-4 overflow-hidden">
            {visualPanel === "code" && (
              <CodeEditor key={sessionId} sessionId={sessionId} isCandidate={true} />
            )}
            {visualPanel === "whiteboard" && (
              <Whiteboard key={sessionId} sessionId={sessionId} isCandidate={true} />
            )}
            {visualPanel === "code_review" && <CodeReview diff={codeDiff} />}
          </div>
        )}
      </div>

      {/* Picture-in-Picture Webcam */}
      {status === "active" && localStream && (
        <div className="absolute bottom-28 right-4 w-32 md:w-48 aspect-[3/4] md:aspect-video bg-black/50 rounded-lg overflow-hidden border border-[var(--border)] shadow-xl z-50">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100" // mirror effect
          />
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="h-20 shrink-0 glass border-t border-[var(--border)] flex items-center justify-center gap-4 px-4 z-50">
        {isTextMode ? (
          <form
            onSubmit={handleSendChat}
            className="flex-1 max-w-2xl flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-6 py-2 rounded-xl gradient-primary text-white font-medium shadow-lg disabled:opacity-50 transition-all"
            >
              Send
            </button>
          </form>
        ) : (
          /* Toggle Mic */
          <button
            onClick={toggleMic}
            className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 border ${micClass}`}
            title={isMicMuted ? "Unmute" : "Mute"}
          >
            {isMicMuted ? (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  clipRule="evenodd"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7.5 7.5 0 01-14.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0v4M8 11h8"
                />
              </svg>
            )}
          </button>
        )}

        {/* End Call */}
        <button
          onClick={() => {
            // Trigger the formal endInterview process in the store, guaranteeing
            // the state updates to 'completed' so the evaluation pipeline catches it.
            useInterviewStore.getState().endInterview();
          }}
          className="flex items-center justify-center shrink-0 w-14 h-14 rounded-full bg-error text-white hover:bg-error/90 transition-all shadow-lg shadow-error/20 hover:-translate-y-1"
          title="End Interview"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 11l7-7 7 7M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
