> September 10 revision: see [current progress](../../README.md) and [implementation matrix](../implementation/revision-tracker.md). Earlier entries below are a dated phase history, not a claim that the expanded scope has passed live acceptance.

# Phase 2: solution design and AI logic

Status: **Complete — design package implemented in the production prototype.**

Started: 2026-09-07. Updated/completed: 2026-09-08 (Asia/Jakarta). Planned allocation: 8 hours; actual hours not recorded.

[Documentation home](../../README.md) · [Previous phase](01-discovery-and-ux.md) · [Sprint index](../README.md) · [Next phase](03-prototype-build.md)

## Outcome

Defined InterviewMate Review Brief as four evidence-based criterion entries with traceable candidate quotations, explicit limitations, reviewer corrections and a reviewed export. [D02](../../archive/pre-evidence-v2/hr-product-sprint/decisions/002-review-brief-design.md) records the selected architecture: one structured server-side generation, deterministic checks and human review, with no numeric hiring score.

The [clickable wireframe](../design/wireframe.html) preserves the early design intent. The live product now implements the shared configuration, mandatory voice + text composer, evidence rubric, recovery/guardrail behavior, provider routing, reviewer boundaries and optional CV/GitHub context. Recruiter timing and independent model-quality calibration remain outside this single-builder release.

### Release note — 2026-09-11

The design package is the source for the implemented UX and AI behavior. The current production validation is summarized in the [release record](../evaluation/results/2026-09-11-production-release.md); the older authored wireframe and design examples remain useful references, not a second product surface.

## Deliverables and reading order

| Read | Artifact | What is specified |
|---|---|---|
| 1 | [Design package and wireframe](../../archive/pre-evidence-v2/hr-product-sprint/design/README.md) | Complete artifact index, authored examples and how to run checks |
| 2 | [UX and interaction specification](../../archive/pre-evidence-v2/hr-product-sprint/design/ux-spec.md) | Input, source inspection, edits, review states, export, errors and responsive/accessibility behavior |
| 3 | [Role and evidence rubric](../../archive/pre-evidence-v2/hr-product-sprint/design/role-rubric.md) | Four provisional criteria, anchors, five shared questions and no score/ranking |
| 4 | [AI/data contract](../../archive/pre-evidence-v2/hr-product-sprint/design/ai-contract.md) and [exact prompt](../../archive/pre-evidence-v2/hr-product-sprint/design/prompts/review-brief-v1.md) | Request/output shape, validation, model configuration, provenance, failures and review/export state |
| 5 | [Acceptance plan](../../archive/pre-evidence-v2/hr-product-sprint/design/acceptance-plan.md) | Software/UX expectations, eight-case evaluation plan, split and fixed readiness rules |
| 6 | [Phase 3 backlog](../../archive/pre-evidence-v2/hr-product-sprint/implementation/phase-3-backlog.md) | Six ordered tasks within the eight-hour planning allocation |

## Verification and limits

| Check | Actual outcome | Boundary |
|---|---|---|
| Offline contract checks | **30 passed** | Fixture/schema/source-copy checks and rejection cases; no provider calls |
| Wireframe interaction rehearsal | **18 passed** across wide/narrow DOM configurations | jsdom with dialog/media/scroll shims; not a real browser accessibility audit |
| Browser rendering | Wireframe opened in the Codex browser; narrow viewport screenshot inspected | Initial layout inspection, not recruiter usability validation or a full cross-browser walkthrough |
| Documentation links | **291 local links across 36 Markdown files passed** | All documents reachable; no external URL or factual-content validation implied |
| Source fixture preservation | P1-A/P1-B retain all 28 original turns and the five shared questions | Authored references remain provisional and known to developers |
| Semantic-overreach control | Authored unsupported claim passes mechanical checks as expected | Demonstrates why quote validity cannot replace human interpretation review |

During wireframe review, source IDs were separated from hidden input-preview IDs and the source panel was kept mounted across narrow-layout edits. Interaction checks cover source highlighting/focus return, review gating, edit invalidation, removal/restore, empty evidence, provenance and failure/loading previews.

Reproduce the checks from the repository root:

```powershell
node docs/hr-product-sprint/scripts/check-phase-2.cjs
node docs/hr-product-sprint/scripts/check-phase-2-wireframe.cjs
node docs/scripts/check-docs.cjs
```

These results are design-artifact checks, not measured AI accuracy, time savings or candidate-assessment validity.

## Exit criteria

- [x] Complete the flow and report wireframe.
- [x] Define four role criteria, evidence anchors and shared questions; label lack of practitioner calibration.
- [x] Finalize v1 input/output shape, prompt, provenance and failure/retry rules.
- [x] Select qualitative evidence status without numeric scores or hiring recommendations.
- [x] Freeze synthetic scenario expectations and readiness rules before live tuning.
- [x] Map the design to a bounded Phase 3 implementation backlog.

## Open items and next action

The [Phase 3 report](03-prototype-build.md) records the implemented generation/review contract. The sentence about pending provider access belongs to the original Phase 2 boundary: Phase 2 itself used no API key or Firebase round trip. Subsequent production checks are recorded in the [release record](../evaluation/results/2026-09-11-production-release.md).

Human timing still awaits an available reviewer. The [Phase 4 dataset](../evaluation/dataset/README.md) now contains frozen C01–C08 inputs/references and two variants. They must remain versioned, with the withheld cases excluded from prompt tuning after authorship. Broader browser/accessibility checks and practitioner calibration remain future work.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created Phase 2 tracker and starting questions | Planning only; no completed wireframes or final AI contract |
| 2026-09-07 | Received Phase 1 decision, practice packet and capability baseline | Detailed design remained planned |
| 2026-09-07 | Defined D02, rubric/profile, prompt, executable contract, authored examples, UX states and acceptance plan | Versioned design choices and Phase 3 backlog; no live AI results |
| 2026-09-08 | Built the authored interactive wireframe and corrected source-panel/ID behavior | Source inspection, edits and review/export eligibility demonstrated with authored content |
| 2026-09-08 | Passed 30 contract checks and 18 DOM interaction checks; inspected browser rendering | Design package complete; Phase 3 implementation and Phase 4 evaluation remain outstanding |
| 2026-09-08 | Linked the implemented Phase 3 workflow | Design artifacts remain authored references; live provider verification is tracked in Phase 3 |
