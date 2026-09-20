# Kimi K3 — handoff.md v3, round 3 (2026-09-21)


**Codex item 1 (§4.1 observable effects):** Fixed and accurate. §4.1 now states the two real effects — the `assessEvidence` `(provider, key)` tuple `(requested, undefined)` → `(first configured, trimmed key)`, and the `claimEvaluation` provider id — and explicitly says the SDK attempt sequence is unchanged. This matches the bundled `assess.ts:30-42` evidence: index-0 with no credential hits `continue`, so the empty-credential primary was already skipped; attempts stay `["openai"]`. The explanation that the harness attempt case flips only because it also asserts the resolved tuple is correct.

**Codex item 2 (checklist item 2):** Retitled to what the grep proves ("No env-based resolution left in the routes"), with the five-literal policy check made an explicit reading step, including the honest caveat that grep cannot prove it. Both halves addressed.

**Opus/Kimi nits:**
- Six resolver rows enumerated, with the resolver-test-vs-harness asymmetry explained both ways (no availability gate in the resolver test; `demoAvailability()` 503s the `gemini only` cases in the harness). Arithmetic hangs together: 6 − 2 + 1 (attempts case) = 5 harness cases.
- 704/7/24 re-tag is mechanistically explained and verified: after the generator edit, `provider` becomes the substitute (non-gemini), so `provider === "gemini"` is false for the `one empty-string` case → `fix-2` → `preserved`; 703/7/25 → 704/7/24, sum stays 735. Matches the simulation evidence exactly.
- §3 parenthetical now distinguishes inspection (3 sites) from the narrower grep (2), resolving my round-2 nit.

**Attempts-case hidden step:** Accurate and useful — the full-exercise evidence (1 failed / 734 passed, failing case = the hand-written attempts expectation near line 763) confirms the generator fix alone leaves exactly that one failure. A doer would otherwise have been stuck; now they won't.

**New inconsistencies:** None found. Failing-count axis in §3 (0/7/25) vs tag-total axis in §4.1 (703/7/25) are clearly labelled; footprint edit matches the §1.2 no-grant literal; change log faithfully describes the v3 diff. §4.4 pending remains the stated ship gate.

APPROVE

