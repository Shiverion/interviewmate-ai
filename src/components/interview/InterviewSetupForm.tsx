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
import { createScheduledInterview } from "@/lib/firebase/interviews";
import ConfigurationFields from "./ConfigurationFields";
type Mode = "byok" | "reviewer" | "scheduled" | "reviewer-scheduled";
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
}: {
  mode: Mode;
  onClose?: () => void;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter(),
    { user } = useAuthContext();
  const scheduled = mode === "scheduled" || mode === "reviewer-scheduled";
  const existing = useInterviewStore.getState()._sessionContext;
  const [configuration, setConfiguration] = useState(
    existing?.configuration || defaultConfiguration()
  );
  const [jobTitle, setJobTitle] = useState(
      existing?.jobTitle || "Frontend Engineer"
    ),
    [jobDescription, setJobDescription] = useState(
      existing?.jobDescription ||
        "Build accessible React interfaces, make technical tradeoffs, validate changes and collaborate with designers."
    ),
    [name, setName] = useState(existing?.candidateName || ""),
    [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [parsing, setParsing] = useState<ParsingResult | undefined>(
      existing?.cvParsing
    ),
    [parsingBusy, setParsingBusy] = useState(false),
    [cvConfirmed, setCvConfirmed] = useState(false),
    [withoutCv, setWithoutCv] = useState(false);
  const parseAttempt = useRef(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [starts, setStarts] = useState(localDateTime(Date.now() - 60000)),
    [ends, setEnds] = useState(localDateTime(Date.now() + 3 * 86400000));
  async function upload(next: File | undefined) {
    const token = ++parseAttempt.current;
    setFile(next || null);
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
      if (token === parseAttempt.current)
        setParsing(
          result.status
            ? result
            : parsingFailure("failed", "Could not parse this PDF.")
        );
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
        if (mode === "reviewer-scheduled" || !user) {
          const r = await fetch("/api/reviewer/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidateName: name,
              jobTitle,
              jobDescription,
              configuration: config,
              resumeText,
              startsAt: new Date(starts).getTime(),
              endsAt: new Date(ends).getTime(),
            }),
          });
          const data = await r.json();
          if (!r.ok)
            throw Error(
              data.error ||
                "Sign in or redeem a reviewer invitation before scheduling."
            );
          onSuccess?.(data.id);
          onClose?.();
          return;
        }
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
        expiresAt: number | undefined;
      if (mode === "reviewer") {
        const r = await fetch("/api/demo/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            configuration: config,
            candidateName: name || "Reviewer",
            jobTitle,
            jobDescription,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        sessionId = data.sessionId;
        expiresAt = data.expiresAt;
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
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="wm-field">
          Role
          <input
            required
            value={jobTitle}
            maxLength={200}
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
            onChange={(e) => setJobDescription(e.target.value)}
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
              required={scheduled && !!user && mode !== "reviewer-scheduled"}
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
