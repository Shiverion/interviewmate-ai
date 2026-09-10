"use client";
import { useState } from "react";
import {
  ADDITIONAL_COMPETENCY_OPTIONS,
  slugifyCompetencyId,
  type InterviewConfiguration,
} from "@/lib/interview/config";
import { LANGUAGES } from "@/lib/interview/language";
const CUSTOM_COMPETENCY_VALUE = "__custom__";
export default function ConfigurationFields({
  value,
  onChange,
  showGithubUsername = true,
}: {
  value: InterviewConfiguration;
  onChange: (value: InterviewConfiguration) => void;
  showGithubUsername?: boolean;
}) {
  const [selectedCompetency, setSelectedCompetency] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  function change<K extends keyof InterviewConfiguration>(
    key: K,
    next: InterviewConfiguration[K]
  ) {
    onChange({ ...value, [key]: next });
  }
  function addCompetency() {
    if (selectedCompetency === CUSTOM_COMPETENCY_VALUE) {
      const label = customLabel.trim();
      const description = customDescription.trim();
      if (!label || !description) return;
      const id = slugifyCompetencyId(
        label,
        value.competencies.map((c) => c.id)
      );
      change("competencies", [...value.competencies, { id, label, description }]);
      setCustomLabel("");
      setCustomDescription("");
      setSelectedCompetency("");
      return;
    }
    const option = ADDITIONAL_COMPETENCY_OPTIONS.find(
      (candidate) => candidate.id === selectedCompetency
    );
    if (!option || value.competencies.some((c) => c.id === option.id)) return;
    change("competencies", [...value.competencies, { ...option }]);
    setSelectedCompetency("");
  }
  return (
    <fieldset className="grid sm:grid-cols-2 gap-4">
      <legend className="wm-eyebrow mb-4">
        Interview behavior · Shared configuration
      </legend>
      <label className="wm-field">
        Duration
        <select
          aria-label="Duration"
          value={value.durationMinutes}
          onChange={(e) =>
            change(
              "durationMinutes",
              e.target.value === "unlimited"
                ? "unlimited"
                : (Number(e.target.value) as 5 | 10 | 15)
            )
          }
        >
          <option value={5}>5 minutes</option>
          <option value={10}>10 minutes</option>
          <option value={15}>15 minutes</option>
          <option value="unlimited">Unlimited</option>
        </select>
      </label>
      <label className="wm-field">
        Maximum interview turns
        <input
          aria-label="Maximum interview turns"
          type="number"
          min={1}
          max={30}
          required
          value={value.maxTurns}
          onChange={(e) => change("maxTurns", Number(e.target.value))}
        />
      </label>
      <label className="wm-field">
        Interview approach
        <select
          aria-label="Interview approach"
          value={value.strategy}
          onChange={(e) =>
            change(
              "strategy",
              e.target.value as InterviewConfiguration["strategy"]
            )
          }
        >
          <option value="structured">Structured Interview</option>
          <option value="adaptive">Adaptive Interview</option>
        </select>
      </label>
      <label className="wm-field">
        Preferred language
        <select
          aria-label="Preferred language"
          value={value.language}
          onChange={(e) =>
            change(
              "language",
              e.target.value as InterviewConfiguration["language"]
            )
          }
        >
          {Object.keys(LANGUAGES).map((language) => (
            <option key={language}>{language}</option>
          ))}
        </select>
        <small>
          Controls interview speech and transcription hints. Auto-detect follows
          the first meaningful answer.
        </small>
      </label>
      <label className="wm-field">
        Interview voice
        <select
          aria-label="Interview voice"
          value={value.voiceProvider || "openai"}
          onChange={(e) =>
            change(
              "voiceProvider",
              e.target.value as InterviewConfiguration["voiceProvider"]
            )
          }
        >
          <option value="openai">GPT-Realtime 2.1 Mini · Marin</option>
          <option value="gemini">Gemini 3.1 Flash Live (Preview) · Kore</option>
        </select>
        <small>
          Marin is the fixed OpenAI interviewer voice across languages and
          reconnects. Gemini uses its separate fixed Kore voice and the
          selected OpenAI transcriber. Personal sessions need both keys.
        </small>
      </label>
      <label className="wm-field">
        Transcription
        <select
          aria-label="Transcription"
          value={value.transcriptionModel || "gpt-transcribe"}
          onChange={(e) =>
            change(
              "transcriptionModel",
              e.target.value as InterviewConfiguration["transcriptionModel"]
            )
          }
        >
          <option value="gpt-transcribe">GPT-Transcribe · Lower cost</option>
          <option value="gpt-live-transcribe">
            GPT-Live-Transcribe · Live captions
          </option>
        </select>
      </label>
      <label className="wm-field">
        Voice reasoning
        <select
          aria-label="Voice reasoning"
          value={value.reasoningEffort || "low"}
          onChange={(e) =>
            change(
              "reasoningEffort",
              e.target.value as InterviewConfiguration["reasoningEffort"]
            )
          }
        >
          <option value="low">Low · Faster, lower cost</option>
          <option value="medium">Medium · More reasoning</option>
        </select>
      </label>
      <div className="wm-field" role="status" aria-label="Interaction mode">
        Interaction mode
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
          Voice + text · Required
        </div>
        <small>
          Speak first, review the transcript, edit it when needed, then send
          your answer. This keeps voice and typing together in every interview.
        </small>
      </div>
      <label className="wm-field">
        Technical panel
        <select
          value={value.visualPanel}
          onChange={(e) =>
            change(
              "visualPanel",
              e.target.value as InterviewConfiguration["visualPanel"]
            )
          }
        >
          <option value="none">None</option>
          <option value="code">Code editor</option>
          <option value="whiteboard">Whiteboard</option>
          <option value="code_review">Code review</option>
        </select>
      </label>
      <label className="wm-field sm:col-span-2">
        Core questions · One per line
        <textarea
          rows={3}
          value={value.customQuestions.join("\n")}
          placeholder={
            "e.g. Walk me through a recent project you owned end to end.\nHow do you decide when to introduce a new dependency?"
          }
          onChange={(e) =>
            change("customQuestions", e.target.value.split("\n"))
          }
        />
      </label>
      {showGithubUsername && (
        <label className="wm-field sm:col-span-2">
          GitHub username · Optional
          <input
            maxLength={39}
            value={value.githubUsername}
            placeholder="e.g. octocat"
            onChange={(e) => change("githubUsername", e.target.value)}
          />
        </label>
      )}
      {value.visualPanel === "code_review" && (
        <label className="wm-field sm:col-span-2">
          Code diff
          <textarea
            rows={4}
            value={value.codeDiff}
            placeholder={"diff --git a/file.ts b/file.ts\n@@ -1,3 +1,3 @@\n..."}
            onChange={(e) => change("codeDiff", e.target.value)}
          />
        </label>
      )}
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">
          Additional competency rubric · Optional
        </p>
        <p className="text-xs text-[var(--muted)] mt-1">
          Leave this empty to derive competencies from the job description and
          validated CV context. Add an option only when you want to assess an
          extra area explicitly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <select
            aria-label="Additional competency"
            value={selectedCompetency}
            onChange={(e) => setSelectedCompetency(e.target.value)}
            className="flex-1"
          >
            <option value="">Choose an additional competency</option>
            {ADDITIONAL_COMPETENCY_OPTIONS.filter(
              (option) => !value.competencies.some((c) => c.id === option.id)
            ).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
            <option value={CUSTOM_COMPETENCY_VALUE}>
              Describe your own…
            </option>
          </select>
          {selectedCompetency !== CUSTOM_COMPETENCY_VALUE && (
            <button
              type="button"
              className="wm-button secondary"
              onClick={addCompetency}
              disabled={!selectedCompetency || value.competencies.length >= 8}
            >
              Add competency
            </button>
          )}
        </div>
        {selectedCompetency === CUSTOM_COMPETENCY_VALUE && (
          <div className="wm-field mt-3">
            <label htmlFor="custom-competency-label">Competency name</label>
            <input
              id="custom-competency-label"
              maxLength={100}
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Cross-team communication"
            />
            <label htmlFor="custom-competency-description" className="mt-3">
              What evidence should count
            </label>
            <textarea
              id="custom-competency-description"
              rows={2}
              maxLength={500}
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe what counts as evidence for this competency."
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                className="wm-button secondary"
                onClick={addCompetency}
                disabled={
                  !customLabel.trim() ||
                  !customDescription.trim() ||
                  value.competencies.length >= 8
                }
              >
                Add custom competency
              </button>
              <button
                type="button"
                className="wm-button quiet"
                onClick={() => {
                  setSelectedCompetency("");
                  setCustomLabel("");
                  setCustomDescription("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {value.competencies.map((c, i) => (
            <div key={c.id} className="wm-field">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{c.label}</span>
                <button
                  type="button"
                  className="wm-button secondary text-xs"
                  onClick={() =>
                    change(
                      "competencies",
                      value.competencies.filter((_, n) => n !== i)
                    )
                  }
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={2}
                aria-label={`${c.label} description`}
                value={c.description}
                onChange={(e) =>
                  change(
                    "competencies",
                    value.competencies.map((x, n) =>
                      n === i ? { ...x, description: e.target.value } : x
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] mt-3">
          Each adaptive follow-up consumes one turn. Coverage is tracked
          separately. Unlimited removes the interview timer; hosted access still
          has a funding window.
        </p>
      </div>
    </fieldset>
  );
}
