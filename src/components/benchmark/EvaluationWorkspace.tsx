"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CRITERIA, validateDraft } from "@/lib/review-brief/contract";
import role from "@/lib/review-brief/role-profile.json";
import {
  canReveal,
  createStudy,
  isReviewed,
  restoreStudy,
  comparisonRows,
} from "@/lib/benchmark/state";
import {
  emptyJudgments,
  responseSchema,
  STUDY_VERSION,
  type Attempt,
  type BenchmarkCase,
  type BenchmarkResponse,
  type Judgment,
  type Language,
  type ProviderId,
  type ProviderProfile,
} from "@/lib/benchmark/types";
import styles from "./evaluation.module.css";
import { getProviderKey } from "@/lib/keys/store";
import { useKeys } from "@/components/providers/KeyProvider";

const label = (value: string) => value.replaceAll("_", " ");
const issueOptions = [
  "unsupported_claim",
  "missed_uncertainty",
  "wrong_status",
  "poor_followup",
  "language_issue",
] as const;
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], {
      type: "application/json",
    })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(
      (crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * (i + 1)
    );
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export default function EvaluationWorkspace({
  cases,
  datasetHash,
  providers,
}: {
  cases: BenchmarkCase[];
  datasetHash: string;
  providers: ProviderProfile[];
}) {
  const { keys } = useKeys();
  const [study, setStudy] = useState(() => createStudy(datasetHash));
  const [language, setLanguage] = useState<Language>("en");
  const [caseId, setCaseId] = useState("C01");
  const [selected, setSelected] = useState<ProviderId[]>(
    providers.map((p) => p.id)
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeId, setActiveId] = useState("");
  const pending = useRef(false);
  const activeController = useRef<AbortController | null>(null);
  const stopped = useRef(false);
  const item = cases.find((c) => c.id === caseId)!;
  const approval = study.referenceApprovals[item.id];
  const approved =
    approval?.referenceHash === item.referenceHash &&
    approval?.reviewer === study.reviewer.trim();
  const attempts = study.attempts.filter((a) => a.caseId === caseId);
  const active = attempts.find((a) => a.id === activeId) ?? attempts[0];
  const summary = comparisonRows(study, cases);
  useEffect(() => {
    if (!study.attempts.length && !Object.keys(study.referenceApprovals).length)
      return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [study.attempts.length, study.referenceApprovals]);
  useEffect(
    () => () => {
      stopped.current = true;
      activeController.current?.abort();
    },
    []
  );
  function chooseLanguage(next: Language) {
    setLanguage(next);
    setCaseId(cases.find((c) => c.language === next)!.id);
    setActiveId("");
  }
  function judge(id: (typeof CRITERIA)[number], patch: Partial<Judgment>) {
    if (!active || study.revealed) return;
    setStudy((s) => ({
      ...s,
      attempts: s.attempts.map((a) =>
        a.id !== active.id
          ? a
          : {
              ...a,
              judgments: {
                ...a.judgments,
                [id]: { ...a.judgments[id], ...patch },
              },
            }
      ),
    }));
  }
  async function run() {
    if (pending.current || !approved || !selected.length || study.revealed)
      return;
    pending.current = true;
    stopped.current = false;
    setBusy(true);
    setNotice(
      "Running selected models. Results will appear in shuffled order."
    );
    const collected: Attempt[] = [];
    try {
      for (const providerId of shuffle(selected)) {
        if (stopped.current) break;
        const provider = providers.find((p) => p.id === providerId)!;
        const controller = new AbortController();
        activeController.current = controller;
        const timeout = setTimeout(() => controller.abort(), 40000);
        let response: BenchmarkResponse;
        try {
          const res = await fetch("/api/benchmark", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-ai-key": getProviderKey(providerId) || "",
            },
            signal: controller.signal,
            body: JSON.stringify({
              caseId: item.id,
              providerId,
              referenceReviewed: true,
              referenceHash: item.referenceHash,
            }),
          });
          const parsed = responseSchema.parse(await res.json());
          const config = provider.configurations[item.language];
          if (
            parsed.caseId !== item.id ||
            parsed.datasetHash !== datasetHash ||
            parsed.inputHash !== item.inputHash ||
            parsed.referenceHash !== item.referenceHash ||
            parsed.language !== item.language ||
            parsed.providerId !== provider.id ||
            parsed.modelRequested !== provider.model ||
            parsed.configurationHash !== config.hash
          )
            throw new Error("PROVENANCE_MISMATCH");
          if (
            parsed.result.ok &&
            (parsed.result.generation.inputHash !== item.inputHash ||
              parsed.result.generation.modelRequested !== provider.model ||
              parsed.result.generation.promptHash !== config.promptHash ||
              !validateDraft(item.input, parsed.result.draft).ok)
          )
            throw new Error("PROVENANCE_MISMATCH");
          response = parsed;
        } catch {
          response = {
            studyVersion: STUDY_VERSION,
            datasetHash,
            caseId: item.id,
            language: item.language,
            inputHash: item.inputHash,
            referenceHash: item.referenceHash,
            configurationHash: provider.configurations[item.language].hash,
            providerId,
            modelRequested: provider.model,
            result: {
              ok: false,
              attemptId: crypto.randomUUID(),
              error: {
                code: stopped.current
                  ? "CLIENT_CANCELLED"
                  : "CLIENT_RESPONSE_UNAVAILABLE",
                message:
                  "No verified response was received. The provider outcome may be unknown; inspect the local server record before retrying.",
                retryable: true,
                issues: [],
              },
            },
          };
          // Do not continue a batch after an unknown transport or provenance outcome.
          stopped.current = true;
        } finally {
          clearTimeout(timeout);
        }
        collected.push({
          id: crypto.randomUUID(),
          caseId: item.id,
          alias: "",
          response,
          judgments: emptyJudgments(),
        });
      }
      const order = shuffle(collected).map((a, index) => ({
        ...a,
        alias: "Output " + (attempts.length + index + 1),
      }));
      setStudy((s) => ({ ...s, attempts: [...s.attempts, ...order] }));
      if (order.length) setActiveId(order[0].id);
      setNotice(
        order.length +
          " attempts recorded. Review every valid output, then reveal the comparison. No automatic retry or fallback occurred."
      );
    } finally {
      activeController.current = null;
      pending.current = false;
      setBusy(false);
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (study.attempts.length || Object.keys(study.referenceApprovals).length) {
      setNotice(
        "Export and start a new study before importing, so existing work is not overwritten."
      );
      return;
    }
    try {
      if (file.size > 8_000_000) throw new Error("File too large");
      const restored = restoreStudy(
        JSON.parse(await file.text()),
        cases,
        datasetHash
      );
      setStudy(restored);
      setNotice(
        "Study restored. Imported exports are user-editable records, not independently certified results."
      );
    } catch {
      setNotice(
        "Could not import: expected a valid study export for this exact dataset. Existing work was retained."
      );
    }
  }
  const criteriaLabel = (id: string) =>
    role.criteria.find((c) => c.id === id)?.label ?? id;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/review-brief">InterviewMate / Review workspace</Link>
        <span className={styles.badge}>PHASE 4 · SYNTHETIC DATA</span>
      </header>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          ENGLISH FIRST. EVIDENCE BEFORE PREFERENCE.
        </p>
        <h1>
          Compare the models.
          <br />
          Review the evidence.
        </h1>
        <p>
          English is the baseline. Bahasa Indonesia is a separate multilingual
          pilot. One reviewer can begin; these results do not establish hiring
          validity or accuracy across all speakers.
        </p>
      </section>
      <div className={styles.toolbar}>
        <button
          onClick={() =>
            download("interviewmate-reference-packet.json", {
              studyVersion: STUDY_VERSION,
              datasetHash,
              cases,
            })
          }
        >
          Download reference packet
        </button>
        <button
          onClick={() => download("interviewmate-study.json", study)}
          disabled={busy}
        >
          Export study
        </button>
        <label className={styles.file}>
          Import study JSON
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button
          disabled={busy || !study.attempts.length}
          onClick={() => {
            download("interviewmate-study.json", study);
            setStudy(createStudy(datasetHash));
            setActiveId("");
            setNotice(
              "Export requested; check your download. A new study is ready."
            );
          }}
        >
          Export & start new study
        </button>
      </div>
      <p className={styles.muted}>
        Reviews stay in browser memory until exported. Refreshing loses unsaved
        work. Generation records are saved locally; this page does not collect
        training data or audio.
      </p>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      <div className={styles.layout}>
        <aside className={styles.setup}>
          <h2>1. Prepare the study</h2>
          <label htmlFor="reviewer-alias">
            Reviewer alias (avoid your full name)
          </label>
          <input
            id="reviewer-alias"
            maxLength={80}
            value={study.reviewer}
            disabled={busy || study.attempts.length > 0}
            onChange={(e) =>
              setStudy((s) => ({
                ...s,
                reviewer: e.target.value,
                referenceApprovals: {},
              }))
            }
          />
          <label htmlFor="track">Language track</label>
          <select
            id="track"
            value={language}
            disabled={busy}
            onChange={(e) => chooseLanguage(e.target.value as Language)}
          >
            <option value="en">English · primary baseline</option>
            <option value="id">Bahasa Indonesia · multilingual pilot</option>
          </select>
          <label htmlFor="case">Interview case</label>
          <select
            id="case"
            value={caseId}
            disabled={busy}
            onChange={(e) => {
              setCaseId(e.target.value);
              setActiveId("");
            }}
          >
            {cases
              .filter((c) => c.language === language)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {label(c.kind)}
                </option>
              ))}
          </select>
          <p>{item.reference.scenario}</p>
          <p className={styles.muted}>
            {item.pairedWith && "Paired with " + item.pairedWith + ". "}
            {item.kind === "adaptation"
              ? "AI-authored adaptation: confirm meaning against the English source before running."
              : label(item.split)}
          </p>
          <fieldset disabled={busy || study.revealed}>
            <legend>Providers to compare</legend>
            {providers.map((p) => (
              <label className={styles.check} key={p.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...s, p.id]
                        : s.filter((id) => id !== p.id)
                    )
                  }
                />
                <span>
                  {p.label}
                  <small>
                    {p.model}
                    <br />
                    {keys[p.id] || p.configured
                      ? "Key present · access unverified"
                      : "Missing " + p.keyName}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <details>
            <summary>API setup and data destination</summary>
            <p>
              Connect personal keys in Models & access, or ask the host to
              configure provider access. Keys are sent only to the selected
              provider through this app’s server.
            </p>
            <p>
              Each selected provider receives the synthetic transcript, rubric,
              and instructions. Reference answers and your review judgments are
              not sent.
            </p>
            <p>
              OpenAI, Gemini and DeepSeek are hosted services. This is cloud
              processing, not local inference.
            </p>
          </details>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={!!approved}
              disabled={
                busy ||
                !study.reviewer.trim() ||
                attempts.length > 0 ||
                study.revealed
              }
              onChange={(e) =>
                setStudy((s) => {
                  const approvals = { ...s.referenceApprovals };
                  if (e.target.checked)
                    approvals[item.id] = {
                      reviewer: s.reviewer.trim(),
                      referenceHash: item.referenceHash,
                      reviewedAt: new Date().toISOString(),
                    };
                  else delete approvals[item.id];
                  return { ...s, referenceApprovals: approvals };
                })
              }
            />
            <span>
              I checked this transcript and reference judgments
              {language === "id"
                ? ", including meaning against the English original"
                : ""}
              .
            </span>
          </label>
          <button
            className={styles.primary}
            disabled={busy || !approved || !selected.length || study.revealed}
            onClick={() => void run()}
          >
            {busy
              ? "Generating…"
              : "Run " +
                selected.length +
                " selected model" +
                (selected.length === 1 ? "" : "s")}
          </button>
          {busy && (
            <button
              onClick={() => {
                stopped.current = true;
                activeController.current?.abort();
              }}
            >
              Cancel remaining requests
            </button>
          )}
          <p className={styles.muted}>
            Up to {selected.length} paid API requests per click. Missing keys
            produce explicit failures. For repeatability, run the same cases
            three times per model. Repeats remain separate attempts.
          </p>
        </aside>
        <section className={styles.content}>
          <section className={styles.panel}>
            <h2>2. Check the source and reference</h2>
            <details open>
              <summary>Transcript · {item.input.turns.length} turns</summary>
              <div className={styles.transcript} lang={item.language}>
                {item.input.turns.map((t) => (
                  <div key={t.id} id={t.id}>
                    <strong>
                      {t.id} · {t.speaker}
                    </strong>
                    <p>{t.text}</p>
                  </div>
                ))}
              </div>
            </details>
            {item.pairedWith && item.language === "id" && (
              <details>
                <summary>Paired English original</summary>
                {cases
                  .find((c) => c.id === item.pairedWith)!
                  .input.turns.map((t) => (
                    <p key={t.id} lang="en">
                      <strong>{t.id}:</strong> {t.text}
                    </p>
                  ))}
              </details>
            )}
            <details>
              <summary>
                Provisional reference judgments · human review required
              </summary>
              <p>
                Assistant-authored expectations, not independently validated
                ground truth. If you disagree, leave the approval unchecked and
                record the case ID for revision. Do not alter references after
                viewing outputs.
              </p>
              {CRITERIA.map((id) => (
                <div key={id} className={styles.criterion}>
                  <h3>
                    {id} · {criteriaLabel(id)}
                  </h3>
                  <p>
                    <strong>
                      {label(item.reference.criteria[id].expectedStatus)}
                    </strong>{" "}
                    — {item.reference.criteria[id].rationale}
                  </p>
                  <p>
                    Preserve these limits:{" "}
                    {item.reference.criteria[id].unknowns.join(" ")}
                  </p>
                  {item.reference.criteria[id].support.map((s, i) => (
                    <blockquote key={i}>
                      <a href={"#" + s.turnId}>{s.turnId}</a> “{s.quote}”
                    </blockquote>
                  ))}
                </div>
              ))}
            </details>
          </section>
          <section className={styles.panel}>
            <h2>3. Review the outputs</h2>
            <p>
              Provider names are hidden here until you finish review. This
              reduces preference cues; it is not an independently blinded study.
            </p>
            {!attempts.length ? (
              <p className={styles.empty}>
                No attempts for this case yet. Review its reference, then run
                the selected models.
              </p>
            ) : (
              <>
                <label htmlFor="output">Output to review</label>
                <select
                  id="output"
                  value={active?.id ?? ""}
                  onChange={(e) => setActiveId(e.target.value)}
                >
                  {attempts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.alias} ·{" "}
                      {a.response.result.ok
                        ? isReviewed(a)
                          ? "reviewed"
                          : "needs review"
                        : "failed"}
                      {study.revealed ? " · " + a.response.providerId : ""}
                    </option>
                  ))}
                </select>
                {active &&
                  (!active.response.result.ok ? (
                    <p role="status" className={styles.notice}>
                      {active.response.result.error.code}:{" "}
                      {active.response.result.error.message}
                    </p>
                  ) : (
                    <div>
                      {active.response.result.warnings.map((w) => (
                        <p key={w.code} className={styles.notice}>
                          {w.message}
                        </p>
                      ))}
                      {CRITERIA.map((id) => {
                        if (!active.response.result.ok) return null;
                        const criterion =
                            active.response.result.draft.criteria[id],
                          j = active.judgments[id];
                        return (
                          <article key={id} className={styles.criterion}>
                            <h3>
                              {id} · {criteriaLabel(id)}
                            </h3>
                            <p>
                              <strong>{label(criterion.status)}</strong>
                            </p>
                            <div lang={item.language}>
                              {!criterion.claims.length && (
                                <p>No claim established.</p>
                              )}
                              {criterion.claims.map((claim, index) => (
                                <div key={index}>
                                  <p>{claim.text}</p>
                                  {claim.citations.map((cite, i) => (
                                    <blockquote key={i}>
                                      <a href={"#" + cite.turnId}>
                                        {cite.turnId}
                                      </a>{" "}
                                      “{cite.quote}”
                                    </blockquote>
                                  ))}
                                </div>
                              ))}
                              <p>
                                <strong>Limitation:</strong>{" "}
                                {criterion.limitation}
                              </p>
                              <p>
                                <strong>Follow-up:</strong> {criterion.followUp}
                              </p>
                            </div>
                            <label htmlFor={"verdict-" + id}>
                              Your judgment: evidence, status, uncertainty, and
                              follow-up
                            </label>
                            <select
                              id={"verdict-" + id}
                              disabled={study.revealed}
                              value={j.verdict}
                              onChange={(e) =>
                                judge(id, {
                                  verdict: e.target
                                    .value as Judgment["verdict"],
                                  issues:
                                    e.target.value === "acceptable"
                                      ? []
                                      : j.issues,
                                })
                              }
                            >
                              <option value="unreviewed">Not reviewed</option>
                              <option value="acceptable">
                                Acceptable as written
                              </option>
                              <option value="needs_correction">
                                Needs correction
                              </option>
                              <option value="uncertain">
                                Uncertain · another review needed
                              </option>
                            </select>
                            {j.verdict === "needs_correction" && (
                              <fieldset disabled={study.revealed}>
                                <legend>
                                  What needs correction? Select at least one.
                                </legend>
                                {issueOptions.map((issue) => (
                                  <label className={styles.check} key={issue}>
                                    <input
                                      type="checkbox"
                                      checked={j.issues.includes(issue)}
                                      onChange={(e) =>
                                        judge(id, {
                                          issues: e.target.checked
                                            ? [...j.issues, issue]
                                            : j.issues.filter(
                                                (i) => i !== issue
                                              ),
                                        })
                                      }
                                    />
                                    {label(issue)}
                                  </label>
                                ))}
                              </fieldset>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ))}
              </>
            )}
          </section>
        </section>
      </div>
      <section className={styles.panel}>
        <h2>4. Compare results by language</h2>
        <p>
          Scores describe draft quality, never candidate ability. Failures,
          unreviewed outputs, and uncertain judgments remain visible. English
          variants and Indonesian adaptations are separate from the English
          baseline.
        </p>
        {!study.revealed ? (
          <button
            disabled={busy || !canReveal(study)}
            onClick={() => setStudy((s) => ({ ...s, revealed: true }))}
          >
            Finish review & reveal model results
          </button>
        ) : (
          <>
            <p className={styles.notice}>
              Review is locked after reveal. Start a new study for further runs.
              Observed rank uses human-acceptable criteria only when case
              coverage and repeats match, all outputs are reviewed, and there
              are no failures or uncertain judgments. It is specific to this
              pilot.
            </p>
            <div className={styles.tableScroll}>
              <table>
                <caption>
                  Single-reviewer pilot · {study.attempts.length} attempts ·
                  quality of original drafts
                </caption>
                <thead>
                  <tr>
                    <th>Model / track</th>
                    <th>Attempts / valid / failed</th>
                    <th>Human-acceptable criteria</th>
                    <th>Uncertain criteria</th>
                    <th>Status agreement with reference</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {row.provider} / {row.model}
                        <small>
                          {row.language === "en"
                            ? "English"
                            : "Bahasa Indonesia"}{" "}
                          · {label(row.kind)}
                          <br />
                          {row.observedRank === null
                            ? "Not ranked · comparison incomplete"
                            : "Observed rank " + row.observedRank}
                        </small>
                      </td>
                      <td>
                        {row.attempts} / {row.valid} / {row.failures}
                      </td>
                      <td>
                        {row.judgments
                          ? row.acceptable + " / " + row.judgments
                          : "Not measured"}
                      </td>
                      <td>{row.uncertain}</td>
                      <td>
                        {row.statusCells
                          ? row.agreement + " / " + row.statusCells
                          : "Not measured"}
                      </td>
                      <td>
                        {Object.entries(row.coverage)
                          .map(([id, count]) => id + " × " + count)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() =>
                download("interviewmate-comparison.json", {
                  version: STUDY_VERSION,
                  datasetHash,
                  reviewerCount: 1,
                  scope:
                    "Single-reviewer pilot; English primary, Indonesian secondary; no hiring validity established.",
                  summary,
                })
              }
            >
              Export comparison
            </button>
          </>
        )}
      </section>
    </main>
  );
}
