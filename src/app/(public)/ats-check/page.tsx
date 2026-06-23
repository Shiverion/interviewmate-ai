"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import { getOpenAIKey } from "@/lib/keys/store";

interface AtsScore {
    overall_match: number;
    keyword_match: number;
    experience_alignment: number;
    skills_coverage: number;
    matched_keywords: string[];
    missing_keywords: string[];
    red_flags: string[];
    strengths: string[];
    summary: string;
}

type Stage = "idle" | "parsing" | "scoring" | "done" | "error";

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--surface-elevated)" strokeWidth="8" />
                    <circle
                        cx="48" cy="48" r={radius} fill="none"
                        stroke={color} strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color }}>
                    {value}%
                </span>
            </div>
            <span className="text-xs text-[var(--muted)] text-center leading-tight">{label}</span>
        </div>
    );
}

function TagCloud({ tags, variant }: { tags: string[]; variant: "match" | "miss" }) {
    if (!tags.length) return null;
    const bg = variant === "match"
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20";
    return (
        <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
                <span key={t} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${bg}`}>
                    {t}
                </span>
            ))}
        </div>
    );
}

function scoreColor(v: number) {
    if (v >= 75) return "#10b981";
    if (v >= 50) return "#f59e0b";
    return "#ef4444";
}

export default function AtsCheckPage() {
    const [file, setFile] = useState<File | null>(null);
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [stage, setStage] = useState<Stage>("idle");
    const [result, setResult] = useState<AtsScore | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((f: File | null) => {
        if (f && f.type === "application/pdf") {
            setFile(f);
        }
    }, []);

    const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFile(e.dataTransfer.files[0] ?? null);
    }, [handleFile]);

    const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback(() => setIsDragOver(false), []);

    const canSubmit = !!file && jobDescription.trim().length >= 50;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;

        setResult(null);
        setErrorMsg("");

        try {
            setStage("parsing");
            const formData = new FormData();
            formData.append("file", file!);
            const parseRes = await fetch("/api/parse-resume", { method: "POST", body: formData });
            if (!parseRes.ok) throw new Error("Failed to parse PDF");
            const { text: resumeText } = await parseRes.json() as { text: string };
            if (!resumeText?.trim()) throw new Error("No text found in PDF");

            setStage("scoring");
            const byokKey = getOpenAIKey();
            const scoreHeaders: Record<string, string> = { "Content-Type": "application/json" };
            if (byokKey) scoreHeaders["x-openai-key"] = byokKey;
            const scoreRes = await fetch("/api/ats-score", {
                method: "POST",
                headers: scoreHeaders,
                body: JSON.stringify({
                    resumeText,
                    jobTitle: jobTitle.trim() || "the role",
                    jobDescription: jobDescription.trim(),
                }),
            });
            if (!scoreRes.ok) {
                const errData = await scoreRes.json() as { error?: string };
                throw new Error(errData.error || "ATS scoring failed");
            }
            const { ats_score } = await scoreRes.json() as { ats_score: AtsScore };
            setResult(ats_score);
            setStage("done");
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
            setStage("error");
        }
    }

    const overallColor = result ? scoreColor(result.overall_match) : "#6b7280";

    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

            {/* Hero */}
            <div className="mb-10 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/5 px-4 py-1.5 text-xs font-semibold text-primary-400 uppercase tracking-wider">
                    ATS Resume Checker
                </div>
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
                    See how your resume scores
                </h1>
                <p className="mx-auto max-w-xl text-base text-[var(--muted)]">
                    Upload your resume PDF and paste a job description. Our AI checks keyword coverage, skill alignment, and experience fit — exactly like an ATS system would.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* PDF Upload */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`
                        flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-all duration-200
                        ${isDragOver
                            ? "border-primary-400 bg-primary-500/5"
                            : file
                                ? "border-emerald-500/50 bg-emerald-500/5"
                                : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-primary-500/40 hover:bg-primary-500/5"
                        }
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    />
                    {file ? (
                        <>
                            <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span className="text-sm font-medium text-emerald-400">{file.name}</span>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
                            >
                                Remove file
                            </button>
                        </>
                    ) : (
                        <>
                            <svg className="h-10 w-10 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            <div className="text-center">
                                <span className="text-sm font-medium text-[var(--foreground)]">Drop your resume PDF here</span>
                                <p className="text-xs text-[var(--muted)] mt-1">or click to browse — PDF only</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Job Info */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                            Job Title <span className="text-[var(--muted)] font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="e.g. Senior Backend Engineer"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                            Job Description <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            rows={6}
                            placeholder="Paste the full job description here (requirements, responsibilities, skills)..."
                            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                        />
                        <p className="mt-1 text-xs text-[var(--muted)]">{jobDescription.length} chars (min 50)</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit || stage === "parsing" || stage === "scoring"}
                    className="w-full rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {stage === "parsing" && (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Parsing resume…
                        </span>
                    )}
                    {stage === "scoring" && (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Analyzing ATS compatibility…
                        </span>
                    )}
                    {(stage === "idle" || stage === "done" || stage === "error") && "Check ATS Score"}
                </button>
            </form>

            {/* Error */}
            {stage === "error" && (
                <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                    {errorMsg}
                </div>
            )}

            {/* Results */}
            {stage === "done" && result && (
                <div className="mt-10 space-y-8">

                    {/* Overall Score Header */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6">
                        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className="relative h-32 w-32">
                                    <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
                                        <circle cx="64" cy="64" r="52" fill="none" stroke="var(--border)" strokeWidth="10" />
                                        <circle
                                            cx="64" cy="64" r="52" fill="none"
                                            stroke={overallColor} strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 52}
                                            strokeDashoffset={2 * Math.PI * 52 - (result.overall_match / 100) * 2 * Math.PI * 52}
                                            style={{ transition: "stroke-dashoffset 1s ease" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold" style={{ color: overallColor }}>{result.overall_match}%</span>
                                        <span className="text-xs text-[var(--muted)]">overall</span>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-[var(--muted)]">ATS Match Score</span>
                            </div>

                            <div className="flex-1">
                                <p className="text-sm text-[var(--muted)] leading-relaxed">{result.summary}</p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {result.overall_match >= 75 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                                            Strong Match
                                        </span>
                                    )}
                                    {result.overall_match >= 50 && result.overall_match < 75 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                                            Moderate Match
                                        </span>
                                    )}
                                    {result.overall_match < 50 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                                            Weak Match
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3 Metric Rings */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { value: result.keyword_match, label: "Keyword Match" },
                            { value: result.skills_coverage, label: "Skills Coverage" },
                            { value: result.experience_alignment, label: "Experience Fit" },
                        ].map((m) => (
                            <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 flex flex-col items-center">
                                <ScoreRing value={m.value} label={m.label} color={scoreColor(m.value)} />
                            </div>
                        ))}
                    </div>

                    {/* Keywords */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                                Matched Keywords ({result.matched_keywords.length})
                            </h3>
                            <TagCloud tags={result.matched_keywords} variant="match" />
                            {!result.matched_keywords.length && <p className="text-xs text-[var(--muted)]">No direct keyword matches found.</p>}
                        </div>

                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                </svg>
                                Missing Keywords ({result.missing_keywords.length})
                            </h3>
                            <TagCloud tags={result.missing_keywords} variant="miss" />
                            {!result.missing_keywords.length && <p className="text-xs text-[var(--muted)]">Great — no critical keywords missing!</p>}
                        </div>
                    </div>

                    {/* Strengths + Red Flags */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {result.strengths.length > 0 && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
                                <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Resume Strengths</h3>
                                <ul className="space-y-1.5">
                                    {result.strengths.map((s) => (
                                        <li key={s} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 16 16">
                                                <circle cx="8" cy="8" r="3" />
                                            </svg>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {result.red_flags.length > 0 && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                                <h3 className="mb-3 text-sm font-semibold text-red-400">ATS Red Flags</h3>
                                <ul className="space-y-1.5">
                                    {result.red_flags.map((f) => (
                                        <li key={f} className="flex items-start gap-2 text-sm text-red-300">
                                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Re-check CTA */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => { setStage("idle"); setResult(null); setFile(null); setJobTitle(""); setJobDescription(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                            className="text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--foreground)]"
                        >
                            Check another resume
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
