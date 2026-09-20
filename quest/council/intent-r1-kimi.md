# Kimi K3 — intent.md round 1 critique (2026-09-20)

## Critique — intent.md v1 (Kimi, round 1)

**1. Fact-check against the code**

Verified accurate:
- (a) `scheduled/route.ts:41-42` — `configured.find(...) || configured[0]` substitutes regardless of `allowFallback` (it only gates `fallbackKeys`, lines 61-65). Same pattern confirmed at `evaluate/route.ts:47-48` (admin path) — and, unmentioned, at `demo/evaluate/route.ts:42-46` under a grant.
- (b) Defaults confirmed: `scheduled` `default(true)` (line 19), `demo` `default(false)` (line 18). `evaluate` has no field; header-gated (`x-ai-allow-fallback === "true" || hostedAdmin`).
- (c) Confirmed precisely: grant + no configured provider → `selectedProvider = "openai"` (42-47); `claimEvaluation` (48) and `consumeReviewer(grant, 3)` (49) run before `assessEvidence` receives `process.env[provider.env]` → `undefined` (58). With empty env, `assess.ts:30-42` yields one choice, no credential, throws. Credits burned. Line range and mechanics are exactly right.
- Trim recurrence: demo passes `process.env[...]` untrimmed at lines 54 and 58; the other two routes trim everywhere. ✓
- Problem B description of `assess.ts:30-93` (try requested, then each fallback key once, swallow, throw generic) ✓. Problem C rejection (3-entry filter, session read is auth+context) ✓.

Errors/overstatements:
- **§1 says "one silently substitutes a provider" — false.** §4(a) itself documents it in two routes, and the demo grant path is a third. Understatement, but it contradicts the doc's own evidence and a skeptical reviewer will catch it.
- **§1 "the copies created in September" (plural).** Only `demo/evaluate` (2026-09-09) is evidenced as September. Cite `scheduled`'s creation date or make it singular.
- **§10 is a provenance violation.** It states the file "was... critiqued in three rounds by Codex and Kimi (K3)" — past tense, but this *is* round 1 and v1 is dated today. The brief explicitly forbids claiming retrospective steps were completed before they were. This is the single most damaging line in the document.

**2. Rubric gaps**
- *Verification (25):* "141 differing lines", "13 of 136 commits; 5 are `fix:`", "0 of 191 tests", "21.05 s" are all unverifiable as written. The rubric demands *reproducible* evidence — add the exact `diff`/ `git log --oneline` / `grep` / `time npm test` commands (a short appendix or the decision record).
- *Communication (10):* §10 references `quest/council/` artifacts that don't exist yet; the three-submission consistency claim is aspirational in v1.

**3. Cuts**
- §9 worst-case paragraph can lose its second sentence; the limitation is already covered by the following bullet.
- §7 "Estimate (not measured)" sentence: keep the label, drop "I will not claim this as a result unless I measure it" — redundant with §2's blanket disclaimer.

**4. Wording**
- §4(a) "141 differing lines" — unlabeled single measurement; give the command or label it as approximate.
- §6 final paragraph (explicit no-telemetry disclaimer) is exactly right; keep.

**Verdict: CHANGE**
1. Fix §10: the three council rounds have not happened; state them as planned or update after completion (provenance rule breach).
2. Fix §1: substitution exists in all three routes under some path, and only one copy is evidenced as September-created — align the summary with §4's own evidence.
3. Attach exact reproduction commands for every measured number (141 lines, 13/136/5 commits, 0/191 tests, 21.05 s) to satisfy the 25-point verification slice.

