# Evaluation materials and result status

[Documentation home](../../README.md) · [Sprint index](../README.md) · [Phase 4 plan](../phases/04-evaluation-and-iteration.md)

Updated: 2026-09-07. **Preparation is complete for a human practice task; no human session or new live AI-quality evaluation has occurred.** The completed source inventory is a separate engineering baseline.

## Choose the right path

| Purpose | Materials | Current status |
|---|---|---|
| Understand the inherited report | [Source baseline report](current-product-baseline.md), [dated raw audit](baselines/2026-09-07-source-audit.json) | Executed source inspection; no model or user outcome measured |
| Facilitate a human rehearsal | [Manual study guide](manual-study-guide.md) | Instructions, timing boundaries and quality checks ready; reviewer unassigned |
| Give a participant the task | [Reviewer packet](practice/reviewer-packet.md), [blank brief](templates/review-brief.md), task instruction from the guide | Two fictional practice records, P1-A/P1-B |
| Review a completed practice brief | [Facilitator reference notes](practice/reference-notes.md) | Assistant-authored expectations; keep separate from participant materials |
| Record actual human measurements | [Human review log](baselines/human-review-log.csv) | Header only; no rows or measurements |
| Plan model evaluation | [Phase 4 case matrix and measures](../phases/04-evaluation-and-iteration.md) | Eight base cases and repeated runs planned; dataset/results not yet produced |

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
