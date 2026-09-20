# Fresh-context Opus (Claude Opus 5) — handoff.md v3, round 3 (2026-09-21)

**Codex item 1 — resolved.** §4.1 now states both observables and both are actually asserted by the harness: the `assessEvidence` tuple (attempt case, line ~797) and the `claimEvaluation` provider id (`check()`, line 533 asserts `expected.observable.provider`; route line 62 passes `selectedProvider = resolution.provider`). The "what does not change" paragraph is correct against `assess.ts:37-42`: the empty-credential primary is `continue`d before any `evaluateWithProvider` call, so `attempts: ["openai"]` / `credentials: ["server-o"]` are identical before and after.

**Codex item 2 — resolved.** Item 2 is retitled "No env-based resolution left in the routes", which is exactly what the grep proves; the five-literal reading step is explicit and separate. I re-ran the grep at HEAD: exit 1, no output.

**Opus/Kimi nits — resolved.** The six resolver rows are enumerated and match my recount (`openai only`×2, `gemini only`×2, whitespace×1, empty×1; `none` correctly excluded since `configured[0]` is undefined there). The re-tag explanation is right: with `provider` becoming `openai`, `trims` at line 321 (`provider === "gemini"`) goes false for `one empty-string | gemini | fallback=true`, hence 704/7/24; the evidence block confirms it. The §3 parenthetical now reads cleanly ("0 in the routes … the one remaining site is `resolveProvider` itself").

**Hidden step — accurate and useful.** Line 314 is the single generator edit; the attempts case at line 763 has its own literal `expected: success("gemini", undefined, …)` and is not derived from the generator, so it must be edited by hand. The 734/735 simulation with only that case failing is the right demonstration.

**New inconsistencies.** None found. One optional tightening, not blocking: "Done when" (a) verifies only the `assessEvidence` tuple, while §4.1 names the `claimEvaluation` id as observable (ii); the harness checks (ii) automatically after, but a baseline engineer showing (a) by script will not have shown (ii) unless told. A four-word addition to (a) would close it.

§4.4 remains gated as stated; the gate wording is unchanged and correct.

APPROVE

---
*Claude:* the optional tightening was applied — done-criterion (a) now also requires `claimEvaluation` to record `"openai"`.
