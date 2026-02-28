"use client";

import { useInterviewStore } from "@/lib/store/useInterviewStore";
import type { AvatarState } from "@/components/interview/LottieAvatar";

export default function DebugControls() {
    const { avatarState, setAvatarState, status, setStatus } = useInterviewStore();

    const states: { label: string; value: AvatarState }[] = [
        { label: "Idle", value: "idle" },
        { label: "Listen", value: "listening" },
        { label: "Think", value: "thinking" },
        { label: "Speak", value: "speaking" },
    ];

    if (process.env.NODE_ENV !== "development") {
        // Hidden in production, but we might keep it during alpha for tests
    }

    return (
        <div className="absolute top-4 right-4 glass-card p-4 space-y-4 z-50 w-64 max-w-full">
            <div>
                <h3 className="text-sm font-semibold mb-2">Avatar State Debugger</h3>
                <div className="grid grid-cols-2 gap-2">
                    {states.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => setAvatarState(s.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${avatarState === s.value
                                    ? "gradient-primary text-white shadow-md shadow-primary-500/20"
                                    : "bg-[var(--surface-elevated)] text-[var(--muted-foreground)] hover:text-white"
                                }`}
                        >
                            Forcing: {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-2">Interview Status</h3>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-500 transition-colors"
                >
                    <option value="setup">Setup (Waiting)</option>
                    <option value="active">Active (On Call)</option>
                    <option value="completed">Completed</option>
                    <option value="error">Error</option>
                </select>
            </div>
        </div>
    );
}
