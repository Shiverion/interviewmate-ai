"use client";
import { type InterviewConfiguration } from "@/lib/interview/config";
export default function ConfigurationFields({
  value,
  onChange,
}: {
  value: InterviewConfiguration;
  onChange: (value: InterviewConfiguration) => void;
}) {
  function change<K extends keyof InterviewConfiguration>(
    key: K,
    next: InterviewConfiguration[K]
  ) {
    onChange({ ...value, [key]: next });
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
          <option>English</option>
          <option>Bahasa Indonesia</option>
        </select>
      </label>
      <label className="wm-field">
        Interaction modes
        <select
          value={value.allowedModes}
          onChange={(e) =>
            change(
              "allowedModes",
              e.target.value as InterviewConfiguration["allowedModes"]
            )
          }
        >
          <option value="audio_and_text">Voice and text</option>
          <option value="audio_only">Voice only</option>
        </select>
      </label>
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
          onChange={(e) =>
            change("customQuestions", e.target.value.split("\n"))
          }
        />
      </label>
      <label className="wm-field sm:col-span-2">
        GitHub username · Optional
        <input
          maxLength={39}
          value={value.githubUsername}
          onChange={(e) => change("githubUsername", e.target.value)}
        />
      </label>
      {value.visualPanel === "code_review" && (
        <label className="wm-field sm:col-span-2">
          Code diff
          <textarea
            rows={4}
            value={value.codeDiff}
            onChange={(e) => change("codeDiff", e.target.value)}
          />
        </label>
      )}
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">
          Competency rubric · {value.rubricVersion}
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {value.competencies.map((c, i) => (
            <label key={c.id} className="wm-field">
              {c.label}
              <textarea
                rows={2}
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
            </label>
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
