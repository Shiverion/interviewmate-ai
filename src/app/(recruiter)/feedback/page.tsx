"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, type DocumentData } from "firebase/firestore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { interviewScope, isWorkspaceAdmin } from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";

type Feedback = {
  overall_experience: number;
  interviewer_clarity: number;
  transcription_accuracy: number;
  question_relevance: number;
  technical_reliability: number;
  comments?: string;
  submitted_at?: unknown;
};

type FeedbackRecord = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  source: string;
  createdAt?: unknown;
  feedback: Feedback;
  recordHref?: string;
};

const metrics: Array<{ key: keyof Omit<Feedback, "comments" | "submitted_at">; label: string }> = [
  { key: "overall_experience", label: "Overall experience" },
  { key: "interviewer_clarity", label: "Interviewer clarity" },
  { key: "transcription_accuracy", label: "Transcript accuracy" },
  { key: "question_relevance", label: "Question relevance" },
  { key: "technical_reliability", label: "Technical reliability" },
];

function millis(value: unknown) {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return value && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ? (value as { toMillis: () => number }).toMillis()
    : 0;
}

function formatDate(value: unknown) {
  const timestamp = millis(value);
  return timestamp ? new Date(timestamp).toLocaleString() : "—";
}

function average(feedback: Feedback) {
  const total = metrics.reduce((sum, { key }) => sum + (feedback[key] || 0), 0);
  return total / metrics.length;
}

function isFeedback(value: unknown): value is Feedback {
  if (!value || typeof value !== "object") return false;
  return metrics.every(({ key }) => typeof (value as Record<string, unknown>)[key] === "number");
}

export default function FeedbackPage() {
  const { user } = useAuthContext();
  const admin = isWorkspaceAdmin(user);
  const [production, setProduction] = useState<FeedbackRecord[]>([]);
  const [reviewer, setReviewer] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user || !admin || !isFirebaseReady()) {
      void Promise.resolve().then(() => {
        if (active) {
          setProduction([]);
          setReviewer([]);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    const feedbackQuery = query(
      collection(db, "interview_sessions"),
      ...interviewScope(user)
    );
    const unsubscribe = onSnapshot(
      feedbackQuery,
      (snapshot) => {
        if (!active) return;
        const next = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as DocumentData & { id: string })
          .filter((record) => isFeedback(record.candidate_feedback))
          .map((record) => ({
            id: record.id,
            candidateName: record.candidate_name || "Candidate",
            candidateEmail: record.candidate_email || "—",
            source: record.synthetic ? "Invited interview" : "Production interview",
            createdAt: record.candidate_feedback.submitted_at || record.completed_at || record.created_at,
            feedback: record.candidate_feedback,
            recordHref: `/interviews/${record.id}`,
          }))
          .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
        setProduction(next);
        setLoading(false);
      },
      () => {
        if (active) {
          setProduction([]);
          setLoading(false);
        }
      }
    );

    const loadReviewerFeedback = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/reviewer/sessions?admin=1", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !active) return;
        const next = (data.results || [])
          .filter((record: { feedback?: unknown }) => isFeedback(record.feedback))
          .map((record: {
            id: string;
            candidateName?: string;
            candidateEmail?: string;
            feedback: Feedback;
          }) => ({
            id: `reviewer-${record.id}`,
            candidateName: record.candidateName || "Reviewer candidate",
            candidateEmail: record.candidateEmail || "—",
            source: "Reviewer invitation",
            feedback: record.feedback,
          }))
          .sort((a: FeedbackRecord, b: FeedbackRecord) =>
            millis(b.feedback.submitted_at) - millis(a.feedback.submitted_at)
          );
        setReviewer(next);
      } catch {
        if (active) setReviewer([]);
      }
    };

    void loadReviewerFeedback();
    const refresh = window.setInterval(() => void loadReviewerFeedback(), 10000);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(refresh);
    };
  }, [admin, user]);

  const records = useMemo(
    () => [...production, ...reviewer].sort((a, b) => millis(b.createdAt || b.feedback.submitted_at) - millis(a.createdAt || a.feedback.submitted_at)),
    [production, reviewer]
  );
  const averageScore = records.length
    ? records.reduce((sum, record) => sum + average(record.feedback), 0) / records.length
    : 0;

  if (!admin) return null;

  return (
    <main className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="wm-eyebrow">Admin workspace · Product feedback</p>
          <h1 className="wm-heading">Interview feedback</h1>
          <p className="wm-subtitle max-w-3xl">
            Candidate experience ratings are separate from hiring assessments. Review them here to improve the interviewer, transcript and session reliability.
          </p>
        </div>
        <Link href="/interviews" className="wm-button secondary">
          Interview history →
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <section className="glass-card p-5">
          <p className="wm-eyebrow">Responses received</p>
          <p className="mt-2 text-3xl font-semibold">{records.length}</p>
        </section>
        <section className="glass-card p-5">
          <p className="wm-eyebrow">Average experience</p>
          <p className="mt-2 text-3xl font-semibold">{records.length ? `${averageScore.toFixed(1)} / 5` : "—"}</p>
        </section>
      </div>

      <section className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-[var(--muted)]">No feedback has been submitted yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {records.map((record) => (
              <details key={record.id} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-[190px] flex-1">
                    <div className="font-medium">{record.candidateName}</div>
                    <div className="text-xs text-[var(--muted)]">{record.candidateEmail}</div>
                  </div>
                  <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs text-primary-300">{record.source}</span>
                  <span className="text-sm font-semibold text-primary-300">{average(record.feedback).toFixed(1)} / 5</span>
                  <span className="text-xs text-[var(--muted)]">{formatDate(record.createdAt || record.feedback.submitted_at)}</span>
                  <span className="text-primary-300 transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2 lg:grid-cols-5">
                  {metrics.map(({ key, label }) => (
                    <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                      <p className="text-xs text-[var(--muted)]">{label}</p>
                      <p className="mt-1 text-xl font-semibold text-primary-300">{record.feedback[key]} / 5</p>
                    </div>
                  ))}
                </div>
                {record.feedback.comments && (
                  <p className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-sm">{record.feedback.comments}</p>
                )}
                {record.recordHref && <Link href={record.recordHref} className="mt-4 inline-block text-sm text-primary-300">Open interview record →</Link>}
              </details>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
