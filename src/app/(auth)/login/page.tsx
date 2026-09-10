"use client";

import { useEffect, useRef, useState } from "react";
import { auth, isFirebaseReady } from "@/lib/firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRightIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { authErrorMessage } from "@/lib/firebase/auth-error";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_EXPIRES_AT,
  isDemoAdminActive,
} from "@/lib/firebase/access";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDemoGate, setShowDemoGate] = useState(false);
  const [demoIntent, setDemoIntent] = useState(false);
  const [showInactiveAccount, setShowInactiveAccount] = useState(false);
  const [inactiveReason, setInactiveReason] = useState<"expired" | "disabled">("expired");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gate") === "demo") {
      setShowDemoGate(true);
      setDemoIntent(true);
    }
  }, []);

  function destination() {
    if (demoIntent) return "/demo";
    const requested = new URLSearchParams(window.location.search).get(
      "returnUrl"
    );
    return requested &&
      /^(\/demo$|\/apply\/|\/dashboard$|\/pipeline(?:\/|$)|\/candidates(?:\/|$)|\/interviews(?:\/|$)|\/settings$|\/invitations(?:\/|$)?$|\/reviewer(?:\?|$)|\/my-results(?:\?|$)?$)/.test(
        requested
      ) &&
      !requested.includes("\\")
      ? requested
      : "/dashboard";
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseReady()) {
      setError(
        "Firebase initialization failed. Authentication is unavailable."
      );
      return;
    }
    setError(null);
    setShowInactiveAccount(false);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (
          credential.user.email?.toLowerCase() === DEMO_ADMIN_EMAIL &&
          !isDemoAdminActive()
        ) {
          await signOut(auth);
          setInactiveReason("expired");
          setShowInactiveAccount(true);
          return;
        }
      }
      router.push(destination());
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      if (code === "auth/user-disabled") {
        setInactiveReason("disabled");
        setShowInactiveAccount(true);
        return;
      }
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
      router.push(destination());
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
                Try a hosted voice interview after signing in. No personal API
                key is needed.
              </p>
              <button
                type="button"
                className="wm-button secondary mt-5"
                onClick={() => {
                  setDemoIntent(true);
                  setShowDemoGate(true);
                }}
              >
                Open free demo <ArrowRightIcon />
              </button>
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
              ref={emailRef}
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
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
        <button
          type="button"
          className="block mt-6 w-full text-xs text-center text-[var(--muted)] underline"
          onClick={() => {
            setDemoIntent(true);
            setShowDemoGate(true);
          }}
        >
          Open the demo after signing in
        </button>
        {showDemoGate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-gate-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
              <p className="wm-eyebrow">Demo access</p>
              <h3 id="demo-gate-title" className="mt-2 text-2xl">
                You must sign in or sign up first.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                A signed-in session keeps the demo allowance and your browser
                recovery state together. After authentication, we will open the
                live demo automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="wm-button"
                  onClick={() => {
                    setIsSignUp(false);
                    setShowDemoGate(false);
                    emailRef.current?.focus();
                  }}
                >
                  Sign in <ArrowRightIcon />
                </button>
                <button
                  type="button"
                  className="wm-button secondary"
                  onClick={() => {
                    setIsSignUp(true);
                    setShowDemoGate(false);
                    emailRef.current?.focus();
                  }}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--muted)] underline"
                  onClick={() => {
                    setDemoIntent(false);
                    setShowDemoGate(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showInactiveAccount && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inactive-account-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
              <p className="wm-eyebrow">Reviewer access inactive</p>
              <h3 id="inactive-account-title" className="mt-2 text-2xl">
                {inactiveReason === "disabled"
                  ? "This reviewer account is inactive."
                  : "This reviewer account has expired."}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Contact the administrator to reactivate access or receive a new
                review window.
              </p>
              <a
                className="mt-4 block text-sm font-medium text-primary-400 underline underline-offset-4"
                href={`mailto:${"miqbal.izzulhaq@gmail.com"}?subject=${encodeURIComponent("Reactivate InterviewMate reviewer access")}`}
              >
                Contact miqbal.izzulhaq@gmail.com
              </a>
              {inactiveReason === "expired" && (
                <p className="mt-4 text-xs text-[var(--muted)]">
                  The previous access window ended on{" "}
                  {new Date(DEMO_ADMIN_EXPIRES_AT).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  .
                </p>
              )}
              <button
                type="button"
                className="wm-button secondary mt-6"
                onClick={() => setShowInactiveAccount(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
