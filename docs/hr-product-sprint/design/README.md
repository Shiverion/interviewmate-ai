# Phase 2 design package

[Documentation home](../../README.md) · [Phase 2 progress](../phases/02-solution-design-and-ai-logic.md) · [D02 design decision](../decisions/002-review-brief-design.md)

Version: `review-brief-v1`. Updated: 2026-09-08. These are engineering-ready design artifacts and authored examples. The live product flow and model behavior remain Phase 3/4 work.

## Read and explore

| Artifact | Purpose |
|---|---|
| [Clickable wireframe](wireframe.html) | Explore input, draft, source inspection, editing, review and failure states with authored sample data |
| [UX and interaction specification](ux-spec.md) | Screens, states, review rules, layout, content and accessibility |
| [Role and evidence rubric](role-rubric.md) | Four criteria, qualitative anchors, questions and limitations |
| [AI and data contract](ai-contract.md) | Request/response, validation, model configuration, errors, provenance and export |
| [Exact prompt v1](prompts/review-brief-v1.md) | Trusted instruction text; role profile appended by the server |
| [Acceptance plan](acceptance-plan.md) | Frozen design expectations and evaluation boundaries |
| [Phase 3 build backlog](../implementation/phase-3-backlog.md) | Ordered implementation tasks and completion checks |

## Machine-readable artifacts

The [role profile](role-profile.json) is the canonical criterion/question configuration. The [executable contract](review-brief-contract.cjs) defines Zod shapes and cross-field citation checks; it runs offline and is not yet imported by the application.

The [example catalog](examples/catalog.json) records provenance and expected mechanical/semantic outcomes for three inputs and five authored drafts:

| Example | Input | Authored draft | Intended observation |
|---|---|---|---|
| Specific evidence | [P1-A](examples/practice-a.request.json) | [P1-A draft](examples/practice-a.draft.json) | Concrete self-reported actions with bounded limitations |
| Conflicting ownership | [P1-B](examples/practice-b.request.json) | [P1-B draft](examples/practice-b.draft.json) | Keep both accounts; request clarification |
| Incomplete coverage | [Sparse transcript](examples/sparse.request.json) | [Sparse draft](examples/sparse.draft.json) | R3/R4 remain not established |
| Wrong speaker | P1-A above | [Invalid citation](examples/invalid-citation.draft.json) | Reject a quotation attributed to an interviewer |
| Unsupported inference | P1-A above | [Unsupported claim](examples/unsupported-claim.draft.json) | Exact quotation passes mechanical checks, but its interpretation must fail human review |

P1-A/P1-B transcript text is copied without rewriting from Phase 1. The new sparse case and every draft were authored by the project AI assistant. None is a live model response, held-out evaluation result or practitioner-validated assessment.

## Open the wireframe and check the package

Open `wireframe.html` in a browser; it has no external dependencies, network calls or API keys. Its permanent “Authored wireframe” label distinguishes it from a working AI prototype. Its sample review interactions illustrate the intended flow; they do not implement the full server contract.

From the repository root, after installing existing dependencies:

```powershell
node docs/hr-product-sprint/scripts/check-phase-2.cjs
node docs/hr-product-sprint/scripts/check-phase-2-wireframe.cjs
node docs/scripts/check-docs.cjs
```

The [contract checker](../scripts/check-phase-2.cjs) checks fixture shape, citations, rejection cases and source-copy integrity. The [wireframe checker](../scripts/check-phase-2-wireframe.cjs) rehearses interactions with jsdom from the installed Jest stack, using dialog/media/scroll shims. Neither proves that a quoted statement supports an interpretation or that the app passes a browser accessibility audit.

To modify the wireframe, edit its HTML/CSS/interaction script directly. When changing the versioned fixture JSON, run `node docs/hr-product-sprint/scripts/build-phase-2-wireframe.cjs` from the repository root to refresh the embedded data, then rerun both checkers. The [data builder](../scripts/build-phase-2-wireframe.cjs) preserves the layout/script and escapes embedded data; do not hand-edit the generated JSON block.
