# directive.md — Working instructions for the change

**Quest:** Make AI-Assisted Code Easier to Trust and Change
**Derived from:** `quest/intent.md` v3 (council-approved 2026-09-20)
**Repository:** `Shiverion/interviewmate-ai`, branch `quest/trust-and-change`, base `50fa2dc`
**Author:** Muhammad Iqbal Hilmy Izzulhaq · **Draft:** v3.6, 2026-09-23 — *Parts 1–7: the directive as issued before implementation (frozen at v3.1; later edits logged in Appendix A). Appendix B: results and handoff, filled after implementation.*

Two readers: the AI coding agent (Parts 1–6 are its instructions) and the human reviewer (Part 7). Parts 1–7 are frozen at the version the agent receives; any later edit is logged in Appendix A. Appendix B is filled once, after implementation.

---

## Part 1 — Objective

Move provider/key resolution for the transcript-evaluation flow out of the three route handlers into one pure module driven by explicit policy inputs, so that each route's current policy is preserved, exactly two behaviours change (Part 3), and one route-level harness shows how every route resolves across a finite fixture set covering each reachable policy path (Part 5.2) — before and after.

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
| v3.6 | 2026-09-23 | B.1: Loom recorded and linked; B.8: final human effort 6 h | Submission |
| v3.5 | 2026-09-22 | B.1: branch pushed, link access recorded; B.2 step 1 qualifier removed | Push |
| v3.4 | 2026-09-22 | Part 1: "proves … every reachable input" → "shows … across a finite fixture set covering each reachable policy path"; Appendix B preamble corrected; B.1 Loom row now carries the recording outline | Final panel (astra, Opus, Kimi): coverage overclaim; preamble wrong; Loom had a label, not a plan |
| v3.3 | 2026-09-22 | Appendix B filled with results; Parts 1–7 unchanged | Implementation, review and handoff complete |
| v3.2 | 2026-09-21 | 5.3 reproduction command changed from `npx jest` to the `node node_modules/jest/bin/jest.js` invocation that actually ran; no instruction changed | Third-reviewer cold read (fresh-context Opus): a reproduction command that never ran is not a reproduction command |
| v3.1 | 2026-09-20 | Part 6 aligned with 5.3 (H = module + tests, zero route edits); oracle uses provider ids; no-evidence cases use real `assessEvidence`; malformed-header cases keyed to *effective* fallback permission; Appendix B baseline numbers carry their command and revision | Council round 3 (Codex): two residual inconsistencies |
| v3 | 2026-09-20 | `demo` keeps passing an object for `fallbackKeys` (`?? {}`); whitespace-only/empty env values pinned as unconfigured under fix-2; attempt oracle corrected to `assess.ts:30-42` semantics; commit H = module + tests, zero route edits; permitted edit regions widened to imports and `assessEvidence` arguments; harness mocks completed (`visitor`, `session.ref.update`, availability gate reproduction, `sameOrigin`); cases added (whitespace-only, empty, malformed header on/off, `x-openai-key`, no-evidence, error bodies); table citations corrected | Council round 2 (Codex, Kimi): v2's contract would have failed a `preserved` demo case at H; oracle and mock list were incomplete |
| v2 | 2026-09-20 | Contract gained `onUnconfigured`/`onNoneConfigured` and an optional key; removed the `missing_caller_key` refusal; change #1 stated as `scheduled`-only, `demo` no-grant path preserved as *proceed*; baseline capture replaced by a real-handler harness committed first (H); added attempt-count and accounting-order tests; `quest/agent-notes.md` carved out; approval gate added to Part 6; Y2/Y3/Y5 made reproducible | Council round 1 (Codex, Kimi): v1's resolver would have introduced new refusals on `evaluate` and a substitution on `demo` no-grant — both outside intent §5's two changes; v1's baseline method was not reproducible |

## Appendix B — Results and handoff

*Filled 2026-09-22 after implementation. Every number below is measured unless labelled otherwise; each has a command or a file where it can be checked. Parts 1–7 above are the instructions the agents received (v3.1); the two later wording edits — a reproduction command (v3.2) and the Part 1 coverage phrase (v3.4) — are logged in Appendix A and changed no instruction. Where this appendix says "the author", it means Iqbal; where it says "Claude", the orchestrating session.*

### B.1 Artifacts

All paths are relative to the repository root on branch `quest/trust-and-change`. GitHub: `https://github.com/Shiverion/interviewmate-ai/tree/quest/trust-and-change` — first pushed 2026-09-22 at `b3822c3` and kept current since (the Loom link and this note are later commits); the repository is public. Unauthenticated `curl` returned HTTP 200 for the branch, `quest/intent.md`, `quest/directive.md`, the compare view `…/compare/50fa2dc...quest/trust-and-change`, and a raw file; the author additionally opens each link from a logged-out browser before submitting.

| Artifact | Where |
|---|---|
| Runnable repository | the branch; `npm ci && node node_modules/jest/bin/jest.js --ci` |
| Focused production diff | `git diff -w 50fa2dc..e5bd47b -- src/` (6 files: the resolver, its test, the harness, the three routes; routes 37 / 44 / 46 changed lines; resolver 89 lines new). Production files only: `… -- src/lib/ai/provider-resolution.ts src/app/api/evaluate src/app/api/demo/evaluate` (4 files) |
| Automated checks | `src/lib/ai/__tests__/provider-resolution.test.ts` (214 cases), `src/app/api/__tests__/evaluation-routes.test.ts` (735 cases); results in B.3 and `quest/agent-notes.md` |
| Code-review example | `quest/review-example.md` (two corrections; rejected patch in `quest/council/rejected-evaluate-route-v1.patch`) |
| Decision record | `quest/decision-record.md` |
| Quality metrics and handoff note | `quest/handoff.md` (§3 metrics; §1–§2 context and checklist; §4.4 the performed exercise) |
| Problem selection | `quest/intent.md` |
| Agent instructions and review method | this file (Parts 1–7); `quest/agents.md`; every review brief in `quest/council/briefs/`; every critique in `quest/council/` |
| Implementation record | `quest/agent-notes.md` |
| Effort | `quest/effort-log.md` |
| Loom (required deliverable) | https://www.loom.com/share/ef993e4a2f6f4261a9e2af2946f12523 — recorded 2026-09-23, ≤ 5 min. Script and screen cues: `quest/loom-script.md`. In order: why this problem ranked first; the five-literal policy table and the two intended changes; the route diff; the baseline-at-H and after results; the AI patch rejected with green tests; who decided what; the handoff exercise including the duplicated-rows finding; the limitations. |

### B.2 Reproduction steps

1. `git clone https://github.com/Shiverion/interviewmate-ai && cd interviewmate-ai && git checkout quest/trust-and-change && npm ci`
2. Whole suite after: `node node_modules/jest/bin/jest.js --ci` → 27 suites / 1140 tests passing.
3. Baseline suite before: `git checkout 50fa2dc && node node_modules/jest/bin/jest.js --ci` → 25 suites / 191 tests (machine time varies; one run was 21.05 s).
4. Baseline harness violations at H: `git checkout d09182e && node node_modules/jest/bin/jest.js src/app/api/__tests__/evaluation-routes.test.ts --json | jq .numFailedTests` → `32` (7 `fix-1` + 25 `fix-2`; 0 `preserved`).
5. After: same command at `e5bd47b` or later → `0`.
6. Decision sites: `grep -rnE 'configured\[0\]|configured\.find|\?\.id \|\| "openai"|process\.env\[' src/app/api/evaluate src/app/api/demo/evaluate` → no output after; 13 lines at `50fa2dc` (`git grep` with the same pattern and revision).
7. The handoff exercise: `quest/handoff.md` §4.1–4.3; worktree setup is described there.

(`npx` did not resolve on the author's Windows shell; the `node node_modules/…` forms are what was actually run.)

### B.3 Checks and actual results

| Check | Baseline | After | Kind |
|---|---|---|---|
| Route-harness cases failing (`preserved` / `fix-1` / `fix-2`) | 0 / 7 / 25 at H (`d09182e`), harness on unmodified routes | 0 / 0 / 0 at `e5bd47b` | measured |
| Route harness total | 735 cases (703 `preserved`, 7 `fix-1`, 25 `fix-2`) | same, all passing | measured |
| Resolver contract test | — (module did not exist) | 214 / 214 | measured |
| Provider attempts under scripted primary failure, per path | measured at H: evaluate caller `gemini, deepseek`; hosted-admin `gemini, deepseek`; evaluate no-key `deepseek`; scheduled `deepseek, openai, gemini`; demo grant `openai`; demo no-grant `openai` | identical on every `preserved` path | measured (`agent-notes.md`) |
| `demo` accounting call order | `ownedLease → claimEvaluation → consumeReviewer? → assessEvidence → saveEvaluation` | identical | measured (harness) |
| Env-based provider-choice sites in the three routes | 3 (by inspection: two `\|\| configured[0]`, one `?.id \|\| "openai"`) | 0 in the routes; 1 in `resolveProvider` | measured (grep / inspection) |
| Test files naming the three routes | 0 | 2 | measured |
| Whole suite | 25 / 191 / 21.05 s | 27 / 1140 / 12.6 s (one recorded run; machine-dependent) | measured, times single-run |
| `tsc --noEmit`, eslint on changed files | — | clean | measured |
| Per-route changed lines (`git diff -w --stat`) | — | scheduled 37 · demo 44 (40 + a 4-line comment) · evaluate 46; yardstick Y3 ≤ 50 | measured |
| Handoff exercise, wall time, self-performed, n = 1 | 7 m 08 s at `50fa2dc` | 16 m 27 s at `2b1ae0f` | measured, descriptive only (`handoff.md` §4.4) |
| Handoff exercise, fresh-agent probe (Sonnet), n = 1 each | 5 m 52 s, 30 tool calls | 6 m 17 s, 29 tool calls | measured, agent-proxy, not human feedback (`handoff.md` §4.5) |

Yardsticks Y1–Y7 (Part 7): all pass — evidence per item in `decision-record.md` §5. Y7 ("every number in Appendix B has a command") is satisfied by this appendix's B.2 and the cited files.

**Reach of fix-1 (a limitation on user impact, found after implementation):** the only in-repo client of `/api/evaluate/scheduled` always sends `allowFallback: true` (`src/app/(public)/interview/page.tsx:330-332`), so the new refusal protects direct API callers, not today's UI. `intent.md` §6's user-impact score of 4 for this problem was given before this was known.

### B.4 AI contribution and human decisions

| Who | Did | Record |
|---|---|---|
| Iqbal (human) | Chose the problem and repository; set the rules (three review rounds, unanimity, model tiering, three independent reviewers); approved the contract table before any route edit (`e25d63e`); read the resolver and the three route diffs; reviewed `review-example.md` as a reader and made four edits; performed the handoff exercise (`handoff.md` §4.4), whose findings changed `handoff.md` §1.4 and added `decision-record.md` follow-up 8; corrected the orchestrator's overclaim that the refactored system would "catch" a wrong edit; signed the review example | `effort-log.md` decisions 1–13; `review-example.md` "Who decided what"; `handoff.md` §4.4 |
| Claude Opus 5 (orchestrating session) | Drafted every document; built every review bundle; ran the Part 7 per-commit checklist on each implementer diff; diagnosed the harness realm failure and made the one-line correction; sent back the duplicated-schema route edit; made every commit | `quest/agent-notes.md`; commit messages |
| Codex `gpt-6-astra` | Reviewed `intent.md`, `directive.md` and the production diff; implemented commit H (resolver, contract tests, harness) — stopped correctly under the stop rule when 701 `preserved` cases failed | `d09182e`; `quest/council/*-codex.md` (early rounds); `agent-notes.md` attempt 1 |
| Codex `gpt-5.6-luna` (xhigh) | Implemented the three route commits; first `evaluate` version sent back | `0d88121`, `a800008`, `1a1a920`; `quest/council/luna-job-reports.md` |
| Codex `gpt-5.6-sol` (xhigh) | Reviewer from `decision-record.md` on, after astra's quota ran out | `quest/council/dr-re-*`, `handoff-*`, `agents-*` |
| Kimi K3 | Reviewer throughout | `quest/council/*-kimi.md` |
| Fresh-context Claude Opus 5 (separate subagents) | Third independent reviewer from `handoff.md` on; one retro cold read of the four earlier documents | `quest/council/retro-coldread-opus.md`, `*-opus.md` |
| Claude Sonnet (two fresh subagents) | The agent-proxy handoff probes | `handoff.md` §4.5; `quest/council/briefs/80-*` |
| ChatGPT (separate sessions, Iqbal's) | Second opinions on `review-example.md` and on the exercise design; help tracing the provider flow and diagnosing a syntax error during the self-performed exercise | `review-example.md` v4 change log; `handoff.md` §4.4 "Exercise mode"; `quest/council/exercise-council.md` |

The drafting session's approval never counted as a review. Panel size: two independent reviewers for the first four documents and the code review; three from `handoff.md` on, plus one retro pass over the earlier four (`quest/council/README.md`).

### B.5 Corrected or rejected AI output

Two during implementation, both with durable sources — `quest/review-example.md`:

1. **Rejected:** luna's first `evaluate` route edit duplicated the fallback-key zod schema across two branches (63 changed lines; passed every test). Sent back with a target shape; the accepted version has one schema and one resolver call (46 lines). Patch: `quest/council/rejected-evaluate-route-v1.patch` (extracted verbatim from the Codex session rollout). Risk: reintroducing the exact drift pattern the change exists to remove.
2. **Corrected:** astra's harness compared `response.json()` bodies with `toStrictEqual`; 701 `preserved` cases failed with `serializes to the same string`. The agent stopped under the directive's rule; Claude changed one line to parse the body in the test file. Risk: a meaningless baseline number, or pressure to loosen assertions.

Document-level corrections — including two cases where a reviewer was wrong and one where the orchestrator overclaimed — are catalogued in `quest/council/README.md` and `quest/agents.md` §5.

### B.6 Handoff exercise

Task, expected footprint and worktrees: `handoff.md` §4.1–4.3. Performed by the author on 2026-09-22, self-performed, AI-assisted (ChatGPT for tracing and diagnosis), BEFORE then AFTER: 7 m 08 s → 16 m 27 s; 1 file → 3 files; confidence moderate → high at completion → partially falsified post-review when a +42 resolver-test count revealed a duplicated hand-mirrored block that every check had passed (`handoff.md` §4.4). That finding rewrote `handoff.md` §1.4 step 3 and became `decision-record.md` follow-up 8. A supplementary fresh-agent probe (`handoff.md` §4.5) found the complementary gap: an untouched, now-stale contract block also passes. **No second engineer performed the exercise; the observed feedback is the author's own — a limitation, stated.**

### B.7 Limitations

- Single-run timings (n = 1) everywhere; the handoff timings are descriptive only and the AFTER run was performed second by the person who wrote the handoff.
- No production telemetry; user impact is argued from code and git history. fix-1's refusal is reachable today only by direct API callers (B.3).
- The harness mocks `assessEvidence`, auth, session and ledger; real provider calls, Firestore and the demo ledger's storage backends are not exercised.
- The resolver's contract rows are hand-mirrored from the routes; stale or duplicated rows do not fail the suite (found twice, B.6; follow-up 8).
- `reviewer/invitations` and `reviewer/sessions` still parse the same headers inline (follow-up 2).
- Two non-observable implementation differences exist behind unreachable states (`decision-record.md` §4).
- Reviewer independence is by session, not by vendor: the third reviewer shares the author's model family.
- The one measured "another engineer" is an AI agent, labelled as such; no human other than the author has attempted the change.

### B.8 Actual effort

From `quest/effort-log.md`, as of 2026-09-22:

| | |
|---|---|
| Human attention (Iqbal) | **6 h** total, self-reported at submission — problem choice and ranking, the directive and its gates, reviewing documents and diffs, the handoff exercise (≈25 min of it on the stopwatch), the Loom script and recording. Inside the brief's suggested 6–8 h. |
| Elapsed | 2026-09-20 ~13:00 → 2026-09-22, three sittings |
| Codex jobs | 29 (≈49 min runtime; largest 14 m 56 s) — job store count at the final panel |
| Kimi K3 invocations | 20 (18 usable, 2 rate-limit failures) |
| Fresh-context Opus reviewer launches | 10 (9 reviews, 1 killed by the author's API session limit) |
| Sonnet handoff probes | 2 (≈12 min) |
| Claude orchestrating session | one continuous session; not separately timed |

The human hours went into the decisions that shaped the outcome (`effort-log.md`, decisions 1–13) rather than into typing; the brief's request to distinguish the candidate's work from AI output is answered by that table and by B.4. No claim is made about how long this would take another engineer or a team.
