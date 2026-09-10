"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import ConfigurationFields from "@/components/interview/ConfigurationFields";
import {
  configurationSchema,
  defaultConfiguration,
  type InterviewConfiguration,
} from "@/lib/interview/config";
import {
  createScheduledInterview,
  type InterviewSession,
} from "@/lib/firebase/interviews";
import { validatedCvText, type ParsingResult } from "@/lib/pdf/result";

type AtsScore = NonNullable<InterviewSession["ats_score"]>;
type CandidateStatus = "queued" | "parsing" | "scoring" | "ready" | "error";
type InviteStatus = "idle" | "creating" | "created" | "error";

type PipelineCandidate = {
  id: string;
  file: File;
  fileName: string;
  candidateName: string;
  candidateEmail: string;
  resumeText: string;
  parsing?: ParsingResult;
  atsScore?: AtsScore;
  status: CandidateStatus;
  inviteStatus: InviteStatus;
  sessionId?: string;
  error?: string;
  selected: boolean;
};

const MAX_FILES = 50;

function localDateTime(ms: number) {
  const date = new Date(ms);
  return new Date(ms - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function candidateNameFromFile(file: File) {
  const name = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  return name || "Unnamed candidate";
}

function emailFromText(text: string) {
  return text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i)?.[0]?.toLowerCase() || "";
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function statusLabel(candidate: PipelineCandidate) {
  if (candidate.inviteStatus === "created") return "Invitation ready";
  if (candidate.inviteStatus === "creating") return "Creating link…";
  if (candidate.status === "parsing") return "Reading CV…";
  if (candidate.status === "scoring") return "Scoring…";
  if (candidate.status === "error") return "Needs attention";
  if (candidate.status === "ready") return "Ready to invite";
  return "Waiting to analyze";
}

export default function PipelinePage() {
  const { user } = useAuthContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [configuration, setConfiguration] = useState<InterviewConfiguration>(
    defaultConfiguration()
  );
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [topLimit, setTopLimit] = useState<"all" | "5" | "10" | "20">("20");
  const [starts, setStarts] = useState(localDateTime(Date.now() - 60000));
  const [ends, setEnds] = useState(localDateTime(Date.now() + 3 * 86400000));
  const [analyzing, setAnalyzing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rankedCandidates = useMemo(
    () =>
      [...candidates].sort((a, b) => {
        const scoreA = a.atsScore?.overall_match ?? -1;
        const scoreB = b.atsScore?.overall_match ?? -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.candidateName.localeCompare(b.candidateName);
      }),
    [candidates]
  );

  const readyCandidates = rankedCandidates.filter(
    (candidate) => candidate.status === "ready" && candidate.atsScore
  );
  const selectedCandidates = candidates.filter(
    (candidate) => candidate.selected && candidate.status === "ready"
  );
  const canAnalyze =
    !!jobTitle.trim() && jobDescription.trim().length >= 50 && candidates.length > 0;

  function updateCandidate(id: string, patch: Partial<PipelineCandidate>) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, ...patch } : candidate
      )
    );
  }

  function addFiles(files: File[]) {
    setError("");
    setMessage("");
    const pdfs = files.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    const existing = new Set(candidates.map((candidate) => `${candidate.file.name}:${candidate.file.size}`));
    const additions = pdfs
      .filter((file) => !existing.has(`${file.name}:${file.size}`))
      .slice(0, Math.max(0, MAX_FILES - candidates.length))
      .map<PipelineCandidate>((file) => ({
        id: crypto.randomUUID(),
        file,
        fileName: file.name,
        candidateName: candidateNameFromFile(file),
        candidateEmail: "",
        resumeText: "",
        status: "queued",
        inviteStatus: "idle",
        selected: false,
      }));
    if (!pdfs.length) setError("Upload PDF resumes to build the ranking.");
    if (files.length > additions.length && candidates.length + additions.length >= MAX_FILES)
      setMessage(`The pipeline accepts up to ${MAX_FILES} resumes per batch.`);
    setCandidates((current) => [...current, ...additions]);
  }

  async function analyzeResumes() {
    if (!canAnalyze || analyzing) return;
    setAnalyzing(true);
    setError("");
    setMessage("");
    // Reprocess the full batch so changing the role brief always refreshes the
    // ranking instead of leaving old scores attached to the new description.
    const pending = candidates;
    let completed = 0;
    for (const candidate of pending) {
      updateCandidate(candidate.id, {
        status: "parsing",
        error: "",
        inviteStatus: "idle",
        sessionId: undefined,
      });
      try {
        const form = new FormData();
        form.set("file", candidate.file);
        const parseResponse = await fetch("/api/parse-resume", {
          method: "POST",
          body: form,
        });
        const parsing = (await parseResponse.json()) as ParsingResult;
        const resumeText = validatedCvText(parsing);
        if (!parseResponse.ok || !resumeText) {
          throw Error(parsing.failureReason || "No readable text was found in this PDF.");
        }
        updateCandidate(candidate.id, {
          status: "scoring",
          parsing,
          resumeText,
          candidateEmail: candidate.candidateEmail || emailFromText(resumeText),
        });

        const scoreResponse = await fetch("/api/ats-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText,
            jobTitle: jobTitle.trim(),
            jobDescription: jobDescription.trim(),
          }),
        });
        const scoreData = (await scoreResponse.json()) as {
          ats_score?: AtsScore;
          error?: string;
        };
        if (!scoreResponse.ok || !scoreData.ats_score)
          throw Error(scoreData.error || "ATS scoring failed.");
        updateCandidate(candidate.id, {
          status: "ready",
          atsScore: scoreData.ats_score,
          selected: false,
        });
        completed++;
      } catch (caught) {
        updateCandidate(candidate.id, {
          status: "error",
          error: caught instanceof Error ? caught.message : "Could not analyze this resume.",
          selected: false,
        });
      }
    }
    setAnalyzing(false);
    // Preselect the chosen top-N after every batch. Recruiters can still edit
    // the checkboxes one by one before creating links.
    setCandidates((current) => {
      const limit = topLimit === "all" ? Number.POSITIVE_INFINITY : Number(topLimit);
      const rankedReady = [...current]
        .filter((candidate) => candidate.status === "ready" && candidate.atsScore)
        .sort((a, b) => (b.atsScore?.overall_match ?? -1) - (a.atsScore?.overall_match ?? -1));
      const topIds = new Set(rankedReady.slice(0, limit).map((candidate) => candidate.id));
      return current.map((candidate) => ({
        ...candidate,
        selected: candidate.status === "ready" && topIds.has(candidate.id),
      }));
    });
    setMessage(
      completed
        ? `${completed} resume${completed === 1 ? "" : "s"} ranked. Review the order and choose who should receive an invitation.`
        : "No resumes could be ranked. Check the PDF files and try again."
    );
  }

  function selectTop() {
    const limit = topLimit === "all" ? Number.POSITIVE_INFINITY : Number(topLimit);
    const topIds = new Set(readyCandidates.slice(0, limit).map((candidate) => candidate.id));
    setCandidates((current) =>
      current.map((candidate) => ({
        ...candidate,
        selected: candidate.status === "ready" && topIds.has(candidate.id),
      }))
    );
  }

  async function createInvitations() {
    if (!user || inviting) return;
    setError("");
    setMessage("");
    if (!selectedCandidates.length) {
      setError("Select at least one ranked candidate first.");
      return;
    }
    const missingEmail = selectedCandidates.find((candidate) => !candidate.candidateEmail.trim());
    if (missingEmail) {
      setError(`Add a sign-in email for ${missingEmail.candidateName} before creating the link.`);
      return;
    }
    if (new Date(ends) <= new Date(starts)) {
      setError("The invitation expiry must be after its start time.");
      return;
    }
    let config: InterviewConfiguration;
    try {
      config = configurationSchema.parse({
        ...configuration,
        allowedModes: "audio_and_text",
        customQuestions: configuration.customQuestions.map((question) => question.trim()).filter(Boolean),
      });
    } catch {
      setError("Review the interview settings before creating invitations.");
      return;
    }
    setInviting(true);
    let created = 0;
    for (const candidate of selectedCandidates) {
      updateCandidate(candidate.id, { inviteStatus: "creating" });
      try {
        const sessionId = await createScheduledInterview(
          user.uid,
          jobTitle.trim(),
          jobDescription.trim(),
          "",
          "",
          config.maxTurns,
          config.customQuestions,
          config.language,
          candidate.candidateName,
          `CAND-${crypto.randomUUID().slice(0, 8)}`,
          candidate.candidateEmail,
          candidate.file,
          new Date(starts),
          new Date(ends),
          "audio_and_text",
          config.githubUsername,
          config.visualPanel,
          config.codeDiff,
          config,
          candidate.parsing,
          candidate.atsScore
        );
        updateCandidate(candidate.id, { inviteStatus: "created", sessionId });
        created++;
      } catch (caught) {
        updateCandidate(candidate.id, {
          inviteStatus: "error",
          error: caught instanceof Error ? caught.message : "Could not create invitation.",
        });
      }
    }
    setInviting(false);
    setMessage(
      `${created} invitation${created === 1 ? "" : "s"} created. Copy each link below and send it to the matching candidate.`
    );
  }

  async function copyLink(candidate: PipelineCandidate) {
    if (!candidate.sessionId) return;
    const link = `${window.location.origin}/apply/${candidate.sessionId}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(candidate.id);
    window.setTimeout(() => setCopiedId((current) => (current === candidate.id ? null : current)), 1600);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">Recruiting pipeline</p>
          <h1 className="text-3xl font-bold tracking-tight">CVs to interview invitations</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Upload a batch of resumes, rank them against one role, then choose which candidates should receive a structured interview link.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/interviews" className="wm-button secondary shrink-0">Review interview records</Link>
          <Link href="/ats-check" className="wm-button secondary shrink-0">Open single resume check</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-6">
          <section className="wm-panel space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step 1</p>
                <h2 className="mt-1 text-xl font-semibold">Set the role brief</h2>
              </div>
              <span className="text-xs text-[var(--muted)]">Used for every ATS score</span>
            </div>
            <label className="wm-field">
              Role title
              <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Senior Product Designer" maxLength={200} />
            </label>
            <label className="wm-field">
              Job description
              <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={6} maxLength={6000} placeholder="Paste the responsibilities, outcomes and skills for this role…" />
              <span className="text-xs text-[var(--muted)]">{jobDescription.length} characters · at least 50 recommended</span>
            </label>
          </section>

          <section className="wm-panel space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step 2</p>
                <h2 className="mt-1 text-xl font-semibold">Add resumes in one batch</h2>
              </div>
              <span className="text-xs text-[var(--muted)]">PDF · up to {MAX_FILES} files</span>
            </div>
            <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-10 text-center transition hover:border-primary-500/50 hover:bg-primary-500/5">
              <span className="text-sm font-semibold">Choose multiple CV PDFs</span>
              <span className="mt-1 text-xs text-[var(--muted)]">Each PDF is read for ATS scoring; it is stored with a session only when you create an invitation.</span>
              <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
            </button>
            {!!candidates.length && (
              <div className="flex flex-wrap gap-2">
                {candidates.map((candidate) => (
                  <span key={candidate.id} className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs">
                    <span className="max-w-[14rem] truncate">{candidate.fileName}</span>
                    <button type="button" aria-label={`Remove ${candidate.fileName}`} className="text-[var(--muted)] hover:text-red-400" onClick={() => setCandidates((current) => current.filter((item) => item.id !== candidate.id))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <button type="button" className="wm-button" disabled={!canAnalyze || analyzing} onClick={() => void analyzeResumes()}>
              {analyzing ? "Analyzing resumes…" : candidates.some((candidate) => candidate.status !== "ready") ? "Analyze and rank resumes" : "Re-run ATS ranking"}
            </button>
          </section>

          {!!rankedCandidates.length && (
            <section className="wm-panel overflow-hidden p-0">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step 3</p>
                  <h2 className="mt-1 text-xl font-semibold">Review the ATS ranking</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Scores are a screening signal. Keep the recruiter decision in your hands.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--muted)]" htmlFor="top-limit">Preselect</label>
                  <select id="top-limit" value={topLimit} onChange={(event) => setTopLimit(event.target.value as typeof topLimit)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm">
                    <option value="20">Top 20</option>
                    <option value="10">Top 10</option>
                    <option value="5">Top 5</option>
                    <option value="all">All ranked</option>
                  </select>
                  <button type="button" className="wm-button secondary" onClick={selectTop}>Apply</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-xs uppercase tracking-wider text-[var(--muted)]">
                    <tr><th className="px-5 py-3">Invite</th><th className="px-5 py-3">Rank</th><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">ATS score</th><th className="px-5 py-3">Email for link</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Link</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {rankedCandidates.map((candidate, index) => {
                      const score = candidate.atsScore?.overall_match;
                      const linkReady = !!candidate.sessionId;
                      return (
                        <tr key={candidate.id} className="align-top hover:bg-[var(--surface-elevated)]/60">
                          <td className="px-5 py-4">
                            <input type="checkbox" checked={candidate.selected} disabled={candidate.status !== "ready" || linkReady || inviting} onChange={(event) => updateCandidate(candidate.id, { selected: event.target.checked })} aria-label={`Invite ${candidate.candidateName}`} className="h-4 w-4 accent-[var(--primary)]" />
                          </td>
                          <td className="px-5 py-4 font-mono text-[var(--muted)]">{score === undefined ? "—" : `#${index + 1}`}</td>
                          <td className="px-5 py-4">
                            <input value={candidate.candidateName} onChange={(event) => updateCandidate(candidate.id, { candidateName: event.target.value })} className="mb-1 w-44 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium hover:border-[var(--border)] focus:border-primary-500 focus:outline-none" />
                            <p className="max-w-[13rem] truncate text-xs text-[var(--muted)]" title={candidate.fileName}>{candidate.fileName}</p>
                            {candidate.error && <p className="mt-1 max-w-xs text-xs text-red-400">{candidate.error}</p>}
                          </td>
                          <td className="px-5 py-4">
                            {score === undefined ? <span className="text-[var(--muted)]">—</span> : <span className={`text-lg font-bold ${scoreColor(score)}`}>{score}%</span>}
                          </td>
                          <td className="px-5 py-4"><input type="email" value={candidate.candidateEmail} disabled={linkReady || inviting} onChange={(event) => updateCandidate(candidate.id, { candidateEmail: event.target.value })} placeholder="candidate@company.com" className="w-52 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs focus:border-primary-500 focus:outline-none" /></td>
                          <td className="px-5 py-4"><span className={`text-xs ${candidate.status === "error" || candidate.inviteStatus === "error" ? "text-red-400" : candidate.inviteStatus === "created" ? "text-emerald-400" : "text-[var(--muted)]"}`}>{statusLabel(candidate)}</span></td>
                          <td className="px-5 py-4 text-right">{linkReady ? <div className="flex items-center justify-end gap-2"><a className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]" href={`/apply/${candidate.sessionId}`} target="_blank" rel="noreferrer">Open</a><button type="button" className="text-xs font-semibold text-primary-400 hover:text-primary-300" onClick={() => void copyLink(candidate)}>{copiedId === candidate.id ? "Copied" : "Copy link"}</button></div> : <span className="text-xs text-[var(--muted)]">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </section>

        <aside className="space-y-6">
          <section className="wm-panel space-y-4 lg:sticky lg:top-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step 4</p>
              <h2 className="mt-1 text-xl font-semibold">Create interview links</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{selectedCandidates.length} candidate{selectedCandidates.length === 1 ? "" : "s"} selected</p>
            </div>
            <details open className="rounded-lg border border-[var(--border)] p-3">
              <summary className="cursor-pointer text-sm font-semibold">Interview settings</summary>
              <div className="mt-4 space-y-4"><ConfigurationFields value={configuration} onChange={setConfiguration} /></div>
            </details>
            <label className="wm-field">Link valid from<input type="datetime-local" value={starts} onChange={(event) => setStarts(event.target.value)} /></label>
            <label className="wm-field">Link expires<input type="datetime-local" value={ends} onChange={(event) => setEnds(event.target.value)} /></label>
            <button type="button" className="wm-button w-full" disabled={!selectedCandidates.length || inviting || analyzing} onClick={() => void createInvitations()}>{inviting ? "Creating invitations…" : "Create selected invitations"}</button>
            <p className="text-xs leading-relaxed text-[var(--muted)]">Each link is tied to the email in its row. Candidates can only open their own active session; the ranking and transcripts remain in the recruiter workspace.</p>
          </section>
        </aside>
      </div>

      {message && <p role="status" className="wm-note mt-6 border-emerald-500/30 bg-emerald-500/5 text-emerald-300">{message}</p>}
      {error && <p role="alert" className="wm-note mt-6 border-red-500/30 bg-red-500/5 text-red-300">{error}</p>}
    </main>
  );
}
