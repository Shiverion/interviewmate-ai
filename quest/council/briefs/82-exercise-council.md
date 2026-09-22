# Council question: the handoff exercise — is a timed self-performed run necessary, and how should it be done?

You are ONE of three independent advisors. Answer directly; do not delegate, spawn subagents, or wait. Make exactly ONE file read (this bundle) — the Opus advisor may also read quest/handoff.md, quest/intent.md, quest/agent-notes.md and quest/agents.md read-only. Under 400 words. Give a recommendation, not a survey.

## Context
A hiring Quest ("Make AI-Assisted Code Easier to Trust and Change"). Everything is council-approved and committed except `handoff.md` §4.4 — the record of a handoff exercise — which is a stated ship gate. The candidate (Iqbal) asks two things.

## Question 1 (from Iqbal)
"For the timed exercise, don't we already include agent-notes.md and agents.md, so it won't be necessary for me to count my own timed exercise?" — i.e. can the self-performed timed run be skipped because those documents exist?

## Question 2 — a second opinion (from a separate ChatGPT session) proposes:
(a) Final §4.4 shape: the existing 5-row table filled with actuals, plus a limitation paragraph: "self-performed (n=1); the after run benefited from familiarity gained during the before run, so the timings are descriptive only and not evidence of team-wide productivity or another engineer's experience." If AI was used in the exercise, state "Exercise mode: self-performed, AI-assisted" and name model/workflow.
(b) If AI is used as the maintainability test: make it fair — BEFORE = fresh agent + baseline repo + same task + same model/effort + same human review gate; AFTER = fresh agent + refactored repo + same everything. Never BEFORE=manual, AFTER=AI with the time difference as evidence. Never reuse an agent that already knows the solution (5 cases, 6 rows, policy table) — must be fresh context or it is not a handoff test.
(c) Rename the metric row "Files to edit for a one-path policy change" → "Change surface and verification coverage", with Before: "1 production route; no route-specific contract harness guarded spill-over." After: "1 production policy literal + explicit resolver and route-test expectations; unrelated-path changes are detected by automated checks." Rationale: the improvement is not "fewer files" but "clearer where policy lives and easier to prove a change did not leak."
(d) Do not add new sections; finalize by: fix baseline SHA (already done — it is 50fa2dc) → perform exercise → fill §4.4 → propagate timing into §3 → finalize limitation → clean metric naming → final factual pass.

## What the Quest brief actually requires (verbatim)
Task 5: "Provide a handoff exercise another engineer can perform, a concise review checklist, and context sufficient to modify the code without you. Document observed feedback if available or demonstrate the handoff yourself and label that limitation."
Task 4: "Run meaningful before-and-after checks: correctness plus a relevant measure such as repeated failures, execution time, requests per operation or steps needed to modify the flow. Distinguish measured values from estimates; do not claim team-wide impact from a local test."
Rubric: Verification and maintainability (25) — "before-and-after evidence is reproducible; tests and context make future changes safer." Communication and handoff (10) — "another engineer can understand and change the system."
"Label synthetic data, mockups, untested assumptions and estimates. Do not fabricate ... tests ..."

## What the submission already has
- Measured before/after: harness failing 32 → 0 (703 preserved unchanged); env-based provider-choice sites in routes 3 → 0; provider attempts per path identical; suite 191 → 1140 tests.
- intent.md §9 promised: "Time for one bounded policy change (handoff exercise) — timed once on baseline; timed once after; n = 1, labelled." That row is still *pending* in intent §9, handoff §3, directive Appendix B.
- handoff.md §4.1–4.3: the exercise, its measured footprint (5 harness cases, 6 resolver rows, 1 hand-written attempts expectation — measured by performing it and reverting), a 50fa2dc "before" worktree and a 2b1ae0f "after" worktree, identical done-criteria for both.
- agent-notes.md: the implementer's record of building the change. agents.md: the roles/rules/review method. Neither performs the handoff exercise.
- The candidate has personally read the resolver and the three route diffs (recorded), and signed the review-example.

## Answer these
1. Is the timed self-performed run required by the brief, or only by our own intent.md promise? What is the minimum that satisfies Task 5 honestly, and what happens to the pending timing rows if the stopwatch is dropped (retract vs. perform)?
2. Evaluate the second opinion's (a)–(d). Which parts to adopt, which to reject, and why — especially (b): is a fresh-agent before/after a better "another engineer" proxy for an AI-native role than a stopwatch on the author, or a worse one? Could both be done cheaply (agent run ≈ minutes; the author's run ≈ 30–45 min)?
3. Recommend ONE concrete plan for closing §4.4 today, with exact labels/limitations to write.
End with a one-line recommendation.
