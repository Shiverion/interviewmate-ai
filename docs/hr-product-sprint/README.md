# Five-day HR product sprint

[Documentation home](../README.md) · [Editing guide](../CONTRIBUTING.md)

Started: 2026-09-07 (Asia/Jakarta). Planned effort: five phases of eight hours each; actual hours are not recorded.

## Direction and current status

Reuse InterviewMate to explore **evidence-backed first-screen review** for a recruiter hiring a frontend engineer. A proposed brief connects candidate claims to transcript turns, surfaces unknowns and supports recruiter correction before handoff. [D01](decisions/001-sprint-scope.md) records the decision, workflow, required features and timeboxes.

The user selected desk research because recruiter/hiring-manager access is unavailable. Phase 1 discovery and Phase 2 design are complete. The [Phase 3 workflow](implementation/review-brief-runbook.md) is implemented; its first real provider attempt failed with AI_UNAVAILABLE, so successful live generation remains pending. Demand and problem severity remain hypotheses; no human timing study or live AI-quality evaluation has been completed. The [Phase 2 design package](design/README.md) includes an authored clickable wireframe, versioned AI contract and an ordered Phase 3 build backlog.

## Phase reports

Each phase has one progress report. Detailed artifacts live in the subject folders linked from that report.

| Phase | Report | Status | Intended output |
|---|---|---|---|
| 1 | [Discovery and UX workflow](phases/01-discovery-and-ux.md) | Desk research complete; human timing pending | Problem, user, evidence, scope, practice materials and source baseline |
| 2 | [Solution design and AI logic](phases/02-solution-design-and-ai-logic.md) | Design complete; implementation in Phase 3 | Wireframe, rubric, prompt, executable contract, acceptance rules and build backlog |
| 3 | [Prototype build](phases/03-prototype-build.md) | In progress; prototype implemented, successful live generation pending | Runnable core workflow and repeatable demonstration |
| 4 | [Evaluation and iteration](phases/04-evaluation-and-iteration.md) | In progress; English-first comparison implemented, live/human review pending | Synthetic runs, separate Indonesian extension, observed results and human comparison |
| 5 | [Case study and engineering handoff](phases/05-case-study-and-handoff.md) | Planned | Case study, handoff and five-minute recording |

## Supporting material

| Topic | Canonical documents | Use |
|---|---|---|
| Problem discovery | [Problem and workflow](research/problem-and-workflow.md), [source register](research/source-register.md) | Separate hypotheses from external and repository evidence |
| Product decision | [D01: sprint scope](decisions/001-sprint-scope.md) | Understand why we reuse the product and what the sprint includes |
| Solution design | [Design package](design/README.md), [D02](decisions/002-review-brief-design.md) | Explore the wireframe and read the versioned UX/AI specification |
| Early illustration | [Synthetic discovery example](research/discovery-example.md) | See how evidence differs from interpretation |
| Evaluation | [Evaluation home](evaluation/README.md), [Phase 4 run/review guide](evaluation/phase-4-guide.md) | Find the frozen dataset, live failure record, runner, human materials and interpretation limits |
| Prototype implementation | [Runbook and source map](implementation/review-brief-runbook.md), [Phase 3 report](phases/03-prototype-build.md) | Run, verify and modify the local review workspace |
| Existing implementation | [Product overview](../product/overview.md), [source baseline](evaluation/current-product-baseline.md) | Distinguish inherited capabilities from proposed changes |

## Submission deliverables

The [Phase 5 submission register](phases/05-case-study-and-handoff.md#final-submission-register) owns the final artifact locations and completion status: working prototype, case study/handoff and five-minute video. None is submitted yet.

This sprint has five phases. The ignored local `.planning/` directory belongs to the older ten-phase development plan; it is not the sprint tracker. Older product claims are retained in the [archive](../archive/README.md).

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created five separate phase progress documents and this index | Initial Phase 1 exploration; Phases 2–5 planned |
| 2026-09-07 | Recorded desk-research-only discovery approach | Proceed with explicit assumptions; no direct user validation |
| 2026-09-07 | Saved initial documents in commit `0e9eba2` on `codex/hr-product-sprint` | New sprint branch established |
| 2026-09-07 | Finished discovery package, practice inputs and source baseline; saved as `b988ff9` | Ready for design; human timing remains pending |
| 2026-09-07 | Reorganized reports and references; added reading and editing guides | Documentation cleanup only; Phase 2 remains planned |
| 2026-09-07 | Checked documentation navigation and artifact preservation | 212 local links across 28 Markdown files passed; baseline/CSV bytes and practice/archive content preserved; source-audit rerun matched apart from timestamp |
| 2026-09-08 | Completed Phase 2 design and authored interactive wireframe | 30 offline contract checks and 18 DOM interaction checks passed; Phase 3 live implementation is next |
| 2026-09-08 | Implemented the Phase 3 local review workspace and generation API | Software/browser/build checks pass; successful live generation remains pending after AI_UNAVAILABLE |
| 2026-09-08 | Started Phase 4 with frozen inputs/references and a checked evaluation runner | 27 software checks passed; one real API attempt failed with AI_UNAVAILABLE, leaving 29 slots unattempted |
| 2026-09-08 | Added the English-first benchmark workspace | [Setup and reviewer guide](evaluation/english-first-pilot.md); three hosted adapters, separate Indonesian pilot, no measured live quality yet |
