"use client";

import { useEffect } from "react";
import LottieAvatar from "@/components/interview/LottieAvatar";
import DebugControls from "@/components/interview/DebugControls";
import { useInterviewStore } from "@/lib/store/useInterviewStore";

export default function InterviewRoomPage() {
    const { avatarState, isMicMuted, toggleMic, status, setStatus } = useInterviewStore();

    // On mount, auto-start for the demo
    useEffect(() => {
        setStatus("active");
        return () => setStatus("setup");
    }, [setStatus]);

    return (
        <div className="relative flex flex-col h-[calc(100vh-4rem)] bg-[var(--background)] overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Debug Controls (Dev Only, but kept for demo) */}
            <DebugControls />

            {/* Main Stage */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-w-lg aspect-square mb-8">
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
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-medium capitalize text-primary-400">
                        <span className="relative flex h-2 w-2">
                            {(avatarState === "listening" || avatarState === "speaking") && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${avatarState === "idle" ? "bg-gray-400" :
                                    avatarState === "thinking" ? "bg-accent-400" :
                                        "bg-primary-500"
                                }`}></span>
                        </span>
                        {avatarState}
                    </span>
                </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="h-24 glass border-t border-[var(--border)] flex items-center justify-center gap-6 px-4">
                {/* Toggle Mic */}
                <button
                    onClick={toggleMic}
                    className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ${isMicMuted
                            ? "bg-error/10 text-error hover:bg-error/20 border border-error/20"
                            : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]"
                        }`}
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

                {/* End Call */}
                <button
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-error text-white hover:bg-error/90 transition-all shadow-lg shadow-error/20 hover:-translate-y-1"
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
