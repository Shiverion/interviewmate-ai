"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKeys } from "@/components/providers/KeyProvider";
import { maskKey } from "@/lib/keys/store";
import ApiKeyInput from "@/components/ui/ApiKeyInput";
import {
    validateFirebaseConfig,
    validateOpenAIKey,
} from "@/lib/keys/validation";
import type { FirebaseConfig } from "@/lib/keys/store";
import {
    saveFirebaseConfig,
    saveOpenAIKey,
} from "@/lib/keys/store";
import { initializeFirebase } from "@/lib/firebase/config";

export default function SettingsPage() {
    const router = useRouter();
    const { keys, resetKeys, refreshStatus } = useKeys();
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [testingFirebase, setTestingFirebase] = useState(false);
    const [testingOpenAI, setTestingOpenAI] = useState(false);
    const [firebaseStatus, setFirebaseStatus] = useState<"idle" | "success" | "error">("idle");
    const [openaiStatus, setOpenaiStatus] = useState<"idle" | "success" | "error">("idle");

    // Edit mode
    const [editingFirebase, setEditingFirebase] = useState(false);
    const [editingOpenAI, setEditingOpenAI] = useState(false);
    const [newFirebaseJson, setNewFirebaseJson] = useState("");
    const [newOpenAIKey, setNewOpenAIKey] = useState("");
    const [firebaseError, setFirebaseError] = useState("");
    const [openaiError, setOpenaiError] = useState("");

    const handleTestFirebase = async () => {
        if (!keys.firebase) return;
        setTestingFirebase(true);
        setFirebaseStatus("idle");

        const result = await validateFirebaseConfig(keys.firebase);
        setFirebaseStatus(result.valid ? "success" : "error");
        setTestingFirebase(false);
    };

    const handleTestOpenAI = async () => {
        if (!keys.openai) return;
        setTestingOpenAI(true);
        setOpenaiStatus("idle");

        const result = await validateOpenAIKey(keys.openai);
        setOpenaiStatus(result.valid ? "success" : "error");
        setTestingOpenAI(false);
    };

    const handleUpdateFirebase = async () => {
        setFirebaseError("");
        try {
            const config: FirebaseConfig = JSON.parse(newFirebaseJson);
            const result = await validateFirebaseConfig(config);
            if (!result.valid) {
                setFirebaseError(result.error || "Invalid config");
                return;
            }
            saveFirebaseConfig(config);
            initializeFirebase(config);
            refreshStatus();
            setEditingFirebase(false);
            setNewFirebaseJson("");
        } catch {
            setFirebaseError("Invalid JSON format");
        }
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
                {/* Firebase Config */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold font-heading">Firebase</h2>
                            {statusDot(firebaseStatus)}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleTestFirebase}
                                disabled={testingFirebase}
                                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-elevated)] disabled:opacity-50"
                            >
                                {testingFirebase ? "Testing..." : "Test Connection"}
                            </button>
                            <button
                                onClick={() => setEditingFirebase(!editingFirebase)}
                                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-elevated)]"
                            >
                                {editingFirebase ? "Cancel" : "Update"}
                            </button>
                        </div>
                    </div>

                    {!editingFirebase ? (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Project ID</span>
                                <span className="font-mono">{keys.firebase?.projectId || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">API Key</span>
                                <span className="font-mono">
                                    {keys.firebase?.apiKey ? maskKey(keys.firebase.apiKey) : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Auth Domain</span>
                                <span className="font-mono">{keys.firebase?.authDomain || "—"}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <ApiKeyInput
                                label="New Firebase Config JSON"
                                value={newFirebaseJson}
                                onChange={(v) => { setNewFirebaseJson(v); setFirebaseError(""); }}
                                placeholder='Paste your firebaseConfig JSON...'
                                error={firebaseError}
                                multiline
                            />
                            <button onClick={handleUpdateFirebase} className="rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-white">
                                Save
                            </button>
                        </div>
                    )}
                </div>

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
                        Remove all stored API keys from this browser. You will need to reconfigure them.
                    </p>
                    {!showResetConfirm ? (
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="rounded-lg border border-error/30 px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error/10"
                        >
                            Reset All Keys
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
