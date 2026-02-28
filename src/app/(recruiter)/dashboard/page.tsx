"use client";

import { useState, useEffect } from "react";
import CreateInterviewModal from "@/components/dashboard/CreateInterviewModal";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function DashboardPage() {
    const { user } = useAuthContext();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function fetchDashboard() {
            try {
                // Fetch simple equality to avoid needing composite indexes early on
                const q = query(
                    collection(db, "interview_sessions"),
                    where("recruiter_id", "==", user!.uid)
                );
                const snapshot = await getDocs(q);

                const fetchedSessions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...(doc.data() as any)
                }));

                // Sort by created_at descending in memory
                fetchedSessions.sort((a, b) => {
                    const timeA = a.created_at?.toMillis() || 0;
                    const timeB = b.created_at?.toMillis() || 0;
                    return timeB - timeA;
                });

                setSessions(fetchedSessions);
            } catch (err) {
                console.error("Error fetching sessions:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [user, generatedLink]); // Re-fetch when a new link is generated

    const handleSuccess = (sessionId: string) => {
        setIsModalOpen(false);
        // Assuming deployment defaults to current origin. Just construct a relative or full link.
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setGeneratedLink(`${origin}/apply/${sessionId}`);
    };

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            showToast("Link copied to clipboard!", "success");
        }
    };

    return (
        <div className="animate-fade-in relative">
            {/* Page header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading tracking-tight">
                        Dashboard
                    </h1>
                    <p className="mt-2 text-[var(--muted)]">
                        Overview of your interview sessions and candidate pipeline.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Schedule Button */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white font-medium shadow-lg shadow-primary-500/20 hover:-translate-y-0.5 transition-all"
                    >
                        Schedule Interview
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>

                    {/* Demo Button to launch Phase 4 testing room */}
                    <Link
                        href="/interview"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] font-medium hover:bg-[var(--border)] transition-all"
                    >
                        Demo Room
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Success Banner */}
            {generatedLink && (
                <div className="mb-8 p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up">
                    <div>
                        <h3 className="font-semibold text-primary-400">Interview Scheduled Successfully!</h3>
                        <p className="text-sm text-[var(--muted)] mt-1">Share this unique, expiring link with your candidate.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-lg p-1.5 w-full sm:w-auto overflow-hidden">
                        <span className="text-sm px-2 truncate max-w-[200px] sm:max-w-xs">{generatedLink}</span>
                        <button
                            onClick={copyToClipboard}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0"
                        >
                            Copy Link
                        </button>
                    </div>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Active Interviews", value: loading ? "..." : sessions.filter(s => s.status === "active").length, color: "primary" },
                    { label: "Candidates Screened", value: loading ? "..." : sessions.filter(s => s.status === "completed" || s.status === "evaluated").length, color: "accent" },
                    {
                        label: "Avg. Score",
                        value: loading ? "..." : (sessions.filter(s => s.status === "evaluated" && s.evaluation?.overallScore !== undefined).length > 0
                            ? (sessions.filter(s => s.status === "evaluated" && s.evaluation?.overallScore !== undefined).reduce((acc, s) => acc + s.evaluation.overallScore, 0) / sessions.filter(s => s.status === "evaluated" && s.evaluation?.overallScore !== undefined).length).toFixed(0) + "%"
                            : "—"),
                        color: "primary"
                    },
                    {
                        label: "Completion Rate",
                        value: loading ? "..." : (sessions.length > 0 ? Math.round((sessions.filter(s => s.status === "completed" || s.status === "evaluated").length / sessions.filter(s => s.status !== "setup").length) * 100) + "%" : "—"),
                        color: "accent"
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="glass-card p-6 animate-slide-up"
                    >
                        <p className="text-sm font-medium text-[var(--muted)]">
                            {stat.label}
                        </p>
                        <p className="mt-2 text-3xl font-bold font-heading gradient-text">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Recent activity */}
            <div className="mt-8 glass-card p-6 animate-slide-up delay-200">
                <h2 className="text-xl font-semibold font-heading mb-4">
                    Recent Scheduled Sessions
                </h2>

                {loading ? (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
                        <svg
                            className="h-12 w-12 mb-3 text-[var(--muted-foreground)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                            />
                        </svg>
                        <p className="text-sm">
                            No interviews yet. Schedule your first session to get started.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-[var(--border)] text-[var(--muted)]">
                                <tr className="border-[var(--border)]">
                                    <th className="pb-3 font-medium">Candidate</th>
                                    <th className="pb-3 font-medium">ID</th>
                                    <th className="pb-3 font-medium">Created</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Score</th>
                                    <th className="pb-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {sessions.slice(0, 5).map((session) => (
                                    <tr key={session.id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                                        <td className="py-4 font-medium">{session.candidate_name}</td>
                                        <td className="py-4">
                                            <span className="text-[10px] font-mono bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">
                                                {session.candidate_id || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-[var(--muted)] text-xs">
                                            {session.created_at ? new Date(session.created_at.toMillis()).toLocaleDateString() : 'Just now'}
                                        </td>
                                        <td className="py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(session.status === 'completed' || session.status === 'evaluated') ? 'bg-accent-500/10 text-accent-400' :
                                                session.status === 'revoked' ? 'bg-error/10 text-error' :
                                                    'bg-primary-500/10 text-primary-400'
                                                }`}>
                                                {session.status === 'evaluated' ? 'completed' : session.status}
                                            </span>
                                        </td>
                                        <td className="py-4 font-semibold text-[var(--foreground)]">
                                            {session.status === "evaluated" && session.evaluation?.overallScore !== undefined ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`flex items-center justify-center w-4 h-4 rounded-full text-white ${session.evaluation.is_passing ? 'bg-green-500' : 'bg-red-500'}`}>
                                                        {session.evaluation.is_passing ? (
                                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                        ) : (
                                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                        )}
                                                    </div>
                                                    {session.evaluation.overallScore.toFixed(0)}%
                                                </div>
                                            ) : (
                                                <span className="text-[var(--muted)]">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-right">
                                            <Link href="/interviews" className="text-primary-400 hover:text-primary-300 transition-colors">
                                                Manage &rarr;
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CreateInterviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
