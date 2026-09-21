# agents.md — how the AI agents were used, ruled, and checked

**Quest:** Make AI-Assisted Code Easier to Trust and Change · **Branch:** `quest/trust-and-change` · **Date:** 2026-09-21 · **Draft:** v3.1 (change log at end)
**Author:** Muhammad Iqbal Hilmy Izzulhaq. Drafted with Claude (Opus 5) from the session record; under three-reviewer council review.
*Optional document (the brief's "agents.md: agent context, rules, roles and collaboration"). It exists so the human-and-AI workflow can be judged from one page instead of reconstructed from the 31 artefacts and 17 briefs (plus their README) in `quest/council/`.*

---

## 1. The one-sentence version — with its qualifications

One orchestrating model drafted every document and made every commit; the code was written by other models under a written directive with stop rules — the baseline commit by a top-tier model, the three route commits by a cheaper one after a cost rule was introduced; every document and the production diff were reviewed by independent reviewer sessions — models that did not draft them, running with no memory of the drafting conversation — **two** for the first four documents and the diff, **three** from `handoff.md` on, plus one retroactive third-reviewer pass over the four earlier documents; nothing shipped without unanimous approval of whoever was on the panel at the time; the human made the decisions that forked the outcome and owns the record. Every critique — including the ones that were wrong — is archived verbatim in `quest/council/`, and every brief the reviewers received is in `quest/council/briefs/` (17 briefs; the bundles' draft and evidence sections are reproducible from the commits the briefs name).

## 2. Roles

| Role | Who | May | May not |
|---|---|---|---|
| **Human** | Iqbal | Choose the problem; set the rules (three rounds, unanimity, model tiering); approve the contract table before any route edit (`e25d63e`); accept or reject the branch; read the resolver and the three route diffs (2026-09-21, recorded in `review-example.md`). **Still pending at v3.1:** the timed handoff exercise, the sign-off in `review-example.md`, the Loom (`effort-log.md`, "not yet done") | Delegate accountability — reviewers advise, the human decides |
| **Orchestrator / author** | Claude Opus 5 (this session) | Survey the code; draft every document; build review bundles; diagnose failures; apply directive Part 7 — the human's review responsibilities: the contract-table gate (exercised by Iqbal) and the six-step per-commit checklist (exercised by Claude under delegation) — to every implementer diff; commit on implementers' behalf | Count its own approval as a review; edit a forbidden file; loosen a test to make it pass |
| **Implementer** | Codex `gpt-6-astra` — commit H (`d09182e`: resolver, contract tests, harness), before the cost rule existed; Codex `gpt-5.6-luna` at effort xhigh — the three route commits (`0d88121`, `a800008`, `1a1a920`) | Work only inside the directive's Part 3 file list; write the tests the directive names; stop on the directive's stop conditions and report | Touch an existing test; add a dependency; change behaviour outside the two declared fixes; patch expectations to make a baseline pass |
| **Reviewers** | Codex `gpt-6-astra` (intent, directive, code) → `gpt-5.6-sol` xhigh from `decision-record.md` when astra's quota ran out; Kimi K3 throughout; a fresh-context Claude Opus subagent from `handoff.md` on, plus one retro pass over the four closed documents | Read exactly the bundle (the Opus reviewer: also the repo, read-only); fact-check every claim; return APPROVE or CHANGE with ≤3 ordered changes | Edit anything; see the drafting conversation; approve on style |

**Independence, defined.** A reviewer is independent if it (a) did not draft the document, (b) has no memory of the drafting conversation, and (c) runs in its own session with only the bundle (and, for one reviewer, the repository) as input. The third reviewer is the same *model* as the author — Claude Opus 5 — but a separate subagent with a fresh context, so (a)–(c) hold; what it shares with the author is training, not state. The drafting session's own approval never counts. This was not the rule from the start — §6.

## 3. Rules the agents worked under

**Implementers** — from `directive.md` (frozen at the version the agent received; edits logged in its Appendix A):
- Confirm the per-route behaviour table (Part 2) against the code before editing; stop if they disagree (Part 6).
- Files they may create or edit are listed; a longer list is forbidden (Part 3). Two behaviour changes, named; everything else preserved.
- Tests first: commit H = module + contract tests + route harness with **zero** route edits, so the harness measures the unmodified routes (5.3). Then the human approves the contract table (Part 7 gate). Then one commit per route (Part 6).
- Stop conditions (Part 6): a `preserved` case failing at baseline; needing a forbidden file; an unrelated existing test failing; the Part 2 table and the code disagreeing.
- Deliver `agent-notes.md`: assumptions, anything found inaccurate, anything not verified.
- Two rules came from the launch prompts, not the directive: *you are one agent — write the answer directly, do not delegate* (after an early Codex run spawned its own sub-agents and parked), and *do not run git write commands* (Codex's sandbox cannot write `.git`).

**Reviewers** — from the archived briefs (`quest/council/briefs/`):
- Exactly one file read, no other tool calls (every brief). Kimi's API allows 3 requests/minute, so every review is one bundle it reads once; the same constraint was applied to Codex for parity; the Opus reviewer additionally had read-only repo and git access (briefs 50, 60–62, 70).
- Fact-check line references, numbers, commit shas and quotes against the evidence in the bundle (every brief from 10 on).
- "Flag anything wrong, unverifiable from the bundle, or overstated" (brief 40); "unverifiable flagged as unverifiable, not wrong" was Kimi's own phrasing of that instruction.
- Brief 21 (`directive.md` round 2), verbatim: "Block only for things that would produce wrong code, an unreproducible number, or a rubric loss — not style." Brief 22 (round 3), verbatim: "Block (CHANGE) only for something that would produce wrong code, an unreproducible number, a contradiction with intent.md, or a rubric loss — not style." Brief 12 (`intent.md` round 3) says "Block (CHANGE) only for something that would cost rubric points or is factually wrong — not for style. If you block, give at most 2 changes"; the confirmation briefs (42, 62, and the handoff/agents final rounds) carry a checklist and the verdict format but no block rule.
- End with `APPROVE` or `CHANGE: <≤3 ordered changes>` (every document brief from 10 on; the code-review brief 30 used `APPROVE / APPROVE WITH NITS / REQUEST CHANGES`; the two problem-choice briefs 00–01 asked for a recommendation, not a verdict).

**Orchestrator:**
- Apply every CHANGE, or say in the archived record why not (author's notes appended to `intent-r1-codex.md`, `code-review-*.md`, `retro-coldread-opus.md`, `agents-r1-opus.md`).
- When reviewers disagree, verify against the code and record who was right (`handoff-r1-opus.md` note; `intent-r1-codex.md` note).
- State only measured numbers; label estimates.
- Commit with the implementer as co-author (verified: `git log --format=%b` shows a `Co-Authored-By: Codex …` trailer on each of `d09182e`, `0d88121`, `a800008`, `1a1a920`); say in the message what is preserved and which fix applies.

## 4. The two loops

**Document loop** (`intent.md`, `directive.md`, `decision-record.md`, `review-example.md`, `handoff.md`, this file): draft v1 → bundle (brief + draft + evidence excerpts with line numbers, draft first because a single read can truncate) → the reviews launched together (session record; not independently verifiable from the archive) → apply → v2 → … up to three rounds; when a round-3 verdict still asked for a change, the change was applied and every reviewer confirmed the amended text before it shipped (`directive.md` v3.1, `review-example.md` v3, `handoff.md` v3). Panel size: two reviewers for the first four documents, three from `handoff.md`.

**Code loop:** directive → implementer produces commit H → orchestrator runs the harness and the Part 7 per-commit checklist → human approves the contract table → implementer wires one route at a time, reports, stops → orchestrator reviews the diff (files ⊆ Part 3; hunks inside the resolution region; accounting lines byte-identical; `assessEvidence` call shape unchanged; tags right) and commits, or sends it back with a concrete target shape → after all routes, **two** independent code reviews of the production diff (`code-review-codex.md`, `code-review-kimi.md`) → nits applied as a comment-only commit (`e5bd47b`).

## 5. What each round caught

| Where | What was wrong | Who caught it (per the archived text) | If shipped |
|---|---|---|---|
| `intent.md` v1 | Claimed reviewers lose credits on a no-key path | Kimi confirmed it; Codex doubted reachability; the author verified the path is unreachable and withdrew it | A false defect claim in the problem statement |
| `directive.md` v1 | The resolver contract would have added new refusals on `evaluate` (caught by both) and, on `demo`, a substitution on the no-grant path (Codex) / a new 503 refusal (Kimi) — undeclared behaviour changes inside a "preserving" refactor | Codex and Kimi, different defects on `demo` | Regressions the routes' users would have seen |
| `directive.md` v2 | `demo` always passes an object (`{}` when fallback is off) for `fallbackKeys`; the contract returned `undefined` → a `preserved` case would have failed at baseline | Codex | A meaningless baseline number |
| commit H | Harness compared `response.json()` bodies with `toStrictEqual`; undici parses in another realm → 701 `preserved` failures (`agent-notes.md`, attempt 1) | Implementer stopped correctly; orchestrator diagnosed — one line | The stop rule would have blocked the change indefinitely, or tempted someone to loosen assertions |
| `evaluate` route, first version | Duplicated the zod schema across two branches — 63 changed lines (`council/rejected-evaluate-route-v1.patch`); passed every test | Orchestrator, Part 7 per-commit review | A maintainability change reintroducing the smell it exists to remove |
| production diff | A dead-code divergence behind the availability gate (both); policy axes independent enough to re-create the fixed bug (Codex nit 1); `substituted` unused outside tests (Kimi nit 1); the caller path passing the browser-keys object by reference (Kimi, in its risk list — `code-review-kimi.md` line 23 — not one of its two nits) | Codex and Kimi | Would surprise a future change to the gate |
| `review-example.md` v1 | Quoted rejected code with no durable source | Codex sol (source) and Kimi (attribution, counts) | A fabrication concern; fixed by extracting the patch from the Codex session rollout |
| `decision-record.md` v1 | "Scheduled UI sends the default" — asserted, unverified | Kimi (`dr-re-r1-kimi.md`, problem 2) | Checking it found the UI *always* sends `allowFallback: true`, narrowing fix-1's reach |
| four closed docs | Status/tense drift between documents; two dangling file references; one overstated mitigation claim (`retro-coldread-opus.md`) | Fresh-context Opus, retro pass | Documents contradicting each other |
| `handoff.md` v1 | Exercise's stated outcome was wrong (fallback would rescue it); the "before" worktree already contained the harness; a "false assumption" that was true | Codex + Kimi (outcome); Opus with repo access (baseline); Codex + Kimi correct vs Opus on the bullet | A stranger following the exercise would have "verified" something that does not happen |
| `agents.md` v1 | §1 claimed three reviewers for every document; one §5 row credited the wrong reviewer; counts unreproducible; briefs not archived | All three (§1); Opus (row attribution, from the archive); Codex sol and Kimi (counts) | A method document overstating its own method |

Two rows record a reviewer being wrong, and one records this document being wrong about the others. The rows also split by what bundle-only reviewers catch (logic, claims) and what a repo-access reviewer catches (state, attribution, cross-document drift) — the reason the panel is three.

## 6. What changed in the method mid-way, and why

- **Model tiering (2026-09-21, after commit H).** Top-tier models were spending on implementation that a written directive already constrained. Rule: implement on cheaper models at maximum effort (`gpt-5.6-luna` xhigh); review on stronger ones. Commit H predates the rule and was written by astra.
- **Reviewer substitution.** `gpt-6-astra` hit its usage limit; `gpt-5.6-sol` (xhigh) took over from `decision-record.md`. Recorded per document in `council/README.md`.
- **Third reviewer.** Until `handoff.md`, the panel was two independent reviewers plus the drafting model, whose "approval" was the author's. The human asked why there were only two columns; a fresh-context Opus subagent was added and one retro cold read over the four closed documents found drift the other two structurally could not see. Every round since has three.
- **Commits.** Codex's sandbox cannot write `.git`; the orchestrator commits on its behalf, which is also where the diff review happens.

## 7. Costs, counted

| | Count | How counted |
|---|---|---|
| Codex jobs | 23, ≈43.5 min total runtime (largest 14 m 56 s, commit H) | plugin job store, `status --all`, at v2 |
| Kimi K3 invocations | 19: 17 that returned a review, 2 that died on the 3 RPM limit | output files in the working folder (15 present) + 1 in the first scratchpad + 3 in a since-deleted worktree, from the session record |
| Fresh-context Opus reviewer launches | 7: 6 returned a review (retro pass; `handoff.md` ×3; `agents.md` r1, r3), 1 died on the author's API session limit (`agents.md` r2) | subagent launches, counted like the Kimi row; the effort log is reconciled at submission |
| Human attention | 3–4 h so far, self-reported; pending items estimated in `effort-log.md` | — |

Incidents worth a line, stated plainly: (1) the first commit-H run (15 min, astra) ended in a correct *stop*, not a result; (2) while preparing the handoff worktrees, the orchestrator ran `Remove-Item` on a `node_modules` junction, which followed the link and **deleted the main checkout's `node_modules`** — restored with `npm ci` in about a minute, git untouched, ≈5 min lost; (3) an early Codex prompt that mentioned "council members" caused the model to spawn sub-agents and idle. Environment specifics (Kimi rate limit, `npx`, Jest realms, junctions) are in `effort-log.md`.

## 8. How to reuse this on another change

1. Write the directive first: the file list, the declared behaviour changes, the stop conditions, the review checklist, and **the baseline commit sha**. Freeze it; log later edits.
2. Have the implementer produce the tests and baseline **before** any production edit, in one commit, and stop for human approval of the expectations.
3. One production commit per unit; the reviewer applies the checklist to each and sends back with a concrete target shape rather than "make it better".
4. Review every document with three independent reviewer sessions that did not draft it, one of which can read the repository. Archive every critique and every brief verbatim, including the wrong ones and the author's replies.
5. Measure before you claim; label what you did not measure; recount before you publish.

**Minimal bundle template** (what every review round received):

```
# Review task: <doc> v<N> — ROUND <r> of 3
<role line: one of three independent reviewers; write directly; no delegation; one file read>
## What the brief requires of this document   <quoted from the Quest brief>
## Rubric slice(s) it feeds                    <criterion, weight, wording>
## Your job                                    <numbered: fact-check / gaps / cuts / consistency>
End with `APPROVE` or `CHANGE: <≤3 ordered one-sentence changes>`.
===== the draft =====
===== prior-round critiques (rounds ≥ 2) =====
===== evidence: numbered code excerpts, commands and their outputs =====
```

**Approval record:** one row per document per round in `council/README.md` (reviewer · verdict); each critique archived as `<doc>-r<N>-<reviewer>.md`, with the author's reply appended below a rule when a point is declined or a reviewer was wrong.

## Review history of this document

- v1 (2026-09-21): drafted from the session record and `council/README.md`.
- v3 → v3.1 (round 3: Codex `gpt-5.6-sol` CHANGE · fresh Opus CHANGE on the same blended quote · Kimi pending): §3 now quotes briefs 21 and 22 separately and exactly — brief 21 has no "a contradiction"; the v1→v2 history line corrected from 18 to 17 briefs; verdict-format claim narrowed (brief 30 and briefs 00–01 differ) and the Opus launch count made consistent with the Kimi row by counting the dead run (Opus nits).
- v2 → v3 (round 2: Codex `gpt-5.6-sol` CHANGE · Kimi CHANGE · fresh Opus — run failed on the author's API session limit before producing a review, re-run in round 3): brief count corrected to 17 + README (Codex sol); the "block only … not style" rule re-cited to the two briefs that carry it verbatim, with the final-round wording quoted separately (Codex sol, Kimi — both caught brief 62); §5 row 6's Kimi attribution made precise (risk list, line 23, not a nit) (Codex sol); "independent models" → "independent reviewer sessions" throughout (Codex sol); co-authorship verified from commit trailers and "in parallel" labelled session-record-only (Codex sol).
- v1 → v2 (round 1, all three CHANGE): §1 rewritten to state the two-reviewer period, the retro pass and the two-reviewer code review, and that commit H predates the cost rule (all three); §5 row 8 re-attributed to Kimi and rows 2 and 6 narrowed to what each reviewer actually raised (Opus, from the archive); 17 review briefs (plus a README) archived verbatim in `council/briefs/` and §3's reviewer rules attributed to the briefs that carried them; the "no delegation" and "no git writes" rules identified as prompt rules, not directive rules (Opus); counts recounted from the job store and output files and reconciled with the effort log (Codex sol, Kimi, Opus); the junction deletion stated as an incident (Codex sol); independence defined, including the same-model caveat (Codex sol); Part 7 labelled as the human's responsibilities with the gate exercised by Iqbal and the per-commit checklist by Claude under delegation (Kimi); pending human items stated in §2 (Opus); bundle template and approval record added, environment trivia moved to the effort log (Codex sol, Kimi); "three properties" paragraph shortened (Kimi).
