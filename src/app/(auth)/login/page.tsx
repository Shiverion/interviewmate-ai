"use client";

import { useState } from "react";
import { auth, isFirebaseReady } from "@/lib/firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRightIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { authErrorMessage } from "@/lib/firebase/auth-error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseReady()) {
      setError(
        "Firebase initialization failed. Authentication is unavailable."
      );
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setError(
        authErrorMessage(
          err,
          window.location.hostname,
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!isFirebaseReady()) {
      setError(
        "Firebase initialization failed. Authentication is unavailable."
      );
      return;
    }
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Google Auth error:", err);
      setError(
        authErrorMessage(
          err,
          window.location.hostname,
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wm-auth">
      <aside className="wm-auth-story">
        <Link href="/" className="wm-brand">
          <span className="wm-mark">
            <MixerHorizontalIcon />
          </span>
          interviewmate
        </Link>
        <div>
          <p className="wm-eyebrow">A workspace for better conversations</p>
          <h1>
            Good hiring starts
            <br />
            with listening.
          </h1>
          <p className="text-sm leading-relaxed max-w-md">
            Bring the interview, the evidence, and your team’s judgment into one
            considered workflow.
          </p>
          <div className="wm-wave my-8" aria-hidden="true">
            {Array.from({ length: 22 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="wm-feature">
            <span className="wm-num">01</span>
            <div>
              <h3>Here to review the prototype?</h3>
              <p>
                Try a hosted voice interview without creating an account or
                supplying an API key.
              </p>
              <Link href="/demo" className="wm-button secondary mt-5">
                Open free reviewer demo <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </div>
        <p className="text-xs opacity-70">
          HR product sprint · Built for human review
        </p>
      </aside>
      <main className="wm-auth-form">
        <p className="wm-eyebrow mb-5">Your workspace awaits</p>
        <h2>{isSignUp ? "Create your account" : "Welcome back"}</h2>
        <p className="wm-subtitle">
          Sign in to organize interviews. API keys can wait.
        </p>
        {error && (
          <p role="alert" className="wm-note mt-5">
            {error}
          </p>
        )}
        <form onSubmit={handleEmailAuth}>
          <div className="wm-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="wm-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <button className="wm-button" disabled={loading}>
            {loading
              ? "Signing you in…"
              : isSignUp
                ? "Create account"
                : "Sign in"}
            <ArrowRightIcon />
          </button>
        </form>
        <div className="wm-divider">
          <span>or</span>
        </div>
        <button
          className="wm-button secondary"
          type="button"
          disabled={loading}
          onClick={handleGoogleAuth}
        >
          Continue with Google
        </button>
        <button
          className="text-sm text-primary-500 mt-7 w-full"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
        <Link
          href="/demo"
          className="block mt-6 text-xs text-center text-[var(--muted)] underline"
        >
          Explore the reviewer demo without signing in
        </Link>
      </main>
    </div>
  );
}
