# Council round 2: critique a concrete pick

You are ONE advisor on a small panel. Write your answer directly in this response. Do not delegate, do not spawn subagents, do not wait. Under 450 words. Be blunt; your job is to find what is wrong with the proposal, not to restate it.

## Context (from round 1)
Hiring "Quest": "Make AI-Assisted Code Easier to Trust and Change." 6–8h budget. Pick ONE recurring quality problem in ONE user-facing flow of a small repo you own; compare ≥3 problems; baseline; implement a focused change with an AI agent under a written directive; keep one corrected/rejected AI output; before/after checks (correctness + a measure like execution time, requests per op, or steps to modify); decision record; handoff exercise + review checklist. Deliverables: Loom (5 min), intent.md, directive.md. Scoring: problem selection 20, engineering & review 30, verification & maintainability 25, human+AI workflow 15, handoff 10. Pass ≥76. Adapting existing work is allowed if pre-existing vs. changed is labelled.

Round 1 split: Kimi said adapt Paprika (Next.js paper→infographic app, one flow, no tests); Codex said build a new tiny synthetic service for reproducibility.

## New information
The candidate (Iqbal) previously built **InterviewMate** for a *different* quest at the *same company* (AI Product Developer role). That hiring was postponed indefinitely and he was redirected to this role/quest. So the reviewers likely already know InterviewMate. It was built fast, AI-assisted, under deadline. It has 15 Jest test files, Cypress config, 136 commits.

## The proposal to critique
Use InterviewMate. Flow: **transcript → AI evaluation**. Problem: the "resolve provider → resolve API key → build fallback chain → call `assessEvidence`" logic is hand-rolled in three routes — `src/app/api/evaluate/route.ts` (114 lines), `src/app/api/evaluate/scheduled/route.ts` (113), `src/app/api/demo/evaluate/route.ts` (99) — with ~141 differing lines between the first two, and the header/fallback-key parsing reappears in `src/app/api/reviewer/invitations/route.ts` and `src/app/api/reviewer/sessions/route.ts`. Recent git log is mostly `fix:` commits on the evaluation/review flow. Proposed change: extract a single `lib/ai/provider-resolution.ts` with table tests; routes become thin. Metric: files touched to add a 4th provider (steps-to-modify) before vs after, done live as the handoff exercise; plus test count and a table test proving the three routes make identical provider/key decisions for identical inputs. Alternatives to rank against: (2) the silent provider-fallback chain in `src/lib/ai/assess.ts` (unreliable retries / hidden cost), (3) repeated `PROVIDERS.filter(env)` + session-doc reads in the scheduled route. Non-goals: realtime/audio, integrity, UI, scheduled-session auth model. Reviewer reproduces with `npm test` (assessEvidence already mocked in `src/lib/ai/__tests__`).

## What to do
You have READ access to the repo in your working directory. Read ONLY these files, nothing else (do not run npm, do not explore further):
- src/app/api/evaluate/route.ts
- src/app/api/evaluate/scheduled/route.ts
- src/app/api/demo/evaluate/route.ts
- src/lib/ai/assess.ts
- src/lib/ai/catalog.ts
- src/lib/ai/__tests__/evaluation.test.ts

Then answer:
1. Is the duplication claim real and is it the *right* problem to pick vs alternatives (2) and (3) — or is there a better one visible in these files? Rank the three by user impact / maintenance effort / operating cost, briefly.
2. Biggest risks of choosing InterviewMate over Paprika given the same-reviewer situation (perception, scope, provenance). Is "recycling" a real danger?
3. Is the metric (files-touched-to-add-a-provider + table test) convincing to a skeptical reviewer, or too soft? Propose a sharper one if so.
4. One thing in the plan you would cut or change to fit 6–8h.
End with: KEEP / CHANGE / REJECT and one sentence why.
