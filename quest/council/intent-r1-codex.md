# Codex gpt-6-astra — intent.md round 1 critique (2026-09-20)

The problem is plausible and bounded, but the draft overstates demonstrated failures and leaves the intended behavioral changes ambiguous.

1. Sections 1, 5 and 8 contradict the success criteria. Preserving "each route's current policy … exactly" would preserve substitution despite allowFallback=false and grant/admin-forced fallback. Preventing charges when credentials are absent also changes validation ordering around accounting. Explicitly distinguish preserved behavior from intentional fixes, define the desired policy matrix, and permit the necessary ordering change. Different defaults alone are not evidence of a defect.

2. Sections 4A and 6 overclaim the credit failure. Demo lines 48–49 do call claimEvaluation and consumeReviewer before assessEvidence, but provider selection already occurred at 39–47. Empty configuration yields "openai"; its key could be absent, empty, or whitespace—not necessarily undefined. More importantly, assess.ts:23–29 returns a successful deterministic evaluation without credentials when evidence is insufficient. demoAvailability, ownedLease, claimEvaluation and consumeReviewer implementations are absent, so reachability and actual credit loss are unverified. Describe a conditional risk requiring eligible evidence and successful preceding checks, then demonstrate it.

3. Sections 4–6 need more precise provider behavior. Scheduled substitution at 41–42 is correctly identified. Personal BYOK requests retain the requested provider; additional providers require the explicit fallback header. The candidate-wide claim is misleading. Hosted admins force fallback at evaluate:55; reviewer grants also force fallback at demo:52 and substitute at 42–46. State these exceptions. Scheduled responses and persistence expose the actual provider, so "without the recruiter knowing" is an untested UI assumption. However, initial substitution is not marked as fallback by assessEvidence because it receives the already-selected provider.

4. The route lengths and scheduled/demo fallback defaults are correct. Demo passes untrimmed primary and fallback keys at 54 and 58; scheduled trims both, and evaluate trims server keys but not browser keys. Thus "never reached the copies created in September" is too broad. The June history is not verifiable here. Section 4B should cite assess.ts:23–93: it short-circuits without sufficient evidence, skips missing credentials, stops at first success, logs failures, and throws after exhaustion. "Swallows errors" and "then every provider" obscure these distinctions.

5. Sections 2, 4 and 7 lack reproducible support for commit counts, test coverage, diff size and timing. Mark them as externally reported until evidence is attached. Grep absence does not establish zero behavioral coverage; missing tests as "the reason" drift occurred is causal speculation. Label pending baselines as planned, include synthetic fixtures and route-level ordering assertions, and distinguish completed Quest artifacts from planned ones. Section 10 prematurely claims three completed review rounds.

Cut repository biography, unrelated alternatives' implementation details, and repeated maintenance claims. Retain the alternatives and ranking rationale.

CHANGE — 1) Define preserved policies versus intentional fixes. 2) Correct conditional credit-loss and affected-user claims. 3) Supply reproducible baselines and accurate provenance.

---
*Claude's post-critique verification:* `demoAvailability()` (`src/lib/demo/ledger.ts:91-93`) returns 503 when `OPENAI_API_KEY` is unset, so the "grant + no configured provider" path in `demo/evaluate` is unreachable. Codex's suspicion was correct; the credit-loss claim is withdrawn in v2.
