# Fresh-context Opus (Claude Opus 5) — agents.md v1, round 1 (2026-09-21)

Run with read access to `quest/` and git; asked to fact-check §5 row by row against the archived critiques.

I read every `quest/council/*.md` file the §5 rows cite, plus `agent-notes.md`, `effort-log.md` and `git log 50fa2dc..HEAD`.

**§5 row-by-row**

- intent v1 — supported (Kimi "confirmed precisely… credits burned"; Codex "reachability unverified"; author note appended). OK.
- directive v1 — half right. Both caught the evaluate refusals. The *demo substitution* was Codex point 1 only; Kimi's demo finding was a *new 503 refusal* on the no-grant path, a different defect. "Codex and Kimi, independently" overstates.
- directive v2 — supported verbatim (`directive-r2-codex.md`). OK.
- commit H — supported (`agent-notes.md:7-14`, 701, one-line fix). OK.
- evaluate first version — supported; 63 lines reproduced by the retro cold read. OK.
- production diff — half right. The gated divergence was flagged by both; "policy axes independent enough to re-create the bug" is Codex nit 1 alone. Kimi's nits were `substituted` dead surface and the comment.
- review-example v1 — supported (Codex sol on the excerpt; Kimi on attribution/counts). OK.
- **decision-record v1 — wrong attribution.** "Scheduled UI sends the default — unverified" is Kimi's problem 2 in `dr-re-r1-kimi.md`. `dr-re-r1-codex.md` never mentions it. A table whose stated purpose is "every row has a verbatim record" mis-crediting a row is the one error this document cannot afford.
- four closed docs — supported (two dangling refs, mitigation overstatement). OK.
- handoff v1 — supported, including who was wrong. OK.

**§7 counts.** "11 Kimi runs" is not reproducible: 12 `*-kimi.md` files exist, and `directive-r3-kimi.md` holds a second v3.1 confirmation run, so ≥13 archived responses. "4 fresh-Opus runs" is correct by the archive but contradicts the effort log it cites ("1 run, 3 m 44 s"). §3 says "never state a number that was not measured"; both numbers fail the doc's own rule.

**§3 rule statements.** The reviewer rules "flag unverifiable as unverifiable, not wrong" and "block only for wrong code/unreproducible number/contradiction/rubric loss, not style" appear in no archived brief; the only brief in evidence (handoff r1) has neither sentence and no brief is archived in `council/`. Either archive one brief verbatim or quote only what the record shows. Implementer "may not delegate to sub-agents" is a post-incident prompt rule, not in directive Part 3/6 as claimed.

**Honesty.** §1 "three independent models reviewed every document and the diff" is false for intent, directive, decision-record, review-example (two + one retro) and the diff (two). §6 admits it; §1 should not contradict §6. §2 lists human "perform the handoff exercise; sign off" as done-tense roles; the effort log says both, plus reading the route diffs, are pending. State that.

**Usefulness / cuts.** §4 and §8 are reusable. §7 Windows bullets duplicate the effort log; cut or link.

CHANGE: (1) Re-attribute row 8 to Kimi and narrow rows 2 and 6 to what each reviewer actually raised; (2) fix or label the §7 counts (Kimi ≥13 archived, Opus 4 vs effort-log 1) and reconcile with `effort-log.md`; (3) correct §1's "every document" claim and add one line on the human items still pending, and either archive a brief or trim §3's reviewer rules to what the archived brief says.

---
*Claude:* all three applied in v2. The briefs are now archived verbatim in `quest/council/briefs/` (18 files); §3 attributes each rule to the briefs that carried it. Row 8 re-attributed to Kimi; rows 2 and 6 narrowed. Counts recounted from output files and the Codex job store and reconciled with `effort-log.md`.
