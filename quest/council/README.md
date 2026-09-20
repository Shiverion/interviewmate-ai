# Council review log

Every markdown deliverable in `quest/` is drafted by Claude (Opus 5) from the author's code reading, then critiqued in up to three rounds by Codex (gpt-6-astra) and Kimi (K3). A document ships only when both reviewers and the author agree. Critiques are archived verbatim; where a critique was itself wrong, the author's verification note follows it.

| Document | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| `intent.md` | Codex CHANGE · Kimi CHANGE | Codex CHANGE · Kimi CHANGE | Codex APPROVE · Kimi APPROVE |
| **code** `git diff 50fa2dc..e4f5224 -- src/` | Codex APPROVE WITH NITS · Kimi APPROVE WITH NITS (both flagged the same unreachable `demo`-grant divergence; nits applied as comments in `review-nits` commit) | — | — |
| `decision-record.md` | Codex sol CHANGE · Kimi CHANGE | Codex sol APPROVE · Kimi APPROVE (v2) | — |
| `review-example.md` | Codex sol CHANGE · Kimi CHANGE | Codex sol CHANGE · Kimi APPROVE (v2) | v3: Codex sol APPROVE · Kimi APPROVE |
| `directive.md` | Codex CHANGE · Kimi CHANGE | Codex CHANGE · Kimi CHANGE | v3: both CHANGE on the same two residual defects → v3.1: Codex APPROVE · Kimi APPROVE |

**Third reviewer added 2026-09-21.** Until then the panel was two independent reviewers plus the drafting Claude, whose own approval does not count as review. A fresh-context Opus subagent (no drafting memory; repo and git access) then re-read all four closed documents in one pass (`retro-coldread-opus.md`), re-ran every measured number (all reproduced) and returned CHANGE on each for status/tense drift and dangling references, which were applied. From `handoff.md` onward every round has three independent reviewers: fresh-context Opus, Codex, Kimi K3.

Reviewer roster: `gpt-6-astra` reviewed `intent.md`, `directive.md` and the code; it reached its usage limit on 2026-09-21 and `gpt-5.6-sol` (xhigh) took over from `decision-record.md` onward. Kimi K3 throughout.

Notable corrections during review: `directive.md` v1's resolver contract would have introduced new refusals on `evaluate` and a substitution on `demo` (both outside the two declared changes) — caught independently by both reviewers; v2 would have failed a `preserved` harness case because `demo` always passes an object for `fallbackKeys` — caught by Codex. a reviewer-credit-loss claim in `intent.md` v1 was confirmed by one reviewer and challenged by the other; the author verified the path is unreachable (`demoAvailability()` gate) and withdrew it in v2. `review-example.md` v1 quoted rejected code from the review session with no durable source; both reviewers flagged it, and the patch was then extracted verbatim from the Codex session rollout into `rejected-evaluate-route-v1.patch` with reproduction commands. Checking a reviewer's "unverifiable" flag on the decision record surfaced that the in-repo client always sends `allowFallback: true` for scheduled sessions, which narrows fix-1's practical reach — recorded in `decision-record.md` §4/§6.
