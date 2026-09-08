# Phase 4 evaluation: run, inspect and continue

[Evaluation home](README.md) · [Dataset](dataset/README.md) · [Phase 4 report](../phases/04-evaluation-and-iteration.md) · [Prototype runbook](../implementation/review-brief-runbook.md)

Updated: 2026-09-08. The dataset and harness are ready. The first batch stopped on **AI_UNAVAILABLE** after one API attempt. No generated draft or semantic-quality result exists for this dataset yet.

## Current evidence

The first [batch report](results/phase4-2026-09-08T07-35-39-471Z-03540b9e/report.md), [plan/configuration](results/phase4-2026-09-08T07-35-39-471Z-03540b9e/batch.json), [attempt](results/phase4-2026-09-08T07-35-39-471Z-03540b9e/C01-r1.attempt.json) and [machine summary](results/phase4-2026-09-08T07-35-39-471Z-03540b9e/summary.json) are retained together. The attempt includes the sanitized API response and the server's original synthetic failure record. No model output or usage was returned.

Only C01-r1 was attempted. The other 29 planned slots were **not attempted**, not failed generations. Zero valid drafts means zero available criterion cells and no status-agreement or quote-validity ratio. Do not turn this into “0% hiring accuracy,” a hallucination finding or a fairness result.

## Verify the frozen package

Use the existing installed project dependencies and Node.js 20.9.0 or newer. From the repository root:

```powershell
node docs/hr-product-sprint/scripts/evaluate-phase-4.cjs --check
node docs/hr-product-sprint/scripts/check-phase-4.cjs
```

The first checks the catalog, references, declared transformations, data hashes and runtime configuration. The second runs **27 software checks** using authored reference replays and injected transport. These checks include a complete 30-slot mock batch, known citation faults, partial denominators, status changes, unavailable providers, missing raw records and provenance mismatches. They do not measure AI performance.

`--freeze` was used once before the first API attempt. It refuses to overwrite an existing freeze. Do not rerun it to erase drift or a failed evaluation.

## Restore access and collect a new batch

Configure a working server `OPENAI_API_KEY` with access to `gpt-4o-2024-08-06` in the ignored `.env.local`, following the prototype runbook. The key is not read by this harness, written to run records or sent through a browser header. Restart the loopback development server after changing it:

```powershell
npm run dev -- --hostname 127.0.0.1
```

In another terminal, a bounded access check can use one planned slot:

```powershell
node docs/hr-product-sprint/scripts/evaluate-phase-4.cjs --run --max-attempts 1
```

Then collect the full frozen batch:

```powershell
node docs/hr-product-sprint/scripts/evaluate-phase-4.cjs --run
```

Each command creates a **new** batch directory under `evaluation/results/`. It does not overwrite or silently resume an old attempt. A successful one-slot check is an extra attempt, not part of a later 30-slot batch; retain and report it separately. There is no automatic retry or background polling.

The default plan is three repeats for each of eight base cases, followed by three repeats for each of two variants. The runner stops on access, rate-limit, infrastructure, provenance or collection problems. Content-specific invalid output/citations or refusal remain failed attempts in the batch; later planned slots can still run. The API has a 30-second generation deadline, with a 40-second client request bound. The runner accepts only the loopback HTTP endpoint and refuses redirects. A live batch with failures or an operational stop returns exit code 2; read its report for the actual coverage.

The model receives only the strict synthetic request. Expected labels and reference notes stay in the harness. Successful responses must match the frozen model/prompt/role/contract hashes and the current case's canonical input hash, and pass the runtime schema/citation validator.

## Inspect records before interpreting metrics

| File | Meaning | Editing rule |
|---|---|---|
| `batch.json` | Plan, freeze snapshot, execution type, timing and stop reason | Runner updates the batch progress metadata; retain it with the attempt files |
| `*.attempt.json` | Actual request identity, HTTP response, accepted/rejected result, raw server record when available | Immutable evidence; never rewrite a failure into success |
| `summary.json` / `report.md` | Derived counts, available denominators, status disagreements and repeat/variant coverage | Regenerate from original attempts; no model call |
| `*.semantic-review.json` | Blank per-output review template, created only for valid drafts | Fill with explicit reviewer identity/background and source reasoning; preserve any original draft |

To regenerate the current report without another API call:

```powershell
node docs/hr-product-sprint/scripts/evaluate-phase-4.cjs --summarize docs/hr-product-sprint/evaluation/results/phase4-2026-09-08T07-35-39-471Z-03540b9e
```

The [shared harness](../scripts/evaluation/core.cjs) owns dataset validation, attempt classification, persistence and aggregation. The [CLI](../scripts/evaluate-phase-4.cjs) owns execution/report commands. The [software checker](../scripts/check-phase-4.cjs) exercises the failure and counting behavior. Runtime product code, role and prompt remain unchanged from Phase 3.

## Review support, uncertainty and correction burden

Automatic results cover mechanically valid drafts, exact candidate quotes, status agreement with author labels, and status changes across available repeats/variants. Rejected output quotes remain in the proposed-quote denominator when the raw output is inspectable. Unparseable or absent output is reported separately; it cannot silently improve quote validity.

For each valid draft, inspect the full input and frozen reference. In its semantic-review file:

1. Record reviewer ID, background, whether the reviewer is a human or assistant, prior case exposure and actual review time/date. Assistant judgments must not be called human validation.
2. Split each claim into atomic factual propositions. For each, record supported, unsupported or uncertain, with cited source reasoning. Exact quotation alone is insufficient: the software control deliberately shows that an overreaching claim can retain a valid quote.
3. Mark every material unknown checkpoint retained, omitted or misrepresented, and inspect both sources of an expected conflict. A status label by itself does not satisfy a checkpoint.
4. Record disagreements with the provisional reference and their rationale. Do not change the frozen label after seeing the output to improve agreement.
5. Preserve corrections separately, count substantive claim edits/removals, and link any reviewed export. Report original draft quality and corrected quality separately.

The harness deliberately leaves these semantic fields blank and does not aggregate unfinished or assistant-authored judgments as human support scores. Once reviews exist, summarize them explicitly in the Phase 4 report, including atomic-claim/checkpoint denominators and reviewer background. No semantic-review files were produced in the first failed batch.

The matched probes inspect a name-only change and filler-only changes with substantive/epistemic content preserved. Even identical outputs cannot establish population fairness. Status stability also does not prove stable meaning; read the claims and qualifiers.

## Human baseline and iteration

The [manual study guide](manual-study-guide.md) and [human log](baselines/human-review-log.csv) remain ready for a willing reviewer. No human session has occurred. Keep active human work separate from model latency; automated test execution is not human task time.

When a real content failure informs a fix, record the original attempt, source-level explanation, exact prompt/product change and fresh result. Preserve the original configuration and do not combine before/after runs into one accuracy figure. If a withheld case informs the fix, it becomes development material. The current access failure supports an operational stop-rule check, not an AI-quality improvement claim. Phase 5's final case study should state these limits unless new evidence resolves them.
