# Phase 4: evaluation and iteration

Status: **Planned — acceptance rules are defined; no live evaluation results collected.**

Updated: 2026-09-08 (Asia/Jakarta). Planned allocation: 8 hours; actual hours not recorded.

[Documentation home](../../README.md) · [Previous phase](03-prototype-build.md) · [Sprint index](../README.md) · [Next phase](05-case-study-and-handoff.md)

## Objective and inputs

Evaluate whether implemented briefs are grounded, useful and stable. Compare manual and assisted effort only when actual human timings exist. Synthetic tests cannot establish hiring validity, population fairness or adoption.

The [Phase 2 acceptance plan](../design/acceptance-plan.md) owns the case matrix, development/withheld assignment, measures and v1 readiness rules. It supersedes the initial proposed rules in this report. The [AI contract](../design/ai-contract.md) fixes versions, source checks and run provenance; the [role rubric](../design/role-rubric.md) defines evidence-status anchors.

## Planned deliverables

- Eight new case inputs with reference statuses, source support, prohibited inferences and material unknown checkpoints.
- C01–C06 for development; final C07/C08 inputs/reference content withheld from prompt tuning after authorship. They do not exist yet.
- Three repeats per base case (24 planned runs) and two matched sensitivity variants with three repeats each (6 additional planned runs).
- Original outputs, failures, version/configuration metadata and human judgments.
- Recorded fixes and fresh runs, with draft quality separate from human-corrected quality.
- Human timing comparison, or an explicit statement that the measurement remains unavailable.

The [Phase 1 packet](../evaluation/practice/reviewer-packet.md), [discovery fragment](../research/discovery-example.md) and [Phase 2 authored examples](../design/README.md#machine-readable-artifacts) are visible practice/development material. They can never be relabeled held-out. The offline contract/wireframe checks are software/design checks, not live model-quality results.

## Execution and result records

Follow the [frozen acceptance plan](../design/acceptance-plan.md#measures-and-readiness-rules). Save case/input/reference versions, prompt/model/role configuration, raw outputs, latency/usage when available, validation issues, human support judgments and reviewer background. Preserve failed attempts and link fixes to new records. No credentials belong in the result package.

If a withheld case informs a fix, record its new development use and author a new withheld case with a new ID. Report missing/failed outputs and actual denominators explicitly; no result is silently excluded.

| Run / case | Prompt/model version | Result | Failure / change | Evidence artifact |
|---|---|---|---|---|
| Not run | v1 design selected; no live run | No result | Dataset and implementation pending | None |

## Manual comparison

Use the [manual study guide](../evaluation/manual-study-guide.md), [blank brief](../evaluation/templates/review-brief.md) and [human timing CSV](../evaluation/baselines/human-review-log.csv). Include source verification, editing, checking and export; record AI wait separately. The CSV has a header only, no participant is assigned, and no human timing session has occurred.

The [source-level inventory](../evaluation/current-product-baseline.md) is a separate engineering baseline. Neither its counts nor agent execution speed substitute for human task measurements.

| Condition | Completed human tasks | Active time median/range | Quality outcome |
|---|---|---|---|
| Manual brief | Not measured | Not measured | Not measured |
| AI-assisted, including review | Not measured | Not measured | Not measured |

## Exit criteria

- [ ] Dataset, expected behavior and development/withheld split documented with actual versioned inputs.
- [ ] Base and variant run records collected with failures preserved.
- [ ] Evidence support, unknown handling, consistency and limitations reviewed.
- [ ] Meaningful failure-to-improvement sequence documented if failures occur.
- [ ] Human baseline comparison completed, or unavailable measurement disclosed clearly.
- [ ] UX changes based on findings recorded and rechecked.
- [ ] Results distinguish draft quality from human-corrected quality.

## Open items and next action

Author the final case/reference records before tuning, then collect runs after Phase 3 implements the workflow. Arrange a willing human reviewer when available. Report creator/assistant authorship and lack of practitioner calibration.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created evaluation plan and empty result registers | No AI, fairness or time-saving results claimed |
| 2026-09-07 | Received practice materials and pending human-baseline task from Phase 1 | Evaluation cases and actual runs remained planned |
| 2026-09-08 | Received v1 acceptance rules, rubric and run contract from Phase 2 | Detailed plan now has one canonical source; dataset authorship and live runs remain outstanding |
