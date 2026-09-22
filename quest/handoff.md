# Handoff — the transcript-evaluation provider-resolution flow

**Branch:** `quest/trust-and-change` · **Revision:** `2b1ae0f` · **Date:** 2026-09-21 · **Draft:** v4 (change log at end)
**Author:** Muhammad Iqbal Hilmy Izzulhaq. Drafted with Claude (Opus 5); under three-reviewer council review (see end).

This note is for an engineer who has never seen this repository and needs to change how the three evaluation routes pick an AI provider and its credentials — without asking me. It has four parts: (1) enough context to make a change, (2) a concise review checklist for any PR touching this flow, (3) a compact before/after metrics table, (4) a handoff exercise with its record.

---

## 1. Context sufficient to modify the flow

### 1.1 What the flow does

Three API routes take an interview transcript and return an AI evaluation:

| Route | Who calls it | Credential source |
|---|---|---|
| `POST /api/evaluate` — `src/app/api/evaluate/route.ts` | Candidate's browser with its own key (BYOK); or a verified admin with no key → server keys | caller, or server |
| `POST /api/evaluate/scheduled` — `src/app/api/evaluate/scheduled/route.ts` | Scheduled-interview pipeline (`src/app/(public)/interview/page.tsx:296-336`) | server |
| `POST /api/demo/evaluate` — `src/app/api/demo/evaluate/route.ts` | Public demo visitor, or a reviewer holding a grant | server |

Each route: authenticates/authorizes in its own way → **resolves `{provider, key, fallbackKeys}`** → calls `assessEvidence(provider, key, transcript, configuration, { host, fallbackKeys, jobContext })` in `src/lib/ai/assess.ts` → persists/returns.

`assessEvidence` (unchanged by this work; `src/lib/ai/assess.ts`) tries `provider` with `key`, then each provider in `fallbackKeys` in `PROVIDERS` order, once each (`:30-38`), skipping empty credentials (`:39-42`); returns a deterministic result without any provider call when the transcript has no eligible evidence (`:23-29`); stops at the first success (`:60-63`); throws a generic error after exhaustion (`:93`). An absent primary key is legal input. Each route validates `requested` before resolution (`evaluate:32` via `isProvider`; `scheduled:18` and `demo:17` via a zod enum).

### 1.2 Where resolution lives now

`src/lib/ai/provider-resolution.ts` — `resolveProvider({ requested, policy, env })` → `{ ok: true, provider, key, fallbackKeys, substituted } | { ok: false, reason }`. Pure; reads env only through its argument; no I/O.

The **policy** is a literal at each route's call site. There are five, and they are the whole policy:

| Path | Policy literal | Where |
|---|---|---|
| `evaluate`, caller key path | `{ credentialSource: "caller", callerKey, allowFallback: header === "true", callerFallbackKeys }` | `evaluate/route.ts:55-61` |
| `evaluate`, hosted admin (no key + verified admin) | `{ credentialSource: "server", allowFallback: true, onUnconfigured: "substitute", onNoneConfigured: "proceed" }` | same ternary |
| `scheduled` | `{ credentialSource: "server", allowFallback: body.allowFallback, onUnconfigured: body.allowFallback ? "substitute" : "refuse", onNoneConfigured: "refuse" }` | `scheduled/route.ts:38-47` |
| `demo`, grant | `{ credentialSource: "server", allowFallback: true, onUnconfigured: "substitute", onNoneConfigured: "proceed" }` | `demo/evaluate/route.ts:43-59` |
| `demo`, no grant | `{ credentialSource: "server", allowFallback: body.allowFallback, onUnconfigured: "proceed", onNoneConfigured: "proceed" }` | same ternary |

Meaning of the axes (also in the module's doc comment):
- `allowFallback` — populate `fallbackKeys` (all configured providers' trimmed server keys, or the caller's browser keys) or leave it `undefined`.
- `onUnconfigured` — what to do when the *requested* provider has no server key: `substitute` = first configured provider; `proceed` = keep the requested provider with `key: undefined`; `refuse` = `ok: false, reason: "provider_not_configured"`.
- `onNoneConfigured` — when *no* provider has a key: `proceed` (requested provider, no key) or `refuse` (`"no_provider_configured"`).
- A provider is *configured* when `env[PROVIDERS[i].env]?.trim()` is non-empty. Whitespace-only counts as unconfigured.
- The catalog (`src/lib/ai/catalog.ts`) is, in order — and order is what `substitute` means by "first configured": `openai` ← `OPENAI_API_KEY`; `gemini` ← `GOOGLE_GENERATIVE_AI_API_KEY`; `deepseek` ← `DEEPSEEK_API_KEY`.

Route-specific things that stay in the routes on purpose: authorization, `demo`'s accounting order (`ownedLease → claimEvaluation → consumeReviewer? → assessEvidence → saveEvaluation`), the browser-over-server merge in `evaluate` hosted-admin (`{ ...resolution.fallbackKeys, ...browserKeys }`), the lazy parse of `x-ai-fallback-keys`, error wording and status codes, and `demo`'s `fallbackKeys ?? {}` (its downstream contract has always been an object).

### 1.3 The tests, and what each one guards

| File | Cases | Guards |
|---|---|---|
| `src/lib/ai/__tests__/provider-resolution.test.ts` | 214 | The resolver's contract: every policy literal × requested provider × env fixture (`none`, `openai only`, `gemini only`, `all`, `all padded`, `one whitespace-only`, `one empty-string`) → full `Resolution` |
| `src/app/api/__tests__/evaluation-routes.test.ts` | 735 | The **routes**: real handlers invoked with `NextRequest`, dependencies mocked, and the `(status, provider, key, fallbackKeys)` that reaches `assessEvidence` asserted per case. Cases are tagged `preserved` (703), `fix-1` (7), `fix-2` (25). Also: attempt sequences under scripted failure, `demo` accounting order, no-evidence short-circuit, response bodies, persistence payloads. |
| Everything else (25 suites, 191 tests) | — | Untouched |

Run: `node node_modules/jest/bin/jest.js src/app/api/__tests__/evaluation-routes.test.ts` (≈4 s). Whole repo: `node node_modules/jest/bin/jest.js --ci` (≈13–25 s; 27 suites / 1140 tests). `npx` may not resolve on Windows shells; invoke the binary directly as shown. Types: `node node_modules/typescript/bin/tsc --noEmit`. Lint: `node node_modules/eslint/bin/eslint.js <files>`.

### 1.4 How to change the policy of one path (the recipe)

1. Decide the new behaviour in terms of the three axes above. If it cannot be expressed with them, you are changing the resolver's contract, not a policy — stop and write a decision record.
2. Edit **one literal** at that path's call site.
3. Update `provider-resolution.test.ts`: each path is one `add("<path>", <policy literal>, <expected>)` call inside the `for (const fixture of fixtures)` loop (lines ~110-165), and **both** the literal and the expected `Resolution` are written by hand — edit that one call **in place**: change its literal *and* its expectation. Do not paste a second `add(...)` for the same path; a duplicate passes silently (both blocks test the resolver consistently) and leaves a stale row set behind. Sanity check: the resolver test count must still read `Tests: 214`. `evaluate hostedAdmin` and `demo grant` share one `for (const path of [...])` loop because their literals are identical today; if you change only one of them, split that loop first. Then update the expectations for that path's cases in `evaluation-routes.test.ts` (cases are generated per route and tagged; the hosted-admin expected provider is the `hostedAdmin ? fixture.selected[requested] : requested` expression, not the fixture). Do not touch other paths' expectations.
4. Run the route harness. **Only cases for the path you changed may flip.** If a `preserved` case for another path fails, you changed more than you meant to.
5. Run the whole suite, `tsc`, lint.
6. In the PR, state which path changed, which axis, and paste the harness tally (passed/failed by tag).

### 1.5 Things you might reasonably assume that are false

- "`allowFallback` is the caller's choice on every path." — No. `evaluate` hosted-admin and `demo` grant force it on regardless of what was sent; and the shipped scheduled UI sends `true` for every scheduled session. Only BYOK callers, direct `scheduled` API callers and `demo` visitors actually choose.
- "The scheduled UI can turn fallback off." — It cannot today: `interview/page.tsx:330-332` sends `allowFallback: true` for every scheduled session. The refusal protects direct API callers.
- "Caller keys are trimmed." — No; caller keys are passed through untouched by the route (the browser key store trims on save/load, `src/lib/keys/store.ts:30,37,63`). Server keys are trimmed.
- "The resolver can refuse on every route." — Only `scheduled` maps `ok: false` to a response. On the other two the branch is unreachable by construction and narrowed with a `throw` into the existing `catch`.
- "`substituted` is in the response." — No; no route reads it (a grep for `substituted` under `src/` outside the resolver and its tests finds nothing relevant). Surfacing it is a follow-up (`decision-record.md` §7-1).

### 1.6 Where to read more

`quest/decision-record.md` (alternatives, trade-offs, two non-observable differences, follow-ups) · `quest/directive.md` (the instructions the change was built under; Part 2 has the original per-route behaviour table) · `quest/agent-notes.md` (baseline numbers and how they were produced) · `quest/review-example.md` (two corrections made during the work).

---

## 2. Review checklist for any PR touching this flow

Use in order; each item is pass/fail.

1. **Scope** — files touched are the resolver, its test, the harness, or a route's resolution region. Anything else needs its own justification.
2. **No env-based resolution left in the routes** — no route picks a provider from env itself: `grep -rnE 'configured\[0\]|configured\.find|\?\.id \|\| "openai"|process\.env\[' src/app/api/evaluate src/app/api/demo/evaluate` returns nothing (the third pattern is `demo`'s pre-change fallback to a literal provider; the fourth catches any new direct env read; `evaluate:31`'s `|| "openai"` is a *default request*, not an env-based choice, and is deliberately not matched). `-r` covers `evaluate/scheduled/`. Then confirm by reading that each path's `policy` is still a literal at its `resolveProvider` call (five literals, §1.2) — the grep cannot prove that; eyes can, in under a minute.
3. **Only the intended path flipped** — harness tally by tag before/after; every `preserved` case for untouched paths still passes.
4. **Accounting untouched** — in `demo`, `git diff -w` shows `ownedLease`/`claimEvaluation`/`consumeReviewer`/`saveEvaluation` lines unchanged and resolution still happens before `claimEvaluation`.
5. **`assessEvidence` call shape unchanged** — same five arguments; `fallbackKeys` is an object in `demo`.
6. **Refusals only where mapped** — a new `ok: false` reason has a route-level mapping on every path that can reach it, with status and wording stated in the PR.
7. **Keys** — server keys trimmed; caller keys not trimmed by the route (unless that is the declared change).
8. **Diff readability** — no reformatting of untouched lines; `git diff -w --stat` per route stays small (the ≤ 50-line figure is this change's yardstick Y3 — a convention, not a rule).
9. **PR text** names the path, the axis, and pastes the harness tally.
10. **`substituted` still test-only** unless the PR declares otherwise (`decision-record.md` §7-1).
11. **Verification run and pasted** — all of: `node node_modules/jest/bin/jest.js src/lib/ai/__tests__/provider-resolution.test.ts`; the same for `src/app/api/__tests__/evaluation-routes.test.ts` (tally by tag); `node node_modules/jest/bin/jest.js --ci` (whole repo); `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/eslint/bin/eslint.js <changed files>`.
12. **Follow-ups** touched? (`decision-record.md` §7) — say which, or that none.

---

## 3. Compact quality metrics — before and after

Each row says how it was obtained. Three revisions appear as "before": `50fa2dc` is the pre-change code; `d09182e` (H) is the harness run against that unchanged code; `e25d63e` adds only the human approval note.

| Measure | Before (`50fa2dc`) | After (`2b1ae0f`) | How measured |
|---|---|---|---|
| Route-harness cases failing (`preserved` / `fix-1` / `fix-2`) | 0 / 7 / 25 at H (`d09182e`, harness on unmodified routes) | 0 / 0 / 0 | `jest … --json`, tally by tag |
| Env-based provider-choice sites in the three routes | 3, by inspection: `\|\| configured[0]` in `evaluate` and `scheduled`, `?.id \|\| "openai"` in `demo` (the narrower grep used during the work finds only 2) | 0 in the routes by the widened grep in checklist item 2; the one remaining site is `resolveProvider` itself | inspection / grep |
| Change surface and verification coverage for a one-path policy change | 1 production route; no route-specific contract harness guarded spill-over | 1 production policy literal + explicit resolver-test and route-test expectations; unrelated-path changes are detected by automated checks | qualitative, from §1.4 and §4.4 |
| Tests naming the three routes | 0 files | 1 harness (735 cases) + 1 resolver test (214) | `intent.md` §12-3 |
| Whole suite | 25 suites / 191 tests / 21.05 s (one run, `intent.md` §12-4) | 27 / 1140 / 12.6 s (one run; machine-dependent) | `jest --ci` |
| Provider attempts under scripted primary failure, per path | measured at H — `agent-notes.md`, "Attempts (5.4) and accounting order (5.5)" | identical for all `preserved` paths | harness attempt cases |
| Time for the handoff exercise (§4.4) | 7 m 08 s | 16 m 27 s | stopwatch, self-performed by the author, n = 1, AI-assisted; descriptive only — see §4.4 |
| Diff size per route (`git diff -w --stat`) | — | scheduled 37 · demo 44 · evaluate 46 changed lines | `decision-record.md` §5 Y3 |

*Estimate, not measured:* "add a provider" still requires a catalog entry and an SDK adapter in `evaluation.ts`; the resolver needs no change.

---

## 4. Handoff exercise

### 4.1 The task (another engineer can perform this)

**Change:** on `demo`'s **no-grant** path, when the visitor has enabled fallback (`allowFallback: true`) and the requested provider is not configured, **substitute the first configured provider** as the primary — as the grant path already does — instead of proceeding with the requested provider and no key.

**Why this is a real question:** today that visitor's request reaches `assessEvidence` as `(requested, undefined)` and the same requested id is what `claimEvaluation` records; the resolver already knows the provider cannot be used. Making the substitution explicit means the ledger and the call both name the provider that will actually run. With `allowFallback: false` nothing should change (the visitor asked for exactly one provider).

**Observable effect (this is what you verify):** for a no-grant request with `allowFallback: true` and a requested provider that has no server key, (i) the `(provider, key)` handed to `assessEvidence` changes from `(requested, undefined)` to `(first configured, its trimmed key)`, and (ii) the provider id passed to `claimEvaluation` changes the same way. **What does not change:** the sequence of actual SDK attempts — `assessEvidence` already skipped the empty-credential primary before calling `evaluateWithProvider`, so the attempt list (e.g. `["openai"]`) is identical before and after; the harness's attempt case flips only because it also asserts the resolved tuple. With `allowFallback: false`, or with the requested provider configured, nothing changes.

**Expected footprint — measured by performing the change once on `2b1ae0f` and reverting:** one literal in `demo/evaluate/route.ts` (`onUnconfigured: "proceed"` → `body.allowFallback ? "substitute" : "proceed"` in the no-grant branch); in `provider-resolution.test.ts` the `"demo no grant"` `add(...)` call (literal and expectation) — **6 rows** flip, all `fallback=true`: `env=openai only` × requested `gemini`, `deepseek`; `env=gemini only` × `openai`, `deepseek`; `env=one whitespace-only` × `gemini`; `env=one empty-string` × `gemini` (the resolver test has no availability gate, so `gemini only` rows do flip there); in `evaluation-routes.test.ts` — **5 cases** flip, all on the `demo | … | grant=false | fallback=true` path: two `preserved` (`env=openai only`, requested `gemini` / `deepseek`), two `fix-2` (`env=one whitespace-only` and `env=one empty-string`, requested `gemini`), and the no-grant provider-attempts case. Of those five, the four generated cases are corrected by one change to the demo generator's expected provider (`evaluation-routes.test.ts:314`, `reviewer ? … : requested` → `reviewer || allowFallback ? … : requested`); the attempts case has its **own** hand-written expectation near line 763 and must be updated separately — verified by performing the full exercise (route + generator) and seeing exactly that one case still failing. Nothing on any other path may move. (`env=gemini only` does not flip in the harness: `demoAvailability()` returns 503 before resolution when `OPENAI_API_KEY` is unset.) One tagging side-effect to expect: the harness derives `fix-2` from whether the case exercises trimming, so after your edit the `one empty-string | gemini | fallback=true` case re-tags from `fix-2` to `preserved` — the by-tag totals read 704 / 7 / 24 instead of 703 / 7 / 25. That is the tag expression working as designed, not a regression (verified by performing the full edit: 704 / 7 / 24).

**Done when** — the same criterion for both timings below: you can show assertions (a) and (b) hold — (a) no grant, `allowFallback: true`, env `OPENAI_API_KEY` only, requested `gemini` → `assessEvidence` receives `provider: "openai"` with the OpenAI key, and `claimEvaluation` records `"openai"`; (b) with `allowFallback: false`, or with requested `openai`, the tuple is unchanged from before your edit — and you can say how you showed it. After: the harness flips exactly the 5 cases and 6 rows above and the whole suite, `tsc` and lint are clean. Before: there is no harness; you decide how to show (a) and (b) and record it.

**Do not commit** the result to this branch; reset the worktree afterwards (`git checkout -- .`).

### 4.2 The same task at baseline

At `50fa2dc` — the code before any of this work; no resolver, no harness — the equivalent edit is in `demo/evaluate/route.ts:42-47`: the no-grant branch `: body.provider` becomes `: body.allowFallback ? (configuredProviders.find((p) => p.id === body.provider) || configuredProviders[0])?.id || body.provider : body.provider` (or your own equivalent). Then show (a) and (b) by whatever means you choose — reading, a throwaway script, a dev-server request — and record what that took and how confident it made you.

### 4.3 Worktrees prepared for the timing

- Before: `C:\Users\miqba\AppData\Local\Temp\im-handoff-before` at `50fa2dc` (no resolver, no harness — verified)
- After: `C:\Users\miqba\AppData\Local\Temp\im-handoff-after` at `2b1ae0f`
- Both have `node_modules` junctioned to the main checkout (remove a junction only with `rmdir`, never `Remove-Item`); `node node_modules/jest/bin/jest.js …` runs in place.

### 4.4 Record — self-performed run (primary evidence)

**Exercise mode:** self-performed by the author, AI-assisted — ChatGPT was used in the BEFORE run to clarify how `selectedProvider` flows into `claimEvaluation` and `assessEvidence`, and in the AFTER run to locate and diagnose a syntax error introduced by copy-paste. No agent edited the code. Run on 2026-09-22 in the worktrees of §4.3, BEFORE first; both trees reset afterwards, nothing committed.

| | Before (`50fa2dc`) | After (`2b1ae0f`) |
|---|---|---|
| Performed by | Muhammad Iqbal Hilmy Izzulhaq | Muhammad Iqbal Hilmy Izzulhaq |
| Wall time (stopwatch, one run) | **7 m 07.69 s** | **16 m 27.34 s** |
| Files touched | `src/app/api/demo/evaluate/route.ts` | `src/app/api/demo/evaluate/route.ts`; `src/lib/ai/__tests__/provider-resolution.test.ts`; `src/app/api/__tests__/evaluation-routes.test.ts` |
| How "done" was decided | Traced `selectedProvider` into `claimEvaluation` and `assessEvidence` by reading; confirmed by reasoning that with fallback on, an unconfigured requested provider is replaced by the first configured one, and with fallback off it is unchanged. `tsc` pass; eslint pass; existing suite 191/191 (no test names the route). | Automated: resolver contract test, route harness (735/735), whole suite, `tsc`, eslint — all pass. |
| Confidence (author's words) | *Moderate.* "The existing suite passed and the behavior was clear after tracing the route, but there was no route-specific contract harness for this behavior." | *High* "after automated contract, route, whole-suite, type, and lint checks." |
| Surprises / friction | A meaningful part of the time went into understanding how `selectedProvider` propagates; AI assistance was needed to be confident the change had the intended observable effect. | (1) A copy-paste introduced a missing closing brace that had to be debugged. (2) The reported resolver-test count was **256**, not the documented 214 — a difference of exactly 42 = 7 fixtures × 3 providers × 2 fallback values, i.e. one whole path's rows. The worktree was reset before the edit could be inspected; the author's own account, given afterwards and consistent with the +42: the recipe's "mirror your new literal and rewrite the expectation" was read as *add a block* rather than *edit in place* — a second `add("demo no grant", …)` was pasted below the existing one — and the duplicate passed silently. §1.4 step 3 was rewritten in response (see change log). The whole-suite figure reported, 1182, is 1140 + 42, consistent with that reading. |

**What the two runs show, and no more.** The post-refactor system cost *more* wall time and touched three files instead of one; in exchange it turned "moderate confidence from reading" into "high confidence from checks", and it is the only one of the two states in which a wrong edit would have been caught automatically (it caught nothing here because the duplicate rows were self-consistent — which is itself the finding above). That is the trade the §3 row "change surface and verification coverage" describes. The times are not evidence that the refactor makes changes faster.

**Limitation.** Self-performed, n = 1, AI-assisted as stated. The author wrote §1 and had reviewed §4.1's measured footprint before running, so neither run is a cold read; the AFTER run was performed second and benefited from familiarity gained in the BEFORE run. Timings are descriptive only — not evidence of another engineer's experience or of team-wide productivity. No second engineer's feedback exists at the time of writing; the observed feedback recorded here is the author's own.

### 4.5 Supplementary: fresh-agent runs (agent-proxy, not human feedback)

A separately labelled probe of *fresh-context discoverability*, run by the orchestrator while the author did §4.4 and held unseen until the author's records were in. Same model (Claude Sonnet), same effort, same task text (`quest/council/briefs/80-agent-proxy-task-sonnet.md`), no memory of the build, one run per revision, worktrees reset afterwards. The task text names neither files, tests nor `handoff.md`. Because the AFTER tree contains `quest/handoff.md`, the comparison measures the whole post-refactor system — code, tests and documentation — not code structure alone. **This row does not satisfy the Quest's handoff requirement and is not a measure of a human engineer.**

| | Before (`50fa2dc`) | After (`bd5f1c8`; `src/` identical to `2b1ae0f` except one harness comment) |
|---|---|---|
| Wall time (harness-measured) · tool calls (harness-counted) | 5 m 52 s · 30 (the agent self-reported "15–20 min", "~20 calls") | 6 m 17 s · 29 (self-reported "15–20 min", "~14 calls") |
| Files changed (verified by `git diff`) | 1: the route (3 lines added) | 2: the route literal (1 line); the harness generator line and the hand-written attempts row |
| How it showed (a) and (b) | Wrote a temporary route-level Jest test with mocked ledger/reviewer/assess, ran it, then **reverted the fix and re-ran to prove the test fails on the old code**, then restored and deleted the test | Ran the existing harness case that is exactly scenario (a) by name; (b) via the untouched `preserved` rows; observed 5 failures with the route edit alone, updated exactly those expectations; final 949/949, tags 704 / 7 / 24 |
| What it did not do | — | Did not update the resolver contract test — and nothing failed, because those rows are hand-mirrored. The stale mirror is the same class of gap the author's run exposed from the other direction (a duplicated block also passes). Its report does not mention `handoff.md`; it found the pattern from the resolver's doc comment and the `scheduled` route. |

What this adds: in both states a capable fresh agent completed the task in a few minutes; the after-state made verification a matter of running existing cases rather than building a harness. What it does not add: any claim about humans, or about time.

---

## Review history of this document

- v1 (2026-09-21): drafted. Three independent reviewers (fresh-context Opus, Codex `gpt-5.6-sol`, Kimi K3), up to three rounds; ships on unanimous approval.
- v2 → v3 (round 2: Opus APPROVE · Kimi APPROVE · Codex `gpt-5.6-sol` CHANGE): §4.1 no longer claims a removed provider attempt — the SDK attempt sequence is unchanged; the observable effects are the `assessEvidence` tuple and the `claimEvaluation` provider id (Codex, Opus); the six flipped resolver rows enumerated and the post-edit tag re-count (704/7/24) explained (Kimi, Opus); checklist item 2 retitled to what its grep proves, with the literal check made a reading step (Codex); §3 parenthetical clarified (Kimi).
- v3 → v4 (2026-09-22, results): §4.4 filled from the author's self-performed run (primary evidence); §4.5 added for the fresh-agent probe (supplementary, labelled); §3 timing row filled; §3 "files to edit" row renamed to "change surface and verification coverage" (council recommendation, 2–1); §4.4 table header corrected from `e25d63e` to `50fa2dc`; §1.4 step 3 rewritten from observed feedback — the author's run showed the old wording could be read as "add a block", which passes silently. Per the author's instruction, no new three-reviewer round for these factual fills; one consistency pass instead.
- v1 → v2 (round 1, all three CHANGE): exercise replaced — v1's change (`evaluate` hosted-admin → `proceed`) would have been rescued by fallback, so its stated outcome was wrong (Codex, Kimi); new exercise on `demo` no-grant with an unambiguous observable, flip counts **measured** (5 harness cases, 6 resolver rows); "before" moved from `e25d63e` (which already contained the harness — Opus) to `50fa2dc`; identical done-criteria for both timings; §1.5 bullet 1 corrected (it was itself false); resolver-test structure (hand-written literal + expectation; shared hostedAdmin/grant loop) explained in §1.4; catalog env names and order, `requested` validation, `assess.ts` and key-store line cites added; checklist gained the full verification commands, a widened grep that would have caught `demo`'s old `|| "openai"`, the `substituted` item, and the ≤ 50 figure labelled a convention; metrics rows re-labelled by method and the "3 sites" row corrected to inspection; ship gate on §4.4 stated.
