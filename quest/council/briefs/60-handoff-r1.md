# Review task: handoff.md v1 — ROUND 1 of 3 (three independent reviewers)

You are ONE of three independent reviewers (fresh-context Opus, Codex, Kimi K3). Write your critique directly in this response. Do not delegate, spawn subagents, or wait. Make exactly ONE file read (this bundle) and no other tool calls — unless you are the Opus reviewer with repo access, in which case you may also read the source files it cites, read-only. Under 500 words.

## What the Quest requires of this document
"Provide a handoff exercise another engineer can perform, a concise review checklist, and context sufficient to modify the code without you. Document observed feedback if available or demonstrate the handoff yourself and label that limitation." Also "a compact quality-metrics and handoff note" linked from directive.md. Rubric slices: Verification and maintainability (25) — "tests and context make future changes safer"; Communication and handoff (10) — "another engineer can understand and change the system".

## Your job
1. **Could you, from §1 alone, make a policy change to one path without asking the author?** Name the first thing you would have had to look up that §1 does not tell you.
2. **Fact-check** every line reference, number and claim in §1–§3 against the evidence (code excerpts, decision-record §5, agent-notes). The "things you might assume that are false" list (§1.5) — is each one actually false?
3. **The exercise (§4)**: is it genuinely bounded and doable in under an hour by a stranger? Is the "before" version (§4.2) a fair comparison or rigged? Does the expected footprint match what the tests would actually require? Any hidden step?
4. **The checklist (§2)**: concise enough to use, complete enough to catch the failure modes this change was about? Anything redundant or missing?
5. **Metrics table (§3)**: measured vs estimated labelled correctly; nothing claimed that Appendix B or decision-record does not support.
End with `APPROVE` or `CHANGE: <≤3 ordered one-sentence changes>`.
