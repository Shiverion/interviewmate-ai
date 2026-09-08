# Phase 5: case study and engineering handoff

Status: **Planned — submission artifacts not yet produced.**

Updated: 2026-09-07 (Asia/Jakarta). Planned allocation: 8 hours; actual hours not recorded.

[Documentation home](../../README.md) · [Previous phase](04-evaluation-and-iteration.md) · [Sprint index](../README.md)

## Objective

Package a runnable demonstration, a case study with honest evidence, and engineering/design guidance sufficient to continue the product. Record a five-minute demo after there is a verified workflow and actual results to show.

## Case study outline

1. **Problem and user:** the selected recruiting task, target segment, desk-research evidence, assumptions, and how the scope was selected.
2. **Prior product and sprint contribution:** exact inherited functionality and what changed during these five phases.
3. **Workflow and UX:** current task, proposed task, key screens, source inspection, correction, unknowns, and error states.
4. **AI behavior:** model/prompt versions, data flow, evidence extraction, validation and reviewer responsibility.
5. **Evaluation:** synthetic dataset, reference-label method, raw results, repeated runs, failure examples and fixes. Include human baseline results only if measured.
6. **Limits and next steps:** uncertainty from desk research, author-written fixtures, limited reviewers, language sensitivity, unsupported claims, and unverified production behavior.

Use [Phase 1](01-discovery-and-ux.md) through [Phase 4](04-evaluation-and-iteration.md) as the evidence trail. The old [PRD](../../archive/legacy-prd.md) and [project report](../../archive/legacy-project-report.md) are historical references; their metrics must not be republished as measured sprint outcomes.

## Engineering handoff checklist

- [ ] Verified local run command, runtime requirements and configuration-variable names with no secrets.
- [ ] Architecture diagram showing browser, server/model calls, persistence and trust boundaries.
- [ ] Implemented API inputs/outputs and example payloads, with validation and error semantics.
- [ ] Role/rubric, prompt/model and transcript versions; quote/turn-reference rules.
- [ ] Data model for draft, reviewer edits, review status and exports.
- [ ] UX states, navigation, empty/loading/error paths and source-review interactions.
- [ ] Acceptance criteria tied to tests and evidence artifacts.
- [ ] Known defects and demo limitations, prioritized by their effect on the core workflow.
- [ ] Access control, data retention/deletion, candidate consent and secret handling requirements for any later real-data use; no unsupported compliance claim.
- [ ] Timeouts/retries, request limits, observability, measured latency and available cost data.
- [ ] Deferred scope, practitioner calibration, user research and future integration decisions.

## Five-minute recording outline

| Time | Segment | Evidence to show |
|---|---|---|
| 0:00-0:40 | Recruiting problem and target user | Workflow and research limitation |
| 0:40-1:15 | Role and synthetic input | Criteria, transcript and synthetic label |
| 1:15-2:40 | Core product flow | Generate draft, inspect a source, correct an interpretation, mark reviewed |
| 2:40-3:25 | AI behavior | Actual input/output, citation checking and unknown handling |
| 3:25-4:20 | Evaluation | Recorded case results, failure and improvement, timing only if measured |
| 4:20-5:00 | Handoff | Run instructions, architecture, limitations and next engineering steps |

Never describe saved output as a live model response. If using a replay for recording reliability, label it and include the recorded run provenance. Do not imply a functioning voice interview unless it was verified.

## Final submission register

| Required deliverable | Location | Status |
|---|---|---|
| Runnable prototype / interactive workflow | [Review runbook](../implementation/review-brief-runbook.md), [benchmark workspace](../evaluation/english-first-pilot.md) | Implemented locally; successful live generation pending |
| Case study and engineering handoff Markdown | To be produced here or linked as a final artifact | Pending Phases 1-4 |
| Five-minute Loom or screen-recorded video | No recording yet | Pending verified demonstration |

## Exit criteria

- [ ] Prototype can be run by following the handoff.
- [ ] Case study accurately distinguishes assumptions, measurements and limitations.
- [ ] All reported metrics trace to raw records and correct denominators.
- [ ] Inherited work and sprint changes are disclosed.
- [ ] Required recording exists, plays correctly, and matches the demonstrated behavior.
- [ ] File links, diagrams and deliverable access checked.

## Open items and next action

The local review prototype and English-first benchmark workspace now exist. Successful live model evaluation, human judgments, the final case study and recording remain pending. Use the [setup/reviewer guide](../evaluation/english-first-pilot.md) and [governance record](../evaluation/data-governance.md) as handoff inputs. Assemble the final artifacts from measured evidence and record the verified workflow.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created case-study, handoff and recording tracker | Outline only; no submission completion or video claimed |
