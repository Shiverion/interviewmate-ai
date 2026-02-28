"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeys } from "@/components/providers/KeyProvider";
import { useAuthContext } from "@/components/providers/AuthProvider";
import ApiKeyInput from "@/components/ui/ApiKeyInput";
import { validateOpenAIKey } from "@/lib/keys/validation";

type Step = "openai" | "success";

export default function SetupPage() {
    const router = useRouter();
    const { saveKeys } = useKeys();
    const { user, loading: authLoading } = useAuthContext();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login?redirect=/setup");
        }
    }, [user, authLoading, router]);

    const [step, setStep] = useState<Step>("openai");
    const [isValidating, setIsValidating] = useState(false);

    if (authLoading || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
                <p className="text-[var(--muted)] animate-pulse">Checking authentication...</p>
            </div>
        );
    }

    // OpenAI fields
    const [openaiKey, setOpenaiKey] = useState("");
    const [openaiError, setOpenaiError] = useState("");

    const handleOpenAINext = async () => {
        setOpenaiError("");
        setIsValidating(true);

        try {
            const result = await validateOpenAIKey(openaiKey);
            if (!result.valid) {
                setOpenaiError(result.error || "Invalid API key");
                setIsValidating(false);
                return;
            }

            // Save key
            saveKeys(openaiKey);
            setStep("success");

            // Redirect after a brief moment
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch {
            setOpenaiError("Validation failed. Please check your key.");
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
            {/* Background blobs */}
            <div className="absolute top-20 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary-500/20 blur-[100px]" />
            <div className="absolute bottom-20 right-1/4 -z-10 h-64 w-64 rounded-full bg-accent-500/15 blur-[80px]" />

            <div className="w-full max-w-lg animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-400 mb-4">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                        </svg>
                        Bring Your Own Key
                    </div>
                    <h1 className="text-2xl font-bold font-heading tracking-tight">
                        Configure OpenAI API
                    </h1>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                        InterviewMate AI uses your own OpenAI account for AI interactions.
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    {[
                        { id: "openai", label: "OpenAI" },
                        { id: "success", label: "Done" },
                    ].map((s, i) => {
                        const isCurrent = step === s.id;
                        const isPast = s.id === "openai" && step === "success";

                        return (
                            <div key={s.id} className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${isPast
                                            ? "bg-success text-white"
                                            : isCurrent
                                                ? "gradient-primary text-white shadow-glow"
                                                : "bg-[var(--surface-elevated)] text-[var(--muted)]"
                                            }`}
                                    >
                                        {isPast ? "✓" : i + 1}
                                    </div>
                                    <span className={`text-xs ${isCurrent ? "text-primary-400 font-medium" : "text-[var(--muted-foreground)]"}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < 1 && (
                                    <div
                                        className={`h-px w-12 transition-colors ${isPast ? "bg-success" : "bg-[var(--border)]"
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step content */}
                <div className="glass-card p-8">
                    {step === "openai" && (
                        <div className="space-y-6 animate-slide-up">
                            <div>
                                <h2 className="text-lg font-semibold font-heading">
                                    OpenAI API Key
                                </h2>
                                <p className="mt-1 text-sm text-[var(--muted)]">
                                    Get your API key from the{" "}
                                    <a
                                        href="https://platform.openai.com/api-keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-400 hover:underline"
                                    >
                                        OpenAI Dashboard
                                    </a>
                                    . This is used for AI interview conversations and evaluation.
                                </p>
                            </div>

                            <ApiKeyInput
                                label="API Key"
                                value={openaiKey}
                                onChange={(v) => {
                                    setOpenaiKey(v);
                                    setOpenaiError("");
                                }}
                                placeholder="sk-..."
                                error={openaiError}
                                helpText="Starts with sk-. Your key is stored locally in your browser only."
                            />

                            <button
                                onClick={handleOpenAINext}
                                disabled={!openaiKey.trim() || isValidating}
                                className="
                  w-full rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-white
                  shadow-lg shadow-primary-500/25 transition-all duration-200
                  hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                "
                            >
                                {isValidating ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Validating...
                                    </span>
                                ) : (
                                    "Validate & Finish"
                                )}
                            </button>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-8 animate-scale-in">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                                <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold font-heading">All Set!</h2>
                            <p className="mt-2 text-sm text-[var(--muted)]">
                                Your API key is configured. Redirecting to dashboard...
                            </p>
                            <div className="mt-4">
                                <div className="h-1 w-32 mx-auto rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                                    <div className="h-full gradient-primary animate-shimmer" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Security note */}
                <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
                    🔒 Your key is stored locally in your browser and never sent to our servers.
                </p>
            </div>
        </div>
    );
}
