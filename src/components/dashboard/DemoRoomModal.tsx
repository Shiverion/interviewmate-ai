"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInterviewStore } from "@/lib/store/useInterviewStore";

interface DemoRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
}

async function extractTextFromPdfFile(file: File): Promise<string> {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/parse-resume", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || `Resume parse failed: ${response.status}`);
        }

        const payload = await response.json();
        return typeof payload.text === "string" ? payload.text : "";
    } catch (err) {
        console.warn("[Demo Room] Failed to parse CV text. Continuing without resume text context.", err);
        return "";
    }
}

export default function DemoRoomModal({ isOpen, onClose }: DemoRoomModalProps) {
    const router = useRouter();
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [questionTopic, setQuestionTopic] = useState("");
    const [questionLevel, setQuestionLevel] = useState<"easy" | "medium" | "hard" | "">("");
    const [questionCount, setQuestionCount] = useState<number | "">("");
    const [customQuestionsText, setCustomQuestionsText] = useState("");
    const [preferredLanguage, setPreferredLanguage] = useState("");
    const [candidateName, setCandidateName] = useState("");
    const [interviewMode, setInterviewMode] = useState<"voice" | "text">("voice");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleStartDemo = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!resumeFile) {
            setError("Please upload the candidate's CV (PDF).");
            return;
        }

        if (questionCount !== "" && (questionCount < 1 || questionCount > 10)) {
            setError("Number of questions must be between 1 and 10.");
            return;
        }

        const parsedCustomQuestions = customQuestionsText
            .split("\n")
            .map((q) => q.trim())
            .filter(Boolean)
            .slice(0, 10);

        setLoading(true);
        try {
            const resumeText = await extractTextFromPdfFile(resumeFile);
            useInterviewStore.setState({
                _sessionContext: {
                    sessionId: `demo-${Date.now()}`,
                    candidateName,
                    jobTitle,
                    jobDescription,
                    questionTopic,
                    questionLevel,
                    questionCount,
                    customQuestions: parsedCustomQuestions,
                    preferredLanguage,
                    resumeText,
                    startedAt: Date.now(),
                    interviewMode,
                    allowedModes: "audio_and_text",
                },
            });
            onClose();
            router.push("/interview");
        } catch (err) {
            console.error("Error starting demo room:", err);
            setError("Unable to start demo room right now.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-10 flex justify-between items-center">
                    <h2 className="text-xl font-bold font-heading">Start Demo Room</h2>
                    <button onClick={onClose} className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-full hover:bg-[var(--surface-elevated)] transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleStartDemo} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-primary-400">Demo Interview Details</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Position</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                placeholder="e.g. Senior Frontend Developer"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Job Description</label>
                            <textarea
                                required
                                rows={4}
                                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-y"
                                placeholder="Paste the job description or core requirements here..."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Candidate Name</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                placeholder="John Doe"
                                value={candidateName}
                                onChange={(e) => setCandidateName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Topic <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="e.g. Next.js, product analytics"
                                    value={questionTopic}
                                    onChange={(e) => setQuestionTopic(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Question Level <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                                <select
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    value={questionLevel}
                                    onChange={(e) => setQuestionLevel(e.target.value as "easy" | "medium" | "hard" | "")}
                                >
                                    <option value="">No preference</option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Number of Questions <span className="text-[var(--muted)] font-normal">(optional, max 10)</span></label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="e.g. 6"
                                    value={questionCount}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (!raw) {
                                            setQuestionCount("");
                                            return;
                                        }
                                        const parsed = Number(raw);
                                        if (Number.isFinite(parsed)) {
                                            setQuestionCount(Math.min(10, Math.max(1, parsed)));
                                        }
                                    }}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Custom Interview Questions <span className="text-[var(--muted)] font-normal">(optional, one per line)</span></label>
                                <textarea
                                    rows={4}
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-y"
                                    placeholder="Describe a difficult bug you diagnosed and how you fixed it."
                                    value={customQuestionsText}
                                    onChange={(e) => setCustomQuestionsText(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Language Preference <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                                <select
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    value={preferredLanguage}
                                    onChange={(e) => setPreferredLanguage(e.target.value)}
                                >
                                    <option value="">Auto-detect</option>
                                    <option value="English">English</option>
                                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="French">French</option>
                                    <option value="German">German</option>
                                    <option value="Arabic">Arabic</option>
                                    <option value="Mandarin Chinese">Mandarin Chinese</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Candidate CV (PDF)</label>
                            <input
                                required
                                type="file"
                                accept=".pdf,application/pdf"
                                className="w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-500 hover:file:bg-primary-500/20"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Interview Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setInterviewMode("voice")}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${interviewMode === "voice"
                                        ? "border-primary-500 bg-primary-500/10 text-primary-400"
                                        : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:border-primary-500/50"
                                        }`}
                                >
                                    Voice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInterviewMode("text")}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${interviewMode === "text"
                                        ? "border-primary-500 bg-primary-500/10 text-primary-400"
                                        : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:border-primary-500/50"
                                        }`}
                                >
                                    Text
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-[var(--muted)]">
                                Voice uses microphone conversation. Text uses chat-only interaction.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 rounded-xl gradient-primary text-white font-medium shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                "Enter Demo Room"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
