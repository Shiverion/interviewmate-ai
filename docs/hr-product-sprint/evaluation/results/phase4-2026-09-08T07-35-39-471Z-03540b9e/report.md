# Phase 4 batch results

Execution: **live_api**. Status: **stopped**. Stop reason: **AI_UNAVAILABLE**.

[Phase 4 report](../../../phases/04-evaluation-and-iteration.md) · [Evaluation guide](../../phase-4-guide.md)

This report is generated from preserved attempt records. Status agreement is against provisional assistant-authored references, not hiring accuracy or practitioner consensus.

| Measure | Observed | Planned / limit |
|---|---|---|
| Base attempts | 1 | 24 planned |
| Variant attempts | 0 | 6 planned |
| Valid base drafts | 0/1 attempted | 24 planned drafts |
| Criterion status agreement | Not available: no valid base drafts | 96 planned cells; missing outputs are not disagreements |
| Exact candidate quotes | Not available: no inspectable proposed quotes | 1 attempt(s) without inspectable output |
| Human claim support / unknown preservation / conflict meaning | Not reviewed | Requires explicit semantic judgments |
| Human time / time saved | Not measured | No human timing session |
| Population fairness / production readiness | Not established | Narrow synthetic scenarios cannot establish either |

## Failures

- C01-r1: AI_UNAVAILABLE; HTTP 503.

## Coverage and consistency

29 planned slots were not attempted. They are listed in summary.json and must not be counted as provider failures. 0/8 base cases have all three valid repeats. 0/6 matched variant pairs are available. Identical statuses would still require a check for changes in meaning.

Read batch.json for the frozen configuration and plan, *.attempt.json for HTTP and raw server evidence, and summary.json for per-case status disagreements and repeat coverage. Successful attempts create separate blank semantic-review templates. Never fill them from quote matching alone.
