# Kimi K3 — decision-record.md v1 + review-example.md v1, round 1 (2026-09-21)

## decision-record.md v1

**Fact-check.** Core claims verify against the bundle: resolver is 89 lines (3e ends at line 89); fix-1 matches `provider_not_configured` (provider-resolution.ts:74-75) and Kimi's 503 trace; fix-2 matches the trim at `:65`; 703/7/25 baseline, 949 = 214+735, d09182e = H, nit attributions (Codex nit 1, Kimi dead-surface and aliasing), and "both reviewers flagged" the gated `"openai"` divergence all check out. Final `evaluate` policy literals match 3f.

**Problems.**
1. **Y3 evidence misstates the measurement.** Agent-notes (3d) ran `git diff -w --stat e25d63e` → scheduled 37, demo **40**, evaluate 46. The record claims range `50fa2dc..e5bd47b` with demo 44 ("40 + 4-line comment") — plausible given e5bd47b, but asserted, not shown, and the range mismatch is unexplained. State the actual command or reconcile.
2. **Unverifiable load-bearing claims:** the June fix `a63fab4` (sha absent from bundle), "no test named any of the three routes", and "the scheduled UI sends the default (`true`)" — the last carries §6's "none is known" risk assessment with no evidence pointer. Cite where each is checkable or soften.
3. **Alternative D attribution:** "Caught by both reviewers in directive round 1" — the bundled reviews are code reviews of the production diff; they support the substance, not the venue. Fix or drop "directive round 1" (same caution applies to "Rejected in intent.md v2" in A).

**Rubric:** alternatives B–E are genuine with honest trade-offs, not strawmen; decided items are explained. No cuts needed.

**Consistency:** two changes, non-goals, and follow-ups all match intent.md §5/§8.

## review-example.md v1

**Fact-check.** Example 2 verifies fully: gpt-6-astra, 701 `preserved` failures, cross-realm cause, the `observable` check (`:466`) already passing, one-line fix, 703/7/25 re-run, `d09182e` — all match 3c. Example 1's substance matches 3d "Review interventions" (schema duplicated in two branches, sent back; reviewer renamed to `resolution`, removed the bare block, `const` for lint); the final-code block matches 3f:43-70 with the schema elision labelled; literals match the resolver's union type.

**Problems.**
1. **Provenance gap exactly where fabrication suspicion lands.** "Codex `gpt-5.6-luna` (effort xhigh)" appears nowhere in the bundle — agent-notes names no model for route wiring (the only named wiring-era model is gpt-6-astra). Since v1 was never committed, the "63" and "45" line counts are also unattested. Point to where these are recorded (review log, `1a1a920` message body) or drop the specifics — the doc's own "no fabrication" standard demands it.
2. **"route harness 735/735" for the rejected version** is only checkable once scheduled/demo were already wired; commit order (3g) supports it, so say so in half a clause.

**Rubric:** risk explanations are specific and honest — "No functional risk — the harness proved it" is exactly the accountable judgment the rubric wants; "why the agent did it" is fair, not flattering. Cut candidate: "What these two say" bullet 3 restates the directive's value without adding score.

**Consistency:** no conflict with intent §5/§8 or directive Part 3; example 1 touches only `evaluate` wiring, behaviour preserved.

---

decision-record: CHANGE: (1) reconcile Y3 diff range/numbers with agent-notes (e25d63e base, demo 40 vs 44); (2) cite or soften unverifiable claims (a63fab4, scheduled UI default, no-tests claim); (3) correct the "directive round 1" attribution in alternative D
review-example: CHANGE: (1) source or drop the gpt-5.6-luna attribution and the 63/45 counts; (2) anchor the 735/735 claim to the wiring commit order; (3) trim workflow bullet 3

