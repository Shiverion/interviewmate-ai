"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKeys } from "@/components/providers/KeyProvider";
import { maskKey } from "@/lib/keys/store";
import ApiKeyInput from "@/components/ui/ApiKeyInput";
import { validateOpenAIKey } from "@/lib/keys/validation";
import { saveOpenAIKey } from "@/lib/keys/store";

export default function SettingsPage() {
    const router = useRouter();
    const { keys, resetKeys, refreshStatus } = useKeys();
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [testingOpenAI, setTestingOpenAI] = useState(false);
    const [openaiStatus, setOpenaiStatus] = useState<"idle" | "success" | "error">("idle");

    // Edit mode
    const [editingOpenAI, setEditingOpenAI] = useState(false);
    const [newOpenAIKey, setNewOpenAIKey] = useState("");
    const [openaiError, setOpenaiError] = useState("");

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
        </div>
    );
}
