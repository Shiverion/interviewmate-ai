"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useKeys } from "@/components/providers/KeyProvider";
import { useAuthContext } from "@/components/providers/AuthProvider";

const PUBLIC_NAV = [
    { label: "ATS Checker", href: "/ats-check" },
];

const AUTH_NAV = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pipeline", href: "/interviews" },
    { label: "ATS Checker", href: "/ats-check" },
    { label: "Settings", href: "/settings" },
];

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const { isConfigured } = useKeys();
    const { user } = useAuthContext();
    const pathname = usePathname();

    const navLinks = user ? AUTH_NAV : PUBLIC_NAV;

    const handleSignOut = () => {
        import("@/lib/firebase/config").then(({ auth }) => {
            import("firebase/auth").then(({ signOut }) => {
                signOut(auth);
                window.location.href = "/login";
            });
        });
    };

    const isActive = (href: string) =>
        pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

    return (
        <header className="sticky top-0 z-50 w-full glass">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 p-1 shadow-sm transition-transform duration-200 group-hover:scale-105 border border-white/10 overflow-hidden">
                        <Image
                            src="/logo.png"
                            alt="InterviewMate Logo"
                            width={32}
                            height={32}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="text-lg font-bold font-heading tracking-tight hidden sm:block">
                        Interview<span className="gradient-text">Mate</span>
                    </span>
                </Link>

                {/* Nav links — centre */}
                <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                isActive(link.href)
                                    ? "bg-primary-500/10 text-primary-400"
                                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Right — status + theme + sign-in/out */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* API key connection status */}
                    {user && (
                        <div
                            className="hidden sm:flex items-center gap-1.5"
                            title={isConfigured ? "API keys configured" : "API keys not configured"}
                        >
                            <span className={`h-2 w-2 rounded-full transition-colors ${isConfigured ? "bg-success" : "bg-error animate-pulse-soft"}`} />
                            <span className="text-xs text-[var(--muted-foreground)]">
                                {isConfigured ? "Connected" : "No key"}
                            </span>
                        </div>
                    )}

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-[var(--surface-elevated)]"
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    >
                        {theme === "dark" ? (
                            <svg className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                            </svg>
                        )}
                    </button>

                    {/* Auth action */}
                    {user ? (
                        <button
                            onClick={handleSignOut}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-error/10 hover:text-error transition-colors duration-200"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                            Sign Out
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 transition-colors duration-200"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
