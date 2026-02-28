"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useKeys } from "@/components/providers/KeyProvider";

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const { isConfigured } = useKeys();

    return (
        <header className="sticky top-0 z-50 w-full glass">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 p-1 shadow-sm transition-transform duration-200 group-hover:scale-105 border border-white/10 overflow-hidden">
                        <Image
                            src="/logo.png"
                            alt="InterviewMate Logo"
                            width={32}
                            height={32}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-xl font-bold font-heading tracking-tight">
                        Interview<span className="gradient-text">Mate</span>
                    </span>
                </Link>

                {/* Right side actions */}
                <div className="flex items-center gap-3">
                    {/* Connection status */}
                    <div className="flex items-center gap-1.5" title={isConfigured ? "API keys configured" : "API keys not configured"}>
                        <span
                            className={`h-2 w-2 rounded-full transition-colors ${isConfigured ? "bg-success" : "bg-error animate-pulse-soft"
                                }`}
                        />
                        <span className="hidden sm:inline text-xs text-[var(--muted-foreground)]">
                            {isConfigured ? "Connected" : "Not configured"}
                        </span>
                    </div>
                    {/* Dark mode toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-[var(--surface-elevated)]"
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    >
                        {theme === "dark" ? (
                            <svg
                                className="h-5 w-5 text-[var(--muted)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="h-5 w-5 text-[var(--muted)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                                />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
