"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  savePipelineCandidate,
  updatePipelineCandidate,
} from "@/lib/firebase/pipeline";
import { validatedCvText, type ParsingResult } from "@/lib/pdf/result";
import {
  MAX_FILES,
  usePipelineDraft,
  type AtsScore,
  type PipelineCandidate,
} from "./PipelineDraftContext";

function candidateNameFromFile(file: File) {
  const name = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  return name || "Unnamed candidate";
}

function emailFromText(text: string) {
  return text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i)?.[0]?.toLowerCase() || "";
}

function nameFromText(text: string, fallback: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);
  const isName = (line: string) =>
    line.length >= 3 &&
    line.length <= 80 &&
    line.split(" ").length >= 2 &&
    line.split(" ").length <= 5 &&
    !line.includes("@") &&
    !/resume|curriculum|vitae|profile|experience|skills|education|linkedin|phone/i.test(line) &&
    /^[\p{L}][\p{L}' .-]+$/u.test(line);
  const detected = lines.find(isName);
  if (detected) return detected;

  // Some PDF extractors flatten the header into one line. Use the text before
  // the first email as a safe fallback for the common "Name  email" layout.
  const emailIndex = text.search(/[\w.+-]+@[\w-]+\.[\w.-]+/i);
  const header = emailIndex >= 0
    ? text.slice(0, emailIndex).replace(/[|•]+/g, " ").replace(/\s+/g, " ").trim()
    : "";
  const flattened = header.split(/(?:target title|location|phone)\s*:?/i)[0].trim();
  if (isName(flattened)) return flattened;
  const detectedFromHeader = flattened.match(/[\p{L}][\p{L}'-]+(?:\s+[\p{L}][\p{L}'-]+){1,4}/u)?.[0];
  if (detectedFromHeader && isName(detectedFromHeader)) return detectedFromHeader;
  return fallback;
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
  const router = useRouter();
  const { draft, setDraft } = usePipelineDraft();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobTitle, setJobTitle] = useState(draft.jobTitle);
  const [jobDescription, setJobDescription] = useState(draft.jobDescription);
  const [candidates, setCandidates] = useState<PipelineCandidate[]>(draft.candidates);
  const [topLimit, setTopLimit] = useState<"all" | "5" | "10" | "20">(draft.topLimit);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      jobTitle,
      jobDescription,
      candidates,
      topLimit,
    }));
  }, [candidates, jobDescription, jobTitle, setDraft, topLimit]);

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
    let persistenceMisses = 0;
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
          candidateName:
            candidate.candidateName === candidateNameFromFile(candidate.file)
              ? nameFromText(resumeText, candidate.candidateName)
              : candidate.candidateName,
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
        const extractedName =
          candidate.candidateName === candidateNameFromFile(candidate.file)
            ? nameFromText(resumeText, candidate.candidateName)
            : candidate.candidateName;
        const extractedEmail = candidate.candidateEmail || emailFromText(resumeText);
        let pipelineId: string | undefined = candidate.pipelineId;
        if (user) {
          try {
            const pipelineData = {
              candidate_id: candidate.id,
              candidate_name: extractedName,
              candidate_email: extractedEmail,
              job_title: jobTitle.trim(),
              job_description: jobDescription.trim(),
              configuration: draft.configuration,
              file_name: candidate.fileName,
              resume_text: resumeText.slice(0, 24000),
              cv_parsing: parsing,
              ats_score: scoreData.ats_score,
              status: "screened" as const,
            };
            if (pipelineId) await updatePipelineCandidate(pipelineId, pipelineData);
            else pipelineId = await savePipelineCandidate(user.uid, pipelineData);
          } catch {
            // Ranking should remain usable if a deployment has not picked up
            // the optional pipeline_candidates rule yet.
            persistenceMisses++;
          }
        }
        updateCandidate(candidate.id, {
          status: "ready",
          atsScore: scoreData.ats_score,
          selected: false,
          candidateName: extractedName,
          candidateEmail: extractedEmail,
          pipelineId,
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
        ? `${completed} resume${completed === 1 ? "" : "s"} ranked. Review the order and choose who should receive an invitation.${persistenceMisses ? ` ${persistenceMisses} record${persistenceMisses === 1 ? " was" : "s were"} not saved to the dashboard; deploy the latest Firestore rules before relying on persistence.` : ""}`
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

  function continueToSchedule() {
    setError("");
    if (!readyCandidates.length) {
      setError("Analyze at least one resume before continuing to Step 4.");
      return;
    }
    if (!selectedCandidates.length) {
      setError("Select at least one ranked candidate before continuing to Step 4.");
      return;
    }
    setDraft((current) => ({
      ...current,
      jobTitle,
      jobDescription,
      candidates,
      topLimit,
    }));
    router.push("/pipeline/schedule");
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

      <nav aria-label="Pipeline progress" className="mb-6 grid gap-2 sm:grid-cols-4">
        {[
          { number: "1", label: "Role brief", complete: true },
          { number: "2", label: "Upload CVs", complete: true },
          { number: "3", label: "Review ranking", complete: rankedCandidates.length > 0 },
          { number: "4", label: "Create links", complete: false },
        ].map((step) => (
          <div key={step.number} className={`rounded-xl border px-4 py-3 ${step.complete ? "border-primary-500/50 bg-primary-500/10" : "border-[var(--border)] bg-[var(--surface-elevated)]"}`}>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step {step.number}</span>
            <p className="mt-1 text-sm font-medium">{step.label}</p>
          </div>
        ))}
      </nav>

      <div>
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

          <section className="wm-panel overflow-hidden p-0">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step 3</p>
                  <h2 className="mt-1 text-xl font-semibold">Review the ATS ranking</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {rankedCandidates.length
                      ? "Scores are a screening signal. Keep the recruiter decision in your hands."
                      : candidates.length
                        ? "Your CVs are ready for ATS analysis. Run the ranking from Step 2 to populate this dashboard."
                        : "Upload CVs in Step 2, then run ATS analysis to populate this dashboard."}
                  </p>
                </div>
                {rankedCandidates.length ? (
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
                ) : (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--muted)]">Waiting for CVs</span>
                )}
              </div>
              {rankedCandidates.length ? (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-xs uppercase tracking-wider text-[var(--muted)]">
                    <tr><th className="px-5 py-3">Invite</th><th className="px-5 py-3">Rank</th><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">ATS score</th><th className="px-5 py-3">Candidate sign-in email</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Link</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {rankedCandidates.map((candidate, index) => {
                      const score = candidate.atsScore?.overall_match;
                      const linkReady = !!candidate.sessionId;
                      return (
                        <tr key={candidate.id} className="align-top hover:bg-[var(--surface-elevated)]/60">
                          <td className="px-5 py-4">
                            <input type="checkbox" checked={candidate.selected} disabled={candidate.status !== "ready" || linkReady} onChange={(event) => updateCandidate(candidate.id, { selected: event.target.checked })} aria-label={`Invite ${candidate.candidateName}`} className="h-4 w-4 accent-[var(--primary)]" />
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
                          <td className="px-5 py-4"><input type="email" value={candidate.candidateEmail} disabled={linkReady} onChange={(event) => updateCandidate(candidate.id, { candidateEmail: event.target.value })} placeholder="candidate@company.com" className="w-52 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs focus:border-primary-500 focus:outline-none" /><p className="mt-1 max-w-[13rem] text-[11px] text-[var(--muted)]">Used only to admit this candidate to their own interview.</p></td>
                          <td className="px-5 py-4"><span className={`text-xs ${candidate.status === "error" || candidate.inviteStatus === "error" ? "text-red-400" : candidate.inviteStatus === "created" ? "text-emerald-400" : "text-[var(--muted)]"}`}>{statusLabel(candidate)}</span></td>
                          <td className="px-5 py-4 text-right">{linkReady ? <a className="text-xs text-primary-400 hover:text-primary-300" href={`/apply/${candidate.sessionId}`} target="_blank" rel="noreferrer">Open link</a> : <span className="text-xs text-[var(--muted)]">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="flex min-h-40 items-center justify-center p-8 text-center">
                  <div>
                    <p className="text-sm font-medium">No ranked candidates yet</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">This dashboard will show candidate names, emails, ATS scores and invite controls after Step 2 analysis.</p>
                  </div>
                </div>
              )}
            </section>
          <section className="wm-panel flex flex-col gap-4 border-primary-500/30 bg-primary-500/5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Step 4</p>
              <h2 className="mt-1 text-xl font-semibold">Create interview links on the next page</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{selectedCandidates.length} candidate{selectedCandidates.length === 1 ? "" : "s"} selected. Review settings and schedule windows separately after ranking.</p>
            </div>
            <button type="button" className="wm-button shrink-0" onClick={continueToSchedule}>Continue to Step 4 <span aria-hidden="true">→</span></button>
          </section>
        </section>
      </div>

      {message && <p role="status" className="wm-note mt-6 border-emerald-500/30 bg-emerald-500/5 text-emerald-300">{message}</p>}
      {error && <p role="alert" className="wm-note mt-6 border-red-500/30 bg-red-500/5 text-red-300">{error}</p>}
    </main>
  );
}
