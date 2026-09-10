"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EvidenceAssessment from "@/components/interview/EvidenceAssessment";
import HumanReviewPanel from "@/components/interview/HumanReviewPanel";
import InterviewFeedbackSummary from "@/components/interview/InterviewFeedbackSummary";
import type { InterviewFeedback } from "@/components/interview/InterviewFeedbackForm";
import type { EvidenceAssessment as Assessment } from "@/lib/ai/evidence";
import Link from "next/link";
export default function ReviewerSession() {
  const { sessionId } = useParams<{ sessionId: string }>(),
    [session, setSession] = useState<{
      evaluation?: Assessment;
      transcript?: unknown;
      model?: string;
      provider?: string;
      feedback?: InterviewFeedback;
      candidateName: string;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/reviewer/sessions?id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.session) throw Error(d.error || "Session unavailable.");
        setSession(d.session);
      })
      .catch((e) => setError(e.message));
  }, [sessionId]);
  return (
    <div className="wm-page max-w-4xl">
      <Link href="/reviewer">Back to Reviewer Mode</Link>
      <h1 className="wm-heading">
        {session?.candidateName || "Reviewer session"}
      </h1>
      {session?.evaluation ? (
        <>
          <EvidenceAssessment assessment={session.evaluation} />
          <HumanReviewPanel
            assessment={session.evaluation}
            transcript={session.transcript}
            source={{
              sessionId,
              transcriptVersion: "live-transcript-v2",
              model: session.model || "unknown",
              provider: session.provider || "unknown",
              synthetic: true,
            }}
          />
          <InterviewFeedbackSummary value={session.feedback} />
        </>
      ) : (
        <p>No completed assessment saved yet.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
