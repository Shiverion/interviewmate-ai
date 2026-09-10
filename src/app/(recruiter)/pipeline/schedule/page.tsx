"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/AuthProvider";
import ConfigurationFields from "@/components/interview/ConfigurationFields";
import {
  configurationSchema,
  type InterviewConfiguration,
} from "@/lib/interview/config";
import { createScheduledInterview } from "@/lib/firebase/interviews";
import { updatePipelineCandidate } from "@/lib/firebase/pipeline";
import {
  usePipelineDraft,
  type PipelineCandidate,
} from "../PipelineDraftContext";

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function statusLabel(candidate: PipelineCandidate) {
  if (candidate.inviteStatus === "created") return "Invitation ready";
  if (candidate.inviteStatus === "creating") return "Creating link…";
  if (candidate.inviteStatus === "error") return "Needs attention";
  return "Ready to invite";
}

export default function PipelineSchedulePage() {
  const { user } = useAuthContext();
  const { draft, setDraft } = usePipelineDraft();
  const [configuration, setConfiguration] = useState<InterviewConfiguration>(
    draft.configuration
  );
  const [starts, setStarts] = useState(draft.starts);
  const [ends, setEnds] = useState(draft.ends);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setDraft((current) => ({ ...current, configuration, starts, ends }));
  }, [configuration, ends, setDraft, starts]);

  const rankedCandidates = useMemo(
    () =>
      [...draft.candidates].sort((a, b) => {
        const scoreA = a.atsScore?.overall_match ?? -1;
        const scoreB = b.atsScore?.overall_match ?? -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.candidateName.localeCompare(b.candidateName);
      }),
    [draft.candidates]
  );
  const selectedCandidates = rankedCandidates.filter(
    (candidate) =>
      candidate.selected && candidate.status === "ready" && !candidate.sessionId
  );
  const createdCandidates = rankedCandidates.filter(
    (candidate) => candidate.sessionId
  );

  function updateCandidate(id: string, patch: Partial<PipelineCandidate>) {
    setDraft((current) => ({
      ...current,
      candidates: current.candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, ...patch } : candidate
      ),
    }));
  }

  async function createInvitations() {
    setError("");
    setMessage("");
    if (!user) {
      setError("Sign in as the recruiter before creating invitations.");
      return;
    }
    if (!selectedCandidates.length) {
      setError("Return to Step 3 and select at least one ranked candidate.");
      return;
    }
    const missingEmail = selectedCandidates.find(
      (candidate) => !candidate.candidateEmail.trim()
    );
    if (missingEmail) {
      setError(
        `Add a candidate sign-in email for ${missingEmail.candidateName} before creating the link.`
      );
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
        // GitHub context is per candidate, so this bulk flow does not ask for
        // a recruiter/personal username in the shared settings panel.
        githubUsername: "",
        customQuestions: configuration.customQuestions
          .map((question) => question.trim())
          .filter(Boolean),
      });
    } catch {
      setError("Review the interview settings before creating invitations.");
      return;
    }

    setInviting(true);
    let created = 0;
    for (const candidate of selectedCandidates) {
      updateCandidate(candidate.id, { inviteStatus: "creating", error: "" });
      try {
        const sessionId = await createScheduledInterview(
          user.uid,
          draft.jobTitle.trim(),
          draft.jobDescription.trim(),
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
          "",
          config.visualPanel,
          config.codeDiff,
          config,
          candidate.parsing,
          candidate.atsScore
        );
        updateCandidate(candidate.id, {
          inviteStatus: "created",
          sessionId,
        });
        if (candidate.pipelineId) {
          await updatePipelineCandidate(candidate.pipelineId, {
            status: "invited",
            session_id: sessionId,
          }).catch(() => undefined);
        }
        created++;
      } catch (caught) {
        updateCandidate(candidate.id, {
          inviteStatus: "error",
          error:
            caught instanceof Error
              ? caught.message
              : "Could not create invitation.",
        });
      }
    }

    await Promise.all(
      draft.candidates
        .filter(
          (candidate) =>
            candidate.status === "ready" &&
            !candidate.selected &&
            candidate.pipelineId
        )
        .map((candidate) =>
          updatePipelineCandidate(candidate.pipelineId!, {
            status: "not_invited",
          }).catch(() => undefined)
        )
    );
    setInviting(false);
    setMessage(
      `${created} invitation${created === 1 ? "" : "s"} created. Copy each link below and send it to the matching candidate.`
    );
  }

  async function copyLink(candidate: PipelineCandidate) {
    if (!candidate.sessionId) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}/apply/${candidate.sessionId}`
    );
    setCopiedId(candidate.id);
    window.setTimeout(
      () =>
        setCopiedId((current) =>
          current === candidate.id ? null : current
        ),
      1600
    );
  }

  if (!draft.candidates.length) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="wm-panel space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">
            Step 4
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Create interview links
          </h1>
          <p className="text-[var(--muted)]">
            This page opens after you upload, analyze and select candidates in
            Steps 1–3.
          </p>
          <Link href="/pipeline" className="wm-button inline-flex">
            Back to pipeline
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">
            Recruiting pipeline · Step 4
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Create interview links
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Confirm shared interview settings and the validity window, then
            create links only for the candidates you selected.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pipeline" className="wm-button secondary">
            ← Back to ranking
          </Link>
          <Link href="/candidates" className="wm-button secondary">
            Candidates dashboard
          </Link>
        </div>
      </div>

      <nav aria-label="Pipeline progress" className="mb-6 grid gap-2 sm:grid-cols-4">
        {[
          { number: "1", label: "Role brief" },
          { number: "2", label: "Upload CVs" },
          { number: "3", label: "Review ranking" },
          { number: "4", label: "Create links" },
        ].map((step) => (
          <div
            key={step.number}
            className="rounded-xl border border-primary-500/50 bg-primary-500/10 px-4 py-3"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">
              Step {step.number}
            </span>
            <p className="mt-1 text-sm font-medium">{step.label}</p>
          </div>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
        <section className="wm-panel overflow-hidden p-0">
          <div className="border-b border-[var(--border)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">
              Selected candidates
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {selectedCandidates.length} ready to invite
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Candidate email is used only to admit that candidate to their own
              interview. Recruiter settings never become candidate data.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">ATS</th>
                  <th className="px-5 py-3 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rankedCandidates.map((candidate, index) => {
                  const score = candidate.atsScore?.overall_match;
                  const selected = candidate.selected && !candidate.sessionId;
                  const linkReady = !!candidate.sessionId;
                  if (!selected && !linkReady) return null;
                  return (
                    <tr key={candidate.id} className="align-top">
                      <td className="px-5 py-4 font-mono text-[var(--muted)]">
                        #{index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{candidate.candidateName}</p>
                        <p className="mt-1 max-w-[12rem] truncate text-xs text-[var(--muted)]">
                          {statusLabel(candidate)}
                        </p>
                        {candidate.error && (
                          <p className="mt-1 max-w-xs text-xs text-red-400">
                            {candidate.error}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--muted)]">
                        {candidate.candidateEmail || "Email required"}
                      </td>
                      <td className="px-5 py-4">
                        {score === undefined ? (
                          "—"
                        ) : (
                          <span className={`font-bold ${scoreColor(score)}`}>
                            {score}%
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {linkReady ? (
                          <div className="flex items-center justify-end gap-2">
                            <a
                              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                              href={`/apply/${candidate.sessionId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                            <button
                              type="button"
                              className="text-xs font-semibold text-primary-400 hover:text-primary-300"
                              onClick={() => void copyLink(candidate)}
                            >
                              {copiedId === candidate.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!!createdCandidates.length && (
            <p className="border-t border-[var(--border)] px-5 py-4 text-xs text-emerald-300">
              {createdCandidates.length} link
              {createdCandidates.length === 1 ? " is" : "s are"} ready. Copy
              each link and send it privately.
            </p>
          )}
        </section>

        <section className="wm-panel space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">
              Interview settings
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              These values are snapshotted into every selected scheduled
              session. GitHub username and recruiter email are not part of this
              bulk form.
            </p>
          </div>
          <ConfigurationFields
            value={configuration}
            onChange={setConfiguration}
            showGithubUsername={false}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label className="wm-field">
              Link valid from
              <input
                type="datetime-local"
                value={starts}
                onChange={(event) => setStarts(event.target.value)}
              />
            </label>
            <label className="wm-field">
              Link expires
              <input
                type="datetime-local"
                value={ends}
                onChange={(event) => setEnds(event.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="wm-button w-full"
            disabled={!selectedCandidates.length || inviting}
            onClick={() => void createInvitations()}
          >
            {inviting ? "Creating invitations…" : "Create selected invitations"}
          </button>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Link creation does not send email. Each link is tied to the email
            shown in its row; candidates can only open their own active session.
          </p>
        </section>
      </div>

      {message && (
        <p
          role="status"
          className="wm-note mt-6 border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="wm-note mt-6 border-red-500/30 bg-red-500/5 text-red-300"
        >
          {error}
        </p>
      )}
    </main>
  );
}
