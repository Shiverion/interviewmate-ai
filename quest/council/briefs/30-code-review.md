# Code review: the provider-resolution change (production diff)

You are ONE reviewer on a three-model panel reviewing a CODE change for a hiring Quest ("Make AI-Assisted Code Easier to Trust and Change"). The rubric slice this feeds is "Engineering and review quality (30): the implementation works, reduces complexity or risk, and includes technically sound review and trade-offs." Write your review directly in this response. Do not delegate, spawn subagents, or wait. Make exactly ONE file read (this bundle) and no other tool calls. Under 500 words.

## What you are reviewing
The production diff `git diff 50fa2dc..e4f5224 -- src/app src/lib/ai/provider-resolution.ts` (three route handlers + one new module), produced by Codex gpt-5.6-luna (routes) and gpt-6-astra (module) under `quest/directive.md` v3.1, and reviewed/committed by Claude. Test files are NOT in this bundle except the harness's normalization/assertion core; the numbers: resolver contract 214/214; route harness 735/735 after (32 failing at baseline H: 7 fix-1, 25 fix-2, 0 preserved); whole repo 27 suites / 1140 tests green; `grep configured\[0\]|configured.find` in the routes = 0 hits; per-route changed lines 37/40/46.

## The contract the diff must meet (from the directive)
Exactly two behaviour changes: (1) `scheduled` returns 503 instead of substituting `configured[0]` when `allowFallback` is false and the requested provider is unconfigured; (2) `demo` trims server keys (empty/whitespace-only env → unconfigured). Everything else preserved: which paths use caller vs server keys; fallback permission per path (`evaluate`: header `"true"` or hostedAdmin; `scheduled`: body flag default true; `demo`: body flag default false or grant); hostedAdmin substitute / proceed-with-undefined-key when none configured; `demo` no-grant proceeds with the requested provider and possibly `undefined` key; `demo` always passes an object for `fallbackKeys`; lazy parse of `x-ai-fallback-keys`; browser-over-server merge for hostedAdmin; demo accounting order `ownedLease → claimEvaluation → consumeReviewer? → assessEvidence → saveEvaluation`; response shapes unchanged; no new refusal on `evaluate` or `demo`.

## Your job
1. **Correctness**: find any path where the new code hands `assessEvidence` a different `(provider, key, fallbackKeys)` than the old code, other than the two declared fixes. Trace the old vs new side by side; cite lines.
2. **Design**: is `resolveProvider`'s contract (two policy axes `onUnconfigured`/`onNoneConfigured`, optional key, `substituted` flag) the right abstraction, or would you have shaped it differently? Does the change reduce complexity/risk in the routes, or just move it? Is the unreachable `if (!resolution.ok) throw` narrowing in `evaluate`/`demo` acceptable?
3. **Risk**: anything a maintainer could now get wrong more easily than before? Anything the harness (735 cases, normalized `{status, provider, key, fallbackKeys}` from the mocked `assessEvidence` call) would NOT catch?
4. **Trade-offs worth recording** in the decision record (e.g. why refuse rather than substitute-and-report; why keys stay `undefined`-able; why `demo` passes `{}`).
5. **Follow-ups** you would file (not for this change).
End with `APPROVE` (mergeable as-is), `APPROVE WITH NITS` (list them), or `REQUEST CHANGES` (list, ordered, each one sentence).
