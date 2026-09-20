# Fresh-context Opus (Claude Opus 5) — handoff.md v2, round 2 (2026-09-21)

**Round-1 resolution.** (1) "Before" re-pointed to `50fa2dc` — resolved (§3, §4.2, §4.3; `git diff --stat 50fa2dc 2b1ae0f -- src/app/api` confirms the harness is absent there). (2) Shared hostedAdmin/grant loop and the `hostedAdmin ? fixture.selected[requested] : requested` expression — resolved in §1.4 step 3 (verified at test lines 155-165 and 259-261); flip counts now stated for the *new* exercise. (3) §3 "3 sites" row relabelled "by inspection", grep widened — resolved (§3, checklist 2). Codex/Kimi points: rationale corrected, equal done-criteria, verification commands, `substituted` item, §1.5 bullet 1 — all present. Nothing dropped.

**Fact-check of new content.**
- **5 harness cases — consistent with the generator.** The demo generator (lines 313-338) sets `provider = reviewer ? fixture.selected[requested] : requested`; the exercise changes it to `reviewer || allowFallback ? …`. Unconfigured-requested cases on `demoAvailable` fixtures: `openai only`×{gemini, deepseek}, `one whitespace-only`×gemini, `one empty-string`×gemini = 4, plus `attemptRows` "demo no grant" (fixture `openai only`, requested gemini, fallback true, line 763) = 5. `all`/`all padded` have nothing unconfigured; the four accounting-order cases use fixture `all`; the `defaults` demo case has fallback off. Tags check out via the `trims` expression.
- **`env=gemini only` non-flip is correct**, and doubly so: the harness mock (line 363) and the real `demoAvailability()` (`ledger.ts:91-93`) both return the 503 string when `OPENAI_API_KEY` is unset/blank.
- **6 resolver rows — consistent.** "demo no grant" `add` runs per fixture × requested × fallback; new expectation `allowFallback ? success(chosen, true) : success(requested, allowFallback)` differs from today's where `chosen !== requested`: `openai only`×2, `gemini only`×2, `one whitespace-only`×1, `one empty-string`×1. `none` fixture: `configured[0]` is undefined so the resolver keeps `requested` — no flip, matches `substitutedProviders`.
- **50fa2dc edit is behaviourally equivalent** for provider choice: `configuredProviders` already filters with `.trim()`; `?.id || body.provider` reproduces `onNoneConfigured: "proceed"`; requested-configured and `allowFallback: false` are untouched. Only the key's trimming differs (pre-existing fix-2, not the exercise); done-criterion (a) uses an unpadded key, so it is fair.
- Widened grep: exit 1 at HEAD; the 50fa2dc evidence matches (demo:46 caught). `substituted` grep: only `benchmark/providers.ts:150`, unrelated — bullet 5's "nothing relevant" is exact. `page.tsx:330-332`, `store.ts:30,37,63`, `evaluate:31` default, catalog order/env names all verify.

**Two small inaccuracies (not blocking).**
1. §4.1 "the provider-attempt sequence loses its leading skipped attempt" — the *observable* attempt list does not change: `assessEvidence` skips the empty-credential primary before calling `evaluateWithProvider`, so the attempt case's `attempts: ["openai"]`/`credentials` stay identical; only its `(provider, key)` tuple flips. Say "internal" or drop the clause.
2. After the edit, the `trims` expression re-tags `one empty-string | gemini | fallback=true` from `fix-2` to `preserved` (`provider === "gemini"` becomes false), so the by-tag tally moves 25/703 → 24/704. Worth one sentence so checklist item 3 doesn't confuse the engineer.

**Over/under-correction.** None. §3's "0 by the widened grep (1 site, in the resolver)" reads awkwardly but is accurate.

**Skeptic's docking.** With §4.4 pending by design (gate wording is correct), I would no longer dock the 25 or the 10: §1 now answers every lookup I needed in round 1.

APPROVE
