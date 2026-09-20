# Codex gpt-6-astra — intent.md round 2 critique (2026-09-20)

CHANGE — 1) Correct policy qualifiers and affected users. 2) Define substitution reporting and complete §3's behavior summary. 3) Verify historical evidence, reproduction details, and provenance wording.

The scheduled-route defect remains well supported, but v2 still needs narrower policy and affected-user claims.

Round-1 checks:

1. Codex: "distinguish preserved behavior from intentional fixes" — partially resolved. §5 preserves forced admin/grant fallback and explicitly defers accounting changes. However, "substitution stays but is reported as such" adds diagnostic behavior beyond the two listed fixes: assess.ts:61 marks fallback only when index > 0, after initial substitution has already occurred. Specify how reporting changes while response shapes remain preserved.

2. Codex: "conditional risk" and Kimi: "Credits burned" — resolved for the withdrawn no-provider claim. ledger.ts:92 checks trimmed OPENAI_API_KEY; demo/evaluate:32–33 returns 503 before accounting when it is absent, empty, or whitespace. Technically, demoAvailability returns a message, not 503. With successful preceding checks, consumeReviewer:106–107 increments usage before assessment; §4A-d appropriately separates that observation from a product defect.

3. Codex: "State these exceptions" and Kimi: "substitution exists in all three routes" — partially resolved. The three substitution paths and defaults are accurately identified. But hostedAdmin requires both no supplied primary key and verified administration (evaluate:34–42); §5's blanket admin policy misses that condition. §7 incorrectly groups admins with demo trim drift: evaluate already trims server keys. Public-demo users are omitted despite receiving untrimmed keys. BYOK fallback is existing behavior, not itself evidence of harm. Forced fallback is implemented behavior; calling it "intended" needs labeling as the policy chosen for preservation.

4. Codex: "short-circuits… skips missing credentials… logs failures" and Kimi: "copies created in September" — partially resolved. §3 correctly describes deterministic results, first success, and exhaustion, but omits credential skipping and failure logging. §1 now names only the September demo route. The June history and key-store explanation lack supporting numbered excerpts in the visible material.

5. Codex: "reproducible support" and Kimi: "Attach exact reproduction commands" — partially resolved. §4D correctly limits the grep inference; §2 clearly labels planned artifacts. However, the single permitted read's output truncated §§8–12, so I cannot verify reproduction commands, synthetic fixtures, ordering assertions, completed-round wording, or the requested cuts to §§7/9. Kimi's "provenance violation" therefore remains unverified, not established as unresolved.

Rubric: problem selection remains strong; verification risks concern unsupported historical measurements and imprecise behavioral boundaries. Communication loses clarity through overbroad affected-user claims.

Cuts: remove hiring history and Paprika implementation detail, §5's introductory meta-commentary, and repeated ranking rationale across §§1/6. Replace "silently" with the precise distinction between reporting the actual provider and identifying substitution.

---
*Process note (Claude):* Codex's single read truncated the bundle at §8 of the draft. Round 3 bundle puts the draft first and limits code to line-range excerpts.
