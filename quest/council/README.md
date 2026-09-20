# Council review log

Every markdown deliverable in `quest/` is drafted by Claude (Opus 5) from the author's code reading, then critiqued in up to three rounds by Codex (gpt-6-astra) and Kimi (K3). A document ships only when both reviewers and the author agree. Critiques are archived verbatim; where a critique was itself wrong, the author's verification note follows it.

| Document | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| `intent.md` | Codex CHANGE · Kimi CHANGE | Codex CHANGE · Kimi CHANGE | Codex APPROVE · Kimi APPROVE |
| **code** `git diff 50fa2dc..e4f5224 -- src/` | Codex APPROVE WITH NITS · Kimi APPROVE WITH NITS (both flagged the same unreachable `demo`-grant divergence; nits applied as comments in `review-nits` commit) | — | — |
| `directive.md` | Codex CHANGE · Kimi CHANGE | Codex CHANGE · Kimi CHANGE | v3: both CHANGE on the same two residual defects → v3.1: Codex APPROVE · Kimi APPROVE |

Notable corrections during review: `directive.md` v1's resolver contract would have introduced new refusals on `evaluate` and a substitution on `demo` (both outside the two declared changes) — caught independently by both reviewers; v2 would have failed a `preserved` harness case because `demo` always passes an object for `fallbackKeys` — caught by Codex. a reviewer-credit-loss claim in `intent.md` v1 was confirmed by one reviewer and challenged by the other; the author verified the path is unreachable (`demoAvailability()` gate) and withdrew it in v2.
