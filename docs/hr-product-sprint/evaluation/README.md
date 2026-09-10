# Evaluation materials and result status

[Documentation home](../../README.md) · [Sprint index](../README.md) · [Phase 4 plan](../phases/04-evaluation-and-iteration.md)

Updated: 2026-09-11. **The human practice packet, Phase 4 dataset/runner and bulk CV pipeline fixture are ready. One real Phase 4 API attempt failed with AI_UNAVAILABLE; no model draft or human session is available for quality/timing evaluation.** The completed source inventory is a separate engineering baseline. The [Phase 3 implementation record](../phases/03-prototype-build.md#verification-record) includes software checks and one failed real provider attempt; it is not an AI-quality evaluation.

## Choose the right path

**New: [English-first three-provider pilot](english-first-pilot.md)** — API setup, benchmark review, Indonesian adaptations, and the exact human tasks. [Data governance](data-governance.md) records implemented boundaries and deferred training work. This is a separate experiment from frozen v1; live comparison remains pending.

| Purpose | Materials | Current status |
|---|---|---|
| Validate interview pauses and recovery | [Step-by-step validation checklist](session-control-validation.md), [owner self-test](results/2026-09-09-session-control-self-test.md) | A1–A10 reported passing with A5/A8 caveats and a window-focus gap; Part B blocked by sign-in; revised behavior needs retest |
| Understand the inherited report | [Source baseline report](current-product-baseline.md), [dated raw audit](baselines/2026-09-07-source-audit.json) | Executed source inspection; no model or user outcome measured |
| Facilitate a human rehearsal | [Manual study guide](manual-study-guide.md) | Instructions, timing boundaries and quality checks ready; reviewer unassigned |
| Give a participant the task | [Reviewer packet](practice/reviewer-packet.md), [blank brief](templates/review-brief.md), task instruction from the guide | Two fictional practice records, P1-A/P1-B |
| Review a completed practice brief | [Facilitator reference notes](practice/reference-notes.md) | Assistant-authored expectations; keep separate from participant materials |
| Record actual human measurements | [Human review log](baselines/human-review-log.csv) | Header only; no rows or measurements |
| Run and inspect model evaluation | [Phase 4 guide](phase-4-guide.md), [frozen dataset](dataset/README.md), [Phase 4 results](../phases/04-evaluation-and-iteration.md) | Eight base cases and two variants frozen; first batch stopped after one failed attempt with 29 unattempted slots |
| Validate automated CV pipeline | [CV pipeline checklist](cv-pipeline-validation.md), [10-CV fixture](dataset/cv-pipeline-v1/README.md), [implementation note](../implementation/2026-09-11-bulk-pipeline.md) | Software path is implemented; live Firebase rule, batch ranking, scheduling and candidate-admission checks are pending |

## Reading and participation order

The facilitator reads the study guide and reference notes first. A participant receives only the reviewer packet, a fresh blank brief and the task instruction. Keep the reference notes out of view until the task ends and record any prior familiarity.

P1-A/P1-B are visible development/practice cases, with provisional criteria and assistant-authored reference judgments. They are never held-out cases and do not establish candidate competence, practitioner agreement or real recruiting demand.

## Records and reproducibility

The [dated audit JSON](baselines/2026-09-07-source-audit.json) preserves the original source hashes, timestamp and extracted values. Run the following from the repository root to inspect current source without replacing it:

```powershell
node docs/hr-product-sprint/scripts/audit-current-product.cjs
```

Reruns write `evaluation/runs/source-audit-latest.json`, which is ignored scratch output. Follow the [baseline report](current-product-baseline.md) to capture a new dated snapshot when needed. Human results belong in the CSV only after a real session, with an original brief and method record. Later AI outputs, failures and reviewed results must retain their case/prompt/model versions; the [contributor guide](../../CONTRIBUTING.md#files-links-and-recorded-evidence) explains where to store them.

No time-saving, accuracy or fairness percentage has been measured for the proposed workflow. The [Phase 4 report](../phases/04-evaluation-and-iteration.md) owns the future result summary and comparison.
