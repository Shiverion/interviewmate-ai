# Kimi K3 — intent.md round 2 critique (2026-09-20)

## 1. Round-1 points: resolution check

**Codex:**
1. Preserved vs intentional fixes — **resolved.** §5 separates the two explicitly; the charge-before-attempt ordering is listed under "explicitly not changed" with a product-decision follow-up, which answers the §1/§5/§8 contradiction.
2. Credit-loss overclaim — **resolved.** A-d downgraded to "observation, not a proven defect." Withdrawal verified: `demoAvailability()` (ledger.ts:91-93) returns 503 when `OPENAI_API_KEY` is unset, and on the grant path the selected provider is always drawn from `configuredProviders` (demo:42-46), so a configured key always exists. Path unreachable, claim correctly withdrawn.
3. Provider behavior — **resolved.** All three substitution sites cited (scheduled:41-42, evaluate:47-48, demo:42-46); admin/grant forced fallback acknowledged in §5; BYOK correctly unaffected in §7; "not necessarily in the UI — untested" labels the assumption.
4. Trim history and assess.ts — **resolved.** Demo untrimmed at :54/:58 confirmed; scheduled trims (:63,:68); evaluate trims server keys (:51) but not browser keys (:34-37) — matches A-c. §3's assess.ts description (short-circuit 23-29; one attempt per choice; skip on missing credential; stop at first success; throw after exhaustion) is exact.
5. Reproducibility — **resolved.** §12 attaches commands; §11 tense fixed.

**Kimi (mine):**
1. §10 provenance — **resolved** ("Planned: three critique rounds").
2. §1 alignment — **partially.** "All three" and singular September copy fixed, but §1 still says "silently substitute" while §4 A-a states the substitute is reported in the response — the headline still contradicts the evidence section.
3. Reproduction commands — **resolved.**

## 2. New-claim fact-check
- §5 preserved list matches code: evaluate header-or-admin gate (:55) ✓; demo grant forces fallback (:52) ✓; scheduled `default(true)` (:19) ✓.
- §12-1: `sed 's/^[ \t]*//'` strips *leading* whitespace only — "after whitespace-stripping" overclaims; trailing/internal differences still count toward 141.

## 3. Rubric
- Verification (25): commands attached everywhere; only the §12-1 label imprecision remains.
- Communication (10): the §1 "silently" vs §4 "reported in the response" clash is the one spot a skeptic still catches.

## 4. Cuts
- §4 alternatives: drop the Paprika parenthetical ("a non-transactional check-then-increment on a per-user token quota") — implementation detail of an unchosen option.
- §9 final sentence: "Not a claimed result unless measured" is redundant with §2's blanket disclaimer.

**Verdict: CHANGE**
1. §1: remove "silently" (the substitute is reported in the response per §4 A-a; the harm is the ignored opt-out, not concealment).
2. §12-1: say "after leading-whitespace stripping".
3. Apply the two cuts in §4 above.

