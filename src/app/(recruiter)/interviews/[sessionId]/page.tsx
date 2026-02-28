"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function CandidateReportPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const { user } = useAuthContext();

    const [sessionData, setSessionData] = useState<any>(null);
    const [templateData, setTemplateData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !sessionId) return;

        async function fetchReport() {
            if (!isFirebaseReady()) {
                setError("Firebase is not initialized. Please ensure environment variables are configured.");
                setLoading(false);
                return;
            }
            try {
                const sessionRef = doc(db, "interview_sessions", sessionId);
                const sessionSnap = await getDoc(sessionRef);

                if (!sessionSnap.exists()) {
                    setError("Session not found");
                    setLoading(false);
                    return;
                }

                const sData = sessionSnap.data();

                // Security Check: Ensure recruiter owns this session
                if (sData.recruiter_id !== user!.uid) {
                    setError("Unauthorized access");
                    setLoading(false);
                    return;
                }

                setSessionData(sData);

                // Fetch job template for context
                if (sData.template_id) {
                    const templateRef = doc(db, "interview_templates", sData.template_id);
                    const templateSnap = await getDoc(templateRef);
                    if (templateSnap.exists()) {
                        setTemplateData(templateSnap.data());
                    }
                }

            } catch (err: any) {
                console.error("Error fetching report:", err);
                setError(err.message || "Failed to load report");
            } finally {
                setLoading(false);
            }
        }

        fetchReport();
    }, [user, sessionId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !sessionData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold font-heading mb-2">Error Loading Report</h2>
                <p className="text-[var(--muted)] mb-6">{error}</p>
                <Link href="/dashboard" className="px-6 py-2 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl hover:bg-[var(--border)] transition-colors">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const { evaluation, final_transcript, candidate_name, status, created_at, completed_at } = sessionData;
    const isEvaluated = status === "evaluated" && evaluation;

    const downloadTranscript = () => {
        if (!sessionData) return;

        let txt = `====================================================\n`;
        txt += `INTERVIEW TRANSCRIPT & EVALUATION REPORT\n`;
        txt += `====================================================\n\n`;

        txt += `CANDIDATE: ${candidate_name}\n`;
        txt += `ID: ${sessionData.candidate_id || 'N/A'}\n`;
        txt += `ROLE: ${templateData?.job_title || 'Unknown'}\n`;
        txt += `DATE: ${completed_at ? new Date(completed_at.toMillis()).toLocaleString() : new Date(created_at.toMillis()).toLocaleString()}\n`;
        txt += `STATUS: ${status.toUpperCase()}\n`;
        if (isEvaluated && evaluation.is_passing !== undefined) {
            txt += `VERDICT: ${evaluation.is_passing ? 'PASS' : 'FAIL'}\n`;
        }
        txt += `\n`;

        if (isEvaluated) {
            txt += `--- AI EVALUATION MATRIX ---\n`;
            txt += `OVERALL SCORE: ${evaluation.overallScore.toFixed(0)} / 100\n`;
            Object.entries(evaluation.scores).forEach(([key, score]) => {
                txt += `- ${key.toUpperCase()}: ${score} / 100\n`;
            });
            txt += `\nFEEDBACK SUMMARY:\n${evaluation.feedback}\n\n`;
        }

        txt += `--- RAW TRANSCRIPT ---\n\n`;

        if (!final_transcript || final_transcript.length === 0) {
            txt += `(No conversation recorded.)\n`;
        } else {
            final_transcript.forEach((item: any) => {
                const speaker = item.role === 'user' ? candidate_name : 'AI Recruiter';
                txt += `[${speaker}]:\n${item.text}\n\n`;
            });
        }

        txt += `====================================================\n`;
        txt += `Generated by Virtual AI Interview Assistant\n`;

        const blob = new Blob([txt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const safeName = candidate_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${safeName}_interview_report.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-fade-in relative">
            {/* Back Button */}
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
            </Link>

            {/* Header Identity Card */}
            <div className="glass-card p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full pointer-events-none" />

                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${status === 'evaluated' ? 'bg-accent-500/10 text-accent-500 border border-accent-500/20' :
                            status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                status === 'active' ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20' :
                                    'bg-[var(--surface-elevated)] text-[var(--muted)] border border-[var(--border)]'
                            }`}>
                            {status === 'evaluated' ? 'Screened & Scored' : status}
                        </span>

                        <span className="text-sm text-[var(--muted)]">
                            {completed_at ? `Completed on ${new Date(completed_at.toMillis()).toLocaleDateString()}` : `Created on ${new Date(created_at.toMillis()).toLocaleDateString()}`}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-3 mb-2">
                        <h1 className="text-3xl md:text-4xl font-bold font-heading">
                            {candidate_name}
                        </h1>
                        <span className="text-xs font-mono bg-[var(--surface-elevated)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">
                            {sessionData.candidate_id || 'N/A'}
                        </span>
                    </div>
                    <p className="text-lg text-[var(--muted)] flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {templateData?.job_title || "Unknown Role"}
                    </p>
                </div>

                {isEvaluated && evaluation.overallScore !== undefined && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="shrink-0 text-center bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 shadow-xl relative z-10">
                            <p className="text-sm uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">Overall Score</p>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-bold font-heading gradient-text">
                                    {evaluation.overallScore.toFixed(0)}
                                </span>
                                <span className="text-xl text-[var(--muted)] font-medium">%</span>
                            </div>
                        </div>

                        {evaluation.is_passing !== undefined && (
                            <div className={`px-4 py-2 rounded-xl border text-sm font-bold tracking-widest uppercase shadow-lg ${evaluation.is_passing
                                ? 'bg-green-500/10 text-green-500 border-green-500/50 shadow-green-500/10'
                                : 'bg-red-500/10 text-red-500 border-red-500/50 shadow-red-500/10'
                                }`}>
                                {evaluation.is_passing ? 'Pass' : 'Fail'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Evaluation Matrix */}
            {isEvaluated && (
                <div className="mb-8 space-y-6">
                    <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        AI Recruiter Evaluation
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Sub-Scores */}
                        <div className="md:col-span-1 space-y-4">
                            {Object.entries(evaluation.scores).map(([key, score]) => (
                                <div key={key} className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
                                    <span className="capitalize font-medium text-[var(--muted)]">{key}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-2 bg-[var(--background)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${Number(score) >= 80 ? 'bg-accent-500' : Number(score) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${Number(score)}%` }}
                                            />
                                        </div>
                                        <span className="font-bold w-8 text-right text-xs">{String(score)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recruiter Feedback */}
                        <div className="md:col-span-2 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-6 relative">
                            <div className="absolute top-4 right-4 opacity-10">
                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[var(--foreground)] mb-3">Summary Feedback</h3>
                            <p className="text-[var(--muted)] leading-relaxed relative z-10">
                                {evaluation.feedback}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Transcript Viewer */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                        <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.5 7.5 0 01-14.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632zM8 11V7a4 4 0 118 0v4M8 11h8" />
                        </svg>
                        Raw Transcript
                    </h2>

                    {/* Download Button */}
                    <button
                        onClick={downloadTranscript}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Report (.txt)
                    </button>
                </div>

                <div className="glass-card p-6 md:p-8 space-y-6">
                    {!final_transcript || final_transcript.length === 0 ? (
                        <div className="text-center py-12 text-[var(--muted)] italic">
                            No transcript data was captured for this session.
                        </div>
                    ) : (
                        final_transcript.map((item: any, i: number) => (
                            <div key={i} className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <span className={`text-xs font-medium uppercase tracking-wider mb-1 px-2 ${item.role === 'user' ? 'text-primary-400' : 'text-accent-400'}`}>
                                    {item.role === 'user' ? candidate_name.split(' ')[0] : 'AI Recruiter'}
                                </span>
                                <div className={`px-5 py-3 rounded-2xl max-w-[85%] md:max-w-[70%] text-[15px] leading-relaxed shadow-sm ${item.role === 'user'
                                    ? 'bg-primary-500/10 border border-primary-500/20 text-[var(--foreground)] rounded-tr-sm'
                                    : 'bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)] rounded-tl-sm'
                                    }`}>
                                    {item.text}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
