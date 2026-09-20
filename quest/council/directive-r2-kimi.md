# Kimi K3 — directive.md round 2 critique (2026-09-20)

**1. Round-1 resolution check.** All points resolved:
- Codex 1 (demo substitution ≠ fallback permission): `onUnconfigured` added (4.1); demo no-grant wired `proceed` (4.2); empty-string browser override pinned in 5.2.
- Codex 2 (evaluate refusals/absent key): `missing_caller_key` removed; caller branch never refuses; admin `onNoneConfigured:"proceed"`; lazy parse stated in 4.2.
- Codex 3 (verify route policy): real-handler harness (5.2), normalized output, tags, commit H + repro command (5.3).
- Codex 4 (attempts/accounting): 5.4, 5.5 added; the demo-refusal-bypass concern is moot — v2 introduces no demo refusal.
- Codex cuts: Y2 scoped to the three routes; agent-notes carved out (Part 3); 5s/5min yardsticks replaced (Y3/Y5/Y7).
- Kimi 1/2 (evaluate + demo no-grant semantics): reachability paragraph; `proceed` wiring; explicit "unreachable" mappings.
- Kimi 3 (baseline defensibility): harness-first H, sha-recorded.
- Kimi agent-notes/gate: Part 3 whitelist + Part 6 gate. Part 4.3 and the drift line are gone.

**2. Policy-table fact-check: every row and line ref is accurate.** Verified: evaluate `:34-37` untrimmed caller key, `:42`, `:47-48`, `:49-52` (proceed-with-`undefined` when `selected` is undefined), `:55-62` lazy parse, `:63-70` browser-over-server; scheduled `:41-42` substitutes regardless of `allowFallback`, `:43-47` 503, trims `:63`/`:68`; demo grant `:42-46` (including the dead-but-accurate `|| "openai"`), untrimmed `:58`, untrimmed all-env fallback `:53-54`; demo no-grant `:47` as-is; `:32-33` + ledger `:91-93` make none-configured genuinely unreachable. Accounting order matches `:38→:48→:49→:56→:72`.

**3. Contract + wiring: sound.** The five literals reproduce every reachable path; divergences are exactly fix-1 and fix-2, plus one direct fix-2 consequence: whitespace-*only* env values count as configured in demo today (untrimmed check; `" "` is truthy → attempted credential) but unconfigured after. `assessEvidence` treats `""`/`undefined` identically, but the harness records raw args — this must be fixture-pinned.

**4. Verification design:** harness-first H is reproducible and defensible. Gaps: the mock list omits `visitor` (used at demo `:37`); fixtures cover whitespace-*padded* but not whitespace-*only*; nothing pins lazy parse against malformed headers; the `x-openai-key` variant is unlisted.

**5. Consistency:** intent §5's two changes and §8 non-goals match; all seven Quest elements present; Appendix B labelled and empty.

**CHANGE**
1. Add `visitor` to 5.2's mock spec (verify its module): demo's no-grant owner derivation (`visitor(req).id`) otherwise crashes or hits real code → false `preserved` failures and a wrong baseline number at H.
2. Add a whitespace-only env fixture to 5.1/5.2, pinning trim-to-empty = not-configured on demo paths — otherwise the 5.1 table (the policy) is ambiguous at fix-2's edge.
3. Add two `preserved` cases: malformed `x-ai-fallback-keys` with fallback off (ignored, pins lazy parse) and caller key via `x-openai-key`.

