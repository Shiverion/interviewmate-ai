# Kimi K3 — handoff.md v2, round 2 (2026-09-21)

**1. Round-1 resolution (my three points).**
- (1) §4.1 rationale — **resolved.** The exercise was replaced, not patched: the `demo` no-grant `onUnconfigured: "proceed" → body.allowFallback ? "substitute" : "proceed"` change produces a genuinely observable difference — the `(provider, key)` tuple reaching `assessEvidence` changes from `(requested, undefined)` to `(first configured, trimmed key)`, which the harness asserts directly. No fallback-rescue ambiguity remains, and `allowFallback: false` correctly stays put.
- (2) §1.5 bullet 1 — **resolved.** Rewritten as "`allowFallback` is the caller's choice on every path," now correctly scoping choice to BYOK callers, direct `scheduled` API callers, and `demo` visitors. Accurate.
- (3) §4.4 — **resolved by design.** Still pending, but the ship gate ("not final until §4.4 is filled in… does not meet the Quest's demonstrate-it-yourself fallback") is correctly worded; per the brief, not a blocker.

Other reviewers' points landed too: Opus's baseline re-point to `50fa2dc` (§4.2/4.3, §3 preamble), the split-loop trap (§1.4 step 3), the grep/"3 sites" fix (§3 row + checklist item 2); Codex's equivalent done-criteria ("the same criterion for both timings"), full verification commands (item 11), metrics re-labelling.

**2. Fact-check of new content.**
- Observable effect (§4.1): correct per the resolver axes in §1.2 — `substitute` fires only when the requested provider is unconfigured, so "requested configured → nothing changes" holds.
- 5 + 6 plausibility: the resolver-test evidence shows `"demo no grant"` inside `fixtures × providers × allowFallback`; with `allowFallback=true`, flips occur exactly where requested is unconfigured and something else is configured: `openai only`×2 + `gemini only`×2 + whitespace/empty-string×1+1 = 6. Harness drops the two `gemini only` cases and adds the attempts case → 5. Arithmetic is consistent with the measured list.
- `env=gemini only` non-flip: corroborated by the route's own comment (lines 39–42: `demoAvailability()` returns 503 unless `OPENAI_API_KEY` is set), so resolution is never reached. Correct.
- §4.2 baseline edit: matches `50fa2dc` lines 42–47 verbatim in structure; `: body.provider` → conditional `find || configured[0]` with `|| body.provider` tail preserves the unconfigured-nothing case. Correct.
- Widened grep: at `50fa2dc` it catches `demo:46`'s `?.id || "openai"` plus all direct `process.env[` reads; at HEAD it returns nothing. Claim verified.
- §1.4 step 3's test description (hand-written literal + expectation, shared loop at ~155) matches the evidence exactly. §1.5 bullet 4 matches `demo:60`'s throw-narrowing. Catalog names/order/env vars match `catalog.ts` exactly.

**3. Over/under-correction.** None material. Two sub-blocking nits: the 6 flipped resolver rows aren't enumerated in-doc the way the 5 harness cases are; and §3's "(1 site, in the resolver)" parenthetical is mildly confusing since the grep scopes only route directories.

**4. Skeptic check.** The criterion-25 gaps I named (catalog, env names, validation) are closed; criterion 10 is now backed by an exercise whose footprint was measured, not asserted, with identical done-criteria both sides. A skeptic's only remaining lever is §4.4, which the gate explicitly withholds shipment on.

APPROVE

