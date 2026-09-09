# Phase 3: prototype build

Status: **In progress — runnable prototype implemented; successful live generation verification pending provider access.**

Updated: 2026-09-08 (Asia/Jakarta). Planned allocation: 8 hours; actual hours not recorded.

[Documentation home](../../README.md) · [Previous phase](02-solution-design-and-ai-logic.md) · [Sprint index](../README.md) · [Next phase](04-evaluation-and-iteration.md)

## Outcome and deliverables

The local [review workspace](http://127.0.0.1:3000/review-brief) implements synthetic transcript input, four evidence criteria, exact candidate quotations, source inspection, corrections, review confirmation and JSON/text exports. It reuses the existing Next.js/React application, theme tokens and installed AI SDK. It has its own development-only page and API, outside the recruiter login/key gates.

The [runbook and source map](../implementation/review-brief-runbook.md) is the canonical setup and maintenance guide. The [Phase 2 package](../design/README.md) remains the design reference; the [backlog](../implementation/phase-3-backlog.md) maps delivered behavior to B01–B06.

An actual synthetic request reached the provider and returned **HTTP 503 / AI_UNAVAILABLE**. The configured server key or requested model was rejected; the adapter intentionally does not expose provider error text. The [original failed attempt](../implementation/verification/2026-09-08-provider-attempt.json) is preserved. No live model draft, quality measurement or time-saving result is claimed. Authored examples are fully interactive and permanently labelled.

## Implemented behavior

| Area | Result | Main source |
|---|---|---|
| Input and role | Three practice transcripts, JSON import, fixed role confirmation, strict synthetic format and limits | [Workspace](../../../src/components/review-brief/ReviewBrief.tsx), [contract](../../../src/lib/review-brief/contract.ts) |
| AI boundary | Server-only key, pinned model, structured output, exact citation validation, one call per explicit attempt and 30-second deadline | [Server adapter](../../../src/lib/review-brief/server.ts), [handler](../../../src/lib/review-brief/handler.ts) |
| Evidence review | Full transcript context; both turns highlighted for conflicts; unknowns and follow-ups remain visible | Workspace above, [styles](../../../src/components/review-brief/review-brief.module.css) |
| Corrections | Text/status/gap edits, claim removal/restore with stable IDs, preserved original, no editable source references | [Review state](../../../src/lib/review-brief/review-state.ts) |
| Attestation and handoff | Four checks plus reviewer ID; edits invalidate review; export only the current reviewed revision | Review state above |
| Failures | Sanitized errors and attempt IDs; invalid drafts rejected in full; explicit retry/cancel; stale responses ignored | Handler and workspace above |
| Provenance | Canonical input/role/prompt/contract hashes, source type, actual model metadata when available, original and reviewed export | [Types](../../../src/lib/review-brief/types.ts), server adapter |
| Local boundary | No Firebase dependency for this flow; production page/API return 404 | [Page](../../../src/app/review-brief/page.tsx), [API](../../../src/app/api/review-brief/route.ts) |

Attempt records are local ignored synthetic generation records. Reviewer edits live in browser memory until explicit export; no Firestore writes or changes to the inherited scoring evaluator were introduced. The runbook explains exact records, hashes, input limits, filenames and how to keep runtime/design copies aligned.

## Verification record

Executed on Windows with Node 24.11.1 and the repository's installed dependencies. Software checks use authored fixtures and injected/mocked provider behavior unless explicitly identified as the real attempt.

| Check | Actual result | Practical limit |
|---|---|---|
| Default Jest discovery | **36 tests passed across 3 suites**: 32 new behavior tests and 4 inherited scoring tests | No model-quality claim |
| TypeScript | Application and separate Cypress projects passed | Separate Jest/Cypress matcher environments |
| Scoped ESLint | New feature, routes and browser spec passed | Full inherited application lint not claimed clean |
| Production build | Passed | Existing optional canvas/PDF rendering warnings remain |
| Development startup | Turbopack started; review page returned HTTP 200 with Firebase API key blank | Existing installed dependencies; no fresh install or full interview/Firebase flow |
| Production boundary | Actual GET page and POST API both returned HTTP 404 on the built server | Local production-mode check, not deployment verification |
| Browser workflow | **7 browser tests passed** in Electron: import, mock success/hash mismatch, source/edit/export, restore/invalidation, conflict/mobile, failure retention and cancel | Authored fixtures and mocked transport; not practitioner usability or model evidence |
| Real provider request | One attempt returned 503 / AI_UNAVAILABLE; no draft opened | Provider access must be repaired before a genuine live demo |
| Phase 2 preservation / documentation | **30 offline contract and 18 wireframe checks passed**; all documentation links/anchors resolve | Historical baseline and practice source text remain separate |

Meaningful checks cover byte limits, malformed/duplicate/no-candidate requests, invalid quotes/speakers, timeout/cancellation, explicit errors, provenance matching, source focus, edits, removals/restores, review invalidation and export fidelity. Unknown-speaker context is warned about and cannot support a candidate claim. A valid quote still does not prove semantic support; that remains a human review task. Source focus and return, narrow layout and export interactions were checked; a full keyboard/screen-reader audit, 200% browser zoom and other browsers were not tested.

## Stabilization and implementation decisions

- Pinned Turbopack and output tracing to this repository, addressing the previously inferred parent-root startup problem.
- Excluded the nested local worktree from Jest/TypeScript/ESLint and split Cypress typing from Jest. No new dependency was required.
- Made the [Firebase proxy](../../../src/lib/firebase/config.ts) tolerate React's `$typeof` inspection and changed the [auth provider](../../../src/components/providers/AuthProvider.tsx) no-configuration message to a warning. Optional Firebase now produces explanatory warnings instead of false runtime errors.
- Kept the shared [theme provider](../../../src/components/providers/ThemeProvider.tsx) child tree stable while applying the saved theme; replacing its wrapper remounted the workspace and lost an early selection in the mobile browser check. The regression now passes.
- The new export names include transcript ID and revision. Content edits clear the relevant criterion check; reviewer identity and note changes clear all checks because the attestation has changed.
- Kept voice, resume ranking, database persistence and the existing seven-score reports outside this prototype path.
- Retained the original failed provider record. Authored examples are an explicit separate action, never a fallback presented as AI success.

The repository's pre-existing Firebase configuration/rule edits and local agent work were left untouched. Inherited permission, candidate-entry and voice observations remain documented in the [source baseline](../evaluation/current-product-baseline.md) and [local development guide](../../product/local-development.md).

## Candidate session-integrity extension

**Current behavior, 2026-09-09:** [pause/warning/recovery policy](../implementation/session-integrity.md) supersedes the earlier nonterminating defaults below. The full-screen modal pauses transport and time after one second hidden, warns on the second interruption or six seconds continuously away, and ends on the third or fifteen seconds away. Same-browser recovery retains answers/time and replaces the interrupted question. The [current verification record](../implementation/verification/2026-09-09-session-control-checks.json) separates mocked/software checks from unverified live voice and hosted persistence.

The following paragraphs record earlier iterations:

Added [deterministic guardrails](../implementation/session-integrity.md) to the actual interview room: pre-start notice, active-only visibility/focus monitoring, a 10-second grace period, warnings at three counted events and human-review suggestion at five, without termination or score penalties. Candidates can provide structured context. Recruiter report display/export and a separate completion-save attempt are implemented; live Firebase persistence and anti-tamper guarantees are not established. The local rehearsal requires no AI key. This is separate from the frozen synthetic review-brief experiment.

[Verification record](../implementation/verification/2026-09-08-session-integrity-checks.json): 84 Jest checks passed across eight suites, including 19 guardrail checks; four guardrail browser checks passed. Build and scoped lint passed. The rehearsal returned 200 in development and 404 in production.

The alert follow-up adds a dismissible English/Indonesian pop-up for each new counted event and an optional local chime with preview/mute. The interview remains active. See [alert behavior and manual checks](../implementation/session-integrity.md#return-to-page-alerts).

The return-visibility fix removes the keyboard-focus prerequisite for closing a hidden interval. The rehearsal also shows monitoring off, a ten-second countdown, and readiness; [Phase 4](04-evaluation-and-iteration.md#session-integrity-software-verification) records the reproduced regression and verification limits.

## Exit criteria

- [x] Core feature runs with clearly labelled synthetic data.
- [x] Interactive prototype has a detailed AI behavior specification and a server implementation.
- [x] Reviewer can trace claims, identify unknowns and correct the brief.
- [x] Errors do not produce fabricated success states.
- [x] Setup and development/production boundaries are documented with executed checks.
- [x] Changed files and inherited functionality are distinguished.
- [x] Record the final browser/check results below.
- [ ] Demonstrate a successful genuine AI generation with retained provenance.

## Open items and next action

Configure a server key with access to the pinned model, restart the loopback development server, and explicitly generate a new synthetic attempt. Keep its record alongside the failed attempt and inspect the claims for support. [Phase 4](04-evaluation-and-iteration.md) has now prepared its frozen dataset and runner, but its first live batch also stopped on AI_UNAVAILABLE. Do not report software pass rates as model accuracy.

Human timing and recruiter validation remain pending. A five-minute recorded demo and final case study remain Phase 5 work. No production deployment is included.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created build tracker and carried forward inherited risks | No new prototype behavior or repaired checks claimed |
| 2026-09-08 | Received completed Phase 2 design package and six-task backlog | Ready to build; authored wireframe and offline checks do not complete product implementation |
| 2026-09-08 | Implemented the separate local review workspace, API, validators, review state and exports | Runnable synthetic workflow; provider calls remain server-side |
| 2026-09-08 | Executed first real provider attempt | AI_UNAVAILABLE; retained original failure and did not substitute authored output |
| 2026-09-08 | Stabilized startup/discovery/typing and checked production boundary | Jest, TypeScript and build passed; production page/API returned 404 |
| 2026-09-08 | Finished seven browser checks and inspected desktop/mobile screenshots | Fixed theme-triggered early selection reset and versioned export names; authored/mocked evidence only |
