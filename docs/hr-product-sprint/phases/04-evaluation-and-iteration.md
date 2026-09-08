# Phase 4: evaluation and iteration

Status: **In progress — dataset and harness complete; live model evaluation blocked by provider access.**

Updated: 2026-09-08 (Asia/Jakarta). Planned allocation: 8 hours; actual hours not recorded.

[Documentation home](../../README.md) · [Previous phase](03-prototype-build.md) · [Sprint index](../README.md) · [Next phase](05-case-study-and-handoff.md)

## Outcome and deliverables

Phase 4 now has a [frozen synthetic dataset](../evaluation/dataset/README.md), [evaluation guide](../evaluation/phase-4-guide.md), repeatable runner and software checks. Eight base cases cover concrete evidence, vague accounts, missing topics, conflicting ownership, unknown speakers, instruction injection, cautious language and an interrupted interview. Two matched variants change an introductory name or conversational fillers.

The first genuine API batch attempted C01-r1 and returned **HTTP 503 / AI_UNAVAILABLE**. The runner preserved the response and original server record, then stopped. It did not manufacture a draft or run the other 29 slots against a known access failure. Successful generation remains pending from Phase 3.

| Deliverable | Actual state | Evidence |
|---|---|---|
| Eight base cases and two variants | Authored and frozen before API calls | [Dataset index](../evaluation/dataset/README.md), [catalog](../evaluation/dataset/v1/catalog.json) |
| Expected behavior and split | 32 base criterion judgments and 32 material unknown checkpoints; explicit sources and prohibited inferences | Reference files linked from the dataset index |
| Freeze/provenance | Canonical data hashes and exact runtime prompt/role/contract/model configuration retained | [Freeze record](../evaluation/dataset/v1/freeze.json) |
| Repeatable evaluation runner | Plans 24 base + 6 variant runs; preserves attempts and stops on operational failures | [CLI](../scripts/evaluate-phase-4.cjs), [shared harness](../scripts/evaluation/core.cjs) |
| Real run evidence | One failed API attempt, zero valid drafts, 29 unattempted slots | [Batch report](../evaluation/results/phase4-2026-09-08T07-35-39-471Z-03540b9e/report.md) |
| Semantic-review preparation | Per-valid-output templates implemented; none created because no output was valid | [Evaluation guide](../evaluation/phase-4-guide.md#review-support-uncertainty-and-correction-burden) |
| Software verification | **27 checks passed** using authored replays and mocked transport | [Checker](../scripts/check-phase-4.cjs) |
| Documentation navigation | **401 local links across 40 Markdown files passed** | All documents remain reachable from the root README |
| Human comparison | No human session; timing log still has no data rows | [Manual guide](../evaluation/manual-study-guide.md), [human log](../evaluation/baselines/human-review-log.csv) |

The cases and expected judgments were authored by the project AI assistant, without recruiter/HM calibration. C07/C08 and their relevant variant are withheld from prompt tuning after authorship; they were seen by their author and are not independently blinded. No runtime prompt, role or product behavior changed during this phase.

## Observed results and denominators

The [machine summary](../evaluation/results/phase4-2026-09-08T07-35-39-471Z-03540b9e/summary.json) and [batch plan](../evaluation/results/phase4-2026-09-08T07-35-39-471Z-03540b9e/batch.json) own exact run coverage. The [attempt record](../evaluation/results/phase4-2026-09-08T07-35-39-471Z-03540b9e/C01-r1.attempt.json) includes both the sanitized HTTP response and the server failure record.

| Measure | Actual result | Interpretation |
|---|---|---|
| Base attempts | 1 of 24 planned | C01-r1 only |
| Variant attempts | 0 of 6 planned | No sensitivity comparison available |
| Valid base drafts | 0 of 1 attempted | Access failure; no candidate judgment produced |
| Available base criterion cells | 0 of 96 planned | Status agreement is unavailable, not 0/96 accuracy |
| Proposed quotes / quote validity | No inspectable model output | No quote-validity ratio or hallucination conclusion |
| Full repeated base cases | 0 of 8 | Stability remains unevaluated |
| Matched variant pairs | 0 of 6 | No fairness or sensitivity result |
| Claim support, unknown preservation and conflict meaning | Not reviewed | Requires generated output and explicit source judgments |
| Human effort / time saved | Not measured | No human session |
| Production readiness / hiring validity | Not established | A narrow synthetic study would not establish either |

No failures were silently excluded. The one unavailable generation is counted as an attempted failure; the 29 untouched slots are listed separately. The earlier Phase 3 P1-A access failure belongs to its own smoke record and is not mixed into this dataset's denominator.

## What the software checks establish

The 27 checks validate case/reference integrity, declared-only variant changes, freeze drift detection, exact-source constraints, input/configuration provenance, no hidden retries, and proper counting for partial or failed batches. Mocked complete batches verify that status disagreements and repeat/variant changes appear in the summary. Rejected quotes remain in the proposed-quote denominator when raw output is inspectable. Missing raw records stop collection rather than claiming a complete audit trail.

An intentionally unsupported statement with a valid quote passes the mechanical checker as expected. This demonstrates a validator boundary, not an observed model hallucination. The tests use explicit `mock_transport` metadata and write scratch data under ignored `tmp/`; they are not reported as 30 successful live generations.

Reproduce software checks without an API call:

```powershell
node docs/hr-product-sprint/scripts/check-phase-4.cjs
node docs/hr-product-sprint/scripts/evaluate-phase-4.cjs --check
node docs/scripts/check-docs.cjs
```

The [guide](../evaluation/phase-4-guide.md) owns live-run commands, stop rules, record maintenance and semantic-review instructions. The frozen [acceptance plan](../design/acceptance-plan.md#measures-and-readiness-rules) still owns quality gates; software pass rates do not satisfy the model-quality gates.

## Failures, changes and remaining uncertainty

The actual finding is operational: server key/model access is still unavailable. The evaluator's message intentionally does not expose provider error details, so the record does not distinguish rejected credentials from missing model access. One failed attempt was sufficient to stop this batch.

The harness now preserves that failure, reports the unattempted slots and leaves unavailable ratios unset. It also avoids sending expected labels to the model. No prompt tuning, AI-quality improvement, candidate ranking, or UX improvement based on live output is claimed. A content-failure-to-improvement sequence and any resulting UX change remain pending real generated outputs.

Do not modify the frozen v1 references after seeing outputs. Record disputes separately. If a withheld case informs a future fix, treat it as development and author a new withheld case. Practice P1-A/P1-B and Phase 2 examples remain development material.

## Manual comparison

| Condition | Completed human tasks | Active time median/range | Quality outcome |
|---|---|---|---|
| Manual brief | Not measured | Not measured | Not measured |
| AI-assisted, including source review and correction | Not measured | Not measured | Not measured |

Use the [manual study guide](../evaluation/manual-study-guide.md) if a willing reviewer becomes available. Record real reviewer background, active work and AI wait separately. The source inventory, assistant execution speed and model latency cannot substitute for human task measurements.

## Exit criteria

- [x] Dataset, expected behavior and development/withheld split documented with actual versioned inputs.
- [x] Human baseline unavailability disclosed clearly.
- [x] Attempt recording, failure preservation and metric-denominator behavior verified.
- [ ] Complete planned base/variant run collection, or explicitly bound a reduced evaluation after working access is restored.
- [ ] Review evidence support, unknown handling, consistency and limitations on actual outputs.
- [ ] Record a meaningful content-failure-to-improvement sequence if content failures occur.
- [ ] Record and recheck any UX changes based on evaluation findings.
- [ ] Report draft quality separately from human-corrected quality once those records exist.

## Open items and next action

Restore server `OPENAI_API_KEY` access to the pinned model and restart the local development server. Run a new bounded check or batch using the guide; preserve this failed batch. Then conduct semantic review and report actual denominators before calling Phase 4 complete.

A final case study can already explain the scope, design, implementation and honest access limitation. Successful live AI, AI-quality measurements, human timing and the five-minute video remain unresolved deliverable work; no Phase 5 completion is implied.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created evaluation plan and empty result registers | No AI, fairness or time-saving results claimed |
| 2026-09-07 | Received practice materials and pending human-baseline task from Phase 1 | Evaluation cases and actual runs remained planned |
| 2026-09-08 | Received v1 acceptance rules, rubric and run contract from Phase 2 | Detailed plan now has one canonical source; dataset authorship and live runs remained outstanding |
| 2026-09-08 | Authored eight base cases, two exact variants and provisional references; froze them before API calls | 69 base transcript turns, 32 base criterion judgments and 32 base uncertainty checkpoints |
| 2026-09-08 | Implemented and checked the evaluation runner and summaries | 27 software checks passed; mocked outcomes remain explicitly separate |
| 2026-09-08 | Attempted the first real Phase 4 batch | C01-r1 returned 503 / AI_UNAVAILABLE; retained failure, zero generated drafts and 29 unattempted slots |
