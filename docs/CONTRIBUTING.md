# Maintaining the documentation

[Documentation home](README.md) · [Sprint index](hr-product-sprint/README.md)

Updated: 2026-09-07. Use this guide when adding progress, changing scope or recording results. The project owner curates the index; anyone contributing work should update the relevant artifact and phase report in the same change.

## What to edit where

| Change | Edit this first | Then update |
|---|---|---|
| Completed work, next action or blocker | The relevant file in [phase reports](hr-product-sprint/README.md#phase-reports) | Sprint status table if the phase status changes; documentation home and root README if their status summaries change |
| New source or revised external claim | [Source register](hr-product-sprint/research/source-register.md) | Affected hypothesis or decision; cite its stable source ID |
| New user observation or changed problem hypothesis | [Problem and workflow](hr-product-sprint/research/problem-and-workflow.md) | Phase 1 report and any affected decision |
| Changed sprint scope | [Product_Sprint.md](../Product_Sprint.md), the authoritative specification | Affected phase reports and docs/README.md; preserve earlier decisions in the archive |
| Finalized UX/AI behavior | A focused artifact linked from the [Phase 2 report](hr-product-sprint/phases/02-solution-design-and-ai-logic.md) | Phase 2 checklist and Phase 3 implementation plan |
| Setup command or implemented capability | [Current runbook](hr-product-sprint/implementation/current-runbook.md) | Link to source, validation record and requirement matrix |
| Human session or AI evaluation run | A versioned record linked from the [evaluation guide](hr-product-sprint/evaluation/README.md) | Phase 4 results and the relevant phase log |
| Completed submission artifact | [Phase 5 submission register](hr-product-sprint/phases/05-case-study-and-handoff.md#final-submission-register) | Phase 5 exit criteria and sprint status |

Keep detailed evidence in one canonical document. A phase report summarizes the outcome and links to it; avoid copying source tables, protocols or results into several reports.

## Phase report structure

Use the [phase report template](templates/phase-report.md). All five reports should have:

- A clear title, current status, last-updated date and planned allocation. Planned time is not actual time worked.
- Navigation to the sprint index and adjacent phase reports.
- An outcome/objective and a linked deliverable list. Planned phases may include proposed flows and checklists.
- Exit criteria, open items/next action and an append-only dated progress log.

Update the current-state prose as work changes. Preserve historical log entries; add a new entry explaining a correction or changed decision. Check a task only when its output exists. If an evidence gap carries forward, name its destination phase explicitly.

## Evidence and status conventions

| Label | Meaning | Required context |
|---|---|---|
| External | A cited source reports something | Direct URL, publication/update date if known, access date and limitations |
| Code | Observed in the repository | Source path, snapshot/commit or audit hash where relevant, and inspection limits |
| Hypothesis | A proposition still to test | Investigation method and evidence that would contradict it |
| Proposed / Planned | Intended design or work | Responsible phase and acceptance criteria; do not describe as implemented |
| Authored example / Synthetic practice | Deliberately written illustration or fixture | Author/provenance, version and intended use; not a measured model response |
| Measured / Executed | An actual study, check or run occurred | Raw artifact, method, versions, reviewer identity/background where relevant, and limits |

Use `Not measured`, `Not collected` or `Not run` for missing evidence. Use `Not applicable` when a denominator is zero. An executed source audit is not a human timing study or an AI-quality evaluation.

Phase statuses are **Planned**, **In progress**, **Complete**, or **Blocked**, followed by the material qualification. Phase 1 uses **Complete for desk research; manual timing unmeasured** so its empirical limitation stays visible. Distinguish a draft brief from a human-reviewed brief in both specs and results.

## Files, links and recorded evidence

- Use descriptive lowercase filenames with hyphens. Phase reports retain `01-` through `05-`; decision files use sequential numbers and stable IDs such as D01.
- Use relative Markdown links within this repository. Wrap a destination containing spaces or parentheses in angle brackets; see the source links in the [product overview](archive/pre-evidence-v2/product/overview.md#implementation-map).
- Put new UX specs in a `design/` folder and later implementation guidance in an `implementation/` folder under the sprint when those artifacts exist. Link them from the relevant phase; do not create empty deliverables and call them complete.
- Keep practice transcripts and facilitator references separate. P1-A/P1-B have been seen during development and can never become held-out cases. When changing a case, version its transcript and reference together and retain the version used by earlier runs.
- Preserve the dated source audit as captured. Reruns write ignored scratch output; copy a result worth retaining into `evaluation/baselines/` with a new date/version and explain it in the baseline report.
- Append human timing rows only after actual sessions. The CSV header is the canonical field list. Keep original briefs, failed outputs and corrections in versioned records; never rewrite a failure into a successful result.
- Link persistent evaluation results from the evaluation guide and Phase 4. Use a tracked folder such as `evaluation/results/` for selected run records; `evaluation/runs/` is disposable source-audit scratch space.
- Preserve archived bodies. Correct current guidance in `product/` or the sprint docs; add an archive note if needed. `.planning/` is ignored local history, and `.claude/` contains local agent work rather than published project documentation.

## Check a documentation change

Run from the repository root:

```powershell
node docs/scripts/check-docs.cjs
git diff --check
git status --short
```

The checker validates inline local links, local reference-link definitions and Markdown heading anchors in root Markdown files and `docs/`. It also checks that every document has a reading path from the root README. It skips fenced code and external URLs; it is not a network or content-fact checker. After moving a file, update incoming links and any relative paths used by scripts.

If the source audit or its location changes, also run:

```powershell
node --check docs/hr-product-sprint/scripts/audit-current-product.cjs
node docs/hr-product-sprint/scripts/audit-current-product.cjs
```

Review that the dated baseline and practice content remain intact, that planned phases still read as planned, and that every result links to evidence. Stage only the files relevant to your change.
