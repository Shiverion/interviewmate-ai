# InterviewMate AI: five-day HR product sprint

Started: 2026-09-07 (Asia/Jakarta). Planned effort: five phases of eight hours each; these are allocations, not recorded hours worked.

## Current direction

Reuse InterviewMate AI to explore evidence-backed first-screen review for a recruiter hiring a frontend engineer. The proposed product turns an interview transcript into a draft brief organized by job criteria, with supporting quotations, missing evidence, and a recruiter review step.

The user confirmed desk research as the starting method because recruiter/hiring-manager access is not currently available. The target segment and problem severity remain hypotheses. No recruiter interviews, human timing study, or new live AI evaluation have been completed in this sprint.

## Phase progress

| Phase | Progress document | Status | Main output |
|---|---|---|---|
| 1 | [Discovery and UX workflow](01-discovery-and-ux.md) | In progress: desk exploration documented | Problem, user, workflow, evidence, scope, baseline protocol |
| 2 | [Solution design and AI logic](02-solution-design-and-ai-logic.md) | Planned | UX flow, rubric, prompts, input/output contract |
| 3 | [Prototype build](03-prototype-build.md) | Planned | Runnable core workflow and reproducible demo |
| 4 | [Evaluation and iteration](04-evaluation-and-iteration.md) | Planned | Synthetic cases, actual results, fixes, comparison |
| 5 | [Case study and engineering handoff](05-case-study-and-handoff.md) | Planned | Case study, handoff, five-minute recording |

## How to maintain these files

- Update the relevant phase's checklist, evidence, decisions, open items, and dated progress log as work happens.
- Keep planned behavior separate from implemented and verified behavior.
- Record a result only when an artifact, observation, or run supports it. Missing measurements stay `Not measured`; they are not zero.
- Preserve failed results when documenting an improvement. Link to the replacement run rather than rewriting history.
- Complete a phase when its exit criteria are met, or document which optional evidence was unavailable and how that limits the outcome.
- Record changes of scope in Phase 1 and carry the decision into downstream phase files.

## Relationship to the existing product

These are the five phases of the new HR sprint, not the historical ten development phases in `.planning/`. The existing product, [README](../../README.md), [PRD](../../PRD.md), and [project report](../../PROJECT_REPORT.md) predate this sprint. Their completion labels and performance claims are not sprint evidence.

The new documents live in a trackable `docs/` folder; `.planning/` is ignored by the repository's current Git configuration.

| Inherited before the sprint | Proposed work during the sprint |
|---|---|
| Next.js/Firebase application, interview configuration, candidate links | A focused role configuration and simpler review journey |
| Voice/text conversation and transcript handling | A repeatable synthetic-transcript demonstration path |
| Structured AI scoring and read-only reports | Traceable evidence, abstention, recruiter corrections and review status |
| Basic arithmetic tests and old product documents | Behavioral evaluation, measured limitations, new case study and handoff |

## Deliverable tracking

- [ ] Runnable prototype or interactive workflow demo.
- [ ] Case study and engineering handoff with observed results.
- [ ] Five-minute demo video and accessible recording link/file.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created five separate phase progress documents and this index | Phase 1 is active; Phases 2-5 remain planned |
| 2026-09-07 | Recorded desk-research-only discovery approach | Proceed with explicit assumptions; do not imply direct user validation |
