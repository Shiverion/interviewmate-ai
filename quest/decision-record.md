# Decision record — extract provider/key resolution from the evaluation routes

**Status:** implemented on `quest/trust-and-change` (`50fa2dc` → `e5bd47b`) · **Date:** 2026-09-21 · **Draft:** v3.1 (change log §8)
**Inputs:** `quest/intent.md` v3, `quest/directive.md` v3.1, code reviews in `quest/council/code-review-{codex,kimi}.md`, `quest/agent-notes.md`
**Author:** Muhammad Iqbal Hilmy Izzulhaq. Drafted with Claude (Opus 5) from the implementation record; under council review (§8).

## 1. Context

Three route handlers — `POST /api/evaluate`, `/api/evaluate/scheduled`, `/api/demo/evaluate` — each re-implemented "which provider, which key, which fallbacks" before calling `assessEvidence()`. They had drifted: `scheduled` substituted a provider even when the caller set `allowFallback: false`; `demo` passed server keys untrimmed after a June fix (`a63fab4`, `intent.md` §12-2) had trimmed them elsewhere; defaults disagreed; no test file named any of the three routes (`intent.md` §12-3). Evidence and ranking against alternatives: `intent.md` §4–6.

## 2. Decision

Extract the *mechanism* into one pure module, `src/lib/ai/provider-resolution.ts` (89 lines incl. doc comment), driven by explicit per-route policy literals, and wire the three routes to it. Two **intended, observable** behaviour changes in reachable states:

1. `scheduled` returns `503` instead of substituting `configured[0]` when `allowFallback` is `false` and the requested provider is unconfigured.
2. `demo` trims server keys (empty / whitespace-only env values are treated as unconfigured).

All other *observable* behaviour in reachable states — credential source per path, fallback permission per path, substitution where fallback is allowed, proceeding with an `undefined` key where the old code did, the browser-over-server merge, lazy header parsing, `demo`'s accounting order, response shapes — is preserved, as far as the route harness can see (§4, last two rows, state what it cannot see). Two non-observable implementation differences exist and are listed in §4.

## 3. Alternatives considered

| Alternative | Why not |
|---|---|
| **A. One universal policy** — make all three routes resolve identically (the framing in `intent.md` v1) | The routes encode different authorization models (BYOK, hosted admin, scheduled pipeline, demo grant). Flattening them is a product change disguised as a refactor. Rejected during intent review (`intent.md` §11, v1→v2; `quest/council/intent-r1-codex.md` §1). |
| **B. Substitute-and-report** — keep substituting on `scheduled`, add a `substituted` field to the response | Adds a response field (response shapes are preserved by directive Part 3) and still evaluates a candidate with a model the pipeline opted out of. The opt-out is the API contract; honouring it is the fix. Reporting is a follow-up (§7-1). |
| **C. Resolver throws on refusal** | Routes own HTTP status and wording (`scheduled` had an existing `503` message to preserve). A typed `ok: false` result keeps the module pure and lets each route map errors in its own style; the two routes where refusal is unreachable narrow the type with a `throw` into their existing `catch`. |
| **D. Resolver requires a key** (`key: string`) | Several paths legitimately proceed with no primary key — `evaluate` hosted-admin with nothing configured; `demo` without a grant — because `assessEvidence` handles a missing credential (deterministic no-evidence result, or skip to fallback). A required key would have introduced new early failures. This was the v1 directive's design and was rejected in directive round 1 (`quest/council/directive-r1-codex.md` §2, `directive-r1-kimi.md` §1). |
| **E. Also migrate `reviewer/invitations` and `reviewer/sessions`** | Same header parsing, but entangled with reviewer authorization; one reviewer estimated it would roughly double the harness surface (`directive-r1-kimi.md` §4). Named follow-up (§7-2). |
| **F. Prune the 735-case harness to a hand-picked set** | The Cartesian product is what makes "0 `preserved` failures" a strong claim, and it runs in ~4 s. Kept; the tag scheme (`preserved` / `fix-1` / `fix-2`) is the navigation aid. |

## 4. Trade-offs and known differences

- **Two policy axes instead of one.** `allowFallback` (populate `fallbackKeys`?) and `onUnconfigured` (`substitute` / `proceed` / `refuse`) are independent. That expressiveness lets five path-literals reproduce every current path — and also makes `allowFallback: false` + `onUnconfigured: "substitute"` expressible, which is precisely the bug fix-1 removed. Mitigation: doc comment on `ResolutionPolicy` (`provider-resolution.ts:3-14`); `scheduled` derives `onUnconfigured` from `allowFallback` (a ternary); `evaluate` hostedAdmin and both `demo` paths fix it by literal, which is safe only because their fallback is forced on or they never substitute.
- **`substituted` is test-only.** No route reads it; it lets the contract table assert *why* a provider was chosen. Kept deliberately; surfacing it is §7-1.
- **`demo` passes `fallbackKeys ?? {}`.** The resolver returns `undefined` when fallback is off; `demo`'s downstream call has always received an object. Adapting at the route keeps the resolver uniform and the route byte-compatible. `assessEvidence` treats `{}` and `undefined` identically (`assess.ts:33,38`).
- **Non-observable difference 1 — object identity.** Caller-path `fallbackKeys` is now the parsed browser-keys object by reference; the old code spread-copied it. `assess.ts` only reads it. No behaviour difference today.
- **Non-observable difference 2 — gated dead code.** `demo` with a grant and *no* configured provider used to fall back to the literal `"openai"`; the resolver keeps the requested provider. Unreachable: `demoAvailability()` returns `503` first unless `OPENAI_API_KEY` is non-empty (`ledger.ts:92`). Commented in the route; both code reviewers flagged it independently.
- **Harness scope.** Real handlers; `assessEvidence` mocked and its arguments recorded (real `assessEvidence` for the no-evidence and attempt cases); auth, session, ledger and reviewer modules mocked; fetch blocked. Persistence payloads asserted via `toHaveBeenCalledWith`. **Not covered:** real provider calls, Firestore, the demo ledger's storage backends, and any state the mocks make unreachable (such as difference 2).
- **Reach of fix-1.** The only in-repo client of `/api/evaluate/scheduled` sends `allowFallback: scheduled || …`, i.e. always `true` for scheduled sessions (`src/app/(public)/interview/page.tsx:330-332`). The refusal therefore protects direct API callers and future clients, not today's UI flow. The API contract was still wrong; the fix is cheap; but the practical user impact today is smaller than `intent.md` §6's score of 4 implied — a limitation now noted in `intent.md` §7.

## 5. Yardstick results (directive Part 7)

| # | Yardstick | Result | Evidence |
|---|---|---|---|
| Y1 | Behaviour preservation | **pass** | 703 `preserved` cases pass at H (`d09182e`) and at `e5bd47b`; only the 7 `fix-1` + 25 `fix-2` cases flipped (`agent-notes.md`, "Baseline at H") |
| Y2 | One decision site | **pass** | `grep -rn "configured\[0\]\|configured.find" src/app/api/evaluate src/app/api/demo/evaluate` → 0 hits |
| Y3 | Readable diff | **pass** | Route commits vs their base: `git diff -w --stat e25d63e..1a1a920 -- <route>` → scheduled 37, demo 40, evaluate 46. The later comment-only commit `e5bd47b` adds 4 lines to demo (44 vs `50fa2dc`). All ≤ 50. |
| Y4 | Explicit policy | **pass** | each path's `policy` is a literal at the call site matching directive 4.2 |
| Y5 | Deterministic tests | **pass** | harness + resolver tests: 949 tests, fetch blocked, ~4 s |
| Y6 | Scope | **pass** | `git diff --stat 50fa2dc..e5bd47b --name-only -- src/` lists exactly the six permitted files |
| Y7 | Reproducible | **pass** | every number here has a command; baseline reproducible at `d09182e` |

## 6. Consequences

- A policy change for one route is now one literal at one call site plus that path's contract-table rows; the harness fails if any *other* path moves.
- Adding a provider still needs the catalog entry and an SDK adapter (`evaluation.ts`); the resolver picks it up from `PROVIDERS` automatically.
- Direct callers of `scheduled` that send `allowFallback: false` against an unconfigured provider now get an explicit `503` instead of a silent substitute. The in-repo client never sends `false` (§4, last row), so no UI change is needed.

## 7. Follow-ups (not in this change)

1. Surface substitution in responses (new field) — product decision.
2. Migrate `reviewer/invitations` and `reviewer/sessions` to the resolver.
3. Test naming the `demoAvailability` invariant (≥1 provider configured past the gate) and the `"openai"`-vs-`requested` difference behind it.
4. Trim caller-supplied keys in `evaluate` — a declared behaviour change, separate PR.
5. Charge-before-attempt ordering in `demo` (`intent.md` §4 A-d) — product decision.
6. A policy-dependent return type so paths that cannot refuse do not need the `throw` narrowing.
8. **Hand-mirrored contract rows are silent when stale or duplicated** (found by the handoff exercise, `handoff.md` §4.4–4.5): the resolver test writes each path's policy literal and expectation by hand, so a route literal can change without its rows changing, and a pasted duplicate passes. Options: derive the resolver-test rows from the routes' actual literals (export them), or assert the row count per path.
7. Decide whether the scheduled UI should ever send `allowFallback: false`; today the API supports it and the UI does not use it.

## 8. Review history of this document

- v1 (2026-09-21): drafted from the implementation record and both code reviews.
- v3 → v3.1 (2026-09-22, results): follow-up 8 added from the handoff exercise's finding; no other change.
- v2 → v3 (third-reviewer cold read, fresh-context Opus, 2026-09-21): mitigation claim corrected — only `scheduled` derives `onUnconfigured` from `allowFallback`; the resolver doc comment fixed to match; the cross-reference to an `intent.md` limitation made true by adding that note. Alternative F kept deliberately: nobody proposed pruning, but the 735-case size is the first thing a reader questions, and the row answers it.
- v1 → v2 (round 1, Codex `gpt-5.6-sol` CHANGE · Kimi K3 CHANGE): header no longer claims completed rounds; "exactly two behaviours … proven" narrowed to *intended, observable, reachable* with the two non-observable differences and the harness limits listed; alternative G (repository choice) cut as not a design alternative; process claims now cite their council files; Y3 restated with the exact command and base used in `agent-notes.md` (37/40/46) plus the comment-only delta; `a63fab4` and the no-tests claim cite `intent.md` §12; the "scheduled UI sends the default" claim replaced by a verified reading of the client (`interview/page.tsx:330-332`) and its consequence for fix-1's reach added to §4/§6/§7.
