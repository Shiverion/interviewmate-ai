"use client";

import { useEffect, useState } from "react";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { revokeInterviewSession } from "@/lib/firebase/interviews";
import Link from "next/link";
import CreateInterviewModal from "@/components/dashboard/CreateInterviewModal";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useKeys } from "@/components/providers/KeyProvider";

export default function InterviewsPage() {
    const { user } = useAuthContext();
    const { showToast } = useToast();
    const { keys } = useKeys();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    // Confirmation State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
    });

    // Filtering & Sorting State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc" | "none">("none");

    const fetchSessions = async () => {
        if (!user || !isFirebaseReady()) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const q = query(
                collection(db, "interview_sessions"),
                where("recruiter_id", "==", user.uid),
                orderBy("created_at", "desc")
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
    };

    useEffect(() => {
        fetchSessions();
    }, [user]);

    const handleSuccess = (sessionId: string) => {
        setIsModalOpen(false);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setGeneratedLink(`${origin}/apply/${sessionId}`);
        fetchSessions(); // Refresh list automatically
    };

    const handleRevoke = async (sessionId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Revoke Interview?",
            message: "Are you sure you want to revoke this interview link? The candidate will no longer be able to access it.",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await revokeInterviewSession(sessionId);
                    setSessions(prev => prev.map(s =>
                        s.id === sessionId ? { ...s, status: "revoked" } : s
                    ));
                    showToast("Success", "Interview revoked successfully", "info");
                } catch (err) {
                    console.error("Failed to revoke session", err);
                    showToast("Error", "Failed to revoke session", "error");
                }
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleEvaluate = async (sessionId: string) => {
        try {
            const res = await fetch("/api/evaluate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-openai-key": keys.openai || ""
                },
                body: JSON.stringify({ sessionId })
            });
            const data = await res.json();
            if (data.success) {
                showToast("Success", "Evaluation completed successfully!", "success");
                fetchSessions(); // Refresh to show score
            } else {
                showToast("Error", `Evaluation failed: ${data.error || "Unknown error"}`, "error");
            }
        } catch (err) {
            console.error("Manual eval error:", err);
            showToast("Error", "An error occurred during manual evaluation.", "error");
        }
    };

    const copyToClipboard = (link: string) => {
        navigator.clipboard.writeText(link);
        showToast("Success", "Link copied to clipboard!", "success");
    };

    // Apply Client-Side Filtering
    const filteredSessions = sessions.filter(session => {
        const matchesName = session.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesId = session.candidate_id?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSearch = matchesName || matchesId;

        const mapsEvaluated = session.status === "evaluated" ? "completed" : session.status;
        const matchesStatus = statusFilter === "all" || mapsEvaluated === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Apply Client-Side Sorting
    const sortedSessions = [...filteredSessions].sort((a, b) => {
        if (sortOrder === "none") return 0;

        const scoreA = a.evaluation?.overallScore || 0;
        const scoreB = b.evaluation?.overallScore || 0;

        if (sortOrder === "desc") return scoreB - scoreA;
        return scoreA - scoreB;
    });

    const toggleSort = () => {
        if (sortOrder === "desc") setSortOrder("asc");
        else if (sortOrder === "asc") setSortOrder("none");
        else setSortOrder("desc");
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading tracking-tight">
                        Pipeline Management
                    </h1>
                    <p className="mt-2 text-[var(--muted)]">
                        Manage all scheduled candidate links and review AI evaluations.
                    </p>
                </div>

                <div className="flex bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-1 shrink-0">
                    <button
                        onClick={() => setStatusFilter("all")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setStatusFilter("active")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'active' ? 'bg-[var(--background)] shadow-sm text-primary-400' : 'text-[var(--muted)] hover:text-primary-400'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setStatusFilter("completed")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'completed' ? 'bg-[var(--background)] shadow-sm text-accent-400' : 'text-[var(--muted)] hover:text-accent-400'}`}
                    >
                        Completed
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search candidates by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    />
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white font-medium shadow-lg shadow-primary-500/20 hover:-translate-y-0.5 transition-all"
                >
                    Schedule Interview
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
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
                            onClick={() => copyToClipboard(generatedLink)}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0"
                        >
                            Copy Link
                        </button>
                    </div>
                </div>
            )}

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
                        <svg className="h-12 w-12 mb-3 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        <p className="text-sm">No interviews scheduled yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[var(--surface-elevated)] border-b border-[var(--border)] text-[var(--muted)]">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Candidate</th>
                                    <th className="px-6 py-4 font-medium">Candidate ID</th>
                                    <th className="px-6 py-4 font-medium">Link Status</th>
                                    <th className="px-6 py-4 font-medium">Created On</th>
                                    <th
                                        className="px-6 py-4 font-medium cursor-pointer hover:text-[var(--foreground)] transition-colors group flex items-center gap-2"
                                        onClick={toggleSort}
                                    >
                                        Evaluation Score
                                        <span className="flex flex-col opacity-50 group-hover:opacity-100">
                                            <svg className={`w-3 h-3 -mb-1 ${sortOrder === 'desc' ? 'text-primary-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                            <svg className={`w-3 h-3 ${sortOrder === 'asc' ? 'text-primary-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </span>
                                    </th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {sortedSessions.map((session) => {
                                    const isExpired = session.expires_at?.toMillis() < Date.now();
                                    const displayStatus = session.status === 'revoked' ? 'Revoked' :
                                        isExpired ? 'Expired' :
                                            (session.status === 'completed' || session.status === 'evaluated') ? 'Evaluated' : 'Active';

                                    const statusColor = displayStatus === 'Active' ? 'bg-primary-500/10 text-primary-400' :
                                        displayStatus === 'Evaluated' ? 'bg-accent-500/10 text-accent-400' :
                                            'bg-error/10 text-error';

                                    const applyUrl = typeof window !== 'undefined' ? `${window.location.origin}/apply/${session.id}` : '';

                                    return (
                                        <tr key={session.id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-[var(--foreground)]">{session.candidate_name}</div>
                                                {session.candidate_email && <div className="text-xs text-[var(--muted)]">{session.candidate_email}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono bg-[var(--surface-elevated)] px-2 py-1 rounded border border-[var(--border)]">
                                                    {session.candidate_id || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[var(--muted)]">
                                                {session.created_at ? new Date(session.created_at.toMillis()).toLocaleDateString() : 'Just now'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {session.status === "evaluated" && session.evaluation?.overallScore !== undefined ? (
                                                    <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                                                        <div className={`flex items-center justify-center w-5 h-5 rounded-full text-white ${session.evaluation.is_passing ? 'bg-green-500' : 'bg-red-500'}`}>
                                                            {session.evaluation.is_passing ? (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                            )}
                                                        </div>
                                                        {session.evaluation.overallScore.toFixed(0)}%
                                                    </div>
                                                ) : session.status === "completed" ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 text-xs font-medium text-accent-500 animate-pulse">
                                                            <div className="w-2 h-2 rounded-full bg-accent-500" />
                                                            Evaluating...
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setConfirmConfig({
                                                                    isOpen: true,
                                                                    title: "Force Evaluation?",
                                                                    message: "This will trigger the AI to evaluate the current transcript immediately. Are you sure?",
                                                                    onConfirm: () => {
                                                                        handleEvaluate(session.id);
                                                                        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                                                    }
                                                                });
                                                            }}
                                                            className="p-1 hover:bg-accent-500/10 rounded text-accent-500 transition-colors pointer-events-auto"
                                                            title="Retry Evaluation"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--muted)]">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                                {displayStatus === 'Active' && (
                                                    <>
                                                        <button
                                                            onClick={() => copyToClipboard(applyUrl)}
                                                            className="text-primary-400 hover:text-primary-300 transition-colors text-xs"
                                                            title="Copy Apply Link"
                                                        >
                                                            Copy Link
                                                        </button>
                                                        <span className="text-[var(--border)]">|</span>
                                                        <button
                                                            onClick={() => handleRevoke(session.id)}
                                                            className="text-error hover:text-red-400 transition-colors text-xs"
                                                        >
                                                            Revoke Link
                                                        </button>
                                                    </>
                                                )}

                                                {displayStatus === 'Evaluated' && (
                                                    <Link href={`/interviews/${session.id}`} className="text-accent-400 hover:text-accent-300 transition-colors text-xs font-medium">
                                                        View Report &rarr;
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
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
            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDestructive={confirmConfig.isDestructive}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                confirmLabel={confirmConfig.isDestructive ? "Revoke" : "Trigger"}
            />
        </div>
    );
}
