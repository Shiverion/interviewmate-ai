"use client";

import { useState } from "react";

interface ApiKeyInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    helpText?: string;
    multiline?: boolean;
}

export default function ApiKeyInput({
    label,
    value,
    onChange,
    placeholder,
    error,
    helpText,
    multiline = false,
}: ApiKeyInputProps) {
    const [revealed, setRevealed] = useState(false);

    const inputClass = `
    w-full rounded-lg border px-4 py-3
    bg-[var(--surface)] text-[var(--foreground)]
    placeholder:text-[var(--muted-foreground)]
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-primary-500/50
    ${error ? "border-error" : "border-[var(--border)] focus:border-primary-500"}
  `;

    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--foreground)]">
                {label}
            </label>

            <div className="relative">
                {multiline ? (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={6}
                        className={`${inputClass} resize-none font-mono text-sm`}
                        spellCheck={false}
                    />
                ) : (
                    <input
                        type={revealed ? "text" : "password"}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={`${inputClass} pr-12 font-mono text-sm`}
                        spellCheck={false}
                        autoComplete="off"
                    />
                )}

                {!multiline && (
                    <button
                        type="button"
                        onClick={() => setRevealed(!revealed)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        aria-label={revealed ? "Hide" : "Show"}
                    >
                        {revealed ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            {helpText && !error && (
                <p className="text-xs text-[var(--muted-foreground)]">{helpText}</p>
            )}
            {error && <p className="text-xs text-error">{error}</p>}
        </div>
    );
}
