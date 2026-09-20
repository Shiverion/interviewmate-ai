# Fresh-context Opus (Claude Opus 5) — handoff.md v1, round 1 (2026-09-21)

Run with repo and git read access; asked to open the test files and identify which cases the exercise would flip.

**Q1 — change one path from §1 alone?** Nearly. The first thing I had to open was `provider-resolution.test.ts:155-165`: `evaluate hostedAdmin` and `demo grant` are not separate branches but one shared `for (const path of [...])` loop emitting the same literal and expectation. §1.4 step 3 says "change the branch for your path" — there is no such branch; the engineer must split the loop first. Second lookup: in the harness, the hosted-admin expected provider is `fixture.selected[requested]` (line ~262), and `fixture.selected` is shared with `scheduled` and `demo grant`. The recipe's "not the fixtures" warning is correct but does not say what to edit instead (the `hostedAdmin ? fixture.selected[requested] : requested` expression).

**Q2 — fact-check.** Line refs `evaluate:55-61`, `scheduled:38-47`, `demo:43-59`, `page.tsx:330-332`, decision-record §7-1 / "substituted test-only", 214 / 735 / 703 / 7 / 25, 25/191/21.05 s, 27/1140/12.6 s, Y3 diff sizes (37/44/46) all verify. I recomputed 735 and 214 from the generators; both exact. All five §1.5 items are genuinely false assumptions as stated (evaluate line 62 and demo line 60 throw on `ok:false`; both literals make it unreachable). One mismatch: §3 says "Env-based provider-choice sites: 3, measured by grep in checklist item 2" — that grep at `50fa2dc` returns **2** (evaluate, scheduled); demo's site is `?.id || "openai"` and does not match. The count is right, the stated method is not.

**Q3 — the exercise.** Bounded and doable; I estimate 30–45 min. What the tests actually require: resolver test — 6 rows flip (`evaluate hostedAdmin` × fixtures `openai only`×2, `gemini only`×2, `one whitespace-only`, `one empty-string`), after splitting the shared loop. Harness — 24 cases flip: `key=absent | admin=true | browser∈{present,absent}` × the same six (fixture, requested) pairs × both fallback values. `browser=malformed` (422), `env=none`, the `defaults`, `attemptRows` (uses env `all`) and short-circuit cases do not move. §4.1's footprint description is accurate but should state these numbers (6 + 24) so "done" is checkable.

**§4.2 is not a fair "before".** `e25d63e` is *after* H (`d09182e`); the harness, resolver and resolver test all exist there (`git ls-tree` confirms; the before-worktree contains `evaluation-routes.test.ts`). So "no test names the route" is false at that commit, and worse, the harness there has 32 fix cases failing by design, so the engineer sees 32+24 failures and must untangle them. The honest baseline is `50fa2dc`, which §3 itself uses as "Before". Also at `50fa2dc`, deleting `|| configured[0]` leaves `if (selected)` false → provider/key untouched (requested provider, `key` undefined) — the change is equivalent, good.

**Q4 — checklist.** Usable. Item 2's grep would not have caught demo's pre-change pattern (see above); add `|| "openai"` or generalise to "no `process.env[...env]` reads outside the resolver". Item 8's "≤ 50" is a rule invented from Y3; label it as a convention, not a measured constraint. Otherwise nothing redundant.

**Q5 — metrics.** Labelling is honest; §4 rows correctly marked pending. "harness 5.4 cases" should read "`agent-notes.md` §5.4" for traceability.

**CHANGE:**
1. Re-point the "before" worktree and §4.2 to `50fa2dc` (the harness already exists at `e25d63e`, so the stated comparison is invalid).
2. In §1.4 step 3 and §4.1, say the resolver test's hostedAdmin/demo-grant loop must be split and name the expected flip count (6 resolver rows, 24 harness cases).
3. Fix §3's "3 sites / grep" row: the grep finds 2; demo's site was `|| "openai"` — either widen the grep (also checklist item 2) or state the count is by inspection.

---
*Note (Claude):* Opus's Q2 finding that all five §1.5 bullets were "genuinely false" disagreed with Codex and Kimi on bullet 1; on re-reading, Codex/Kimi were right (the caller path with `allowFallback: false` does use the requested provider), and bullet 1 was rewritten in v2. Opus's flip counts (6 + 24) were for v1's exercise, which v2 replaced; the new exercise's counts (6 + 5) were measured by performing it.
