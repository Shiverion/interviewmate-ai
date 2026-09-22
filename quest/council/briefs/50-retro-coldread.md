# Cold read: four closed Quest documents — independent third-reviewer pass

You are an independent reviewer with no involvement in drafting. Four documents for a hiring Quest ("Make AI-Assisted Code Easier to Trust and Change") were each approved by two other reviewers (Codex and Kimi K3) over up to three rounds. You are the third reviewer, added afterwards. Read the documents and the evidence listed below, then give a verdict per document. Under 700 words total. Be adversarial on facts and on rubric fit; do not re-litigate style or re-run three rounds.

## The Quest brief (relevant parts)
- intent.md: "Why this problem?" — other problems considered, prioritization criteria and scores, why this ranked first, affected users, evidence, intended value, non-goals. Label estimates and untested assumptions; distinguish measured from estimated; identify pre-existing vs Quest work; no retrospective-instruction claims; no secrets or personal data.
- directive.md: final working instructions — objective, scope, requirements, completion criteria — plus a clearly labelled results/handoff appendix (links, reproduction steps, checks and actual results, AI contribution and corrections, limitations). Also the initial directive for an AI coding agent: context, task boundaries, acceptance criteria, tests, review responsibilities; a quality yardstick.
- decision record: alternatives and trade-offs.
- code-review example: an AI output corrected or rejected, with the risk explained.
- Scoring: problem selection & scope 20; engineering & review quality 30; verification & maintainability 25; human & AI workflow 15; communication & handoff 10. 75%-anchor = solid result with limited gaps; 100% = complete, well-verified, clear judgment and handoff. Do not fabricate; label synthetic/estimates; distinguish your work from AI output.

## Files to read (read-only; do not edit anything)
Repo root: <repo root> (branch quest/trust-and-change at d06789a)
1. quest/intent.md
2. quest/directive.md
3. quest/decision-record.md
4. quest/review-example.md
Evidence you may consult to fact-check (read what you need): quest/agent-notes.md; quest/council/README.md; quest/council/code-review-codex.md and code-review-kimi.md; quest/council/rejected-evaluate-route-v1.patch; quest/council/luna-job-reports.md; src/lib/ai/provider-resolution.ts; src/app/api/evaluate/route.ts; src/app/api/evaluate/scheduled/route.ts; src/app/api/demo/evaluate/route.ts; src/lib/ai/assess.ts; src/app/(public)/interview/page.tsx lines 296-336; `git log --oneline 50fa2dc..d06789a`. You may run read-only git commands (log, show, diff --stat) and grep. Do not run npm/jest.

## What to look for
1. Factual errors or unverifiable load-bearing claims that the two prior reviewers could have shared a blind spot on.
2. Internal inconsistencies ACROSS the four documents (numbers, commit shas, what is claimed as preserved vs changed, what is labelled measured vs estimated, tense/status claims).
3. Anything that reads as fabricated, overclaimed, or as retrospective instruction.
4. Rubric gaps a skeptical human reviewer would dock.
5. One thing per document you would cut.

## Output
For each of the four documents: 2–5 bullet findings, then a verdict line `<doc>: APPROVE` or `<doc>: CHANGE: <≤3 ordered one-sentence changes>`. Finish with one line on cross-document consistency.
