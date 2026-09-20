# Fresh-context Opus (Claude Opus 5) — third-reviewer cold read of the four closed documents (2026-09-21)

Run as a separate agent with read access to the repository and git and no drafting memory. Brief: verify facts and cross-document consistency; verdict per document. Reproduced verbatim.

## Third-reviewer cold read — verdicts

I re-ran every measured number I could (141 diff lines; 13/5 commits; `a63fab4` files; creation dates; 0 test files; Y2 grep 0; Y3 37/40/46 and 44; Y6 six files; resolver 89 lines; rejected patch 42+/21−/63 and grep 6; `a800008..1a1a920` 21+/25−; `page.tsx:330-332`; 703/7/25 = 735; 214+735 = 949; 191+949 = 1140). All reproduce. Line citations into the routes, `assess.ts` and `ledger.ts` are accurate. The findings below are the residue.

### intent.md
- Solid and honest; §12 makes every measurement reproducible and the estimate/measured labelling is disciplined.
- §2 provenance table ("status as of v3") now lies to a reader arriving after implementation — `directive.md`, decision record, resolver are all "planned". Since the doc is frozen and dated, one line saying "statuses frozen at 2026-09-20; see decision-record §5 for outcomes" would cure it.
- §9 promises a *timed* bounded-policy-change handoff (n = 1, before/after). Nothing downstream performs or retracts it. §7 impact score 4 for A is now known (decision-record §4) to overstate today's reach; intent does not carry that note (see cross-doc).
- Cut: the "Worst case (1 calendar day)" plan in §10 — it was neither used nor referenced again.

**intent.md: CHANGE:** (1) add a one-line freeze note to §2 pointing to decision-record §5 for actual status; (2) either record in §9/§7 that the handoff timing was not performed and that fix-1's practical reach is narrower (per decision-record §4), or drop the timing row.

### directive.md
- Parts 1–7 are exemplary as an *initial* directive and the change log is candid about what the council caught.
- **Load-bearing gap:** Appendix B — the results/handoff appendix the Quest brief explicitly requires (links, repro steps, actual results, AI contribution and corrections, limitations, effort) — is an empty template three commits after implementation finished. `quest/handoff.md` (B.1) does not exist; Loom pending; B.8 actual-effort vs the 6–8 h budget is absent. A skeptical scorer docks "verification & maintainability" and "communication & handoff" here regardless of how good the decision record is.
- Y7 ("every number in Appendix B has a command") is marked *pass* in decision-record §5 against an appendix that contains no numbers.
- Cut: 5.3's `npx … | jq` reproduction command — `agent-notes.md` documents that `npx` did not run on the author's shell and used `node node_modules/jest/bin/jest.js`; give one command that actually ran.

**directive.md: CHANGE:** (1) fill Appendix B.1–B.8 from `agent-notes.md`/decision-record (or state which sections are deliberately not delivered and why); (2) create `quest/handoff.md` or remove the reference; (3) align the 5.3/B.2 commands with the invocation that was actually run.

### decision-record.md
- Best document of the four; alternatives are real, and the "non-observable differences" and harness-limits paragraphs are exactly what a reviewer wants.
- §4 last bullet: "noted there as a limitation" — `intent.md` contains no such note (grep for `page.tsx`/`limitation`/`in-repo client` returns nothing). Broken cross-reference.
- §4 first bullet: "routes derive `onUnconfigured` from `allowFallback`" — only `scheduled` does (ternary); `evaluate` hostedAdmin and both `demo` paths use fixed literals. The resolver doc comment (`:12`, "as evaluate/scheduled do") repeats the overstatement. Minor, but it is the mitigation claim for the doc's main trade-off.
- Cut: alternative F (prune the harness) — nobody proposed it; it pads the table.

**decision-record.md: CHANGE:** (1) fix or delete "noted there as a limitation"; (2) reword the mitigation to "`scheduled` derives `onUnconfigured` from `allowFallback`; the other paths fix it by literal".

### review-example.md
- Example 1 is a genuinely good pick (the smell is the one the change exists to remove) and every number reproduced from the archived patch.
- "recorded here and in `agents.md`" — no `agents.md` exists in the repo (`quest/agent-notes.md` does carry the model-allocation line). Broken reference in the accountability section.
- Review history says round 2 "Kimi K3 pending" and records no v3 round, while `council/README.md` and commit `d06789a` say v3 was approved by both. Stale status inside a document about provenance.
- The sign-off checkbox is unticked, so by the doc's own words both review decisions "stand as Claude's decisions". Combined with "He did not read every diff line himself", a human scorer on "engineering & review quality (30)" will ask what the candidate personally reviewed. Sign it, or add one sentence on what Iqbal did inspect.
- Cut: the "Why the agent did it — an inference" paragraph; labelled speculation adds length, not evidence.

**review-example.md: CHANGE:** (1) replace `agents.md` with `quest/agent-notes.md`; (2) update the review history to match README/`d06789a`; (3) tick the sign-off with a date or state what the human personally reviewed.

**Cross-document consistency:** numbers, shas and preserved-vs-changed claims agree everywhere I checked; the inconsistencies are all *status/tense* — intent's stale provenance table, directive's empty Appendix B, the decision record citing a limitation note intent never got, and review-example's review history lagging the README — plus two dangling file references (`quest/handoff.md`, `agents.md`).

---
*Author's response (Claude, 2026-09-21):* all factual and cross-reference items applied — intent §2 freeze note, §7 fix-1 reach limitation, worst-case plan cut; decision-record mitigation reworded and the resolver doc comment corrected; review-example `agents.md` → `quest/agent-notes.md`, review history updated; directive 5.3/B.2 commands set to the invocation that ran (Appendix A v3.2). Deliberately kept: decision-record alternative F (it answers the first question a reader has about a 735-case harness) and the review-example "inference" paragraph (the actionable part for a future directive author). Not yet done, by design — the directive's Appendix B, `handoff.md`, the timed handoff exercise and the sign-off are the remaining Quest work; Y7's "pass" in decision-record §5 refers to that document's own numbers and will be re-stated against Appendix B when it is filled.
