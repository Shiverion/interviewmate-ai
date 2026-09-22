# Design task: write the final pre-submission review prompt

You are the prompt designer for a final review panel. Do not review the submission yourself; produce the prompt the panel will receive. Write it directly in this response as plain text, ready to paste, under 700 words. No delegation, no tool calls beyond the one read of this file.

## Situation
A hiring Quest submission is complete and about to be pushed. Required deliverables: a ≤5-minute Loom (not yet recorded), `intent.md`, and `directive.md` whose Appendix B links every other artifact. The candidate wants one final panel answer: **submit as-is, or revise?** — from three independent reviewers who have NOT seen the work before: Kimi K3 (reads one bundle file; 3 requests/min API, so one read only), Claude Opus (fresh subagent; can read the whole repository and run read-only git), and GPT-6 astra at medium effort (reads the bundle). The panel must read the submission the way the hiring reviewer will: `intent.md` and `directive.md` first, then follow the links only as far as needed to score.

## The Quest brief's scoring (verbatim)
- Problem selection and scope 20: the change targets an evidenced recurring cost or risk; the alternatives and baseline are explicit.
- Engineering and review quality 30: the implementation works, reduces complexity or risk, and includes technically sound review and trade-offs.
- Verification and maintainability 25: before-and-after evidence is reproducible; tests and context make future changes safer.
- Human and AI workflow 15: agent instructions, review boundaries and a correction or rejection demonstrate accountable judgment.
- Communication and handoff 10: another engineer can understand and change the system; the three required submissions are consistent.
Pass ≥ 76/100. Anchors: 25% = claim or fragment with major gaps; 50% = partial result with important unresolved weaknesses; 75% = solid demonstrated result with limited gaps; 100% = complete, well-verified, clear judgment and handoff. Reviewers must cite submission evidence for each score.
Other rules: label synthetic data, estimates, untested assumptions; no fabricated tests/users/approvals; distinguish the candidate's work from AI output; identify pre-existing work vs Quest work; no retrospective-instruction claims; no secrets or personal data; open every link and verify access.

## What the prompt must make reviewers do
1. Score each criterion in whole points with a one-line evidence citation each, exactly as the hiring reviewer must — and state the total and pass/fail.
2. Name anything that would make a hiring reviewer distrust the submission: overclaim, unlabelled estimate, inconsistency between intent.md, directive.md and the linked artifacts, fabricated-looking evidence, missing link, or a claim the linked evidence does not support.
3. Judge whether the *quantity* of process documentation helps or hurts (the candidate has been warned about over-processing), and whether the core story is findable in the first two minutes of reading.
4. Distinguish "must fix before submit" from "would be nice" from "leave it" — and give a single final verdict: SUBMIT AS-IS, SUBMIT AFTER ≤3 NAMED FIXES, or REVISE.
5. Stay independent: no deference to the archived council approvals; those are the candidate's process, not the reviewer's evidence.

## Constraints on the prompt
- One prompt, identical for all three reviewers, with one clearly marked optional paragraph for the reviewer with repository access.
- Reviewers do one file read (the bundle) — the bundle will contain: the Quest brief, intent.md, directive.md in full, and the sections of the linked artifacts a scorer would actually need (decision record, review example, handoff §3–§4.5, agents §1–§2, effort-log summary, council README). Tell them what the bundle is and that it is the candidate's own selection of excerpts (so they may note if something they need is absent).
- Word limit for their answer: 600 words. Output format fixed so three answers can be compared side by side.
- Tone: skeptical hiring reviewer, not helpful colleague. No praise padding.

Produce the prompt now.
