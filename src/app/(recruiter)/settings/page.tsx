"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKeys } from "@/components/providers/KeyProvider";
import { validateOpenAIKey } from "@/lib/keys/validation";
import { saveOpenAIKey, maskKey } from "@/lib/keys/store";
import ApiKeyInput from "@/components/ui/ApiKeyInput";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { db, storage } from "@/lib/firebase/config";
import { collection, query, getDocs, writeBatch } from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function SettingsPage() {
    const router = useRouter();
    const { keys, resetKeys, refreshStatus } = useKeys();
    const { user } = useAuthContext();
    const { showToast } = useToast();

    // Key States
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [testingOpenAI, setTestingOpenAI] = useState(false);
    const [openaiStatus, setOpenaiStatus] = useState<"idle" | "success" | "error">("idle");

    // Data Management States
    const [isDeletingResumes, setIsDeletingResumes] = useState(false);
    const [isClearingDatabase, setIsClearingDatabase] = useState(false);
    const [showResumeConfirm, setShowResumeConfirm] = useState(false);
    const [showDbConfirm, setShowDbConfirm] = useState(false);

    // Edit mode
    const [editingOpenAI, setEditingOpenAI] = useState(false);
    const [newOpenAIKey, setNewOpenAIKey] = useState("");
    const [openaiError, setOpenaiError] = useState("");

    const handleDeleteAllResumes = async () => {
        if (!user) return;
        setIsDeletingResumes(true);
        setShowResumeConfirm(false);

        try {
            const resumesRef = ref(storage, "resumes");
            const listResult = await listAll(resumesRef);

            let totalDeleted = 0;

            // Delete files directly in /resumes (if any)
            const rootDeletePromises = listResult.items.map((item) => deleteObject(item));
            totalDeleted += rootDeletePromises.length;
            await Promise.all(rootDeletePromises);

            // Delete files within each {sessionId} folder
            for (const folderRef of listResult.prefixes) {
                const folderList = await listAll(folderRef);
                const folderDeletePromises = folderList.items.map((item) => deleteObject(item));
                totalDeleted += folderDeletePromises.length;
                await Promise.all(folderDeletePromises);
            }

            showToast("Success", `Data Cleanup: ${totalDeleted} resumes have been permanently deleted.`, "success");
        } catch (error) {
            console.error("Error deleting resumes:", error);
            showToast("Error", "Failed to delete resumes. Please check your permissions or try again.", "error");
        } finally {
            setIsDeletingResumes(false);
        }
    };

    const handleClearDatabase = async () => {
        if (!user) return;
        setIsClearingDatabase(true);
        setShowDbConfirm(false);

        try {
            const collections = ["interview_sessions", "candidate_reports"];
            const batchSize = 500; // Firestore batch limit

            for (const collName of collections) {
                const q = query(collection(db, collName));
                const snapshot = await getDocs(q);

                // Delete in batches
                for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = snapshot.docs.slice(i, i + batchSize);
                    chunk.forEach((d) => batch.delete(d.ref));
                    await batch.commit();
                }
            }

            showToast("Success", "All database records have been cleared.", "success");
        } catch (error) {
            console.error("Error clearing database:", error);
            showToast("Error", "Failed to clear database records.", "error");
        } finally {
            setIsClearingDatabase(false);
        }
    };

    const handleTestOpenAI = async () => {
        if (!keys.openai) return;
        setTestingOpenAI(true);
        setOpenaiStatus("idle");

        const result = await validateOpenAIKey(keys.openai);
        setOpenaiStatus(result.valid ? "success" : "error");
        setTestingOpenAI(false);
    };

    const handleUpdateOpenAI = async () => {
        setOpenaiError("");
        const result = await validateOpenAIKey(newOpenAIKey);
        if (!result.valid) {
            setOpenaiError(result.error || "Invalid key");
            return;
        }
        saveOpenAIKey(newOpenAIKey);
        refreshStatus();
        setEditingOpenAI(false);
        setNewOpenAIKey("");
    };

    const handleReset = () => {
        resetKeys();
        router.push("/setup");
    };

    const statusDot = (status: "idle" | "success" | "error") => {
        if (status === "success") return <span className="inline-block h-2 w-2 rounded-full bg-success" />;
        if (status === "error") return <span className="inline-block h-2 w-2 rounded-full bg-error" />;
        return null;
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-heading tracking-tight">Settings</h1>
                <p className="mt-2 text-[var(--muted)]">Manage your API keys and connections.</p>
            </div>

            <div className="space-y-6">
                {/* OpenAI Key */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold font-heading">OpenAI</h2>
                            {statusDot(openaiStatus)}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleTestOpenAI}
                                disabled={testingOpenAI}
                                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-elevated)] disabled:opacity-50"
                            >
                                {testingOpenAI ? "Testing..." : "Test Connection"}
                            </button>
                            <button
                                onClick={() => setEditingOpenAI(!editingOpenAI)}
                                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-elevated)]"
                            >
                                {editingOpenAI ? "Cancel" : "Update"}
                            </button>
                        </div>
                    </div>

                    {!editingOpenAI ? (
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--muted)]">API Key</span>
                            <span className="font-mono">
                                {keys.openai ? maskKey(keys.openai) : "—"}
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <ApiKeyInput
                                label="New OpenAI API Key"
                                value={newOpenAIKey}
                                onChange={(v) => { setNewOpenAIKey(v); setOpenaiError(""); }}
                                placeholder="sk-..."
                                error={openaiError}
                            />
                            <button onClick={handleUpdateOpenAI} className="rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-white">
                                Save
                            </button>
                        </div>
                    )}
                </div>

                {/* Data Management */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold font-heading mb-4">Database & Storage Management</h2>
                    <p className="text-sm text-[var(--muted)] mb-6">
                        Manage your application's data and stored files. These actions are permanent.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Delete Resumes */}
                        <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                            <h3 className="text-sm font-semibold mb-1">Uploaded Resumes</h3>
                            <p className="text-xs text-[var(--muted)] mb-4">Delete all candidate resumes from Firebase Storage.</p>
                            <button
                                onClick={() => setShowResumeConfirm(true)}
                                disabled={isDeletingResumes}
                                className="w-full rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                            >
                                {isDeletingResumes ? "Deleting..." : "Delete All Resumes"}
                            </button>
                        </div>

                        {/* Clear Firestore */}
                        <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                            <h3 className="text-sm font-semibold mb-1">Database Records</h3>
                            <p className="text-xs text-[var(--muted)] mb-4">Clear all interview sessions and candidate reports.</p>
                            <button
                                onClick={() => setShowDbConfirm(true)}
                                disabled={isClearingDatabase}
                                className="w-full rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                            >
                                {isClearingDatabase ? "Clearing..." : "Clear All Records"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger zone */}
                <div className="glass-card border-error/20 p-6">
                    <h2 className="text-lg font-semibold font-heading text-error mb-2">Danger Zone</h2>
                    <p className="text-sm text-[var(--muted)] mb-4">
                        Remove your stored OpenAI API key from this browser. You will need to reconfigure it.
                    </p>
                    {!showResetConfirm ? (
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="rounded-lg border border-error/30 px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error/10"
                        >
                            Reset Key
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-error">Are you sure?</span>
                            <button
                                onClick={handleReset}
                                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white"
                            >
                                Yes, Reset
                            </button>
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Dialogs */}
            <ConfirmDialog
                isOpen={showResumeConfirm}
                onCancel={() => setShowResumeConfirm(false)}
                onConfirm={handleDeleteAllResumes}
                title="Delete All Resumes?"
                message="This will permanently delete all candidate resumes from your Firebase Storage bucket. This action cannot be undone."
                confirmLabel="Delete Resumes"
                isDestructive={true}
            />

            <ConfirmDialog
                isOpen={showDbConfirm}
                onCancel={() => setShowDbConfirm(false)}
                onConfirm={handleClearDatabase}
                title="Clear Database Records?"
                message="This will permanently delete all interview sessions and candidate reports from Firestore. This action cannot be undone."
                confirmLabel="Clear All Records"
                isDestructive={true}
            />
        </div>
    );
}
