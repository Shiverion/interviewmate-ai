# Fresh-context Opus (Claude Opus 5) — agents.md v3, round 3 (2026-09-21)

Checked against `quest/council/*.md` and `quest/council/briefs/*.md`.

**§5 rows.** Row 2: supported — `directive-r1-codex.md` §1 is the demo no-grant substitution, `directive-r1-kimi.md` §2 is the new 503 on demo; both raise evaluate refusals. Row 6: supported — gated `"openai"`→`requested` divergence in both reviews; policy-axes point is Codex nit 1 (line 14); `substituted` dead surface is Kimi nit 1; the same-object point is `code-review-kimi.md` line 23, in the risk list, not a nit. Row 8: `dr-re-r1-kimi.md` problem 2; `dr-re-r1-codex.md` never mentions it. Row 11: matches the three round-1 critiques.

**§3 citations.** 17 briefs + README: correct. Brief 40 quote: verbatim. Brief 12 quote: verbatim. Briefs 42/62 carry no block rule: correct. Opus repo access in 50, 60–62, 70: correct.

**One factual error remains.** §3 quotes "Block only for things that would produce wrong code, an unreproducible number, a contradiction, or a rubric loss — not style" and labels it "briefs 21 and 22 … verbatim". It is verbatim in neither: brief 21 line 13 has no "contradiction" clause at all; brief 22 line 5 reads "Block (CHANGE) only for something that would produce wrong code, an unreproducible number, a contradiction with intent.md, or a rubric loss — not style". The sentence is a blend. Given this exact clause was the subject of both round-2 blocks, a document about accurate attribution cannot carry a "verbatim" quote that matches no source.

**Non-blocking nits.** (a) "End with APPROVE or CHANGE (every brief)" — brief 30 uses APPROVE / APPROVE WITH NITS / REQUEST CHANGES, and brief 00 has no verdict format. (b) §7 counts Opus runs by "subagent launches" as 5, but the round-2 agents.md launch that died is a launch too (the Kimi row does count its dead runs); either count it or change the method label.

Everything else — independence definition, "reviewer sessions", co-author trailers (verified on all four shas), "in parallel" labelled session-record-only, pending human items — is accurate.

CHANGE: In §3 quote brief 21 exactly ("…wrong code, an unreproducible number, or a rubric loss — not style") and state that brief 22 adds "a contradiction with intent.md", dropping the "verbatim" claim for the blended sentence.

---
*Claude:* the blended quote was replaced by the two exact sentences (also caught by Codex sol in the same round) and both nits applied — v3.1.

## Confirmation on v3.1

Both quotes in §3 now match the archive character-for-character: brief 21 line 13 (no "contradiction" clause) and brief 22 line 5 ("a contradiction with intent.md"). The "verbatim" label is now true for each. Verdict-format claim correctly narrowed: brief 30 uses APPROVE / APPROVE WITH NITS / REQUEST CHANGES, and briefs 00–01 ask for a recommendation. §7 Opus row (7 launches, 6 reviews, 1 dead on the session limit) is now counted the same way as the Kimi row, with the method stated. The v1→v2 history line's 18→17 correction removes the last internal inconsistency. No new overclaim introduced.

APPROVE
