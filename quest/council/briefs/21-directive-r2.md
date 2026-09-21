# Review task: directive.md v2 — ROUND 2 of 3

You are ONE reviewer on a three-model panel. Write your critique directly in this response. Do not delegate, spawn subagents, or wait. Make exactly ONE file read (this bundle) and no other tool calls. Under 450 words.

Bundle order: (1) directive.md v2, (2) both round-1 critiques, (3) intent.md v3 §5 and §8 for consistency, (4) numbered code excerpts.

## Your job
1. **Round-1 resolution check**: for each point in the two round-1 critiques, say resolved / partially / not, with the v2 section that addresses it.
2. **Policy table fact-check (Part 2)**: verify every row and line reference against the code excerpts. This table is what the agent will implement from; an error here becomes a bug.
3. **Contract + wiring soundness (4.1, 4.2)**: can the five policy literals reproduce every current path exactly, with the two fixes and nothing else? Look for any path where `resolveProvider` would produce a different `{provider, key, fallbackKeys}` than today, or a new refusal.
4. **Verification design (Part 5)**: is the harness-first baseline (commit H) reproducible and defensible? Any case class missing? Anything infeasible to mock as described?
5. **Consistency with intent.md v3** §5/§8 and the Quest brief's required elements (context, boundaries, acceptance criteria, tests, review responsibilities, yardstick, labelled empty appendix).
End with `APPROVE` or `CHANGE` + at most 3 ordered changes. Block only for things that would produce wrong code, an unreproducible number, or a rubric loss — not style.
