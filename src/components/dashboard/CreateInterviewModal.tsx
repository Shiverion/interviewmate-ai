"use client";

import { useState } from "react";
import { createScheduledInterview } from "@/lib/firebase/interviews";
import { useAuthContext } from "@/components/providers/AuthProvider";

interface CreateInterviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (sessionId: string) => void;
}

export default function CreateInterviewModal({ isOpen, onClose, onSuccess }: CreateInterviewModalProps) {
    const { user } = useAuthContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [candidateName, setCandidateName] = useState("");
    const [candidateEmail, setCandidateEmail] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [allowedModes, setAllowedModes] = useState<"audio_only" | "audio_and_text">("audio_and_text");

    // Default to today and 3 days from now
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    });

    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Generate a human-readable unique Candidate ID (CAND-1234)
        const generateCandidateId = () => {
            const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digits
            return `CAND-${randomDigits}`;
        };
        const candidateId = generateCandidateId();

        if (!user) {
            setError("You must be logged in to create an interview.");
            return;
        }

        if (!resumeFile) {
            setError("Please upload the candidate's CV (PDF).");
            return;
        }

        setLoading(true);

        try {
            const sessionId = await createScheduledInterview(
                user.uid,
                jobTitle,
                jobDescription,
                candidateName,
                candidateId,
                candidateEmail,
                resumeFile,
                new Date(startDate),
                new Date(endDate),
                allowedModes
            );

            onSuccess(sessionId);
            // Reset state
            setJobTitle("");
            setJobDescription("");
            setCandidateName("");
            setCandidateEmail("");
            setResumeFile(null);
            setAllowedModes("audio_and_text");

            // Reset dates
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setStartDate(now.toISOString().slice(0, 16));

            const future = new Date();
            future.setDate(future.getDate() + 3);
            future.setMinutes(future.getMinutes() - future.getTimezoneOffset());
            setEndDate(future.toISOString().slice(0, 16));

        } catch (err: any) {
            console.error("Error creating interview:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-10 flex justify-between items-center">
                    <h2 className="text-xl font-bold font-heading">Schedule New Interview</h2>
                    <button onClick={onClose} className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-full hover:bg-[var(--surface-elevated)] transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-primary-400">1. Role Details</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Job Title</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                placeholder="e.g. Senior Frontend Developer"
                                value={jobTitle}
                                onChange={e => setJobTitle(e.target.value)}
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
                                onChange={e => setJobDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                        <h3 className="font-semibold text-lg text-primary-400">2. Candidate Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Candidate Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="John Doe"
                                    value={candidateName}
                                    onChange={e => setCandidateName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Candidate Email <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                                <input
                                    type="email"
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="john@example.com"
                                    value={candidateEmail}
                                    onChange={e => setCandidateEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Candidate Resume (PDF)</label>
                            <input
                                required
                                type="file"
                                accept=".pdf,application/pdf"
                                className="w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-500 hover:file:bg-primary-500/20"
                                onChange={e => setResumeFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                        <h3 className="font-semibold text-lg text-primary-400">3. Link Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Start Date</label>
                                <input
                                    required
                                    type="datetime-local"
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">End Date</label>
                                <input
                                    required
                                    type="datetime-local"
                                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Allowed Modes</label>
                            <p className="text-xs text-[var(--muted)] mb-2">Control how the candidate can interact during the interview.</p>
                            <select
                                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                value={allowedModes}
                                onChange={e => setAllowedModes(e.target.value as "audio_only" | "audio_and_text")}
                            >
                                <option value="audio_and_text">Audio & Text (Candidate can speak or type)</option>
                                <option value="audio_only">Audio Only (Forces microphone, prevents typing)</option>
                            </select>
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
                                    Generating...
                                </>
                            ) : (
                                "Generate Link"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
