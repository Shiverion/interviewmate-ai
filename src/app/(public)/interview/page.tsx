"use client";

import { useEffect, useRef, useState } from "react";
import LottieAvatar from "@/components/interview/LottieAvatar";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { getOpenAIKey } from "@/lib/keys/store";

export default function InterviewRoomPage() {
  const {
    avatarState,
    isMicMuted,
    toggleMic,
    status,
    error,
    connect,
    disconnect,
    reset,
    localStream,
    transcript,
    activeDeltaMessage,
    _sessionContext,
    sendTextMessage
  } = useInterviewStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes
  const [chatInput, setChatInput] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationDone, setEvaluationDone] = useState(false);

  // Attach local stream to video element PIP when it becomes available
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Persistent Timer Logic
  useEffect(() => {
    if (status !== "active") return;

    const startedAt = _sessionContext?.startedAt || Date.now();
    const thirtyMinsMs = 30 * 60 * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remainingMs = thirtyMinsMs - elapsed;

      if (remainingMs <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        // Force the AI to stop natively and database to mark completed
        disconnect();
      } else {
        setTimeLeft(Math.ceil(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, _sessionContext?.startedAt, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);

  // Trigger automated evaluation asynchronously on completion
  useEffect(() => {
    // The moment the state transitions to 'completed' and we haven't already hit this toggle
    if (status === "completed" && _sessionContext?.sessionId && !isEvaluating && !evaluationDone) {
      setIsEvaluating(true);
      const apiKey = getOpenAIKey() || "";

      fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openai-key": apiKey
        },
        body: JSON.stringify({ sessionId: _sessionContext.sessionId })
      })
        .then(res => res.json())
        .then(data => {
          console.log("Evaluation complete:", data);
          setIsEvaluating(false);
          setEvaluationDone(true);
        })
        .catch(err => {
          console.error("Eval Error:", err);
          // Fail gracefully so the user isn't stuck waiting forever
          setIsEvaluating(false);
          setEvaluationDone(true);
        });
    }
  }, [status, _sessionContext?.sessionId, isEvaluating, evaluationDone]);

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

  if (status === "setup" || status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="max-w-md w-full glass-card p-8 space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.5 7.5 0 01-14.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632zM8 11V7a4 4 0 118 0v4M8 11h8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-heading">Ready for your interview?</h1>
          <p className="text-[var(--muted)] text-sm">
            You will be speaking with an AI interviewer. Please ensure you are in a quiet environment and your microphone is working.
          </p>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-md text-sm text-error text-left content-start">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={connect}
            className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 transition-transform"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
        <p className="text-[var(--muted)] animate-pulse">Connecting to AI Server...</p>
      </div>
    );
  }

  // Completion State & Evaluation Loading Screen
  if (status === "completed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="max-w-md w-full glass-card p-12 space-y-6 relative overflow-hidden">
          {isEvaluating ? (
            <>
              <div className="mx-auto w-16 h-16 relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                <svg className="w-6 h-6 text-primary-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold font-heading">Analyzing Interview...</h2>
              <p className="text-[var(--muted)] text-sm">
                The AI is currently compiling your results and evaluating your responses. Please don't close this window just yet.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-lg shadow-green-500/20">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold font-heading">Interview Complete!</h2>
              <p className="text-[var(--muted)] text-sm">
                Thank you for your time. Your interview has been successfully recorded and processed. You may now close this tab safely.
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
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Stage */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full">
          <div className="relative w-40 h-40 sm:w-56 sm:h-56 mb-6 shrink-0">
            {/* Subtle pulse ring when active */}
            {status === "active" && avatarState === "speaking" && (
              <div className="absolute inset-0 rounded-full border-2 border-primary-500/50 animate-ping opacity-20" />
            )}

            <LottieAvatar state={avatarState} className="w-full h-full drop-shadow-2xl" />
          </div>

          {/* Current State Label */}
          <div className="text-center mb-4 shrink-0">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-medium capitalize text-primary-400">
              <span className="relative flex h-2 w-2">
                {(avatarState === "listening" || avatarState === "speaking") && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
              </span>
              {avatarState}
            </span>
          </div>

          {/* Timer Display */}
          {status === "active" && (
            <div className={`mt-2 font-mono text-sm px-3 py-1 rounded-md border ${timeLeft < 120
              ? "bg-error/10 border-error/20 text-error animate-pulse"
              : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--muted)]"
              }`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")} left
            </div>
          )}
        </div>

        {/* Conditional View: Voice Subtitles vs Text Chat */}
        {isTextMode ? (
          <div className="w-full max-w-2xl flex-1 min-h-0 flex flex-col bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden mt-4 shadow-xl z-10 relative">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {transcript.map((item, i) => (
                <div key={i} className={`flex flex-col ${item.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-[var(--muted)] mb-1 px-1 uppercase tracking-wider opacity-70">
                    {item.role === "user" ? "You" : "AI"}
                  </span>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] ${item.role === "user" ? "bg-primary-500 text-white rounded-br-sm" : "bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-sm"}`}>
                    {item.text}
                  </div>
                </div>
              ))}
              {activeDeltaMessage && (
                <div className="flex flex-col items-start">
                  <span className="text-xs text-[var(--muted)] mb-1 px-1 uppercase tracking-wider opacity-70">AI</span>
                  <div className="px-4 py-2.5 rounded-2xl max-w-[85%] bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-sm">
                    {activeDeltaMessage}<span className="inline-block w-1 h-3 ml-1 bg-primary-400 animate-pulse" />
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
          <div className="w-full max-w-2xl h-32 shrink-0 relative flex flex-col justify-end overflow-hidden mask-image-b-to-t">
            <div className="flex flex-col gap-2 p-4 text-center">
              {transcript.slice(-3).map((item, i) => (
                <p
                  key={i}
                  className={`text-lg transition-all duration-300 ${i === transcript.slice(-3).length - 1
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
              {/* Live Streaming Subtitle */}
              {activeDeltaMessage && (
                <p className="text-lg text-[var(--foreground)] opacity-100 font-medium translate-y-0 transition-all">
                  <span className="opacity-50 text-xs uppercase tracking-wider block mb-1 text-primary-400">
                    AI Interviewer
                  </span>
                  {activeDeltaMessage}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-primary-400 animate-pulse" /> {/* Blinking cursor */}
                </p>
              )}
              {transcript.length === 0 && !activeDeltaMessage && (
                <p className="text-[var(--muted)] opacity-50 italic">Listening for conversation...</p>
              )}
            </div>
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
          <form onSubmit={handleSendChat} className="flex-1 max-w-2xl flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
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
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.5 7.5 0 01-14.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4M8 11h8" />
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
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 11l7-7 7 7M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
