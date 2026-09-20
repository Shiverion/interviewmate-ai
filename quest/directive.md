# directive.md — Working instructions for the change

**Quest:** Make AI-Assisted Code Easier to Trust and Change
**Derived from:** `quest/intent.md` v3 (council-approved 2026-09-20)
**Repository:** `Shiverion/interviewmate-ai`, branch `quest/trust-and-change`, base `50fa2dc`
**Author:** Muhammad Iqbal Hilmy Izzulhaq · **Draft:** v3.2, 2026-09-21 — *initial directive, issued before implementation. Appendix B is an empty template until results exist.*

Two readers: the AI coding agent (Parts 1–6 are its instructions) and the human reviewer (Part 7). Parts 1–7 are frozen at the version the agent receives; any later edit is logged in Appendix A. Appendix B is filled once, after implementation.

---

## Part 1 — Objective

Move provider/key resolution for the transcript-evaluation flow out of the three route handlers into one pure module driven by explicit policy inputs, so that each route's current policy is preserved, exactly two behaviours change (Part 3), and one route-level harness proves how every route resolves for every reachable input — before and after.

## Part 2 — Context the agent needs

**Flow.** `POST /api/evaluate`, `POST /api/evaluate/scheduled`, `POST /api/demo/evaluate` each compute `{provider, key, fallbackKeys}` and call `assessEvidence(provider, key, transcript, configuration, { host, fallbackKeys, jobContext })` (`src/lib/ai/assess.ts`). `assessEvidence` returns a deterministic result without any provider call when the transcript has no eligible evidence; otherwise tries `provider` with `key`, then every provider in `fallbackKeys`, once each, skipping empty credentials. **An absent primary key is legal input** — today several paths pass `undefined` and rely on this.

**Catalog.** `src/lib/ai/catalog.ts`: `PROVIDERS` (`id`, `env`, `model`, …) for `openai`, `gemini`, `deepseek`; `isProvider()`. A provider is *configured* when `env[provider.env]?.trim()` is non-empty.

**Current per-route policy — preserve exactly; confirm against the code before writing anything:**

| Path | Primary credential | Fallback keys passed when | If requested provider is unconfigured | If no provider is configured |
|---|---|---|---|---|
| `evaluate`, caller key present (`x-ai-key`, or `x-openai-key` for openai) | caller key, **not trimmed by the route** | `x-ai-allow-fallback: true` → browser `x-ai-fallback-keys` (parsed **only** inside that branch, `:55-62`) | n/a — env is not consulted | n/a |
| `evaluate`, no caller key **and** `isVerifiedAdminRequest` (`hostedAdmin`, `:42`) | server key of `configured.find(requested) \|\| configured[0]` (`:47-48`) | always (`:55`): server keys of all configured, then browser keys merged **over** them (`:63-70`) | substitute `configured[0]` | proceed: provider = requested, key `undefined` (`:49-52`) |
| `evaluate`, no caller key, not admin | `undefined` | header as above | n/a | n/a |
| `scheduled` | server key of `configured.find(requested) \|\| configured[0]` (`:41-42`), trimmed (`:68`) | `body.allowFallback` (default `true`) → trimmed keys of all configured (`:61-65`), else `undefined` | **substitute — even when `allowFallback` is `false`** | `503` "No hosted evaluation provider is configured." (`:43-47`) |
| `demo`, reviewer `grant` | server key of `(configured.find(requested) \|\| configured[0])?.id \|\| "openai"` (`:42-46`), **untrimmed** (`:58`) | always (`:52`): every env value that is **truthy** (so whitespace-only counts), **untrimmed** (`:53-54`) | substitute | unreachable — `demoAvailability()` returns a message and the route answers `503` before this point unless `OPENAI_API_KEY` is non-empty after trim (`:32-33`, `ledger.ts:92`) |
| `demo`, no grant | `process.env[requested.env]`, **untrimmed**, possibly `undefined` — `body.provider` is used as-is (`:47`) | `body.allowFallback` (default `false`) → truthy env values untrimmed; **`{}` (an empty object, not `undefined`) when disabled** (`:51-55`) | **proceed** with `undefined` key; `assessEvidence` then returns the deterministic no-evidence result, falls back, or throws | unreachable, as above |

Accounting order in `demo` on every path: `ownedLease` → provider selection → `claimEvaluation` → `consumeReviewer` (grant only) → `assessEvidence` → `saveEvaluation` (`:38-72`).

**Reachability of change #1.** Substitution-despite-opt-out exists only on the `scheduled` path: `evaluate`'s substitution happens only under `hostedAdmin`, which forces fallback on; `demo`'s only under `grant`, which forces fallback on; `demo` without grant never substitutes. Change #1 therefore alters `scheduled` only. Change #2 alters `demo` only (`scheduled` and `evaluate` already trim server keys).

**Test conventions.** Jest via `next/jest`; `/** @jest-environment node */` for server code; route handlers are invoked directly with `new NextRequest(...)` and mocked dependencies — see `src/lib/demo/__tests__/routes.test.ts` for the pattern. `npm test` baseline: 25 suites, 191 tests.

## Part 3 — Scope and boundaries

**You may create or edit only:**
- `src/lib/ai/provider-resolution.ts` (new) and `src/lib/ai/__tests__/provider-resolution.test.ts` (new)
- `src/app/api/__tests__/evaluation-routes.test.ts` (new; the route harness, Part 5.2)
- `src/app/api/evaluate/route.ts`, `src/app/api/evaluate/scheduled/route.ts`, `src/app/api/demo/evaluate/route.ts` — the **resolution region** of each: the lines identified in the Part 2 table, the `assessEvidence` call's first two arguments and its `fallbackKeys` option (`scheduled:67-68`, `demo:57-58,63`, `evaluate:74-76,80`), the import block, and in `scheduled` one new error return. Nothing else in these files.
- `quest/agent-notes.md` (new; implementation note, Part 6) — the only file outside `src/` you may touch

**You must not edit:** `src/lib/ai/assess.ts`, `catalog.ts`, `evaluation.ts`; anything under `src/lib/access`, `src/lib/demo`, `src/lib/firebase`; `src/app/api/reviewer/**`; UI; config; `package.json`; any existing test. No new dependencies.

**Behaviour that changes — exactly these two:**
1. **`scheduled` refuses instead of substituting.** When `body.allowFallback === false` and the requested provider is not configured, respond `503` `{ error: "Requested evaluation provider is not configured and fallback is disabled." }` instead of using `configured[0]`. With `allowFallback: true`, substitution continues exactly as today.
2. **`demo` trims server keys** — primary and fallback — as the other two routes already do. Consequence, stated so it is not silent: an env value that is empty or whitespace-only is *unconfigured* after this change (omitted from `fallbackKeys`; primary key `undefined`), whereas today a whitespace-only value is passed as a credential.

**Everything else is preserved**, in particular: which paths get server vs caller keys; which paths pass fallback keys and from where; the browser-over-server merge in `evaluate`; the lazy parse of `x-ai-fallback-keys`; every existing error path, status and message; proceeding with an `undefined` primary key wherever the table says *proceed*; the `demo` accounting order; the `assessEvidence` argument shape; response shapes (no new fields). No new refusal is introduced on `evaluate` or `demo`.

## Part 4 — Requirements

### 4.1 Module contract

```ts
// src/lib/ai/provider-resolution.ts — pure; no I/O; reads env only via input.env; no logging
export type ResolutionPolicy =
  | { credentialSource: "caller"; callerKey: string | undefined;
      allowFallback: boolean; callerFallbackKeys?: Partial<Record<AIProvider, string>> }
  | { credentialSource: "server"; allowFallback: boolean;
      onUnconfigured: "substitute" | "proceed" | "refuse";
      onNoneConfigured: "proceed" | "refuse" };
export type ResolutionInput = { requested: AIProvider; policy: ResolutionPolicy;
  env: Record<string, string | undefined> };
export type Resolution =
  | { ok: true; provider: AIProvider; key: string | undefined;
      fallbackKeys: Partial<Record<AIProvider, string>> | undefined;
      substituted: boolean }     // for tests only; never surfaced in a response
  | { ok: false; reason: "no_provider_configured" | "provider_not_configured" };
export function resolveProvider(input: ResolutionInput): Resolution;
```

- **caller:** `provider = requested`, `key = callerKey` as given (may be `undefined`, not trimmed), `fallbackKeys = allowFallback ? callerFallbackKeys : undefined`, `substituted: false`. Never `ok: false`.
- **server:** `configured` = providers with non-empty trimmed env value, in `PROVIDERS` order. Precedence: (i) none configured → `onNoneConfigured === "refuse"` ? `no_provider_configured` : proceed with `provider = requested`, `key = undefined`. (ii) requested configured → use it, trimmed key. (iii) requested unconfigured → `substitute`: `configured[0]`, `substituted: true`; `proceed`: `provider = requested`, `key = undefined`; `refuse`: `provider_not_configured`. `fallbackKeys = allowFallback ? {trimmed key of every configured provider} : undefined`.

### 4.2 Route wiring (policy per path — these literals are the policy; do not compute them differently)

| Path | `policy` | `ok: false` mapping |
|---|---|---|
| `evaluate`, caller path | `{ credentialSource: "caller", callerKey: key, allowFallback: header === "true", callerFallbackKeys }` — parse `x-ai-fallback-keys` only when `allowFallback` (as today) | unreachable by type; keep the existing `catch` |
| `evaluate`, `hostedAdmin` | `{ credentialSource: "server", allowFallback: true, onUnconfigured: "substitute", onNoneConfigured: "proceed" }`, then in the route: `fallbackKeys = { ...result.fallbackKeys, ...browserKeys }` (browser over server, as today) | unreachable by construction; keep the existing `catch` |
| `scheduled` | `{ credentialSource: "server", allowFallback: body.allowFallback, onUnconfigured: body.allowFallback ? "substitute" : "refuse", onNoneConfigured: "refuse" }` | `no_provider_configured` → existing `503` message; `provider_not_configured` → the new `503` (change #1) |
| `demo`, grant | `{ credentialSource: "server", allowFallback: true, onUnconfigured: "substitute", onNoneConfigured: "proceed" }`; route passes `fallbackKeys: result.fallbackKeys ?? {}` (today always an object) | unreachable (`demoAvailability` gate); keep the existing `catch` |
| `demo`, no grant | `{ credentialSource: "server", allowFallback: body.allowFallback, onUnconfigured: "proceed", onNoneConfigured: "proceed" }`; route passes `fallbackKeys: result.fallbackKeys ?? {}` | unreachable by construction |

In `demo`, call `resolveProvider` exactly where `selectedProvider` is computed today, so `claimEvaluation`/`consumeReviewer` ordering is untouched. In `demo`, keep passing `selectedProvider` to `claimEvaluation` (it ignores it, but the call must not change).

## Part 5 — Tests the agent must write (all deterministic; no network; `@jest-environment node`)

**5.1 Resolver contract** — `src/lib/ai/__tests__/provider-resolution.test.ts`. A table over the five policy literals in 4.2 × `requested ∈ {openai, gemini, deepseek}` × env fixtures `{none, openai only, gemini only, all, all with whitespace-padded values, one whitespace-only value, one empty-string value}` (× `callerKey ∈ {"k", undefined}` for the caller policy). Whitespace-only and empty values are *unconfigured* in every server policy. Every row asserts the full `Resolution`. **This table is the policy and must be approved by the human before Parts 4.2 and 5.2 are implemented (Part 7).**

**5.2 Route harness** — `src/app/api/__tests__/evaluation-routes.test.ts`. Invoke each route's `POST` with `NextRequest`, mocking (with `jest.mock` + `jest.requireActual` for everything not listed): `@/lib/ai/assess` (`assessEvidence` → records its arguments, returns a fixed result), `@/lib/firebase/server-auth` (`isVerifiedAdminRequest`), `@/lib/firebase/scheduled-session` (`requireScheduledSession` → a session whose `ref.update` is a `jest.fn()`, since `scheduled:77` writes to it), `@/lib/access/reviewer` (`requestReviewer`, `consumeReviewer`), `@/lib/demo/ledger` (`demoAvailability` → reproduce the real gate: message when `OPENAI_API_KEY` is empty after trim, else `null`; `ownedLease`, `claimEvaluation`, `saveEvaluation`), `@/lib/demo/http` (`visitor` only — `reply`, `sameOrigin`, `limitedJson` real). Requests must pass `sameOrigin` (set the `origin` header to the request origin). Transcript fixture must contain eligible evidence so `assessEvidence` would be called. Add one `no-evidence` case per route that uses the **real** `assessEvidence` with `@/lib/ai/evaluation` mocked, and asserts `evaluateWithProvider` is never called and the response is 2xx — this pins the deterministic short-circuit. Normalized observable output per case: `{ status, provider, key, fallbackKeys }` where the last three are what `assessEvidence` received (or `null` on a non-2xx). Cases: every *reachable* row of the Part 2 table × env fixtures as in 5.1 × (`allowFallback` true/false where the path has it) × for `evaluate`: caller key via `x-ai-key` / via `x-openai-key` (openai only) / absent, admin true/false, browser fallback keys present (including an empty-string value, which must override the server value) / absent / **malformed JSON with *effective* fallback off — header not `"true"` and not `hostedAdmin` — (must be ignored — pins the lazy parse) and with effective fallback on (must fail exactly as today; note `hostedAdmin` parses the header even without the `true` header)**. An absent header parses as `{}` as today. Non-2xx cases also assert the response body's `error` string. Each case is tagged `preserved`, `fix-1` or `fix-2`; expectations are the **intended** post-change behaviour.

**5.3 Baseline capture (measured "before").** Commit H = the new module (4.1), 5.1 and 5.2, on top of `50fa2dc`, with **zero edits to the three routes** (the module is inert until wired). Because the harness exercises the unmodified routes, H is the baseline. Run `npx jest src/app/api/__tests__/evaluation-routes.test.ts --json` at H and record `numFailedTests` and the list of failing case names in `quest/agent-notes.md`. The expected outcome is that exactly the `fix-1` and `fix-2` cases fail and every `preserved` case passes; if any `preserved` case fails at H, **stop** — the Part 2 table is wrong. Reproduction command for Appendix B: `git checkout <H> && node node_modules/jest/bin/jest.js src/app/api/__tests__/evaluation-routes.test.ts --json | jq .numFailedTests` (`npx` did not resolve on the author's Windows shell; invoking the binary directly is what was actually run — see `agent-notes.md`).

**5.4 Provider attempts.** In the harness, one extra case per path: mock `@/lib/ai/evaluation` (`evaluateWithProvider`) instead of `assessEvidence` (real `assessEvidence` runs), transcript with eligible evidence, script every call to reject, and assert the attempt sequence equals the oracle `assess.ts:30-42` defines: `[provider, ...PROVIDERS.map(p => p.id).filter(id => id !== provider && fallbackKeys?.[id])]` with any choice whose credential is empty skipped (not attempted). Record attempts per path before (at H) and after; they must be equal for `preserved` cases.

**5.5 Accounting order.** For `demo` (grant and no-grant, allowFallback true/false): assert the call order `ownedLease → claimEvaluation → consumeReviewer? → assessEvidence → saveEvaluation` is identical before (at H) and after.

**5.6 Named fix tests.** In 5.2, one case titled `fix-1: scheduled refuses when fallback disabled and provider unconfigured` and one titled `fix-2: demo trims server keys`.

**5.7 Existing suite** passes unchanged.

## Part 6 — Completion criteria and working rules

- [ ] **Gate:** deliver 5.1 and the case list of 5.2 first; do not implement 4.2 until the human has approved them (Part 7). Stop and ask if unsure whether approval was given.
- [ ] Commit H exists — the module, 5.1 and 5.2, **zero route edits** (as 5.3 defines) — with the baseline numbers in `quest/agent-notes.md`; then one commit per route. Each message names what it preserves and which fix (if any) it applies.
- [ ] `resolveProvider` per 4.1; three routes per 4.2; `git diff --stat 50fa2dc` lists only files from Part 3.
- [ ] 5.1–5.7 pass; `npm test`, `npm run lint`, `npx tsc --noEmit` clean.
- [ ] `quest/agent-notes.md`: assumptions, anything in Part 2 found inaccurate, anything not verified, baseline numbers with the exact commands.
- [ ] Stop and ask instead of guessing when: a `preserved` case fails at H; a change would touch a forbidden file; an existing test fails for an unrelated reason; the Part 2 table and the code disagree.
- No reformatting of untouched lines; no renames outside the listed lines; no Quest narration in code comments.

## Part 7 — Review responsibilities (human)

**Before implementation:** I review the 5.1 table and the 5.2 case list as *the policy*. Disagreement is resolved in `quest/decision-record.md`, not in code.

**Per commit, in order:** (1) files touched ⊆ Part 3, else reject; (2) each route diff, viewed with `git diff -w`, contains hunks only inside that route's resolution region as defined in Part 3; (3) `demo` accounting call lines are byte-identical; (4) `assessEvidence` call shape unchanged; (5) the 5.2 tags are right — nothing tagged `preserved` encodes a behaviour change; (6) `quest/agent-notes.md` explains every deviation; unexplained deviation → reject.

**Rejection rule.** Output that changes behaviour outside Part 3's two fixes, edits a forbidden file, adds a dependency, or edits an existing test is rejected, not patched. At least one rejected or corrected output is recorded verbatim with its risk in Appendix B.5; if none occurs, that is stated.

**Quality yardstick** (pass/fail; also used in the decision record):

| # | Yardstick | Pass when |
|---|---|---|
| Y1 | Behaviour preservation | All `preserved` cases pass at H and after; only `fix-1`/`fix-2` cases flip |
| Y2 | One decision site | `grep -rn "configured\[0\]\|configured.find" src/app/api/evaluate src/app/api/demo/evaluate` → 0 hits; the only env-based provider choice is in `resolveProvider` |
| Y3 | Readable diff | Per route, `git diff -w --stat 50fa2dc -- <route>` ≤ 50 changed lines and check (2) above holds |
| Y4 | Explicit policy | Each path's `policy` is a literal matching 4.2, not derived elsewhere |
| Y5 | Deterministic tests | 5.1–5.6 pass with network disabled and with `--runInBand`; no timers |
| Y6 | Scope | Y2 plus `git diff --stat 50fa2dc` ⊆ Part 3 |
| Y7 | Reproducible | Every number in Appendix B has a command and a commit sha |

---

## Appendix A — Directive change log

| Version | Date | Change | Reason |
|---|---|---|---|
| v1 | 2026-09-20 | Initial draft | — |
| v3.2 | 2026-09-21 | 5.3 reproduction command changed from `npx jest` to the `node node_modules/jest/bin/jest.js` invocation that actually ran; no instruction changed | Third-reviewer cold read (fresh-context Opus): a reproduction command that never ran is not a reproduction command |
| v3.1 | 2026-09-20 | Part 6 aligned with 5.3 (H = module + tests, zero route edits); oracle uses provider ids; no-evidence cases use real `assessEvidence`; malformed-header cases keyed to *effective* fallback permission; Appendix B baseline numbers carry their command and revision | Council round 3 (Codex): two residual inconsistencies |
| v3 | 2026-09-20 | `demo` keeps passing an object for `fallbackKeys` (`?? {}`); whitespace-only/empty env values pinned as unconfigured under fix-2; attempt oracle corrected to `assess.ts:30-42` semantics; commit H = module + tests, zero route edits; permitted edit regions widened to imports and `assessEvidence` arguments; harness mocks completed (`visitor`, `session.ref.update`, availability gate reproduction, `sameOrigin`); cases added (whitespace-only, empty, malformed header on/off, `x-openai-key`, no-evidence, error bodies); table citations corrected | Council round 2 (Codex, Kimi): v2's contract would have failed a `preserved` demo case at H; oracle and mock list were incomplete |
| v2 | 2026-09-20 | Contract gained `onUnconfigured`/`onNoneConfigured` and an optional key; removed the `missing_caller_key` refusal; change #1 stated as `scheduled`-only, `demo` no-grant path preserved as *proceed*; baseline capture replaced by a real-handler harness committed first (H); added attempt-count and accounting-order tests; `quest/agent-notes.md` carved out; approval gate added to Part 6; Y2/Y3/Y5 made reproducible | Council round 1 (Codex, Kimi): v1's resolver would have introduced new refusals on `evaluate` and a substitution on `demo` no-grant — both outside intent §5's two changes; v1's baseline method was not reproducible |

## Appendix B — Results and handoff *(template; empty until implementation is complete — nothing below is a result yet)*

### B.1 Artifacts
- Repository and branch: `https://github.com/Shiverion/interviewmate-ai/tree/quest/trust-and-change` — *access to be verified before submission*
- Focused diff: `git diff 50fa2dc..<final-sha> -- src/lib/ai/provider-resolution.ts src/app/api/evaluate src/app/api/demo/evaluate` — *sha pending*
- Tests: `src/lib/ai/__tests__/provider-resolution.test.ts`, `src/app/api/__tests__/evaluation-routes.test.ts` — *pending*
- Decision record `quest/decision-record.md`; review example `quest/review-example.md`; handoff note and checklist `quest/handoff.md`; agent notes `quest/agent-notes.md` — *pending*
- Loom — *pending*

### B.2 Reproduction steps
1. `git clone … && git checkout <final-sha> && npm ci && npm test`
2. Baseline suite: `git checkout 50fa2dc && node node_modules/jest/bin/jest.js --ci` → expect 25 suites / 191 tests (time is machine-dependent; 21.05 s was one run)
3. Baseline violations: `git checkout <H> && node node_modules/jest/bin/jest.js src/app/api/__tests__/evaluation-routes.test.ts --json | jq .numFailedTests`
4. After: same command at `<final-sha>` → expect 0

### B.3 Checks and actual results

| Check | Baseline | After | Kind |
|---|---|---|---|
| Route-harness cases failing (`fix-1` + `fix-2` expected at H; `preserved` expected 0) | *pending @ H* | *pending @ final* | measured |
| Provider attempts under scripted primary failure, per path (5.4) | *pending* | *pending* | measured |
| `demo` accounting call order (5.5) | *pending* | *pending* | measured |
| Env-based provider choice sites in the three routes (Y2 grep) | *pending @ 50fa2dc* | *pending* | measured |
| Tests naming the resolution logic | 0 files | *pending* | measured |
| `npm test` suites / tests / time | 25 / 191 / 21.05 s (`npx jest --ci` at `50fa2dc`, single run 2026-09-20, Node v24.11.1 — `intent.md` §12-4) | *pending* | measured |
| Time for one bounded policy change (handoff exercise) | *pending, n = 1* | *pending, n = 1* | measured, single run |

### B.4 AI contribution and human decisions — *pending*
### B.5 Corrected or rejected AI output — *pending (verbatim excerpt, what was wrong, risk, replacement)*
### B.6 Handoff exercise — *pending (task, who performed it, time, gaps found; if only me, stated as a limitation)*
### B.7 Limitations — *pending (at minimum: single-run timings; no production telemetry; reviewer routes not migrated)*
### B.8 Actual effort — *pending (hours by activity vs 6–8 h budget)*
