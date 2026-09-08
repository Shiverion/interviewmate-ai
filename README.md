# InterviewMate AI

InterviewMate is a Next.js/Firebase application for creating AI interview sessions and reviewing candidate transcripts and reports.

The current five-day HR sprint explores a **recruiter-reviewed first-screen brief**: a draft organized by role criteria, with source quotations, missing evidence and recruiter corrections. Phase 1 discovery and Phase 2 design are complete. The [Phase 3 prototype](docs/hr-product-sprint/phases/03-prototype-build.md) now implements the review workflow, including a server AI route and labelled authored examples. Successful live generation is pending provider access; AI quality and human review time are not measured.

## Start here

| I want to… | Read |
|---|---|
| Understand the project and find its documents | [Documentation home](docs/README.md) |
| Review sprint progress and deliverables | [HR product sprint](docs/hr-product-sprint/README.md) |
| Understand what the inherited application contains | [Product overview](docs/product/overview.md) |
| Set up the application locally | [Local development](docs/product/local-development.md) |
| Edit or add documentation | [Documentation contributor guide](docs/CONTRIBUTING.md) |
| Read the older plans and reports | [Historical archive](docs/archive/README.md) |

## Local quick start

Use Node.js **20.9.0 or newer**, as required by [package.json](package.json). Configure the environment using the [local development guide](docs/product/local-development.md), then run from the repository root:

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [the review workspace](http://127.0.0.1:3000/review-brief). Follow its [runbook](docs/hr-product-sprint/implementation/review-brief-runbook.md) for authored examples or server AI setup. Firebase is not required for this local prototype; the inherited live interview/Firebase flow remains unverified.

## Documentation checks

```powershell
node docs/scripts/check-docs.cjs
```

This checks local Markdown links and anchors. It does not validate external websites or product behavior.
