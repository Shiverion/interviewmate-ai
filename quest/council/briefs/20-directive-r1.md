# Review task: directive.md v1 — ROUND 1 of 3

You are ONE reviewer on a three-model panel (Claude drafts; you and one other model critique; ships only on unanimous approval). Write your critique directly in this response. Do not delegate, spawn subagents, or wait. Make exactly ONE file read (this bundle) and no other tool calls. Under 500 words.

## What directive.md must be (Quest brief)
"The final working instructions developed from intent.md, including objective, scope, requirements and completion criteria. Add a clearly labelled results/handoff appendix with artifact links, reproduction or viewing steps, checks and actual results, AI contribution and corrections, and limitations." It must also serve as the *initial directive for an AI coding agent*: context, task boundaries, acceptance criteria, tests and review responsibilities; plus a short quality yardstick. This v1 is issued BEFORE implementation, so the appendix is a labelled empty template — that is expected, do not penalize it; DO penalize any placeholder that could be mistaken for a result.

## Rubric slices it feeds
- Engineering and review quality (30): implementation works, reduces complexity/risk, technically sound review and trade-offs.
- Verification and maintainability (25): before/after evidence reproducible; tests and context make future changes safer.
- Human and AI workflow (15): agent instructions, review boundaries, and a correction/rejection demonstrate accountable judgment.
- Communication and handoff (10): another engineer can understand and change the system; Loom/intent/directive consistent.

## Your job
1. **Consistency with intent.md v3** (included): does the directive implement exactly the two behaviour changes from intent §5, preserve exactly what §5 preserves, and respect §8 non-goals? Flag any drift.
2. **Technical soundness** against the code excerpts: is the module contract (Part 4.1) sufficient to reproduce each route's current policy? Is the route wiring (4.2) correct — especially `evaluate`'s hostedAdmin key merge, `demo`'s no-grant path, and the accounting-order constraint? Would the baseline-capture test (Part 5.4) actually produce a defensible "before" number?
3. **Agent-instruction quality**: is anything ambiguous enough that a competent coding agent could do the wrong thing while believing it complied? Anything missing that the brief requires (acceptance criteria, tests, review responsibilities, yardstick)?
4. **Cuts**: what adds length but no score?
End with: `APPROVE` or `CHANGE` followed by the 3 most important changes, ordered.
