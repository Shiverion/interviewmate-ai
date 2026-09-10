"use client";
import type { DocumentData } from "firebase/firestore";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { canManageInterview } from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { readPrivateResume } from "@/lib/firebase/resumes";
import { validatedCvText } from "@/lib/pdf/result";
import { configurationSchema } from "@/lib/interview/config";
import ReviewerCandidateEntry from "@/components/interview/ReviewerCandidateEntry";

export default function CandidateApplyPage() {
  const params = useParams();
  const id = params.sessionId as string;
  const { user, loading } = useAuthContext();
  if (!id.startsWith("reviewer-") && (loading || !user))
    return (
      <main className="max-w-lg mx-auto p-8 space-y-5">
        <h1>Sign in to your interview</h1>
        <p>
          Use the Google account with the email your recruiter invited. Only
          that account, the recruiter and the administrator can open this
          session.
        </p>
        {!loading && (
          <Link
            className="wm-button"
            href={`/login?returnUrl=${encodeURIComponent(`/apply/${id}`)}`}
          >
            Sign in to continue
          </Link>
        )}
      </main>
    );
  return id.startsWith("reviewer-") ? (
    <ReviewerCandidateEntry id={id} />
  ) : (
    <ScheduledCandidateEntry />
  );
}
function ScheduledCandidateEntry() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<DocumentData | null>(null);
  const [templateData, setTemplateData] = useState<DocumentData | null>(null);
  const [interviewMode, setInterviewMode] = useState<"voice" | "text">("voice");

  useEffect(() => {
    if (!sessionId) return;

    async function verifySession() {
      if (!isFirebaseReady()) {
        setError(
          "Firebase initialization failed. Please ensure the recruiter has configured the application correctly."
        );
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Session
        const sessionRef = doc(db, "interview_sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          setError("This interview link is invalid or does not exist.");
          setLoading(false);
          return;
        }

        const sData = sessionSnap.data();

        // 2. Check Expiration & Status
        if (sData.status === "revoked") {
          setError("This interview link has been revoked by the recruiter.");
          setLoading(false);
          return;
        }

        if (sData.status === "completed" || sData.status === "evaluated") {
          setError("This interview has already been completed.");
          setLoading(false);
          return;
        }

        const validFrom = sData.valid_from?.toMillis() || 0;
        if (validFrom > Date.now()) {
          const startDate = new Date(validFrom).toLocaleString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          setError(
            `This interview window has not started yet. It will be available on ${startDate}.`
          );
          setLoading(false);
          return;
        }

        const expiresAt = sData.expires_at?.toMillis() || 0;
        if (expiresAt < Date.now()) {
          setError(
            "This interview link has expired. Please contact your recruiter for a new link."
          );
          setLoading(false);
          return;
        }

        // Admission expiry is separate from the paused active interview clock.

        // 3. Fetch Job associated with the Template
        let tData = null;
        if (
          sData.template_id &&
          (!sData.role_snapshot || !sData.configuration) &&
          canManageInterview(user, sData)
        ) {
          const templateSnap = await getDoc(
            doc(db, "interview_templates", sData.template_id)
          );
          if (templateSnap.exists()) {
            tData = templateSnap.data();
          }
        }

        if (sData.role_snapshot) tData = { ...tData, ...sData.role_snapshot };
        if (sData.configuration) {
          const c = configurationSchema.parse(sData.configuration);
          tData = {
            ...tData,
            question_count: c.maxTurns,
            custom_questions: c.customQuestions,
            preferred_language: c.language,
            github_username: c.githubUsername,
            visual_panel: c.visualPanel,
            code_diff: c.codeDiff,
          };
        }
        setSessionData({ id: sessionId, ...sData });
        setTemplateData(tData);

        // 4. Pre-fetch and parse the CV text so the AI has it immediately
        let extractedResumeText = "";
        if (sData.cv_parsing || sData.resume_storage_path || sData.resume_url) {
          const parsed =
            sData.cv_parsing ||
            (await readPrivateResume(
              sData.resume_storage_path || sData.resume_url
            ));
          extractedResumeText = validatedCvText(parsed);
          setSessionData((prev: DocumentData | null) => ({
            ...prev,
            cv_parsing: parsed,
          }));
          if (extractedResumeText) {
            console.log(
              `[CV PDF DIAGNOSIS] Success. Extracted ${extractedResumeText.length} characters.`
            );
            setSessionData((prev: DocumentData | null) => ({
              ...prev,
              _resumeText: extractedResumeText,
            }));
          } else {
            console.warn("[CV PDF DIAGNOSIS] FAILED or returned empty string.");
          }
        }

        // GitHub enrichment (if template has a github_username)
        if (tData?.github_username) {
          try {
            const ghRes = await fetch("/api/github-enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: tData.github_username,
                context: (
                  tData.job_title +
                  " " +
                  tData.job_description +
                  " " +
                  extractedResumeText
                ).slice(0, 6000),
              }),
            });
            if (ghRes.ok) {
              const ghData = await ghRes.json();
              if (ghData.enrichment) {
                setSessionData((prev: DocumentData | null) => ({
                  ...prev,
                  _githubEnrichment: ghData.enrichment,
                }));
                console.log(
                  `[GITHUB] Enriched with ${ghData.enrichment.top_repos.length} repos`
                );
              }
            }
          } catch (e) {
            console.warn("[GITHUB] Enrichment failed, continuing without:", e);
          }
        }
      } catch (err: unknown) {
        console.error("Error verifying session:", err);
        // Due to Firestore rules, if the link is expired and rules block strictly, it might throw a permission error.
        if (
          (err instanceof Error ? err.message : "").includes(
            "Missing or insufficient permissions"
          )
        ) {
          setError(
            "This invitation is unavailable to this account. Sign in with the invited email, or ask your recruiter to check the address and interview window."
          );
        } else {
          setError("An error occurred while loading your interview details.");
        }
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, [sessionId, user]);

  const handleStart = async () => {
    if (!sessionData || !templateData) return;

    // If the 15 minute timer hasn't started yet, start it now
    if (!sessionData.started_at) {
      try {
        await updateDoc(doc(db, "interview_sessions", sessionData.id), {
          started_at: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to start timer", err);
        setError(
          "This account cannot start the interview. Ask your recruiter to check the invitation."
        );
        return;
      }
    }

    // Push the session context into the UI store so the Voice implementation knows what to do
    if (
      useInterviewStore.getState()._sessionContext?.sessionId !== sessionData.id
    )
      useInterviewStore.getState().reset();
    useInterviewStore.setState({
      _sessionContext: {
        sessionId: sessionData.id,
        configuration: sessionData.configuration,
        cvParsing: sessionData.cv_parsing,
        accessMode: "byok",
        returnTo: `/apply/${sessionData.id}`,
        candidateName: sessionData.candidate_name,
        jobTitle: templateData.job_title,
        jobDescription: templateData.job_description || "",
        questionTopic: templateData.question_topic || "",
        questionLevel: templateData.question_level || "",
        questionCount: templateData.question_count || "",
        customQuestions: Array.isArray(templateData.custom_questions)
          ? templateData.custom_questions
          : [],
        preferredLanguage: templateData.preferred_language || "",
        resumeUrl: sessionData.resume_url,
        resumeText: sessionData._resumeText || "",
        githubEnrichment: sessionData._githubEnrichment || undefined,
        startedAt: sessionData.started_at?.toMillis() || Date.now(),
        interviewMode:
          sessionData.allowed_modes === "audio_only" ? "voice" : interviewMode,
        allowedModes: sessionData.allowed_modes || "audio_and_text",
        visualPanel: templateData.visual_panel || "none",
        codeDiff: templateData.code_diff || "",
      },
    });

    // Navigate to the live room
    router.push("/interview");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <div className="glass-card max-w-md w-full p-8 text-center animate-slide-up border-error/20">
          <div className="mx-auto w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold font-heading mb-2">Access Denied</h2>
          <p className="text-[var(--muted)] mb-8">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-elevated)] transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="glass-card max-w-lg w-full p-8 md:p-12 animate-slide-up relative z-10">
        <div className="mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            Interview Invitation
          </span>
          <h1 className="text-3xl font-bold font-heading">
            Welcome, {sessionData?.candidate_name?.split(" ")[0]}
          </h1>
          <p className="text-[var(--muted)] mt-2">
            You&apos;ve been invited to complete a virtual AI interview for the
            following role:
          </p>
        </div>

        <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {templateData?.job_title || "Role Undefined"}
          </h2>
          <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Estimated Duration: ~15 to 20 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
              <span>Your connection is stable and secure</span>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mb-8 space-y-3">
          <h3 className="font-semibold text-sm text-[var(--muted)]">
            Select Interview Mode
          </h3>
          <div
            className={
              sessionData?.allowed_modes === "audio_only"
                ? "grid grid-cols-1 gap-4"
                : "grid grid-cols-2 gap-4"
            }
          >
            <button
              onClick={() => setInterviewMode("voice")}
              className={`p-4 rounded-xl border text-left transition-all ${
                interviewMode === "voice"
                  ? "border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20"
                  : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-primary-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`font-semibold ${interviewMode === "voice" ? "text-primary-400" : ""}`}
                >
                  Voice
                </span>
                <svg
                  className={`w-5 h-5 ${interviewMode === "voice" ? "text-primary-400" : "text-[var(--muted)]"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7.5 7.5 0 01-14.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632zM8 11V7a4 4 0 118 0v4M8 11h8"
                  />
                </svg>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Interactive speaking & listening.
              </p>
            </button>

            {sessionData?.allowed_modes !== "audio_only" && (
              <button
                onClick={() => setInterviewMode("text")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  interviewMode === "text"
                    ? "border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20"
                    : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-primary-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-semibold ${interviewMode === "text" ? "text-primary-400" : ""}`}
                  >
                    Text
                  </span>
                  <svg
                    className={`w-5 h-5 ${interviewMode === "text" ? "text-primary-400" : "text-[var(--muted)]"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Quiet typing environment.
                </p>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full gradient-primary text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 transition-transform flex justify-center items-center gap-2"
        >
          Enter Interview Room
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
