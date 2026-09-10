"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { type InterviewConfiguration } from "@/lib/interview/config";
import Link from "next/link";
type Session = {
  resumeText?: string;
  id: string;
  candidateName: string;
  jobTitle: string;
  jobDescription: string;
  configuration: InterviewConfiguration;
  startsAt: number;
  endsAt: number;
  status: string;
};
export default function ReviewerCandidateEntry({ id }: { id: string }) {
  const router = useRouter(),
    [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/reviewer/sessions?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.session) throw Error(d.error || "Session unavailable.");
        setSession(d.session);
      })
      .catch((e) => setError(e.message));
  }, [id]);
  async function start() {
    if (!session) return;
    setBusy(true);
    try {
      if (Date.now() < session.startsAt || Date.now() > session.endsAt)
        throw Error("This interview link is outside its admission window.");
      if (session.status !== "scheduled")
        throw Error("This scheduled test is already complete.");
      const old = useInterviewStore.getState()._sessionContext;
      if (old?.reviewSourceId === id) {
        router.push("/interview");
        return;
      }
      const r = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration: session.configuration }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      let githubEnrichment;
      if (session.configuration.githubUsername) {
        try {
          const response = await fetch("/api/github-enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: session.configuration.githubUsername,
              context: (
                session.jobDescription +
                " " +
                (session.resumeText || "")
              ).slice(0, 6000),
            }),
          });
          if (response.ok)
            githubEnrichment = (await response.json()).enrichment;
        } catch {
          /* Optional context never blocks reviewer entry. */
        }
      }
      useInterviewStore.getState().reset();
      useInterviewStore.setState({
        _sessionContext: {
          sessionId: data.sessionId,
          reviewSourceId: id,
          candidateName: session.candidateName,
          jobTitle: session.jobTitle,
          jobDescription: session.jobDescription,
          resumeText: session.resumeText,
          githubEnrichment,
          configuration: session.configuration,
          preferredLanguage: session.configuration.language,
          allowedModes: session.configuration.allowedModes,
          visualPanel: session.configuration.visualPanel,
          codeDiff: session.configuration.codeDiff,
          interviewMode: "voice",
          sponsored: true,
          accessMode: "reviewer",
          startedAt: Date.now(),
          demoExpiresAt: data.expiresAt,
          returnTo: `/apply/${id}`,
        },
      });
      router.push("/interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot enter room.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wm-page max-w-3xl">
      <p className="wm-eyebrow">Synthetic scheduled interview</p>
      <h1 className="wm-heading">
        {session?.jobTitle || "Loading interview…"}
      </h1>
      {session && (
        <>
          <p>
            {session.candidateName} · {session.configuration.strategy} ·{" "}
            {session.configuration.maxTurns} turns ·{" "}
            {session.configuration.language}
          </p>
          <p className="wm-subtitle my-4">
            Configuration was saved when this link was created. CV context is
            used only when confirmed during setup. This synthetic test is
            excluded from candidate statistics.
          </p>
          <button
            className="wm-button"
            onClick={() => void start()}
            disabled={busy}
          >
            {busy ? "Preparing…" : "Enter interview"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="wm-note mt-5">
          {error}
        </p>
      )}
      <p className="mt-5">
        <Link href="/reviewer">Return to Reviewer Mode</Link>
      </p>
    </div>
  );
}
