# Review task: critique intent.md v1 for a hiring Quest

You are ONE reviewer on a three-model panel (Claude drafted; you and one other model critique; three rounds; the document ships only when all three approve). Write your critique directly in this response. Do not delegate, spawn subagents, or wait. Make exactly ONE file read (this bundle) and no other tool calls. Under 500 words.

## What intent.md must do (from the Quest brief)
Answer "Why this problem?" Include: the other problems considered, prioritization criteria and scores if used, why this option ranked first, affected users, evidence, intended value, and non-goals. Label synthetic data, untested assumptions and estimates. Distinguish measured values from estimates; do not claim team-wide impact from a local test. Identify what pre-existed vs. what was changed for the Quest; do not claim retrospective instructions were written before the original work. No secrets or personal candidate/customer data.

## Rubric it is scored against (relevant slices)
- Problem selection and scope (20): the change targets an evidenced recurring cost or risk; the alternatives and baseline are explicit.
- Verification and maintainability (25): before-and-after evidence is reproducible.
- Communication and handoff (10): another engineer can understand the system; the three submissions (Loom, intent.md, directive.md) are consistent.
Anchors: 75% = solid demonstrated result with limited gaps; 100% = complete, well-verified, clear judgment.

## Your job
1. **Fact-check** every code claim in intent.md against the three route files and assess.ts included below (line numbers, defaults, the substitution behaviour, the credit-consumption ordering, trim). Flag anything wrong or overstated.
2. **Rubric gaps**: what would a skeptical reviewer dock points for? Be specific (section + what is missing or weak).
3. **Cuts**: anything that adds length without adding score.
4. **Wording**: any claim that reads as fabricated, unlabeled estimate, or overclaim.
End with a verdict line: `APPROVE` (ship as is) or `CHANGE` followed by the 3 most important changes, ordered.
