# Review task: decision-record.md v1 AND review-example.md v1 — ROUND 1 of 3

You are ONE reviewer on a panel (Claude drafts; you and one other model critique; each doc ships only on unanimous approval). Write your critique directly in this response. Do not delegate, spawn subagents, or wait. Make exactly ONE file read (this bundle) and no other tool calls. Under 550 words total, split across the two documents.

## What the Quest requires of these
- Decision record: "a decision record with alternatives and trade-offs" (rubric: Engineering and review quality 30 — "technically sound review and trade-offs").
- Review example: "keep an example of AI output you corrected or rejected and explain the risk" (rubric: Human and AI workflow 15 — "a correction or rejection demonstrate accountable judgment"). No fabrication: excerpts must be real; provenance labelled.

## Bundle order
(1) decision-record.md v1, (2) review-example.md v1, (3) evidence: both code-review records, the relevant agent-notes sections, the final evaluate route block, provider-resolution.ts.

## Your job
For EACH document:
1. **Fact-check** every claim against the evidence (commit shas, numbers, line refs, quotes, who-did-what). Flag anything wrong, unverifiable from the bundle, or overstated.
2. **Rubric gaps**: what would a skeptical reviewer dock? For the decision record: are alternatives real alternatives with honest trade-offs, or strawmen? Is anything decided but unexplained? For the review example: is the risk explanation convincing and specific? Is the "why the agent did it" fair rather than flattering? Is provenance of the rejected code clear enough that a reviewer would not suspect fabrication?
3. **Cuts**: what adds length but no score?
4. **Consistency** with intent.md §5/§8 and directive Part 3 (two changes, non-goals).
End with two verdict lines:
`decision-record: APPROVE` or `CHANGE: <≤3 ordered changes>`
`review-example: APPROVE` or `CHANGE: <≤3 ordered changes>`
