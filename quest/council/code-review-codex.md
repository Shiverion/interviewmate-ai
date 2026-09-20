# Codex gpt-6-astra — code review of the production diff `50fa2dc..e4f5224` (2026-09-21)

No blocking regression is demonstrated by the supplied diff, assuming the stated demoAvailability invariant holds.

Correctness: evaluate preserves caller credentials, lazy fallback-header parsing, and browser-over-server fallback-key precedence (evaluate/route.ts, hunk −40/+41). Hosted-admin selection still chooses the requested configured provider or the first configured provider. Scheduled preserves configured-provider selection and fallback keys; its new refusal when fallback is disabled is the intended fix (scheduled/route.ts, hunk −35/+35). Demo without a grant preserves the requested provider and always supplies a fallbackKeys object; trimming primary and fallback server credentials implements the second fix (demo/evaluate/route.ts, hunk −36/+36). The visible accounting calls retain their order.

One latent discrepancy deserves documentation: demo with a grant previously selected "openai" when no providers were configured; the resolver now returns requested through "selected?.id ?? requested" (old demo selection in hunk −36/+36; provider-resolution.ts, final return). That changes the assessEvidence provider for a non-OpenAI request if this state becomes reachable. The brief explicitly says demoAvailability prevents it, so I would not block this change, but the preservation claim depends on that gate.

Design: the extraction reduces duplicated credential filtering, trimming, selection, and fallback-map construction. Keeping route authorization, browser-key merging, and response mapping outside the resolver is appropriate. The two policy axes express the existing distinction between a missing requested provider and an entirely unconfigured deployment. An optional key is necessary to preserve existing paths, including assessEvidence's deterministic no-evidence result before credential checks.

The unreachable throws are acceptable defensive narrowing with the current broad Resolution return type. A future overload or policy-dependent result type could express guaranteed success directly.

Nits and follow-ups:
1. Document that allowFallback controls fallbackKeys independently of initial substitution. The API currently permits allowFallback:false with onUnconfigured:"substitute"; a future caller could accidentally recreate the scheduled bug.
2. Record and test the demo grant gate's no-provider invariant, including the otherwise different default-provider behavior.
3. Add focused integration coverage for real assessEvidence fallback attempts and its no-evidence path. The shown harness fixes eligibleEvidence to true and mocks assessEvidence; its normalized tuple also does not establish preservation of successful response bodies, configuration, job context, or persistence contents. The accounting helper enables ordering checks, but those assertions are outside the supplied excerpt.

The decision record should explain why scheduled refuses instead of silently substituting, why undefined credentials remain valid resolver results, and why demo adapts absent fallback keys to {}. These preserve distinct route contracts rather than imposing one universal policy.

APPROVE WITH NITS

---
*Claude, on the nits:* (1) accepted — a doc comment on `ResolutionPolicy` and a follow-up in the decision record. (2) accepted — the invariant is stated in directive Part 2 and the harness's `env=none` demo-grant cases exercise the 503 gate; a dedicated test naming the invariant is a cheap follow-up. (3) partly a bundle artefact: the harness (not fully in the bundle) does include no-evidence cases that run the real `assessEvidence` with `evaluateWithProvider` mocked, attempt-sequence cases (5.4) and accounting-order assertions (5.5, harness line ~540); response bodies are compared with `toStrictEqual` at lines 500/512/526. Configuration/jobContext preservation is asserted via `toHaveBeenCalledWith` at line 479. Persistence payloads are asserted too (`sessionUpdate` `toHaveBeenCalledWith` at line 518, `saveEvaluation` at 547). What the harness genuinely does not cover: real provider calls, Firestore, and the demo ledger's file/Firestore backends — recorded as limitations.
