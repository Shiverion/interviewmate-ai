# Effort log

**Quest budget:** suggested 6–8 h focused effort, including documentation and Loom. The brief asks for *actual* effort and for the candidate's work to be distinguished from AI output. This log does both. It is kept current until submission; entries marked *pending* are not yet done.

## Summary

| | Value | Kind |
|---|---|---|
| Elapsed | 2026-09-20 ~13:00 → 2026-09-21 ~05:00 local (two sittings, one overnight gap) | measured from commit timestamps and session |
| **Human attention (Iqbal)** | **3–4 h** so far, plus the pending items below | self-reported estimate |
| Codex agent runtime | 23 jobs, ≈43.5 min total (largest 14 m 56 s: baseline harness) — recounted 2026-09-21 at `agents.md` v2; final count at submission | measured from the plugin job store |
| Kimi K3 invocations | 19: 17 returned a review, 2 died on the 3 RPM cap (15 output files present; 1 in the first scratchpad; 3 in a since-deleted worktree, from the session record) | counted from output files + session record |
| Claude (Opus 5) session | orchestration, drafting, diagnosis, all commits; one session | not separately timed |
| Fresh-context Opus reviewer | 5 runs to date (retro pass 3 m 44 s; `handoff.md` ×3; `agents.md` r1); final count at submission | counted from subagent launches |

No claim is made about how long this would take another engineer or a team; see `handoff.md` §4 for the one timed exercise (n = 1, pending).

## What the human did (decisions, in order)

Every item below changed what happened next. None was a rubber stamp; several reversed the AI's recommendation.

| # | Decision | Effect |
|---|---|---|
| 1 | Asked for a multi-model council rather than a single assistant's answer; capped analysis depth ("don't over-analyze") | The problem-selection round was adversarial from the start |
| 2 | Surfaced the context that InterviewMate was built for the *same* reviewers' previous Quest | Reversed the council's split (Paprika vs synthetic service) into the InterviewMate pick |
| 3 | Chose a branch in the existing repo over a copy; set the calendar plan (3 days normal, 1 day worst case) | Provenance lives in git; scope pressure explicit |
| 4 | Required every markdown deliverable to pass three critique rounds with unanimous approval | Produced the correction trail in `quest/council/` (the intent v1 credit-loss claim, the directive v1 hidden behaviour changes) |
| 5 | Approved the contract table before any route edit (`e25d63e`) | The Part 7 gate the directive required |
| 6 | Set model tiering: implementation on cheaper models at max effort, review on stronger models | Routes built by `gpt-5.6-luna`; reviews by `gpt-6-astra` → `gpt-5.6-sol` when quota ran out, Kimi K3 |
| 7 | Let the running astra job finish rather than cancel it mid-verification | Avoided discarding 9 minutes of paid work for a small saving |
| 8 | Asked where the council method sits in the rubric; decided to hold `agents.md` until diff-review evidence existed | Kept an optional doc honest |
| 9 | Caught that the panel had only two independent reviewers and added a fresh-context Opus as the third | Cold read found cross-document drift the other two could not see |
| 10 | Asked for an honest effort accounting rather than an inflated one | This file |

## What the human has not yet done (pending — required before submission)

- [x] Read the three route diffs and the resolver — done 2026-09-21; statement recorded in `review-example.md` "Who decided what".
- [ ] Perform the timed handoff exercise, once on `50fa2dc` and once on `2b1ae0f` (`handoff.md` §4). *Est. 30–45 min.*
- [ ] Tick the sign-off in `review-example.md`.
- [ ] Record the Loom (≤ 5 min; a couple of takes). *Est. 45–60 min.*
- [ ] Push the branch; open every link in Appendix B from a logged-out browser. *Est. 10 min.*

Projected human total at submission: **≈5–6 h**, within the brief's 6–8 h suggestion. The AI-agent minutes above are additional and are reported, not folded into the human figure.

## What the AI did (by model)

| Model | Role | Artefacts |
|---|---|---|
| Claude Opus 5 (this session) | Orchestrator and author: problem survey, all document drafts, council bundles, diagnosis of the harness realm bug, review of every agent diff under directive Part 7, all commits | everything in `quest/` except where noted; commits `150baab`…`2b1ae0f` |
| Codex `gpt-6-astra` | Council reviewer (intent, directive, code review); implementer of commit H (resolver + tests + harness) | `d09182e` (one harness line corrected by Claude) |
| Codex `gpt-5.6-luna` (xhigh) | Implementer of the three route commits | `0d88121`, `a800008`, `1a1a920` (one send-back, one reviewer touch-up) |
| Codex `gpt-5.6-sol` (xhigh) | Council reviewer from `decision-record.md` onward | `quest/council/dr-re-*`, `handoff-*` |
| Kimi K3 | Council reviewer throughout | `quest/council/*-kimi.md` |
| Fresh-context Claude Opus 5 | Independent third reviewer (cold read of the four closed documents; every round from `handoff.md` on) | `quest/council/retro-coldread-opus.md`, `handoff-*-opus.md` |

## Method notes that cost time and are worth knowing

- Kimi's API is capped at 3 requests/min; multi-file reads fail. Every review is a single bundle file it reads once.
- Codex's sandbox cannot write `.git`; the human-side orchestrator commits on its behalf, which is also where the diff review happens.
- `npx` did not resolve in the Windows shell used; binaries are invoked directly from `node_modules`.
- The most expensive single agent run (astra, 15 min) ended in a correct *stop*, not a result — the stop rule in the directive is what made that run useful.
- Windows junctions: `Remove-Item` on a `node_modules` junction followed the link and deleted the main checkout's `node_modules` (restored with `npm ci`, ~1 min; git unaffected). Remove a junction with `rmdir` (cmd) only. Cost ≈5 min of agent time on 2026-09-21.
