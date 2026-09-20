# Kimi K3 — intent.md round 3 (final) review (2026-09-20)

**Round-2 points: resolution check**

1. **§1 "silently" contradiction — resolved.** §1 now states the precise distinction: "the response carries the provider actually used, but nothing identifies that a substitution happened." Matches A-a exactly; no concealment claim remains.
2. **§12-1 whitespace label — resolved.** §4 A now reads "after leading-whitespace stripping," which is what `sed 's/^[ \t]*//'` actually does.
3. **Both cuts — resolved.** The Paprika implementation parenthetical is gone from §4 alternatives; §9's redundant disclaimer sentence is gone (§2's blanket disclaimer covers it).

**Fact-check against code excerpts (all pass)**

- Substitution sites: scheduled `:41-42` (`find || configured[0]`, flag only gates fallbackKeys at `:61-65`) ✓; evaluate admin path `:47-48`, gated by `hostedAdmin = !key && isVerifiedAdminRequest` at `:42` ✓; demo grant path `:42-46` ✓.
- Defaults: scheduled `default(true)` `:19`, demo `default(false)` `:18`, evaluate header-or-hostedAdmin `:55` ✓.
- Trim drift: evaluate `:51` and scheduled `:63/:68` trim; demo passes `process.env[...]` untrimmed at `:54` and `:58` ✓. Admins correctly excluded from trim-drift victims (their keys come via `:51`) ✓.
- Fallback-marker logic: `providerDiagnostic(..., provider, index > 0)` at `assess.ts:61` — since routes pass the already-substituted provider, first-choice success reports `false` ✓.
- Charge-before-attempt at demo `:48-49`; the withdrawal guard holds: `demoAvailability()` (ledger `:91-93`) returns 503 pre-charge when OpenAI is unconfigured, so `configuredProviders` is non-empty past `:33` ✓.
- §3's `assess.ts` walkthrough matches the excerpt line-for-line (no-evidence `:23-29`, choices `:30-38`, credential skip `:39-42`, success return `:60-63`, failure logging `:65-76`, throw `:93`) ✓.

**Estimates/overclaims:** All baselines are either *measured* with a §12 command or explicitly *planned*; §9's edit-site projection is marked *Estimate*; §6 scores are labeled judgment. No retrospective or unlabeled claims found.

**Rubric risk:** Problem selection (20) — dated recurrence trail, real user-facing symptom, verified evidence. Verification (25) — every number reproducible via §12. Communication (10) — provenance table and change log are clean. Nothing left to dock.

APPROVE

