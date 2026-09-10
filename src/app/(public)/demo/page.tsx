"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightIcon,
  SpeakerLoudIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { configurationSchema } from "@/lib/interview/config";
import { PROVIDERS, type AIProvider } from "@/lib/ai/catalog";
import { saveEvaluationProvider } from "@/lib/keys/store";
import { LANGUAGES } from "@/lib/interview/language";

type Availability = {
  available: boolean;
  message?: string;
  remaining?: number;
  sharedRemaining?: number;
};
export default function ReviewerDemoPage() {
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState("English");
  const [voiceProvider, setVoiceProvider] = useState("openai");
  const [transcriptionModel, setTranscriptionModel] =
    useState("gpt-transcribe");
  const [consent, setConsent] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [configured, setConfigured] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/ai/config")
      .then((r) => r.json())
      .then((data) =>
        setConfigured(
          data.providers
            .filter((p: { configured: boolean }) => p.configured)
            .map((p: { id: string }) => p.id)
        )
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/demo/voice")
      .then((r) => r.json())
      .then(setAvailability)
      .catch(() =>
        setError("We couldn't check the demo allowance. Refresh to try again.")
      );
  }, []);
  async function start() {
    setBusy(true);
    setError("");
    try {
      saveEvaluationProvider(provider);
      const configuration = configurationSchema.parse({
        language,
        voiceProvider,
        transcriptionModel,
        maxTurns: 8,
        durationMinutes: 10,
      });
      const response = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      useInterviewStore.getState().reset();
      useInterviewStore.setState({
        _sessionContext: {
          sessionId: data.sessionId,
          sponsored: true,
          accessMode: "demo",
          returnTo: "/demo",
          configuration: data.configuration || configuration,
          demoExpiresAt: data.expiresAt,
          candidateName: "Demo reviewer",
          jobTitle: "Frontend Engineer",
          jobDescription:
            "Build accessible React interfaces, debug UI issues, and collaborate with designers.",
          preferredLanguage: language,
          questionCount: 8,
          questionLevel: "medium",
          interviewMode: "voice",
          allowedModes: "audio_and_text",
          startedAt: Date.now(),
        },
      });
      router.push("/interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the demo.");
      setBusy(false);
    }
  }
  const exhausted =
    availability?.remaining === 0 || availability?.sharedRemaining === 0;
  return (
    <div className="wm-page">
      <p className="text-sm">
        <Link href="/reviewer">
          Have an invitation? Open Reviewer Mode for extended access.
        </Link>
      </p>
      <div className="wm-hero-grid">
        <section>
          <p className="wm-eyebrow">Reviewer access · No account required</p>
          <h1>
            Your next eight minutes.
            <br />
            <span className="text-primary-500">A real conversation.</span>
          </h1>
          <p className="wm-subtitle">
            Experience the interview as a candidate, then review what the model
            understood. The role is Frontend Engineer. Your answers can be
            entirely fictional.
          </p>
          <div className="wm-feature">
            <span className="wm-num">01</span>
            <div>
              <h3>Talk, pause, pick up again</h3>
              <p>
                Speak through your microphone. The interview pauses if you leave
                the page or focus another window.
              </p>
            </div>
          </div>
          <div className="wm-feature">
            <span className="wm-num">02</span>
            <div>
              <h3>Look at the evidence</h3>
              <p>
                Review a transcript and an evaluation using a configured model.
                This demo does not make a hiring decision.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-sm inline-flex gap-2 items-center mt-5"
          >
            Prefer your own role and key? Open workspace <ArrowRightIcon />
          </Link>
        </section>
        <section className="wm-hero-panel">
          <div className="flex justify-between items-center">
            <span className="wm-eyebrow">Your demo allowance</span>
            <SpeakerLoudIcon />
          </div>
          {!availability ? (
            <div className="wm-skeleton" aria-label="Checking allowance" />
          ) : (
            <>
              <div className="font-mono text-5xl mt-6">
                {availability.remaining ?? "—"}
                <span className="text-lg text-[var(--muted)]"> / 5 today</span>
              </div>
              <p className="wm-subtitle mt-3">
                Up to 8 minutes each · Resets at midnight UTC
              </p>
            </>
          )}
          <div className="wm-field mt-7">
            <label htmlFor="demo-language">Interview language</label>
            <select
              id="demo-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {Object.keys(LANGUAGES).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="wm-field mt-5">
            <label htmlFor="demo-voice">Interview voice</label>
            <select
              id="demo-voice"
              value={voiceProvider}
              onChange={(e) => setVoiceProvider(e.target.value)}
            >
              <option value="openai">GPT-Realtime 2.1 Mini</option>
              <option value="gemini" disabled={!configured.includes("gemini")}>
                Gemini 3.1 Flash Live (Preview)
              </option>
            </select>
          </div>
          <div className="wm-field mt-5">
            <label htmlFor="demo-transcription">Transcription</label>
            <select
              id="demo-transcription"
              value={transcriptionModel}
              onChange={(e) => setTranscriptionModel(e.target.value)}
            >
              <option value="gpt-transcribe">GPT-Transcribe</option>
              <option value="gpt-live-transcribe">GPT-Live-Transcribe</option>
            </select>
            <small>
              Voice reasoning is Low. Both voice options use OpenAI
              transcription.
            </small>
          </div>
          <div className="wm-field mt-5">
            <label htmlFor="demo-provider">Evaluation provider</label>
            <select
              id="demo-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
            >
              {PROVIDERS.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  disabled={!configured.includes(p.id)}
                >
                  {p.name}
                  {configured.includes(p.id) ? "" : " · Host setup needed"}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)] mt-2">
              The voice choice is separate. This choice controls who reviews the
              transcript. Configured keys still need a live access check.
            </p>
          </div>
          <div className="space-y-3 text-sm mt-6">
            {[
              "Live voice with your selected model and GPT transcription",
              "No CV upload or personal API key",
              "Your transcript stays available for review",
            ].map((t) => (
              <p key={t} className="flex gap-2 items-center">
                <CheckIcon className="text-primary-500" />
                {t}
              </p>
            ))}
          </div>
          <label className="flex gap-3 items-start text-xs text-[var(--muted)] leading-relaxed my-6">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            I’ll use fictional answers. My audio goes to OpenAI for transcription.
            Gemini voice also receives the transcript when selected. An evaluation
            sends the transcript to the selected evaluation provider. The eight-minute free
            window includes pauses and reconnecting.
          </label>
          {availability && !availability.available && (
            <p role="status" className="wm-note mb-4">
              {availability.message}
            </p>
          )}
          {exhausted && (
            <p role="status" className="wm-note mb-4">
              The free allowance is used for today. Return tomorrow or connect
              your own key in the workspace.
            </p>
          )}
          {error && (
            <p role="alert" className="wm-note mb-4">
              {error}
            </p>
          )}
          <button
            className="wm-button w-full"
            onClick={start}
            disabled={busy || !consent || !availability?.available || exhausted}
          >
            {busy ? "Preparing your room…" : "Start free voice demo"}
            <ArrowRightIcon />
          </button>
          <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed">
            Starting reserves one demo. Retry a failed connection inside the
            same room. The shared host allowance may also be reached. Browser
            recovery records contain your answers.
          </p>
        </section>
      </div>
    </div>
  );
}
