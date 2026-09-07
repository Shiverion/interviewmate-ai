# Current product baseline: evidence and report affordances

Recorded: 2026-09-07 (Asia/Jakarta). Status: **Offline source inventory executed; human task baseline and model behavior not measured.**

This artifact establishes what the inherited product's evaluation contract and report page currently support. It supports the Phase 1 decision to explore a traceable, editable first-screen brief for one frontend role. It does not establish that recruiters experience the proposed problem or that the proposed workflow saves time.

The three inspected product files were not changed. The audit reads and parses their source without importing the application, executing a model, connecting to Firebase, or reading candidate records or environment variables.

## Reproduce the recorded inventory

From the repository root, with the repository's Node.js and installed dependencies available:

```powershell
node docs/hr-product-sprint/phase-1/scripts/audit-current-product.cjs
```

- [Audit script](scripts/audit-current-product.cjs): uses the installed TypeScript parser to inspect the inline evaluation schema, selected declarations/imports, and report-page JSX/state declarations.
- [Recorded output](baseline/current-product-audit.json): contains actual extracted values, source line numbers, TypeScript version, SHA-256 hashes of all three source files, and the run's UTC timestamp. The recorded UTC date is September 6; the local date in Asia/Jakarta is September 7.
- The command overwrites that output file with the current source inventory. Preserve this version in Git before a later implementation comparison; use the recorded hashes to distinguish snapshots. Timestamp changes on rerun are expected.

The audit completed with exit code 0 using TypeScript 5.9.3. Console summary:

```text
7 required numeric dimensions; 3 free-text evidence collections; 0 native report editing controls.
```

This is a source inventory, not a passed AI-quality test. The script deliberately fails on schema syntax outside its supported inline form rather than silently treating an unfamiliar schema as safe.

## Observed baseline

| Observation | Actual inventory result | Interpretation and boundary |
|---|---|---|
| Required score dimensions | **7** required, nonnullable numbers, each constrained to 0-100: communication, reasoning, relevance, technical_depth, production_experience, skill_match, confidence | A schema-valid report must supply a number for every dimension. This schema has no nullable or explicit insufficient-evidence value for those scores. It does not prove what a model does on sparse input. |
| Evidence representation | **3** collections, all arrays of strings: strengths, weaknesses, notable_moments. **0** structured evidence-item objects or citation fields inside those items | There is no separate, enforceable turn identifier/quotation pair in the evidence-item contract. A model can still write a quotation in free text; this count does not mean actual outputs never quote the transcript. |
| Mandatory positive and negative claims | strengths: **1-4** strings; weaknesses: **1-4** strings; notable_moments: **0-3** strings | Every schema-valid report must contain at least one strength and one weakness. This motivates testing incomplete input; it is not a measured hallucination or overstatement rate. |
| Deterministic total helper | `calculateOverallScore` exists at scoring.ts line 12; **0** references to that identifier and **0** imports of the canonical scoring module in the evaluator | Manual inspection confirms the route assigns `result.object` directly to `evaluationData` and passes it to persistence/response. The existing helper is available for reuse but is not called by this route. This does not measure arithmetic errors in generated outputs. |
| Report editing affordances | **0** native input/textarea/select/form/contentEditable controls; **1** native button, “Download Report (.txt)”; its **1** JSX event handler invokes `downloadTranscript` | The inspected page renders a report and export action. Manual review found no correction, note-entry, approve, or mark-reviewed action here. This conclusion is limited to this page, not every product surface. |
| Human review state | The page's four local state bindings hold session data, template data, loading, and error. Compared session statuses are active/completed/evaluated | Manual inspection found no separate human review state or review submission in this page. “Evaluated” indicates the existing evaluation pipeline state; it does not record that a recruiter checked the report. Variable names alone are not used by the script to infer this semantic conclusion. |

Source evidence:

- [Evaluation route](../../../src/app/api/evaluate/route.ts): score schema at lines 95-104; evidence at 105-109; model-produced aggregate/recommendation fields at 110-114; direct output assignment and persistence/response at 124-134.
- [Scoring helper](../../../src/lib/utils/scoring.ts): existing weighted calculation at lines 12-21.
- [Recruiter report page](<../../../src/app/(recruiter)/interviews/[sessionId]/page.tsx>): local state at lines 16-19; evaluation status at 96-97; evidence rendering at 331-365; AI-provided summary at 375-377; download/transcript at 384-425.

## Manual interpretation of the report journey

The page displays strengths, weaknesses, and the AI summary above a separate raw transcript. A recruiter can read both and download them together, but the inspected JSX does not link each claim to a supporting turn or provide a way to amend the brief. The label “Recruiter Summary” renders `evaluation.feedback`, the AI-generated field; it is not a saved recruiter-authored assessment in this implementation.

This establishes a concrete product gap to explore: reviewing a claim currently involves finding its support in a separate transcript, and any correction must occur outside this report page. Whether that is difficult or slow for an actual recruiter remains a hypothesis.

Reusable pieces are the transcript/report display, structured-output endpoint, session context, text export, and deterministic scoring helper. The sprint can retain these foundations while designing explicit source references, unknown states, corrections, and a separate human-review step. These changes remain proposed; this inventory did not implement them.

## What this baseline does not measure

| Outcome | Current evidence status |
|---|---|
| Manual active/elapsed time to prepare a frontend-screen brief | **Not measured** |
| Assisted review time, including verification and correction | **Not measured** |
| Number or frequency of unsupported AI claims | **Not measured** |
| Accuracy of citations or interpretation in generated reports | **Not measured** |
| Generated overall-score arithmetic consistency | **Not measured** |
| Recruiter usefulness, demand, or adoption | **Not measured** |
| Hiring accuracy, candidate quality, or fairness across people/groups | **Not measured** |

The human timing protocol remains the protocol in [Phase 1](../01-discovery-and-ux.md). A human must perform the defined task and record their own raw timings before any time-saving claim is made. These source counts cannot substitute for that study or for the behavioral runs planned in [Phase 4](../04-evaluation-and-iteration.md).

## Scope and verification limits

The parser handles the inline Zod method chains used in this snapshot and inventories syntax in the three files above. It does not resolve arbitrary aliases, follow imports or re-exports, evaluate refinements, inspect every route, render a browser, or prove that no alternate editing path exists elsewhere. Counts of native controls alone cannot identify all possible custom interfaces; the recorded custom JSX tag inventory contains only `Link`, and the reviewer-state interpretation additionally uses manual review of the full page.

The audit's source hashes fix the provenance of this result. Repeat it after changing the evaluator/report to compare source affordances, then independently test model outputs and the user workflow. A new citation field or review button would establish an implementation change, not demonstrate that a citation supports a claim or that a reviewer makes better decisions.
