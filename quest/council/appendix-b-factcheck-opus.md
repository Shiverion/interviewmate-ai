# Fresh-context Opus — factual consistency pass on directive.md Appendix B (2026-09-22)

Single pass, not a review round (per the author's instruction). Repo and git read access; every number in Appendix B checked against the repository and the files it cites.

Findings (all applied in commit 0d9efa9):

1. B.8 Codex jobs 27 / ≈45 min vs effort-log.md and agents.md §7 23 / ≈43.5 min → effort log and agents.md updated to 27.
2. B.8 elapsed "→ 2026-09-22, three sittings" vs effort-log "→ 2026-09-21, two sittings" → effort log updated.
3. B.8 "≈25 min for the exercise" had no source line in the effort log → added (stopwatch sum + reporting).
4. B.1 diff command listed production paths but claimed 6 files (that command yields 4) → command changed to `-- src/` for 6, production-only command given separately with 4.
5. B.3 "12.6–24.4 s" — 24.4 s recorded in no file → dropped to the recorded 12.6 s.
6. council/README.md "17 review briefs" vs 22 on disk → 22.
7. council/README.md: handoff table row and one sentence duplicated → duplicates removed; row status updated to "gate closed".
8. decision-record.md §7 follow-ups listed 8 before 7 → reordered.
9. B.2 step 1 presumes a push that has not happened → "(after the branch is pushed)".

All other figures reproduced: 37/44/46 (+4 comment); 89-line resolver at e5bd47b; 13 grep lines at 50fa2dc, 0 at HEAD; page.tsx:330-332; 214/735/703-7-25/704-7-24/949/1140/191/21.05 s; 7 m 08 s / 16 m 27 s; 5 m 52 s·30 / 6 m 17 s·29; 701; 63/46 lines; 19/17/2 Kimi; 8/7/1 Opus; decisions 1–13; all shas on the branch in stated order; bd5f1c8 differs from 2b1ae0f under src/ by one harness comment line; every cited council/briefs file exists.

9 FINDINGS
