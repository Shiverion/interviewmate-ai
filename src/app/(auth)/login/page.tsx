"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/config";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push("/dashboard");
        } catch (err: any) {
            console.error("Auth error:", err);
            setError(err.message || "Failed to authenticate.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setError(null);
        setLoading(true);
        const provider = new GoogleAuthProvider();

        try {
            await signInWithPopup(auth, provider);
            router.push("/dashboard");
        } catch (err: any) {
            console.error("Google Auth error:", err);
            setError(err.message || "Failed to authenticate with Google.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] animate-fade-in relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-500/10 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />

            <div className="glass-card max-w-md w-full p-8 relative z-10 animate-slide-up">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-heading mb-2">InterviewMate AI</h1>
                    <p className="text-[var(--muted)]">Sign in to manage your interview sessions</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email Address</label>
                        <input
                            required
                            type="email"
                            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            placeholder="recruiter@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            required
                            type="password"
                            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full gradient-primary text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
                    >
                        {loading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}
                    </button>
                </form>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--border)]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[var(--surface)] text-[var(--muted)]">Or continue with</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    type="button"
                    className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-medium py-2.5 rounded-xl hover:bg-[var(--border)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                </button>

                <div className="mt-8 text-center text-sm">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
                    >
                        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
