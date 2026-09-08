# Documentation home

[Project README](../README.md) · [How to edit these docs](CONTRIBUTING.md)

Updated: 2026-09-08. This is the entry point for the inherited InterviewMate application and its new five-day HR product sprint.

**Current status:** Discovery and design are complete. The [Phase 3 prototype](hr-product-sprint/phases/03-prototype-build.md) is implemented; successful live generation is pending provider access. Start with the [runbook](hr-product-sprint/implementation/review-brief-runbook.md) to run or modify it. Phases 4–5 and human timing remain pending.

## Recommended reading order

1. [Sprint overview](hr-product-sprint/README.md) — objective, progress and deliverable locations.
2. [Phase 1 report](hr-product-sprint/phases/01-discovery-and-ux.md) — what was completed and what remains unknown.
3. [D01: sprint scope](hr-product-sprint/decisions/001-sprint-scope.md) — selected problem, reuse decision and boundaries.
4. [Phase 2 design package](hr-product-sprint/design/README.md) — clickable wireframe, rubric, AI contract and next build tasks.
5. Follow the supporting evidence or implementation links below for your role.

## Find the right document

| Reader / task | Start with | Continue to |
|---|---|---|
| Reviewer checking sprint progress | [Phase reports](hr-product-sprint/README.md#phase-reports) | [Final submission register](hr-product-sprint/phases/05-case-study-and-handoff.md#final-submission-register) |
| Designer exploring the recruiting problem | [Problem and workflow](hr-product-sprint/research/problem-and-workflow.md) | [Source register](hr-product-sprint/research/source-register.md), [Phase 2 report](hr-product-sprint/phases/02-solution-design-and-ai-logic.md) |
| Designer/engineer continuing the selected solution | [Design package](hr-product-sprint/design/README.md) | [Phase 3 backlog](hr-product-sprint/implementation/phase-3-backlog.md) |
| Engineer continuing implementation | [Product overview](product/overview.md) | [Local development](product/local-development.md), [source baseline](hr-product-sprint/evaluation/current-product-baseline.md) |
| Facilitator preparing an evaluation | [Evaluation guide](hr-product-sprint/evaluation/README.md) | [Manual study protocol](hr-product-sprint/evaluation/manual-study-guide.md) |
| Contributor updating a report | [Documentation contributor guide](CONTRIBUTING.md) | [Phase report template](templates/phase-report.md) |
| Reader investigating older claims | [Archive index](archive/README.md) | Original PRD, project report and README |

## Folder guide

```text
docs/
  README.md                       Reading guide (this page)
  CONTRIBUTING.md                  Editing rules and checks
  product/                        Inherited app overview and local setup
  hr-product-sprint/
    README.md                     Sprint dashboard
    phases/                       One progress report for each phase, 1–5
    decisions/                    Scope choices and their rationale
    research/                     Sources, workflow hypotheses and illustration
    design/                       UX/AI spec, rubric, prompt and authored wireframe
    implementation/               Build backlog, runbook and verification records
    evaluation/
      README.md                   Materials and result status
      practice/                   Participant packet and separate reference notes
      templates/                  Blank review brief
      baselines/                  Dated source snapshot and human timing CSV
      runs/                       Ignored scratch audit output, created on rerun
    scripts/                      Reproducible source audit
  templates/                      Reusable documentation templates
  scripts/                        Documentation link checker
  archive/                        Historical documents with provenance labels
```

Research evidence, source inspection, authored examples and measured outcomes serve different purposes. Each artifact states which it contains. The [editing guide](CONTRIBUTING.md#evidence-and-status-conventions) defines the labels and where to record future changes.
