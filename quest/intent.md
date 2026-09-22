# intent.md — Why this problem?

**Quest:** Make AI-Assisted Code Easier to Trust and Change
**Repository:** InterviewMate (`Shiverion/interviewmate-ai`), branch `quest/trust-and-change`, starting revision `50fa2dc` (2026-09-11)
**Author:** Muhammad Iqbal Hilmy Izzulhaq · **Draft:** v3.2, 2026-09-22 (change log in §11)

---

## 1. One-paragraph answer

InterviewMate's *transcript → AI evaluation* flow is served by three sibling API routes that each re-implement "which AI provider do we call, with which key, and which fallbacks are allowed." The three copies have drifted. All three, on some path, substitute a different provider when the requested one is not configured; the response carries the provider actually used, but nothing identifies that a substitution happened, and on the scheduled route it happens even when the caller passed `allowFallback: false`. Their defaults disagree, and a June key-trimming fix reached one route but not the demo route created in September. I will move the *mechanism* (credential lookup, provider selection, fallback-list construction) into one module driven by an explicit policy table, keep each route's current policy except for the two fixes in §5, and prove the before/after with a contract test that runs every route's resolution against the same inputs.

## 2. Provenance

| Pre-existed at `50fa2dc` | Added for this Quest (statuses **frozen at 2026-09-20**, when this document was approved; for actual outcomes see `decision-record.md` §5 and `directive.md` Appendix B) |
|---|---|
| InterviewMate application, built AI-assisted for a previous Quest at the same company | Branch `quest/trust-and-change` — **done** |
| 25 Jest suites / 191 tests, all passing at `50fa2dc` | `quest/intent.md` (this file) — **in review, round 3**; `quest/council/` critiques — rounds 1–2 archived |
| The three evaluation routes and `src/lib/ai/assess.ts` | `quest/directive.md`, decision record, handoff note, review example — **planned** |
| Earlier-Quest deliverables in `deliverables/` — not reused as evidence here | `src/lib/ai/provider-resolution.ts` + contract tests; thinned routes; before/after measurements; Loom — **planned** |

No instruction or directive in `quest/` was written before the work it describes; each file carries its own draft date. Values marked *measured* have a reproduction command in §12. Anything marked *estimate* or *planned* is not yet a result.

## 3. The flow in scope

- `POST /api/evaluate` — candidate browser with its own key (BYOK); or, when no key is supplied **and** the request is from a verified admin, server keys.
- `POST /api/evaluate/scheduled` — scheduled-interview pipeline, server keys only.
- `POST /api/demo/evaluate` — public demo visitor, or a reviewer on a grant; server keys only.

Each builds `{provider, key, fallbackKeys}` and calls `assessEvidence()` in `src/lib/ai/assess.ts`, which: returns a deterministic result without calling any provider when the transcript has no eligible evidence (`:23-29`); otherwise tries the selected provider, then each provider that has a fallback key, once each (`:30-38`); skips any choice with an empty credential (`:39-42`); stops at the first success, marking the result as fallback only if it was not the first choice (`:60-63`); logs each failure server-side with the real cause (`:65-76`); throws a generic error after exhaustion.

## 4. Problems considered

| # | Problem | Evidence |
|---|---|---|
| **A** | **Provider/key resolution re-implemented per route and drifted.** Files: `src/app/api/evaluate/route.ts` (114 lines), `evaluate/scheduled/route.ts` (113), `demo/evaluate/route.ts` (99). The same header/fallback-key parsing appears in `reviewer/invitations` and `reviewer/sessions` (out of scope, §8). | *Measured:* 141 differing lines between the first two routes after leading-whitespace stripping (§12-1). *Verified by reading the code:* (a) **Substitution.** `scheduled/route.ts:41-42` selects `configured.find(requested) \|\| configured[0]` even when `body.allowFallback === false`; the flag only gates the *later* fallback list (`:61-65`). The same pattern is on the admin path of `evaluate/route.ts:47-48` and the grant path of `demo/evaluate/route.ts:42-46`. Because `assessEvidence` receives the already-substituted provider, its fallback marker (`assess.ts:61`, `index > 0`) is false — the response reports the provider used but not that it differs from the request. (b) **Divergent defaults.** `scheduled` `allowFallback: default(true)` (`:19`); `demo` `default(false)` (`:18`); `evaluate` has no body field and gates on `x-ai-allow-fallback: true` or hosted-admin (`:55`). Not a defect alone — evidence that policy lives in three places. (c) **Trim drift.** Commit `a63fab4` (2026-06-23, "fix: trim API key at save/load and in route handlers") touched `evaluate/route.ts` and the key store; `evaluate` and `scheduled` trim server keys; `demo/evaluate` (created 2026-09-09) passes `process.env[...]` untrimmed at `:54` and `:58`. (d) **Charge-before-attempt — observation, not a proven defect.** `demo/evaluate:48-49` runs `claimEvaluation` and `consumeReviewer(grant, 3)` before `assessEvidence`, so a grant is charged even if every provider attempt then fails. Whether that is intended is undocumented. No credit loss is claimed on a no-key path: `demo/evaluate:32-33` returns 503 when `demoAvailability()` (`ledger.ts:91-93`) reports the OpenAI key missing, so at least one configured provider always exists past that point. *Measured:* 13 of 136 commits touch these files, 5 with a `fix:` prefix (§12-2). |
| B | Fallback chain semantics in `assess.ts:30-93`. | Behaviour is designed, partly tested (`src/lib/ai/__tests__/evaluation.test.ts`), and diagnosable via the `diagnostic` field. Whether a candidate should ever be evaluated by a model they did not choose is a product question, not a maintainability one. |
| C | Repeated per-request work in the scheduled route (`PROVIDERS.filter(env)`, session-document read; `scheduled/route.ts:36-60`). | On inspection: the filter is over three entries; the session read supplies authorization and interview context. Not redundant. Rejected. |
| D | No tests reference the three evaluation routes. | *Measured:* 0 test files match `api/evaluate`, `demo/evaluate`, `allowFallback`, or `configured[0]` (§12-3). This shows no test *names* these routes; it does not prove zero behavioural coverage via other paths. Folded into A's remedy. |

*Repository-level alternatives:* adapting another app of mine (Paprika) or building a fresh synthetic service with a planted defect. Not chosen: InterviewMate has a dated recurrence trail, an existing test baseline, and is the AI-assisted codebase these reviewers already know.

## 5. What is preserved and what is intentionally changed

**Preserved — the current policy of each route, kept as the policy for this change (not a claim about original intent):**
- `evaluate`: a supplied key keeps the requested provider; fallback only with `x-ai-allow-fallback: true`; server keys and forced fallback only when *no key is supplied and* the request is verified admin (`:42`, `:55`).
- `scheduled`: server keys only; `allowFallback` default `true`.
- `demo`: server keys only; `allowFallback` default `false`; a reviewer grant forces fallback on (`:52`).
- Authorization checks, credit accounting and its ordering, leases, persistence, and **response shapes — no new fields**.

**Intentionally changed (exactly two):**
1. When the requested provider is not configured **and** fallback is not allowed for that caller, the route returns an explicit error instead of substituting `configured[0]`. When fallback *is* allowed, substitution continues exactly as today.
2. Server keys are trimmed on every path (demo included).

**Not changed, recorded as follow-ups:** identifying substitution in the response (would be a new field); charge-before-attempt ordering (A-d).

## 6. Prioritization

Criteria from the brief, scored 1 (low) – 5 (high); scores are my judgment.

| # | User impact | Maintenance effort | Operating cost | Total | Verdict |
|---|---|---|---|---|---|
| **A** | 4 — explicit opt-out ignored on the scheduled path; behaviour differs by route | 5 — any policy change is 3–5 edit sites; a June fix already missed one | 2 — wasted attempts with untrimmed keys; no measured spend | **11** | **Selected** |
| B | 3 — surprising but diagnosed and largely by design | 2 — already centralized | 3 — extra provider calls on failure | 8 | Deferred; product decision |
| C | 1 | 1 | 1 | 3 | Rejected; not redundant |
| D | — | — | — | — | Absorbed into A |

**Why A ranks first:** the symptoms are user-facing, the cause is structural, and there is dated evidence of the same class of bug (a fix landing in one copy) already recurring. The remedy changes only two behaviours and otherwise moves code, so it stays reviewable inside the budget.

## 7. Affected users

- **Scheduled-pipeline candidates and the recruiters reading their scores** — `allowFallback: false` is not honoured; the evaluation may come from a provider the pipeline did not select. The `provider` field in the response shows which was used; whether the UI surfaces it is untested.
- **Public demo visitors and reviewers on a grant** — receive untrimmed server keys on the demo route; grant holders additionally get substitution/forced fallback (preserved policy).
- **Verified admins on `evaluate`** — substitution/forced fallback (preserved policy); not affected by trim drift.
- **BYOK candidates** — not affected by substitution; fallback only if they opt in.
- **Maintainers** — up to five edit sites per policy change, with no test naming these routes.

*Limitation found after implementation (2026-09-21):* the only in-repo client of `scheduled` sends `allowFallback: true` for every scheduled session (`src/app/(public)/interview/page.tsx:330-332`), so fix-1's refusal is reachable by direct API callers, not through today's UI. The user-impact score of 4 for A in §6 was given before this was known and overstates today's reach; the API contract was still wrong. See `decision-record.md` §4.

No production telemetry exists for how often these fire; evidence is code reading and git history. No team-wide or revenue impact is claimed.

## 8. Non-goals

- `reviewer/invitations`, `reviewer/sessions` — same header parsing, entangled with reviewer authorization; follow-up.
- Fallback semantics in `assess.ts` (B); substitution identification in responses; charge-before-attempt ordering (A-d).
- Authentication, grants, credit accounting, leases, Firestore persistence, response shapes.
- Realtime/voice, integrity, UI, benchmark, ATS, GitHub enrichment; adding providers; models; prompts.

## 9. Intended value and how it will be measured

| Measure | Baseline at `50fa2dc` | Target | Kind |
|---|---|---|---|
| Contract violations: a table of (caller type × requested provider × fallback flag × configured providers) → expected `{provider, key, fallbackOrder}` or refusal, run against each route's resolution with synthetic env fixtures | **Planned** — expected > 0 given A-a and A-c; recorded in `directive.md` appendix | 0 | measured (planned) |
| Provider attempts per route under a scripted primary-provider failure, with synthetic fixtures; plus an ordering assertion that accounting calls are unchanged | **Planned** | Matches §5; no attempt with an empty credential | measured (planned) |
| Resolution decision sites in scope | 3 | 1 module + 3 call sites with explicit policy inputs | measured (count) |
| Time for one bounded policy change (handoff exercise; the task was finalised in `handoff.md` §4.1 as a `demo` no-grant policy change, not the hosted-admin change first named here) | 7 m 08 s at `50fa2dc` | 16 m 27 s at `2b1ae0f` — longer, with higher confidence and automated spill-over detection; see `handoff.md` §4.4 | measured; self-performed by the author, n = 1, AI-assisted, descriptive only |
| Tests naming the resolution logic | 0 files | Contract test + one test per fix in §5 | measured |
| `npm test` wall time | 21.05 s, 25 suites, 191 tests (§12-4) | Reported, not a target | measured |

*Estimate:* "add a provider" would drop from ~5 edit sites to the catalog plus the SDK adapter.

## 10. Effort and timeline

- **Budget:** 6–8 h focused, per the brief; actual effort reported in `directive.md`'s appendix.
- **Normal plan (3 calendar days):** Day 1 — baseline measurements, this file, `directive.md`, quality yardstick. Day 2 — agent-implemented extraction under the directive; my review; correction/rejection example; decision record. Day 3 — before/after runs, handoff exercise, review checklist, Loom.

## 11. Review history of this document

Drafted with Claude (Opus 5) from my code reading and git history; critiqued in rounds by Codex (gpt-6-astra) and Kimi (K3), archived in `quest/council/`; ships only on unanimous approval. Ranking and scope decisions are mine.

- **v1 → v2** (round 1, both CHANGE): withdrew the reviewer-credit-loss claim (path unreachable); substitution stated for all three routes; separated preserved policy from fixes (§5); corrected affected users; precise trim history and `assess.ts` description; added §12; removed the causal claim that missing tests caused drift; fixed review-history tense.
- **v3.1 → v3.2** (2026-09-22, results): §9 timing row filled from `handoff.md` §4.4 and the exercise's final task named; no other change.
- **v3 → v3.1** (third-reviewer cold read, fresh-context Opus, 2026-09-21): §2 statuses marked as frozen with a pointer to actual outcomes; §7 gains the post-implementation limitation on fix-1's reach; unused worst-case plan cut. No measured value changed.
- **v2 → v3** (round 2, both CHANGE): "silently" replaced by the precise reporting distinction; hosted-admin condition narrowed to *no key supplied + verified admin*; "reported as such" removed (would be a third behaviour change → follow-up); admins no longer listed under trim drift; public-demo visitors added; `assess.ts` summary completed (credential skipping, failure logging, fallback marker); 503 attributed to the route, not `demoAvailability()`; "leading-whitespace"; cuts: hiring history, Paprika detail, §5 meta-intro, redundant §9 sentence.

## 12. Reproduction commands for measured values

Run from the repository root at `50fa2dc` (Git Bash / POSIX shell).

1. Differing lines between the two main routes — `141`:
   `diff <(sed 's/^[ \t]*//' src/app/api/evaluate/route.ts) <(sed 's/^[ \t]*//' src/app/api/evaluate/scheduled/route.ts) | grep -c '^[<>]'`
2. Commits touching the flow — `13`; with `fix:` — `5`:
   `git log --oneline -- src/app/api/evaluate src/app/api/demo/evaluate src/lib/ai/assess.ts src/lib/ai/catalog.ts | wc -l`
   `git log --oneline -- src/app/api/evaluate src/app/api/demo/evaluate src/lib/ai/assess.ts src/lib/ai/catalog.ts | grep -c '^[0-9a-f]* fix'`
   Trim-fix commit and its files: `git show --stat a63fab4` (touches `src/app/api/evaluate/route.ts`, `src/app/api/ats-score/route.ts`, `src/lib/keys/store.ts`). Creation dates: `git log --diff-filter=A --format='%h %ad' --date=short -- src/app/api/demo/evaluate/route.ts src/app/api/evaluate/scheduled/route.ts` → `29e40ba 2026-09-09`, `8215f27 2026-09-11`.
3. Test files naming the routes — `0`:
   `grep -rlE "api/evaluate|demo/evaluate|allowFallback|configured\[0\]" src --include="*.test.ts" --include="*.test.tsx" | wc -l`
4. Baseline test run — `25 suites, 191 tests, 21.05 s` (single run, 2026-09-20, Windows 11, Node v24.11.1):
   `npx jest --ci`
