# Kimi K3 — directive.md round 1 critique (2026-09-20)

**Consistency with intent §5/§8.** Scope lists, non-goals, and the two changes are transcribed faithfully; forbidden files match §8. But two drifts break "exactly two changes":

1. **evaluate.** Today this route *never* refuses at resolution: an empty caller key falls through into `assessEvidence` (browser `fallbackKeys` can still carry the request when `x-ai-allow-fallback: true`), and `hostedAdmin` with zero configured server keys likewise proceeds with browser keys. Contract 4.1 (`missing_caller_key`, `no_provider_configured`) plus 4.2's "maps `ok: false` to its error style" force new error paths — and 4.2 never even specifies evaluate's mapping. Note change #1 is *unreachable* in evaluate (substitution there implies `hostedAdmin`, which forces fallback on); the directive should say so instead of inventing refusals.
2. **demo no-grant.** Today `body.provider` unchecked + unconfigured proceeds to `assessEvidence` and fails with the generic throw. Routing it through `resolveProvider` yields a new explicit 503 — a change to an existing error path, contradicting Part 3's own "error messages for existing error paths" preservation and §5's exactly-two. The parenthetical "not a third change" is assertion, not derivation. Either preserve the throw or escalate to the intent owner.

**Technical soundness.** scheduled wiring is correct (503 mapping, trim, order). evaluate's hostedAdmin browser-over-server merge is reproducible *only* when `ok: true` — the empty-server-config case falls into the hole above. 4.1 is otherwise sufficient. Minor: today `x-ai-fallback-keys` is parsed lazily (only inside the fallback-allowed block); 4.2's "parsed" could make an agent parse unconditionally and newly throw on requests that succeed today. **Part 5.4 baseline is not defensible**: "copied verbatim" is impossible (`isVerifiedAdminRequest`, `req`, zod need stubs), transcription drift is undetectable, and deleting the copies destroys the number's provenance (Y7 wants a command per number). Generate fixtures via `git show 50fa2dc` + diff-check, or invoke real handlers with mocked deps, and record the sha.

**Agent-instruction quality.** Contradiction: Part 6 allows `quest/agent-notes.md` for the implementation note, but Part 3's whitelist, Y6, and Part 7 check 1 would reject that file — carve it out explicitly. Part 7's pre-implementation contract-table approval has no matching stop condition in Part 6's "Stop and ask" list; an agent can comply with everything written and never pause. Acceptance criteria, tests, review responsibilities, and yardstick are otherwise present and strong.

**Cuts.** Merge 4.3 into the Part 6 checklist + Y3 (triple-stated); drop Part 2's "Known drift to fix" line (duplicates Part 3); the rest earns its length.

**CHANGE**
1. Rewire evaluate (4.1 caller branch + 4.2) to reproduce today's fall-through semantics; state that change #1 is unreachable there and specify its `ok: false` mappings explicitly.
2. Resolve demo no-grant: preserve the existing generic failure or get intent-owner sign-off for a declared third change; remove the "applied consistently" gloss.
3. Make the baseline capture mechanical (`git show`-derived fixtures or real-handler harness, sha-recorded); also add the `agent-notes.md` whitelist carve-out and the contract-table approval gate to Part 6.

