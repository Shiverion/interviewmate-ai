# Kimi K3 — code review of the production diff `50fa2dc..e4f5224` (2026-09-21)

## Review: provider-resolution change

**1. Correctness (old vs new, traced path by path)**

I found no undeclared `(provider, key, fallbackKeys)` divergence. All three routes check out:

- **`evaluate`, caller path**: old kept `provider`/`key` untouched and set `fallbackKeys = {...{}, ...browserKeys}` only when `header === "true"`; new passes `callerKey`/requested through and gates `callerFallbackKeys` identically (module lines 272–282). Lazy parse of `x-ai-fallback-keys` preserved (still inside the `allowFallback` branch).
- **`evaluate`, hostedAdmin**: old `find || configured[0]`, trimmed key, `undefined` key when nothing configured, browser-over-server merge — all reproduced exactly (`{...resolution.fallbackKeys, ...browserKeys}`).
- **`scheduled`**: substitution when `allowFallback`, trimmed key, trimmed `fallbackKeys` map, and the none-configured 503 with the original message all match; the new `provider_not_configured` → 503 is declared change #1, correctly wired to `body.allowFallback` post-schema-default.
- **`demo`**: grant = substitute/proceed, no-grant = proceed with possibly-`undefined` key, `{}` floor via `?? {}`, and resolution computed exactly where `selectedProvider` was, so `ownedLease → claimEvaluation → consumeReviewer? → assessEvidence → saveEvaluation` is untouched. The whitespace-env cases (key and fallback values) are declared change #2.
- One latent divergence: old demo grant + zero configured yielded `"openai"`; new yields `requested` (`selected?.id ?? requested`). Unreachable behind the `demoAvailability` gate, so not a defect — but it is a silent semantic change in dead code.

**2. Design**

The two-axis policy (`onUnconfigured`/`onNoneConfigured`, server-only by discriminated union) is the right shape: the caller branch *cannot* refuse by construction, and the directive's literals stay visible at each call site. This genuinely removes complexity — the old demo fallback-key loop (untrimmed, whitespace-leaking) is proof the triplicated filter/find logic was the risk. The unreachable `if (!resolution.ok) throw` in `evaluate`/`demo` is acceptable defensive narrowing, sanctioned by the wiring table, and lands in the existing catch.

**3. Risk**

- The harness normalizes only `{status, provider, key, fallbackKeys}` — it cannot see the `substituted` flag, which no route reads. It's unasserted dead surface.
- The `"openai"`-vs-`requested` divergence above is unobservable to the harness (gate mocks it away).
- Caller-path `fallbackKeys` is now the *same object* as the parsed browser keys (old code spread-copied); only matters if `assessEvidence` mutates it.
- Real-world whitespace-key network behavior is invisible while `assessEvidence` is mocked.

**4. Trade-offs for the decision record**

Refuse-rather-than-substitute keeps a scheduled run from silently billing/reporting against the wrong provider; keys stay `undefined`-able because `assessEvidence` already owns the missing-credential skip ("Add a key…"); `demo` passes `{}` because its downstream contract requires an object, and `{}` means "no alternates."

**5. Follow-ups**

- Log `substituted` (or drop it until consumed).
- Trim caller-supplied keys too, as a separate declared change.
- Align or comment the gated `"openai"` default in `demo`.

**APPROVE WITH NITS**: (1) `substituted` is dead surface — use it or omit it; (2) note the unreachable `"openai"` → `requested` change in `demo` so a future gate refactor doesn't trip on it.


---
*Claude, on the nits:* `substituted` is test-only by directive design (4.1: "for tests only; never surfaced in a response") — the harness reads it through the resolver contract tests, not the route tuple; keeping it is deliberate, and "surface it in a response" is the follow-up intent.md §5 already names. The shared-object point: `assess.ts` only reads `options.fallbackKeys?.[p]` (lines 33, 38), never writes — no aliasing risk today; noted in the decision record. The gated `"openai"` → `requested` divergence is commented in code (review-nits commit).
