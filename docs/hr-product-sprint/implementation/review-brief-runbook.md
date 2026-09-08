# Review brief: run and maintain the prototype

[Documentation home](../../README.md) · [Phase 3 report](../phases/03-prototype-build.md) · [Build backlog](phase-3-backlog.md) · [AI contract](../design/ai-contract.md)

Updated: 2026-09-08. The local web workflow is implemented. Successful live generation is still pending: the first actual provider attempt returned `AI_UNAVAILABLE`. Authored examples and mocked software tests are separate from live model evidence.

## Start locally

From the repository root, use Node.js 20.9.0 or newer and the existing lockfile:

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [the review workspace](http://127.0.0.1:3000/review-brief). This route is outside the recruiter login/key gates. Firebase and browser-stored OpenAI keys are not required. The startup check used the existing installed dependencies; a fresh `npm ci` was not performed during this implementation.

For actual generation, set `OPENAI_API_KEY` in the ignored `.env.local`, with access to `gpt-4o-2024-08-06`, then restart the local server. Do not paste credentials into transcripts, exports or issue reports. No key is needed for **Load authored example**. A configured variable does not prove that the provider accepts it.

To reproduce the no-Firebase check without editing the environment file, use a dedicated PowerShell session:

```powershell
$env:NEXT_PUBLIC_FIREBASE_API_KEY=''
npm run dev -- --hostname 127.0.0.1
```

The inherited root provider warns that Firebase initialization was skipped. It does not block this route. Its safe proxies now tolerate React's `$typeof` inspection; real access to an unavailable SDK method still fails explicitly. Keep the development server bound to loopback. `npm run build` succeeds, but `npm start` intentionally serves 404 for both `/review-brief` and `/api/review-brief`.

## Demonstrate the workflow

1. Select P1-A, P1-B or the sparse practice transcript. Read the transcript and inspect the four fixed role criteria. Alternatively import a synthetic JSON file using the [practice input format](../../../src/lib/review-brief/fixtures/practice-a.request.json).
2. Confirm the role. Select **Generate AI draft** for one real provider attempt, or explicitly **Load authored example** for an authored practice draft. A failed attempt never substitutes a fixture.
3. Set a reviewer ID and optional note before checking the criteria. Inspect source quotations in full context, including both accounts of a conflict. Exact text matching is not proof that a claim is supported.
4. Correct claim text, status, uncertainty or follow-up; remove and restore unsupported claims as needed. Original generated/authored content remains preserved. Source references cannot be rewritten in the editor.
5. Check all four criteria and select **Mark reviewed**. Export JSON for the full input/original/reviewed audit trail, or text for a readable brief. Filenames include the transcript ID and current revision.
6. Edit a reviewed criterion and observe exports lock again. Recheck the affected criterion and mark the new revision reviewed. Changing the reviewer ID or note clears all checks.

Review state lives in browser memory. Refreshing or switching transcripts clears it; the page explains this and warns before leaving an open review. Starting a new successful generation replaces the same-input review. Failed attempts retain it. Authored provenance remains authored after human review.

## Source map and ownership

| Change | Edit | Keep aligned |
|---|---|---|
| Request/output rules and quote validation | [Runtime contract](../../../src/lib/review-brief/contract.ts) | [Offline design contract](../design/review-brief-contract.cjs), versioned fixtures and both test suites |
| Criteria, questions and evidence anchors | [Runtime role profile](../../../src/lib/review-brief/role-profile.json) | [Design role profile](../design/role-profile.json) and its version |
| Model instructions | [Runtime prompt](../../../src/lib/review-brief/prompt.md) | [Exact design prompt](../design/prompts/review-brief-v1.md); preserve exact text and record a new version when behavior changes |
| Transport limits, timeouts and response envelopes | [HTTP handler](../../../src/lib/review-brief/handler.ts), [types](../../../src/lib/review-brief/types.ts) | [API route](../../../src/app/api/review-brief/route.ts) and handler tests |
| Provider settings and attempt persistence | [Server adapter](../../../src/lib/review-brief/server.ts) | Requested model, no automatic retries, allowlisted record fields and provenance hashes |
| Reviewer edits, attestation and export | [Review state](../../../src/lib/review-brief/review-state.ts) | Immutable original, stable claim IDs, invalidation rules and export tests |
| UI, source inspection and responsive layout | [Review workspace](../../../src/components/review-brief/ReviewBrief.tsx), [styles](../../../src/components/review-brief/review-brief.module.css) | [UX specification](../design/ux-spec.md), browser checks |
| Development-only entry | [Page](../../../src/app/review-brief/page.tsx) | Production not-found guard and server-only configuration |

The runtime role, prompt and six practice fixture files were copied from Phase 2. The TypeScript contract ports its checks, with explicit R1–R4 keys for static type inference. This is a maintenance duplication: update the design and runtime together, preserve old run artifacts, and rerun both checks. Avoid changing the meaning of a frozen version silently.

## Data flow and provenance

The server reads the body incrementally and rejects more than 65,536 UTF-8 bytes. Zod validates the strict synthetic request, including unique IDs, candidate presence and text limits. Input text is not silently trimmed or truncated. Unknown speakers remain context only and produce a visible warning.

The fixed trusted prompt and role profile form the system message. Only the serialized validated transcript enters the user message. AI SDK structured output is followed by cross-field and exact candidate-quote validation. A failed draft is rejected in full. The original seven-score evaluator and Firestore report format are not imported.

One explicit attempt means one provider request (`maxRetries: 0`). A 30-second deadline and client cancellation abort the request; stale browser responses are discarded using an attempt token and canonical input hash. Errors are sanitized and include an attempt ID. There is no automatic repair, retry or fixture fallback.

Hashes use SHA-256: input = UTF-8 `JSON.stringify` of schema-parsed input; role = serialized trusted role JSON; prompt = exact final system message including the role; contract = runtime contract source bytes at the attempt. Actual returned model and usage fields are nullable when unavailable. Authored examples have null model/timing/usage fields.

Synthetic provider attempts are saved under ignored `.review-brief-runs/<attempt-id>.json`. These contain validated input, provenance, allowlisted model output/metadata and success or failure. They never serialize provider request objects or headers. Pre-provider input/key validation failures are returned directly; they do not create provider-attempt records. Reviewer edits remain in memory and in explicit exports, not in these server records. If saving a successful generation fails, the response warns the reviewer to retain their export.

The [first real provider attempt](verification/2026-09-08-provider-attempt.json) is a selected, tracked copy of a failed run. No model output or usage was returned. Its contract hash reflects the source at that attempt, before subsequent source formatting. Do not overwrite this failure when access is fixed; preserve the next attempt separately.

## Checks and their limits

From the repository root:

```powershell
npm test -- --runInBand
npx tsc --noEmit
npx tsc --noEmit -p cypress/tsconfig.json
npx eslint src/lib/review-brief src/components/review-brief src/app/review-brief src/app/api/review-brief cypress/e2e/review-brief.cy.ts
npx cypress run --spec cypress/e2e/review-brief.cy.ts --browser electron --config baseUrl=http://127.0.0.1:3000
npm run build
node docs/hr-product-sprint/scripts/check-phase-2.cjs
node docs/hr-product-sprint/scripts/check-phase-2-wireframe.cjs
node docs/scripts/check-docs.cjs
```

Run the development server before Cypress. The [browser tests](../../../cypress/e2e/review-brief.cy.ts) use authored fixtures and explicitly mocked provider responses; they do not consume API calls or measure model quality. The [handler tests](../../../src/lib/review-brief/__tests__/handler.test.ts) inject provider behavior. The [review-state tests](../../../src/lib/review-brief/__tests__/review-state.test.ts) check validation, edit preservation, review invalidation and export fidelity.

The [Phase 3 report](../phases/03-prototype-build.md#verification-record) owns actual check results. Global legacy lint, a real interview/Firebase round trip, practitioner usability, human timing, fairness and AI quality are not established by these tests. The build still emits inherited optional `canvas`/PDF rendering warnings.

## Continue implementation or evaluation

Restore provider access and record a successful genuine run before demonstrating live AI. Then use the [Phase 4 acceptance and dataset plan](../design/acceptance-plan.md#phase-4-dataset-and-split), preserving all attempted outputs and failures. Do not count practice examples, mocked successes or software pass rates as model accuracy. Production access control, storage/retention policy, practitioner rubric calibration and ATS integration remain future handoff work.
