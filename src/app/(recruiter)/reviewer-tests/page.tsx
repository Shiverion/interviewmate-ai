"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, type DocumentData } from "firebase/firestore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { interviewScope, isWorkspaceAdmin } from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { isReviewerTestSession } from "@/lib/firebase/interviews";

type ReviewerTestRecord = DocumentData & {
  id: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_id?: string;
  status?: string;
  created_at?: unknown;
  completed_at?: unknown;
  updated_at?: unknown;
  evaluation?: {
    schemaVersion?: string;
    status?: string;
    overallScore?: number | null;
    dimensions?: { evidenceScore?: number | null };
  };
};

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

function scoreLabel(record: ReviewerTestRecord) {
  const evaluation = record.evaluation;
  const score =
    evaluation?.schemaVersion === "competency-evidence-v2"
      ? evaluation.dimensions?.evidenceScore
      : evaluation?.overallScore;
  if (typeof score === "number") return `${Math.round(score)}/100`;
  if (evaluation?.status) return evaluation.status;
  return "Pending";
}

export default function ReviewerTestsPage() {
  const { user } = useAuthContext();
  const admin = isWorkspaceAdmin(user);
  const [records, setRecords] = useState<ReviewerTestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user || !admin || !isFirebaseReady()) {
      void Promise.resolve().then(() => {
        if (active) {
          setRecords([]);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }
    void Promise.resolve().then(() => {
      if (active) setLoading(true);
    });
    const reviewerQuery = query(
      collection(db, "interview_sessions"),
      ...interviewScope(user)
    );
    const unsubscribe = onSnapshot(
      reviewerQuery,
      (snapshot) => {
        if (!active) return;
        const next = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as ReviewerTestRecord)
          .filter((record) => !record.synthetic && isReviewerTestSession(record))
          .sort((a, b) => millis(b.created_at) - millis(a.created_at));
        setRecords(next);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setRecords([]);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [admin, user]);

  if (!admin) return null;

  return (
    <main className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="wm-eyebrow">Admin only · QA workspace</p>
          <h1 className="wm-heading">Reviewer test runs</h1>
          <p className="wm-subtitle max-w-3xl">
            Test invitation sessions live here so they never mix with production
            candidate history, rankings or recruiter reports.
          </p>
        </div>
        <Link href="/interviews" className="wm-button secondary">
          Production interview history →
        </Link>
      </div>

      <div className="wm-note mb-6">
        These records are created from the reviewer demo invitation. They are
        retained for QA and can be reviewed without changing production metrics.
      </div>

      <section className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-[var(--muted)]">
            No reviewer test runs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Candidate ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created On</th>
                  <th className="px-6 py-4">Completed On</th>
                  <th className="px-6 py-4">Assessment</th>
                  <th className="px-6 py-4 text-right">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-[var(--surface-elevated)]">
                    <td className="px-6 py-4">
                      <div className="font-medium">{record.candidate_name || "Reviewer"}</div>
                      <div className="text-xs text-[var(--muted)]">{record.candidate_email || "—"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{record.candidate_id || record.id}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-accent-500/10 px-2 py-1 text-xs font-medium text-accent-400">
                        {record.status === "evaluated" || record.status === "completed" ? "Evaluated" : record.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)]">{formatDate(record.created_at)}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {formatDate(record.completed_at || record.updated_at)}
                    </td>
                    <td className="px-6 py-4 font-medium text-accent-400">{scoreLabel(record)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/interviews/${record.id}`}
                        className="text-primary-400 transition-colors hover:text-primary-300"
                      >
                        Open record →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
