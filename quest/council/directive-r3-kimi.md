# Kimi K3 — directive.md round 3 review (2026-09-20)

**Round-2 points — all resolved.**
1. `visitor` mock: 5.2 now mocks `@/lib/demo/http` with `visitor` only, `reply`/`sameOrigin`/`limitedJson` real — covers demo `:37`. Resolved.
2. Whitespace-only edge: 5.1 fixtures add "one whitespace-only value, one empty-string value" and pin both as unconfigured in every server policy; Part 3 states the fix-2 consequence (primary key `undefined`). Resolved.
3. Missing preserved cases: 5.2 adds `x-openai-key`, malformed fallback header with fallback off (ignored — pins lazy parse) and on (fails as today), empty-string browser override, no-evidence per route. Resolved.

**Divergence sweep (Part 2 × 4.2 × code).** Traced every reachable row: caller (untrimmed key, lazy parse, browser-over-server incl. empty-string override), hostedAdmin (substitute/proceed, merge order, none-configured → requested+`undefined`), scheduled (503-none regardless of `allowFallback`; substitute only when fallback on — that is fix-1), demo grant (substitute; availability gate makes none-configured unreachable; the dead `|| "openai"` diverges only on that unreachable path), demo no-grant (`proceed`; disabled fallback yields `{}` via `?? {}`, matching `:51-55`). Every `(provider, key, fallbackKeys)` delta is fix-1, fix-2, or fix-2's stated consequences (whitespace-only dropped as credential; empty-string primary `""`→`undefined`). No third change.

**Commit H / harness.** 5.3 is reproducible: sha-pinned, zero route edits, module inert, jq command in B.2. Mocks are complete for the shown code — `session.ref.update` (`scheduled:77`), gate reproduction in `demoAvailability`, `visitor`, real `sameOrigin` satisfied via the origin header. The 5.4 oracle matches `assess.ts:30-42` including truthy-whitespace credentials.

**Two defects remain.**
- Part 6's checklist contradicts 5.3 and Appendix A: those define H = module + tests, but Part 6 says "Commit H exists (tests only) … then one commit for the module" — stale v2 ordering; followed literally, 5.1 cannot import the module at H and the baseline run is red.
- B.3 ships an unmarked number: `21.05 s` sits in the Baseline column of a template claiming no results exist, with no command or sha and inherently machine-dependent — unreproducible per Y7 (25/191 is fine; B.2.2 pins it).

CHANGE: Part 6 — align the commit-order checklist with 5.3/Appendix A so H contains the module and only the three per-route commits follow; B.3 — mark the `21.05 s` baseline time *pending* (or attach its command and sha) so no unreproducible number ships, per Y7.


---
*Claude:* both changes coincide with Codex's round-3 changes and were applied as v3.1; v3.1 sent to Kimi for confirmation.

## Confirmation on v3.1

Both round-3 changes are correctly applied:

1. **H composition (Part 6 vs 5.3):** Part 6 now reads "Commit H exists — the module, 5.1 and 5.2, **zero route edits** (as 5.3 defines)", which matches 5.3's "Commit H = the new module (4.1), 5.1 and 5.2, on top of `50fa2dc`, with zero edits to the three routes". The gate (no 4.2 before approval) is unaffected since H contains only 4.1 + tests.

2. **Baseline provenance:** B.2 step 2 now annotates "21.05 s was one run", and the B.3 row carries full provenance: `npx jest --ci` at `50fa2dc`, single run 2026-09-20, Node v24.11.1, cited to `intent.md` §12-4.

The supporting edits are also consistent: 5.4's oracle uses `PROVIDERS.map(p => p.id)`; 5.2's no-evidence case uses the real `assessEvidence` with `@/lib/ai/evaluation` mocked; the malformed-header cases are keyed to *effective* fallback (header `"true"` or `hostedAdmin`), with the lazy-parse asymmetry noted. 5.3's reproduction command matches B.2 step 3 verbatim, and Appendix A's v3.1 row accurately enumerates all five changes.

No new inconsistency introduced.

APPROVE

