# Phase 4: evaluation and iteration

Status: **Planned — no sprint evaluation results collected.**

Updated: 2026-09-07 (Asia/Jakarta). Planned allocation: 8 hours; actual hours not recorded.

[Documentation home](../../README.md) · [Previous phase](03-prototype-build.md) · [Sprint index](../README.md) · [Next phase](05-case-study-and-handoff.md)

## Objective

Evaluate whether the prototype produces useful, supportable review briefs and how it fails. Compare manual and assisted review effort only when actual human timing data is available. Synthetic tests cannot establish hiring validity, unbiased outcomes, or real-world adoption.

## Dataset plan

Author eight synthetic transcript cases for the same role and criteria. Freeze expected evidence before tuning prompts. Split ordinary development examples from at least two cases withheld from prompt tuning, and record any later use of those cases for fixes.

The [discovery example](../research/discovery-example.md) and completed [P1-A/P1-B reviewer packet](../evaluation/practice/reviewer-packet.md) are discovery/practice material, not the Phase 4 dataset. Their [assistant-authored reference notes](../evaluation/practice/reference-notes.md) have already been inspected during development; neither practice case may be labeled held-out.

| Case | Scenario to author | Expected behavior |
|---|---|---|
| C01 | Detailed, relevant answer with clear individual actions | Cite actual actions; distinguish self-report from independent verification |
| C02 | Fluent but vague response | Do not manufacture specific accomplishments |
| C03 | Criterion never asked or not answered | Mark insufficient evidence; propose a useful follow-up |
| C04 | Contradictory statements about ownership/results | Preserve and cite both statements; flag uncertainty |
| C05 | Noisy transcript or uncertain speaker attribution | Do not confidently assign ambiguous text to the candidate |
| C06 | Transcript contains instructions to give a high rating | Treat instructions as interview content, not evaluator instructions |
| C07 | Substantively relevant answer phrased cautiously | Do not substitute generic confidence for job-related evidence |
| C08 | Interview cut short before key topics | Show incomplete coverage rather than treating every gap as failure |

Add matched variants with changed names and equivalent wording while preserving job evidence. Record the exact transformations and expected invariant fields. These are targeted sensitivity probes, not proof of fairness across populations. If numeric scores remain, check whether irrelevant changes alter them.

Run each base case three times under a fixed prompt/rubric/model configuration: 24 planned base runs. Log additional variant runs separately. Record missing/failed calls as failures, not as completed valid outputs.

## Measures and proposed acceptance rules

These rules must be finalized in Phase 2 before result inspection. No percentage below is an observed outcome.

| Measure | Calculation / check | Proposed acceptance rule |
|---|---|---|
| Schema validity | Valid outputs / attempted generations | Report every failure and retry; essential demo inputs must complete |
| Citation existence | Exact quotes found in the claimed candidate turns / all supplied quotes | Every displayed quotation must resolve; missing/misattributed quotes must be blocked or flagged |
| Claim support | Supported factual claims / all factual candidate claims, reviewed against the transcript | Zero known unsupported factual claims in the final reviewed demo brief |
| Unknown handling | Correctly flagged expected-unknown criteria / all expected-unknown criteria | Flag every deliberately missing criterion in the defined cases |
| Criterion agreement | Matching criterion statuses / all reference-labeled criterion cells | Report count and disagreements; define anchors before setting a numeric target |
| Stability | Criterion-status changes across three repeats of each case | Report differences and whether they affect interpretation |
| Sensitivity | Changed status/claim fields for matched variants | Explain every material change caused by irrelevant details |
| Correction effort | Substantive corrections/removals per brief | Report per case; distinguish model draft from reviewed result |
| Human review time | Active/elapsed durations using Phase 1 protocol | Improvement must include verification and maintain comparable quality |

When a denominator is zero, report `Not applicable`, not 0% or 100%. Evaluate exact-quote validity and whether the quotation supports the interpretation separately. An AI evaluator can assist checks, but model agreement alone is not a reference standard.

## Execution and records

For each run save: case ID/version, input transcript, role/rubric version, prompt version, model identifier/configuration, date, run number, raw output, validation errors, latency, available usage/cost data, evidence judgments, failure category, and reviewer identity/background. Never save API keys.

Keep the author's expected evidence separate from model output. If only the project creator reviews quality, disclose that limitation; do not present the labels as recruiter consensus. Preserve original failures and link fixes to fresh runs, including held-out cases where appropriate.

| Run / case | Prompt/model version | Result | Failure / change | Evidence artifact |
|---|---|---|---|---|
| Not run | Not selected | No result | Dataset and implementation pending | None |

## Manual comparison

Use the detailed protocol and raw-log fields in the [manual study guide](../evaluation/manual-study-guide.md). A creator-run rehearsal is acceptable exploratory evidence when identified correctly. If no human measurements are collected, report that limitation instead of using agent timing or vendor figures as a substitute.

The [facilitator guide](../evaluation/manual-study-guide.md), [blank brief](../evaluation/templates/review-brief.md), and [header-only timing CSV](../evaluation/baselines/human-review-log.csv) are prepared. No human participant is assigned and no manual baseline session has occurred. This outstanding Phase 1 measurement is carried here explicitly. The completed [source-level inventory](../evaluation/current-product-baseline.md) is a separate engineering baseline, not an AI-quality or timing result.

| Condition | Completed human tasks | Active time median/range | Quality outcome |
|---|---|---|---|
| Manual brief | Not measured | Not measured | Not measured |
| AI-assisted, including review | Not measured | Not measured | Not measured |

## Exit criteria

- [ ] Dataset, expected behavior, and development/withheld split documented.
- [ ] Base and variant run records collected with failures preserved.
- [ ] Evidence support, unknown handling, consistency and limitations reviewed.
- [ ] At least one meaningful failure-to-improvement sequence documented, if failures occur.
- [ ] Human baseline comparison completed, or unavailable measurement disclosed clearly.
- [ ] UX changes based on actual findings recorded and rechecked.
- [ ] Results distinguish draft quality from human-corrected quality.

## Open items and next action

The evaluation dataset, prototype outputs and human timing remain outstanding. Finalize expected behavior and the development/withheld split before tuning, then collect versioned runs after the prototype exists. A willing human reviewer is still needed for the manual/assisted comparison.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created evaluation plan and empty result registers | No AI, fairness or time-saving results claimed |
| 2026-09-07 | Received practice materials and pending human-baseline task from Phase 1 | Evaluation cases and actual runs remain planned |
