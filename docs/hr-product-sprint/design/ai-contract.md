# AI and data contract

[Design package](README.md) · [Executable specification](review-brief-contract.cjs) · [Prompt v1](prompts/review-brief-v1.md)

Contract: `review-brief-v1`. Role: `frontend-review-v1`. Date: 2026-09-07. Selected design; the new API and product UI are not implemented yet.

## Runtime boundary and tools

Use the existing Next.js/React stack, installed Zod, Vercel AI SDK 6 and OpenAI provider. The new development-only POST route is `/api/review-brief`; the page is `/review-brief`. No ATS, Firebase write, browser-key input, tools, web retrieval or autonomous follow-up is required by this feature.

Use `generateText` with `Output.object({ schema: draftSchema })`, then read `result.output`. That structured-output interface is documented by [AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) and present in the installed package README/types. This specifies a separate route; migrating the existing `generateObject` evaluator is unnecessary.

Initial configuration: `createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).chat("gpt-4o-2024-08-06")`, temperature 0, `maxOutputTokens: 4000`, `maxRetries: 0`, total timeout 30,000 ms, and a request-linked abort signal. These are chosen experiment limits, not measured latency or determinism guarantees. The [OpenAI model reference](https://developers.openai.com/api/docs/models/gpt-4o) lists the snapshot and structured-output support. Access in this account is unverified. Both sources were checked on 2026-09-07.

One user attempt produces at most one provider request. No hidden repair call or automatic fallback. Retry is an explicit action with a new attempt ID; preserve the prior error. If the pinned model is unavailable, record a deliberate configuration change before continuing evaluation.

## Request and input preparation

[Request fixtures](examples/practice-a.request.json) and `requestSchema` in the executable spec define the exact shape:

- `schemaVersion`: literal `review-brief-v1`; `roleVersion`: literal `frontend-review-v1`.
- `transcriptId`: 1–64 letters, digits, underscores or hyphens; `transcriptVersion`: nonblank, at most 80 characters.
- `synthetic`: literal `true`, shown in the UI. This label is a user assertion for imported data, not a detector of whether data is fictional.
- `turns`: 1–100 entries, each with unique `id`, `speaker` (`candidate`, `interviewer`, `unknown`) and nonblank `text` of at most 2,000 UTF-16 code units.
- Combined turn text is at most 20,000 UTF-16 code units. The HTTP handler separately enforces 65,536 UTF-8 bytes while reading the request body, before JSON parsing; do not trust Content-Length alone.
- At least one candidate turn is required. Unknown speakers are retained as context with a warning, never inferred or used as candidate evidence.
- Reject unknown fields, duplicate IDs and unsupported role/contract versions. Do not silently truncate input or strip prompt-injection text.

Accept bundled fixtures or imported JSON in this exact shape. JSON parsing decodes escapes; keep the resulting turn text unchanged. Do not trim, rewrite punctuation, normalize Unicode or assign inferred speakers. Hash the parsed schema-ordered request with SHA-256 over UTF-8 `JSON.stringify(parsedRequest)`; preserve turn order.

Load the role profile from the trusted server file using roleVersion, not from client-supplied criteria. Names and other identifying metadata are not request fields. For a future legacy transcript adapter, explicitly map stored `user` to candidate and `assistant` to interviewer only after confirming that source contract.

## Prompt assembly and generation

1. Read the [exact instruction file](prompts/review-brief-v1.md); append two newlines, `TRUSTED_ROLE_PROFILE_JSON:`, a newline and serialized [role profile](role-profile.json). This is the system message.
2. The user message is exactly `JSON.stringify(parsedRequest)`. Never interpolate transcript strings into the trusted system instruction.
3. Supply `draftSchema` as the structured-output schema. Do not send example reference judgments or anticipated case labels to the evaluator.
4. Treat refusal, missing structured output, truncation, timeout and provider errors as failed attempts.
5. Run schema and cross-field checks before displaying any generated candidate claims. Do not stream unchecked partial claims into the brief.

Record SHA-256 hashes of the actual instruction/profile bytes used, and the contract implementation/version, so a changed prompt cannot masquerade as the same configuration.

## Draft contract and validation

The model emits only `schemaVersion` and `criteria`, an object with exactly R1–R4. Every entry has:

| Field | Contract |
|---|---|
| `status` | One of the four [evidence statuses](role-rubric.md#evidence-statuses) |
| `claims` | 0–3 atomic self-report claims; nonempty for any status other than not_established |
| `claims[].text` | Nonblank, at most 350 characters; each factual statement must be supported by its citations |
| `claims[].citations` | 1–2 objects with `turnId` and a nonblank `quote` up to 600 characters |
| `limitation` | Nonblank, at most 500 characters; scope/uncertainty, not a place to hide uncited candidate facts |
| `followUp` | One nonblank neutral question, at most 350 characters |

All string limits use JavaScript length. All objects reject extra fields. Numeric scores, overall summaries, rankings and review-approval metadata are excluded.

For every quotation: the turn exists, speaker is candidate, and the exact case-sensitive quotation is a contiguous substring of that unchanged turn. No fuzzy matching, ellipsis repair or global transcript search. Conflict status requires valid citations to at least two distinct candidate turns. Duplicate criterion keys in the raw JSON must not be used to smuggle alternatives; the provider's parsed object still must contain exactly the four canonical entries.

A quote check verifies location, not entailment. The [unsupported-claim fixture](examples/unsupported-claim.draft.json) intentionally passes mechanical validation while making an unsupported conclusion. Human review must reject it. Structured outputs can still contain mistakes; [OpenAI's guide](https://developers.openai.com/api/docs/guides/structured-outputs) makes the same distinction between structured format and reliable content.

Reject the whole generated draft if any mechanical check fails; preserve diagnostic/raw output for the local run record, but show no invalid candidate report. Do not quietly delete a broken claim and report success. Semantic overreach, omitted qualifiers, omissions and misleading follow-ups remain human evaluation tasks.

## API envelope, errors and provenance

A successful response is `{ ok: true, generation, draft, warnings }`. `draft` is the validated model object; the server supplies `generation`:

```text
generationId, generatedAtUtc, sourceType = "live_model",
contractVersion, contractHash, roleVersion, roleHash, promptVersion, promptHash,
modelRequested, modelReturned, inputHash, latencyMs,
usage = { inputTokens, outputTokens } | null
```

Use an application-generated UUID and server timestamp. Take returned model/usage data from provider metadata when present; use null for unavailable metadata, never invent values. `warnings` is an array of server-generated `{code, message}` entries, initially `UNKNOWN_SPEAKER_CONTEXT` if relevant. Raw provider response ID, finish reason and validation errors belong in the local evaluation record. Record available usage; cost stays unmeasured until calculated from a dated pricing source. Never save credentials.

An error response is `{ ok: false, error: { code, message, retryable, issues }, attemptId }`; `issues` contains field paths/codes without provider secrets. Do not return a draft in an error response.

| HTTP | Code | Behavior |
|---|---|---|
| 404 | NOT_ENABLED | Page/route unavailable outside development; no provider call |
| 400 | INVALID_JSON | Keep input; ask for valid JSON |
| 413 | INPUT_TOO_LARGE | Keep input; show limits; no silent truncation |
| 422 | INVALID_INPUT / NO_CANDIDATE_TURNS | Show field issues; correct input before retry |
| 503 | AI_UNAVAILABLE | Missing key or unavailable model configuration; no sample response substituted |
| 429 | RATE_LIMITED | Explicit later retry; record provider attempt |
| 504 | GENERATION_TIMEOUT | Preserve input and prior draft; explicit retry |
| 502 | INVALID_OUTPUT / INVALID_CITATION / PROVIDER_ERROR / MODEL_REFUSAL | No new draft; record failed attempt, allow explicit retry |

Map executable-spec request issue codes into 422 issues, except aggregate text-limit violations may use 413. Missing/extra fields and wrong versions are INVALID_INPUT. Map draft shape/blank/status errors to INVALID_OUTPUT, and quote/turn/speaker/conflict-reference failures to INVALID_CITATION. Refusal or truncation yields failure even if some text exists. Cancellation preserves the prior state and cannot mark a draft successful.

Use `Cache-Control: no-store`. The UI permits one pending request, creates a local attempt token, aborts on input changes/cancellation and ignores late responses that do not match its current token and input hash.

## Reviewer state and export

Keep immutable `originalDraft`, editable `currentDraft`, the input snapshot, generation metadata, reviewer note (up to 1,000 characters), revision number and four `checked` flags in memory. Claim IDs are assigned locally as R1-C1 etc. on generation and remain stable through edits; do not request IDs from the model.

Claim text, limitation, follow-up and status are editable; quotation text/turn references and the original draft are read-only. Remove/restore claims explicitly. Newly asserted facts must be supported by the retained citations; review is not automatic semantic validation. Notes are for review process and next steps, not uncited candidate findings.

A content change increments revision, clears the edited criterion's checked flag, and clears global reviewedAt/reviewedRevision. A reviewer-note change clears all four flags. “Mark reviewed” requires all four current flags, a nonblank reviewer ID up to 80 characters, and successful validation of the current draft. It captures the exact reviewed revision and timestamp. A conflicting criterion may be reviewed if the conflict is retained; reviewed does not mean resolved or approved for hiring.

Export only a current reviewed revision. JSON contains `exportVersion: "review-brief-export-v1"`, input, trusted role profile, generation metadata, originalDraft, reviewedDraft, revision, checked flags, reviewerId, reviewerNote and reviewedAt. Text contains the same reviewed claims, statuses, quotations/turn IDs, limitations, follow-ups, reviewer metadata and synthetic/source labels; JSON retains the full original/input audit trail. No new AI summary is generated at export.

For authored examples use `sourceType: "authored_example"`, with live model/timing/usage fields null and the authorship/version visible. They can never acquire `live_model` provenance by being reviewed. Filenames use the validated transcript ID plus revision. Refresh clears state; display this before work begins and warn on leaving unsaved edited work.
