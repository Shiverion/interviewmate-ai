"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { getOpenAIKey, getProviderKey } from "@/lib/keys/store";
import {
  configurationSchema,
  defaultConfiguration,
} from "@/lib/interview/config";
import {
  validatedCvText,
  parsingFailure,
  type ParsingResult,
} from "@/lib/pdf/result";
import {
  createScheduledInterview,
  createReviewerSourcedInterview,
  type AtsScore,
} from "@/lib/firebase/interviews";
import ConfigurationFields from "./ConfigurationFields";
type Mode = "byok" | "reviewer" | "scheduled";
function localDateTime(ms: number) {
  const date = new Date(ms);
  return new Date(ms - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export default function InterviewSetupForm({
  mode,
  onClose,
  onSuccess,
  invitationId,
}: {
  mode: Mode;
  onClose?: () => void;
  onSuccess?: (id: string) => void;
  invitationId?: string;
}) {
  const router = useRouter(),
    { user } = useAuthContext();
  const scheduled = mode === "scheduled";
  const existing = useInterviewStore.getState()._sessionContext;
  const [configuration, setConfiguration] = useState(
    existing?.configuration || defaultConfiguration()
  );
  const [jobTitle, setJobTitle] = useState(existing?.jobTitle || ""),
    [jobDescription, setJobDescription] = useState(
      existing?.jobDescription || ""
    ),
    [name, setName] = useState(existing?.candidateName || ""),
    [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [parsing, setParsing] = useState<ParsingResult | undefined>(
      existing?.cvParsing
    ),
    [atsScore, setAtsScore] = useState<AtsScore | undefined>(
      existing?.atsScore
    ),
    [atsBusy, setAtsBusy] = useState(false),
    [atsError, setAtsError] = useState(""),
    [parsingBusy, setParsingBusy] = useState(false),
    [cvConfirmed, setCvConfirmed] = useState(false),
    [withoutCv, setWithoutCv] = useState(false);
  const parseAttempt = useRef(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [starts, setStarts] = useState(localDateTime(Date.now() - 60000)),
    [ends, setEnds] = useState(localDateTime(Date.now() + 3 * 86400000));

  async function scoreResume(resumeText: string, token?: number) {
    if (
      mode !== "reviewer" ||
      !resumeText.trim() ||
      jobDescription.trim().length < 50
    )
      return;
    setAtsBusy(true);
    setAtsError("");
    try {
      const response = await fetch("/api/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });
      const data = (await response.json()) as {
        ats_score?: AtsScore;
        error?: string;
      };
      if (!response.ok || !data.ats_score)
        throw Error(data.error || "ATS scoring failed.");
      if (token === undefined || token === parseAttempt.current)
        setAtsScore(data.ats_score);
    } catch (caught) {
      if (token === undefined || token === parseAttempt.current)
        setAtsError(caught instanceof Error ? caught.message : "ATS scoring failed.");
    } finally {
      if (token === undefined || token === parseAttempt.current) setAtsBusy(false);
    }
  }

  async function upload(next: File | undefined) {
    const token = ++parseAttempt.current;
    setFile(next || null);
    setAtsScore(undefined);
    setAtsError("");
    setAtsBusy(false);
    setCvConfirmed(false);
    setWithoutCv(false);
    if (!next) {
      setParsing(undefined);
      return;
    }
    setParsingBusy(true);
    try {
      const form = new FormData();
      form.set("file", next);
      const r = await fetch("/api/parse-resume", {
        method: "POST",
        body: form,
      });
      const result = await r.json();
      if (token === parseAttempt.current) {
        const parsed = result.status
          ? (result as ParsingResult)
          : parsingFailure("failed", "Could not parse this PDF.");
        setParsing(parsed);
        const resumeText = validatedCvText(parsed);
        if (resumeText) void scoreResume(resumeText, token);
      }
    } catch {
      if (token === parseAttempt.current)
        setParsing(
          parsingFailure(
            "failed",
            "Upload failed. Retry or explicitly continue without CV."
          )
        );
    } finally {
      if (token === parseAttempt.current) setParsingBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (parsingBusy) return;
    if (
      (file || parsing) &&
      !(validatedCvText(parsing) ? cvConfirmed : withoutCv)
    ) {
      setError(
        "Confirm the CV preview or explicitly continue without CV grounding."
      );
      return;
    }
    setBusy(true);
    try {
      const config = configurationSchema.parse({
        ...configuration,
        allowedModes: "audio_and_text",
        customQuestions: configuration.customQuestions
          .map((q) => q.trim())
          .filter(Boolean),
      });
      const resumeText = withoutCv ? "" : validatedCvText(parsing);
      if (scheduled) {
        if (!user) throw Error("Sign in before scheduling an interview.");
        if (new Date(ends) <= new Date(starts))
          throw Error("End date must be after start date.");
        const id = await createScheduledInterview(
          user.uid,
          jobTitle,
          jobDescription,
          "",
          "",
          config.maxTurns,
          config.customQuestions,
          config.language,
          name,
          "CAND-" + crypto.randomUUID().slice(0, 8),
          email,
          file,
          new Date(starts),
          new Date(ends),
          "audio_and_text",
          config.githubUsername,
          config.visualPanel,
          config.codeDiff,
          config,
          withoutCv ? undefined : parsing
        );
        onSuccess?.(id);
        onClose?.();
        return;
      }
      if (mode === "byok" && !getOpenAIKey())
        throw Error(
          "Add an OpenAI key in Settings before starting a personal voice interview."
        );
      if (
        mode === "byok" &&
        config.voiceProvider === "gemini" &&
        !getProviderKey("gemini")
      )
        throw Error(
          "Add a Gemini key in Settings for Gemini voice. Your OpenAI key handles transcription."
        );
      let sessionId = "demo-" + crypto.randomUUID(),
        expiresAt: number | undefined,
        voiceLeaseId: string | undefined;
      if (mode === "reviewer") {
        if (!user) throw Error("Sign in before starting an invited interview.");
        const r = await fetch("/api/demo/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            configuration: config,
            candidateName: name || "Reviewer",
            jobTitle,
            jobDescription,
            resumeText,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        voiceLeaseId = data.sessionId;
        expiresAt = data.expiresAt;
        sessionId = await createReviewerSourcedInterview(
          { uid: user.uid, email: user.email || "" },
          jobTitle,
          jobDescription,
          name || user.displayName || "Reviewer",
          file,
          config,
          withoutCv ? undefined : parsing,
          invitationId,
          withoutCv ? undefined : atsScore
        );
      }
      let enrichment;
      if (config.githubUsername) {
        try {
          const r = await fetch("/api/github-enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: config.githubUsername,
              context: (
                jobTitle +
                " " +
                jobDescription +
                " " +
                resumeText
              ).slice(0, 6000),
            }),
          });
          if (r.ok) enrichment = (await r.json()).enrichment;
        } catch {
          /* Optional context never blocks startup. */
        }
      }
      useInterviewStore.getState().reset();
      useInterviewStore.setState({
        _sessionContext: {
          sessionId,
          voiceLeaseId,
          candidateName: name || "Reviewer",
          jobTitle,
          jobDescription,
          configuration: config,
          questionCount: config.maxTurns,
          customQuestions: config.customQuestions,
          preferredLanguage: config.language,
          allowedModes: config.allowedModes,
          interviewMode: "voice",
          visualPanel: config.visualPanel,
          codeDiff: config.codeDiff,
          resumeText,
          cvParsing: withoutCv ? undefined : parsing,
          atsScore: withoutCv ? undefined : atsScore,
          githubEnrichment: enrichment,
          startedAt: Date.now(),
          sponsored: mode === "reviewer",
          accessMode: mode === "reviewer" ? "reviewer" : "byok",
          demoExpiresAt: expiresAt,
          returnTo: mode === "reviewer" ? "/reviewer" : "/interview/setup",
        },
      });
      onClose?.();
      router.push("/interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare interview.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="wm-field">
          Candidate name
          <input
            required
            value={name}
            maxLength={100}
            placeholder="e.g. Jane Doe"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="wm-field">
          Role
          <input
            required
            value={jobTitle}
            maxLength={200}
            placeholder="e.g. Frontend Engineer"
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </label>
        <label className="wm-field sm:col-span-2">
          Job description
          <textarea
            required
            rows={3}
            maxLength={6000}
            value={jobDescription}
            placeholder="e.g. Build accessible React interfaces, make technical tradeoffs, validate changes and collaborate with designers."
            onChange={(e) => {
              setJobDescription(e.target.value);
              if (mode === "reviewer") {
                setAtsScore(undefined);
                setAtsError("");
              }
            }}
          />
        </label>
      </div>
      <ConfigurationFields value={configuration} onChange={setConfiguration} />
      <section className="wm-panel">
        <label className="wm-field">
          CV PDF · Optional, up to 10 MB
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        {parsingBusy && <p role="status">Reading CV…</p>}
        {parsing && (
          <>
            <p className="text-sm mt-3">
              Parsing: <strong>{parsing.status}</strong> · {parsing.pageCount}{" "}
              pages · {parsing.characterCount} characters
            </p>
            {validatedCvText(parsing) ? (
              <>
                <h3 className="text-sm font-medium mt-3">CV Context Preview</h3>
                <pre className="whitespace-pre-wrap max-h-40 overflow-auto text-xs my-3">
                  {parsing.text.slice(0, 1500)}
                </pre>
                <label className="text-sm flex gap-2">
                  <input
                    type="checkbox"
                    checked={cvConfirmed}
                    onChange={(e) => setCvConfirmed(e.target.checked)}
                  />
                  I confirm this text was read from the intended CV.
                </label>
                {mode === "reviewer" && (
                  <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">ATS screening score</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Uses this role brief and the validated CV text. It is a screening signal, not a hiring decision.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="wm-button secondary"
                        disabled={atsBusy || jobDescription.trim().length < 50}
                        onClick={() => void scoreResume(validatedCvText(parsing))}
                      >
                        {atsBusy ? "Scoring…" : atsScore ? "Re-run ATS score" : "Run ATS score"}
                      </button>
                    </div>
                    {jobDescription.trim().length < 50 && (
                      <p className="mt-3 text-xs text-amber-300">Add at least 50 characters to the job description to score this CV.</p>
                    )}
                    {atsError && <p role="alert" className="mt-3 text-xs text-red-400">{atsError}</p>}
                    {atsScore && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-lg border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Overall match</p><p className="mt-1 text-2xl font-semibold text-primary-300">{atsScore.overall_match}%</p></div>
                        <div className="rounded-lg border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Keywords</p><p className="mt-1 text-lg font-semibold">{atsScore.keyword_match}%</p></div>
                        <div className="rounded-lg border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Skills</p><p className="mt-1 text-lg font-semibold">{atsScore.skills_coverage}%</p></div>
                        <div className="rounded-lg border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Experience</p><p className="mt-1 text-lg font-semibold">{atsScore.experience_alignment}%</p></div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p role="status" className="wm-note my-3">
                  {parsing.failureReason} Replace the PDF or continue without
                  it.
                </p>
                <label className="text-sm flex gap-2">
                  <input
                    type="checkbox"
                    checked={withoutCv}
                    onChange={(e) => setWithoutCv(e.target.checked)}
                  />
                  Continue without CV grounding.
                </label>
              </>
            )}
            {parsing.warnings.map((w) => (
              <p key={w} className="text-xs text-[var(--muted)]">
                {w}
              </p>
            ))}
          </>
        )}
      </section>
      {scheduled && (
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="wm-field">
            Candidate sign-in email
            <input
              type="email"
              required={scheduled && !!user}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="wm-field">
            Link valid from
            <input
              type="datetime-local"
              required
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
            />
          </label>
          <label className="wm-field">
            Link expires
            <input
              type="datetime-local"
              required
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            Configuration is snapshotted when the link is created.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="wm-note">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button disabled={busy || parsingBusy} className="wm-button">
          {busy
            ? "Preparing…"
            : scheduled
              ? "Generate Link"
              : "Enter interview room"}
        </button>
        {onClose && (
          <button
            type="button"
            className="wm-button secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
