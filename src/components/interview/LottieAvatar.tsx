"use client";
import { memo } from "react";
export type AvatarState = "idle" | "listening" | "thinking" | "speaking";
function InterviewPresence({
  state,
  className = "",
}: {
  state: AvatarState;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 rounded-[32px] border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      <span className="wm-eyebrow">Your AI interviewer</span>
      <div className="wm-wave" aria-hidden="true">
        {Array.from({ length: 13 }, (_, i) => (
          <i
            key={i}
            style={{
              animationPlayState: state === "idle" ? "paused" : "running",
            }}
          />
        ))}
      </div>
      <span className="wm-tag" role="status">
        {state === "idle"
          ? "Ready when you are"
          : state === "thinking"
            ? "Considering your answer"
            : state === "speaking"
              ? "Speaking"
              : "Listening to you"}
      </span>
    </div>
  );
}
export default memo(InterviewPresence);
