"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  query,
  type DocumentData,
} from "firebase/firestore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { interviewScope } from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import {
  deleteInterviewSession,
  revokeInterviewSession,
} from "@/lib/firebase/interviews";
import {
  deletePipelineCandidate,
  pipelineScope,
} from "@/lib/firebase/pipeline";

type CandidateRecord = DocumentData & { id: string };
type StatusFilter = "all" | "active" | "completed";

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

function displayStatus(record: CandidateRecord) {
  if (record.status === "revoked") return "Revoked";
  if (millis(record.expires_at) && millis(record.expires_at) < Date.now()) return "Expired";
  if (record.status === "evaluated" || record.status === "completed") return "Completed";
  if (record.status === "not_invited") return "Not invited";
  if (record.status === "screened") return "Screened";
  return "Active";
}

function atsSnapshot(record: CandidateRecord) {
  const value = record.ats_score ?? record.atsScore;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function completedAt(record: CandidateRecord) {
  if (["completed", "evaluated"].includes(record.status))
    return (
      record.completed_at ??
      record.completedAt ??
      record.updated_at ??
      record.created_at
    );
  return record.completed_at ?? record.completedAt;
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function tags(values: unknown) {
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
}

export default function CandidatesPage() {
  const { user } = useAuthContext();
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pipelineUnavailable, setPipelineUnavailable] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!user || !isFirebaseReady()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const snapshot = await getDocs(
        query(collection(db, "interview_sessions"), ...interviewScope(user))
      );
      const sessions: CandidateRecord[] = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as CandidateRecord)
        .filter((record) => !record.synthetic && !/^(demo|reviewer)-/.test(record.id))
      let pipelineRecords: CandidateRecord[] = [];
      try {
        const pipelineSnapshot = await getDocs(
          query(collection(db, "pipeline_candidates"), ...pipelineScope(user))
        );
        setPipelineUnavailable(false);
        const sessionsById = new Map(sessions.map((session) => [session.id, session]));
        pipelineRecords = pipelineSnapshot.docs.map((item) => {
          const pipeline = { id: item.id, ...item.data() } as CandidateRecord;
          const session = pipeline.session_id ? sessionsById.get(pipeline.session_id) : undefined;
          return {
            ...pipeline,
            ...(session || {}),
            id: pipeline.id,
            pipeline_id: pipeline.id,
            session_id: pipeline.session_id || session?.id,
            candidate_name: session?.candidate_name || pipeline.candidate_name,
            candidate_email: session?.candidate_email || pipeline.candidate_email,
            ats_score:
              session?.ats_score ||
              session?.atsScore ||
              pipeline.ats_score ||
              pipeline.atsScore,
          };
        });
      } catch {
        // Keep the interview records usable while a Firebase rules deployment
        // is being rolled out for the new pipeline collection.
        setPipelineUnavailable(true);
      }
      const linkedSessionIds = new Set(
        pipelineRecords.map((record) => record.session_id).filter(Boolean)
      );
      const next: CandidateRecord[] = [
        ...pipelineRecords,
        ...sessions.filter((session) => !linkedSessionIds.has(session.id)),
      ].sort((a, b) => {
          const atsA = atsSnapshot(a);
          const atsB = atsSnapshot(b);
          const scoreA = typeof atsA?.overall_match === "number" ? atsA.overall_match : -1;
          const scoreB = typeof atsB?.overall_match === "number" ? atsB.overall_match : -1;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return millis(b.created_at) - millis(a.created_at);
        });
      setRecords(next);
    } catch {
      setError("We could not load the candidate dashboard. Check your sign-in and retry.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !term || [record.candidate_name, record.candidate_email, record.candidate_id, record.role_snapshot?.job_title]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(term));
      const status = displayStatus(record);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? status === "Active" : status === "Completed");
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: records.length,
      active: records.filter((record) => displayStatus(record) === "Active").length,
      completed: records.filter((record) => displayStatus(record) === "Completed").length,
    }),
    [records]
  );

  async function copyLink(record: CandidateRecord) {
    const sessionId = record.session_id || record.id;
    if (!record.session_id && record.pipeline_id) {
      setError("This candidate has not been invited yet, so there is no link to copy.");
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/apply/${sessionId}`);
    setNotice(`Invitation link copied for ${record.candidate_name || "this candidate"}.`);
    window.setTimeout(() => setNotice(""), 2200);
  }

  async function revoke(record: CandidateRecord) {
    if (!record.session_id) return;
    if (!window.confirm(`Revoke the invitation for ${record.candidate_name || "this candidate"}?`)) return;
    try {
      await revokeInterviewSession(record.session_id);
      setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: "revoked" } : item));
      setNotice("Invitation revoked.");
    } catch {
      setError("The invitation could not be revoked.");
    }
  }

  async function remove(record: CandidateRecord) {
    if (!window.confirm(`Delete ${record.candidate_name || "this candidate"}'s interview record? This cannot be undone.`)) return;
    try {
      if (record.session_id) await deleteInterviewSession(record.session_id, record.resume_storage_path);
      if (record.pipeline_id) await deletePipelineCandidate(record.pipeline_id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setExpandedId(null);
      setNotice("Candidate record deleted.");
    } catch {
      setError("The candidate record could not be deleted.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">Candidate dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">Candidate records</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">A compact ranking view for every invited candidate. Expand a row when you need the full context.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pipeline" className="wm-button">Add candidates</Link>
          <Link href="/interviews" className="wm-button secondary">Interview records</Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[["All candidates", counts.total], ["Active links", counts.active], ["Completed", counts.completed]].map(([label, value]) => (
          <div key={label} className="wm-panel p-4"><p className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, email, ID or role" className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm outline-none focus:border-primary-500" />
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1">
          {(["all", "active", "completed"] as const).map((filter) => (
            <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${statusFilter === filter ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}>{filter}</button>
          ))}
        </div>
      </div>

      {notice && <p role="status" className="wm-note mb-5 border-emerald-500/30 bg-emerald-500/5 text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="wm-note mb-5 border-red-500/30 bg-red-500/5 text-red-300">{error}</p>}
      {pipelineUnavailable && <p role="status" className="wm-note mb-5 border-amber-500/30 bg-amber-500/5 text-amber-300">The candidate collection is not available yet. Deploy the latest Firestore rules to show screened and not-invited candidates here; existing interview sessions remain visible.</p>}

      <section className="wm-panel overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" /></div>
        ) : !filtered.length ? (
          <div className="px-6 py-20 text-center text-sm text-[var(--muted)]">No candidate records match this view. Upload resumes from the pipeline to create the first invitation.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="w-[5rem] px-5 py-3">Rank</th>
                  <th className="w-[20%] px-5 py-3">Candidate</th>
                  <th className="w-[27%] px-5 py-3">Email</th>
                  <th className="w-[8rem] px-5 py-3">ATS</th>
                  <th className="w-[10rem] px-5 py-3">Status</th>
                  <th className="w-[11rem] px-5 py-3">Completed</th>
                  <th className="w-[7rem] px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((record) => {
                  const expanded = expandedId === record.id;
                  const rank = records.findIndex((item) => item.id === record.id) + 1;
                  const ats = atsSnapshot(record);
                  const score = typeof ats?.overall_match === "number" ? ats.overall_match : null;
                  const status = displayStatus(record);
                  const completed = completedAt(record);
                  const matched = tags(ats?.matched_keywords);
                  const missing = tags(ats?.missing_keywords);
                  return (
                    <Fragment key={record.id}>
                      <tr
                        className="align-top transition-colors hover:bg-[var(--surface-elevated)]/60"
                      >
                        <td className="px-5 py-4 font-mono text-[var(--muted)]">
                          {score === null ? "—" : `#${rank}`}
                        </td>
                        <td className="px-5 py-4">
                          <strong className="block truncate">
                            {record.candidate_name || "Unnamed candidate"}
                          </strong>
                          <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                            {record.role_snapshot?.job_title ||
                              record.job_title ||
                              "Role not recorded"}
                          </span>
                        </td>
                        <td className="truncate px-5 py-4 text-[var(--muted)]">
                          {record.candidate_email || "Email not recorded"}
                        </td>
                        <td className={`px-5 py-4 text-lg font-bold ${score === null ? "text-[var(--muted)]" : scoreColor(score)}`}>
                          {score === null ? "Not scored" : `${score}%`}
                        </td>
                        <td className={`px-5 py-4 text-xs ${status === "Active" ? "text-primary-400" : status === "Completed" ? "text-emerald-400" : "text-[var(--muted)]"}`}>
                          {status}
                        </td>
                        <td className="px-5 py-4 text-xs text-[var(--muted)]">
                          {formatDate(completed)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() =>
                              setExpandedId(expanded ? null : record.id)
                            }
                            className="text-xs font-semibold text-primary-400 hover:text-primary-300"
                          >
                            {expanded ? "Close" : "Expand"}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <div className="border-t border-[var(--border)] bg-[var(--surface-elevated)]/40 px-5 py-5 sm:px-8">
                            <div className="grid gap-6 lg:grid-cols-3">
                              <div className="space-y-3">
                                <h3 className="text-sm font-semibold">Candidate and invitation</h3>
                                <dl className="space-y-2 text-xs"><div><dt className="text-[var(--muted)]">Candidate ID</dt><dd className="font-mono">{record.candidate_id || "—"}</dd></div><div><dt className="text-[var(--muted)]">Email</dt><dd>{record.candidate_email || "—"}</dd></div><div><dt className="text-[var(--muted)]">Created</dt><dd>{formatDate(record.created_at)}</dd></div><div><dt className="text-[var(--muted)]">Valid window</dt><dd>{formatDate(record.valid_from)} → {formatDate(record.expires_at)}</dd></div></dl>
                                <div className="flex flex-wrap gap-2 pt-1"><button type="button" disabled={!record.session_id} className="wm-button secondary text-xs disabled:opacity-50" onClick={() => void copyLink(record)}>Copy invitation</button>{record.session_id && <a className="wm-button secondary text-xs" href={`/apply/${record.session_id}`} target="_blank" rel="noreferrer">Open invitation</a>}</div>
                              </div>
                              <div className="space-y-3">
                                <h3 className="text-sm font-semibold">Role and interview setup</h3>
                                <dl className="space-y-2 text-xs"><div><dt className="text-[var(--muted)]">Role</dt><dd>{record.role_snapshot?.job_title || record.job_title || "—"}</dd></div><div><dt className="text-[var(--muted)]">Language</dt><dd>{record.configuration?.language || "—"}</dd></div><div><dt className="text-[var(--muted)]">Interview mode</dt><dd>{record.allowed_modes || record.configuration?.allowedModes || "—"}</dd></div><div><dt className="text-[var(--muted)]">Turns / strategy</dt><dd>{record.configuration?.maxTurns || "—"} · {record.configuration?.strategy || "—"}</dd></div><div><dt className="text-[var(--muted)]">Panels</dt><dd>{record.configuration?.visualPanel || "None"}</dd></div></dl>
                                {(record.role_snapshot?.job_description || record.job_description) && <details><summary className="cursor-pointer text-xs text-primary-400">Show job description</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[var(--muted)]">{record.role_snapshot?.job_description || record.job_description}</p></details>}
                              </div>
                              <div className="space-y-3">
                                <h3 className="text-sm font-semibold">ATS and evaluation</h3>
                                {ats ? <><p className="text-xs leading-relaxed text-[var(--muted)]">{typeof ats.summary === "string" ? ats.summary : "No ATS summary recorded."}</p><div><p className="mb-1 text-xs text-[var(--muted)]">Matched keywords</p><div className="flex flex-wrap gap-1">{matched.length ? matched.slice(0, 16).map((tag) => <span key={tag} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">{tag}</span>) : <span className="text-xs text-[var(--muted)]">—</span>}</div></div><div><p className="mb-1 text-xs text-[var(--muted)]">Missing keywords</p><div className="flex flex-wrap gap-1">{missing.length ? missing.slice(0, 10).map((tag) => <span key={tag} className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">{tag}</span>) : <span className="text-xs text-[var(--muted)]">—</span>}</div></div></> : <p className="text-xs text-[var(--muted)]">No ATS snapshot was saved for this older interview.</p>}
                                <p className="text-xs text-[var(--muted)]">Evaluation: <strong className="text-[var(--foreground)]">{typeof record.evaluation?.overallScore === "number" ? `${Math.round(record.evaluation.overallScore)}%` : record.evaluation?.status || "Not evaluated"}</strong></p>
                              </div>
                            </div>
                            <div className="mt-6 border-t border-[var(--border)] pt-4">
                              <details><summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">Show parsed CV details</summary><div className="mt-3 grid gap-4 md:grid-cols-2"><div className="text-xs text-[var(--muted)]">Status: {record.cv_parsing?.status || "—"} · Pages: {record.cv_parsing?.pageCount || "—"} · Characters: {record.cv_parsing?.characterCount || "—"}</div><pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-relaxed">{record.cv_parsing?.text || "No parsed CV text stored."}</pre></div></details>
                              <div className="mt-4 flex flex-wrap gap-3">{record.session_id && <Link className="text-xs font-medium text-primary-400" href={`/interviews/${record.session_id}`}>Open interview record</Link>}{status === "Active" && record.session_id && <button type="button" className="text-xs text-amber-400" onClick={() => void revoke(record)}>Revoke invitation</button>}<button type="button" className="text-xs text-red-400" onClick={() => void remove(record)}>Delete record</button></div>
                            </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
