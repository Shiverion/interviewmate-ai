"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CRITERIA,
  validateDraft,
  validateRequest,
  type Criterion,
  type CriterionId,
  type ReviewInput,
} from "@/lib/review-brief/contract";
import { fixtures, roleProfile } from "@/lib/review-brief/fixtures";
import {
  canExport,
  canReview,
  checkCriterion,
  createReview,
  editCriterion,
  exportReview,
  exportText,
  markReviewed,
  removeClaim,
  restoreClaim,
  setNote,
  setReviewer,
  STATUS_LABELS,
  type ReviewSession,
} from "@/lib/review-brief/review-state";
import {
  MAX_BODY_BYTES,
  successSchema,
  type Provenance,
} from "@/lib/review-brief/types";
import styles from "./review-brief.module.css";

async function hashInput(input: ReviewInput) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(input))
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type SourceSelection = { criterion: CriterionId | null; turnIds: string[] };

export default function ReviewBrief({
  provenance,
  configured,
}: {
  provenance: Provenance;
  configured: boolean;
}) {
  const [input, setInput] = useState<ReviewInput>(fixtures[0].input);
  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const [confirmed, setConfirmed] = useState(false);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [source, setSource] = useState<SourceSelection | null>(null);
  const [editing, setEditing] = useState<CriterionId | null>(null);
  const attempt = useRef(0);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (source) sourceRef.current?.focus();
  }, [source]);
  useEffect(
    () => () => {
      attempt.current++;
      controller.current?.abort();
    },
    []
  );
  useEffect(() => {
    if (!session) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [session]);

  function cancel() {
    attempt.current++;
    controller.current?.abort();
    pending.current = false;
    setLoading(false);
    setNotice("Generation cancelled. Start a new attempt when ready.");
  }
  function replaceInput(next: ReviewInput, id: string) {
    attempt.current++;
    controller.current?.abort();
    pending.current = false;
    setLoading(false);
    setInput(next);
    setFixtureId(id);
    setConfirmed(false);
    setSession(null);
    setSource(null);
    setEditing(null);
    setError("");
    setNotice(
      "Transcript changed. Confirm the role before generating a new draft."
    );
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BODY_BYTES) {
      setError("The JSON file exceeds 65,536 bytes.");
      return;
    }
    try {
      const result = validateRequest(JSON.parse(await file.text()));
      if (!result.ok)
        throw new Error(
          result.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ")
        );
      replaceInput(result.data, "imported");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Import a valid synthetic transcript JSON file."
      );
    }
  }
  async function generate(authored = false) {
    if (!confirmed || pending.current) return;
    pending.current = true;
    const token = ++attempt.current;
    controller.current = new AbortController();
    setLoading(true);
    setError("");
    setNotice("");
    setEditing(null);
    try {
      const hash = await hashInput(input);
      if (token !== attempt.current) return;
      if (authored) {
        const fixture = fixtures.find((item) => item.id === fixtureId);
        if (!fixture)
          throw new Error(
            "Authored examples are available only for the built-in practice transcripts."
          );
        setSession(
          createReview(input, fixture.draft, {
            ...provenance,
            generationId: `authored-${fixture.id}`,
            generatedAtUtc: null,
            sourceType: "authored_example",
            inputHash: hash,
            modelRequested: null,
            modelReturned: null,
            latencyMs: null,
            usage: null,
          })
        );
        setNotice("Authored example loaded. No model was called.");
      } else {
        const response = await fetch("/api/review-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.current.signal,
        });
        const body: unknown = await response.json();
        if (token !== attempt.current) return;
        if (!response.ok) {
          const failure = body as {
            error?: { code?: string; message?: string };
            attemptId?: string;
          };
          throw new Error(
            `${failure.error?.code ?? "GENERATION_FAILED"}: ${failure.error?.message ?? "Generation failed. Retry explicitly when ready."}${failure.attemptId ? ` Attempt: ${failure.attemptId}` : ""}`
          );
        }
        const parsed = successSchema.safeParse(body);
        if (!parsed.success || parsed.data.generation.inputHash !== hash)
          throw new Error(
            "The response did not match this transcript or the live generation contract. No draft was opened."
          );
        const checked = validateDraft(input, parsed.data.draft);
        if (!checked.ok)
          throw new Error(
            "The response contained invalid evidence references. No draft was opened."
          );
        setSession(createReview(input, checked.data, parsed.data.generation));
        setNotice(
          parsed.data.warnings.map((warning) => warning.message).join(" ") ||
            "Live draft ready. Inspect each claim against its source before reviewing."
        );
      }
      setSource(null);
    } catch (problem) {
      if (token === attempt.current)
        setError(
          problem instanceof Error
            ? problem.message
            : "Generation failed. Retry explicitly when ready."
        );
    } finally {
      if (token === attempt.current) {
        pending.current = false;
        setLoading(false);
      }
    }
  }
  function viewSource(
    key: CriterionId | null,
    turnIds: string[],
    button: HTMLButtonElement
  ) {
    returnFocus.current = button;
    setSource({ criterion: key, turnIds });
  }
  function closeSource() {
    setSource(null);
    returnFocus.current?.focus();
  }
  const sourcePanel = source && (
    <section
      ref={sourceRef}
      tabIndex={-1}
      aria-label="Source transcript"
      className={styles.source}
    >
      <div className={styles.row}>
        <h3>Source transcript</h3>
        <button onClick={closeSource}>Close source</button>
      </div>
      <p>
        Full context · {input.transcriptId}. Highlighted turns are cited;
        inspecting them does not mark a criterion checked.
      </p>
      {input.turns.map((turn) => (
        <div
          key={turn.id}
          className={`${styles.turn} ${source.turnIds.includes(turn.id) ? styles.highlight : ""}`}
        >
          <strong>
            {turn.id} · {turn.speaker}
          </strong>
          <p>{turn.text}</p>
        </div>
      ))}
    </section>
  );
  const valid = session
    ? validateDraft(session.input, session.currentDraft)
    : null;
  const checkedCount = session
    ? CRITERIA.filter((key) => session.checked[key]).length
    : 0;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">
          InterviewMate <span> / Review workspace</span>
        </Link>
        <Link href="/review-brief/evaluation">Compare evaluation models →</Link>
        <span className={styles.tag}>LOCAL PROTOTYPE · SYNTHETIC DATA</span>
      </header>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>FROM INTERVIEW TO HANDOFF</p>
        <h1>
          A brief you can trace
          <br />
          back to the conversation.
        </h1>
        <p>
          Review what a candidate actually described, keep uncertainty visible,
          and prepare a useful handoff for the hiring manager.
        </p>
      </div>
      <div className={styles.layout}>
        <aside className={styles.setup}>
          <p className={styles.eyebrow}>01 / SET THE CONTEXT</p>
          <h2>Interview source</h2>
          <label htmlFor="transcript">Practice transcript</label>
          <select
            id="transcript"
            value={fixtureId}
            onChange={(event) => {
              const selected = fixtures.find(
                (item) => item.id === event.target.value
              );
              if (selected) replaceInput(selected.input, selected.id);
            }}
          >
            {fixtures.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.label}
              </option>
            ))}
            {fixtureId === "imported" && (
              <option value="imported">Imported synthetic transcript</option>
            )}
          </select>
          <p>
            {input.turns.length} turns · {input.transcriptId} ·{" "}
            {input.transcriptVersion}
          </p>
          {input.turns.some((turn) => turn.speaker === "unknown") && (
            <p role="status">
              Unknown-speaker turns remain context only; they cannot support
              candidate claims.
            </p>
          )}
          <button
            onClick={(event) => viewSource(null, [], event.currentTarget)}
          >
            Read full transcript
          </button>
          <label className={styles.file}>
            Or import synthetic JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                void importFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <p className={styles.small}>
            Synthetic transcripts only. Imported JSON must use the same
            versioned format as the practice fixtures. Changing the transcript
            clears this review.
          </p>
          <hr />
          <h3>{roleProfile.title}</h3>
          <p>{roleProfile.context}</p>
          <details>
            <summary>Inspect the four review criteria</summary>
            {roleProfile.criteria.map((criterion) => (
              <div key={criterion.id}>
                <h4>
                  {criterion.id} · {criterion.label}
                </h4>
                <p>{criterion.lookFor}</p>
                <p className={styles.small}>{criterion.boundary}</p>
              </div>
            ))}
          </details>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            This role fits the synthetic interview.
          </label>
          <button
            className={styles.primary}
            disabled={!confirmed || loading || !configured}
            onClick={() => void generate()}
          >
            {" "}
            {loading
              ? "Generating draft…"
              : session
                ? "Generate a new AI draft"
                : "Generate AI draft"}
          </button>
          {loading && <button onClick={cancel}>Cancel generation</button>}
          {!configured && (
            <p role="status">
              AI is unavailable until OPENAI_API_KEY is configured on the local
              server.
            </p>
          )}
          <button
            disabled={!confirmed || loading || fixtureId === "imported"}
            onClick={() => void generate(true)}
          >
            Load authored example
          </button>
          <p className={styles.small}>
            One model call per attempt. A new successful draft replaces the
            current review; a failed attempt keeps it. Authored examples are
            labelled separately.
          </p>
        </aside>
        <section className={styles.workspace} aria-label="Review brief">
          <div className={styles.row}>
            <div>
              <p className={styles.eyebrow}>02 / CHECK THE EVIDENCE</p>
              <h2>Recruiter review brief</h2>
            </div>
            {session && (
              <span className={styles.tag}>
                {canExport(session) ? "REVIEWED" : "UNREVIEWED"} · v
                {session.revision}
              </span>
            )}
          </div>
          <p>
            Evidence describes this interview, not overall ability. Exact quotes
            still need a human check for meaning and relevance.
          </p>
          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className={styles.error}
            >
              {error}
              {session && <p>The previous draft is still open.</p>}
            </div>
          )}
          {notice && (
            <p role="status" className={styles.notice}>
              {notice}
            </p>
          )}
          {source?.criterion === null && sourcePanel}
          {!session ? (
            <div className={styles.empty}>
              <span>4 criteria. Every claim connected to its source.</span>
              <h3>Start with a completed interview.</h3>
              <p>
                Confirm the role, generate a draft, then check the evidence and
                gaps before exporting.
              </p>
              <div className={styles.steps}>
                <span>Generate</span>
                <span>Inspect & correct</span>
                <span>Review & export</span>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.provenance}>
                <strong>
                  {session.generation.sourceType === "authored_example"
                    ? "Authored example · no live AI response"
                    : "Live model draft"}
                </strong>
                <p>
                  {session.generation.modelReturned ??
                    session.generation.modelRequested ??
                    "No model used"}
                  {session.generation.latencyMs !== null &&
                    ` · ${(session.generation.latencyMs / 1000).toFixed(1)} s`}{" "}
                  · {checkedCount}/4 criteria checked
                </p>
                <details>
                  <summary>Generation details</summary>
                  <p>Generation: {session.generation.generationId}</p>
                  <p>
                    Role: {session.generation.roleVersion} · Prompt:{" "}
                    {session.generation.promptVersion}
                  </p>
                  <p>Input SHA-256: {session.generation.inputHash}</p>
                  <p>
                    Generated:{" "}
                    {session.generation.generatedAtUtc ?? "Authored fixture"}
                  </p>
                </details>
              </div>
              {CRITERIA.map((key) => {
                const entry = session.currentDraft.criteria[key];
                const role = roleProfile.criteria.find(
                  (item) => item.id === key
                )!;
                return (
                  <div key={key}>
                    <article
                      className={styles.criterion}
                      aria-label={`${key} ${role.label}`}
                    >
                      <div className={styles.row}>
                        <h3>
                          <span>{key}</span> {role.label}
                        </h3>
                        <span
                          className={`${styles.status} ${entry.status === "conflicting_evidence" ? styles.conflict : ""}`}
                        >
                          {STATUS_LABELS[entry.status]}
                        </span>
                      </div>
                      {editing === key ? (
                        <CriterionEditor
                          entry={entry}
                          onCancel={() => setEditing(null)}
                          onSave={(next) => {
                            try {
                              setSession(editCriterion(session, key, next));
                              setEditing(null);
                              setError("");
                            } catch (problem) {
                              setError((problem as Error).message);
                            }
                          }}
                        />
                      ) : (
                        <>
                          {entry.claims.length === 0 && (
                            <p>
                              No completed relevant action established in this
                              interview.
                            </p>
                          )}
                          {entry.claims.map((claim, index) => (
                            <div
                              className={styles.claim}
                              key={session.claimIds[key][index]}
                            >
                              <p>{claim.text}</p>
                              {claim.citations.map(
                                (citation, citationIndex) => (
                                  <blockquote key={citationIndex}>
                                    <p>“{citation.quote}”</p>
                                    <cite>{citation.turnId} · candidate</cite>
                                  </blockquote>
                                )
                              )}
                              <div className={styles.actions}>
                                <button
                                  onClick={(event) =>
                                    viewSource(
                                      key,
                                      entry.status === "conflicting_evidence"
                                        ? entry.claims.flatMap((item) =>
                                            item.citations.map(
                                              (citation) => citation.turnId
                                            )
                                          )
                                        : claim.citations.map(
                                            (citation) => citation.turnId
                                          ),
                                      event.currentTarget
                                    )
                                  }
                                >
                                  View source
                                  {entry.status === "conflicting_evidence"
                                    ? " · both accounts"
                                    : ""}
                                </button>
                                <button
                                  onClick={() =>
                                    setSession(
                                      removeClaim(
                                        session,
                                        key,
                                        session.claimIds[key][index]
                                      )
                                    )
                                  }
                                >
                                  Remove claim
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className={styles.gap}>
                            <h4>What remains unclear</h4>
                            <p>{entry.limitation}</p>
                            <h4>Suggested follow-up</h4>
                            <p>{entry.followUp}</p>
                          </div>
                          <div className={styles.actions}>
                            <button onClick={() => setEditing(key)}>
                              Edit criterion
                            </button>
                            {session.removed[key].length > 0 && (
                              <button
                                onClick={() =>
                                  setSession(restoreClaim(session, key))
                                }
                              >
                                Restore last removed claim
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          disabled={editing !== null}
                          checked={session.checked[key]}
                          onChange={(event) =>
                            setSession(
                              checkCriterion(session, key, event.target.checked)
                            )
                          }
                        />
                        I checked the claims, source context, status and gaps
                        for {key}.
                      </label>
                    </article>
                    {source?.criterion === key && sourcePanel}
                  </div>
                );
              })}
              <section className={styles.finish}>
                <p className={styles.eyebrow}>03 / PREPARE THE HANDOFF</p>
                <h2>Review, then export</h2>
                <p>
                  Reviewed means inspected; unresolved gaps or conflicts may
                  remain. This brief makes no hiring decision.
                </p>
                <label htmlFor="reviewer">
                  Reviewer ID <span>(required, up to 80 characters)</span>
                </label>
                <input
                  id="reviewer"
                  maxLength={80}
                  value={session.reviewerId}
                  onChange={(event) =>
                    setSession(setReviewer(session, event.target.value))
                  }
                />
                <label htmlFor="reviewer-note">
                  Reviewer note · {session.reviewerNote.length}/1000
                </label>
                <textarea
                  id="reviewer-note"
                  maxLength={1000}
                  value={session.reviewerNote}
                  onChange={(event) =>
                    setSession(setNote(session, event.target.value))
                  }
                />
                <p className={styles.small}>
                  Set your ID and note before checking the criteria. Changing
                  either clears all checks. Editing a criterion clears its check
                  and the reviewed state.
                </p>
                {valid && !valid.ok && (
                  <p role="alert" className={styles.error}>
                    Resolve before review:{" "}
                    {valid.issues
                      .map((issue) => `${issue.path}: ${issue.message}`)
                      .join("; ")}
                  </p>
                )}
                <div className={styles.actions}>
                  <button
                    className={styles.primary}
                    disabled={
                      !canReview(session) || editing !== null || loading
                    }
                    onClick={() => setSession(markReviewed(session))}
                  >
                    Mark reviewed
                  </button>
                  <button
                    disabled={
                      !canExport(session) || editing !== null || loading
                    }
                    onClick={() =>
                      download(
                        `${input.transcriptId}-review-v${session.revision}.json`,
                        JSON.stringify(exportReview(session), null, 2),
                        "application/json"
                      )
                    }
                  >
                    Export JSON
                  </button>
                  <button
                    disabled={
                      !canExport(session) || editing !== null || loading
                    }
                    onClick={() =>
                      download(
                        `${input.transcriptId}-review-v${session.revision}.txt`,
                        exportText(session),
                        "text/plain"
                      )
                    }
                  >
                    Export text
                  </button>
                </div>
                <p role="status">
                  {canExport(session)
                    ? `Revision ${session.revision} reviewed. Exports are ready.`
                    : "Export is locked until all four criteria are checked and the current revision is marked reviewed."}
                </p>
              </section>
            </>
          )}
        </section>
      </div>
      <footer className={styles.footer}>
        Local development prototype · Review edits live in this tab and are lost
        on refresh. Export reviewed work before leaving. Synthetic model
        attempts are recorded locally on the server.
      </footer>
    </main>
  );
}

function CriterionEditor({
  entry,
  onSave,
  onCancel,
}: {
  entry: Criterion;
  onSave: (entry: Criterion) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(entry));
  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <label>
        Status
        <select
          value={draft.status}
          onChange={(event) =>
            setDraft({
              ...draft,
              status: event.target.value as Criterion["status"],
            })
          }
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {draft.claims.map((claim, index) => (
        <label key={index}>
          Claim {index + 1} · {claim.text.length}/350
          <textarea
            required
            maxLength={350}
            value={claim.text}
            onChange={(event) =>
              setDraft({
                ...draft,
                claims: draft.claims.map((item, i) =>
                  i === index ? { ...item, text: event.target.value } : item
                ),
              })
            }
          />
        </label>
      ))}
      <p className={styles.small}>
        Source references stay unchanged. Remove an unsupported claim instead of
        attaching unrelated evidence.
      </p>
      <label>
        What remains unclear · {draft.limitation.length}/500
        <textarea
          required
          maxLength={500}
          value={draft.limitation}
          onChange={(event) =>
            setDraft({ ...draft, limitation: event.target.value })
          }
        />
      </label>
      <label>
        Suggested follow-up · {draft.followUp.length}/350
        <textarea
          required
          maxLength={350}
          value={draft.followUp}
          onChange={(event) =>
            setDraft({ ...draft, followUp: event.target.value })
          }
        />
      </label>
      <div className={styles.actions}>
        <button type="submit" className={styles.primary}>
          Save changes
        </button>
        <button type="button" onClick={onCancel}>
          Cancel edit
        </button>
      </div>
    </form>
  );
}
