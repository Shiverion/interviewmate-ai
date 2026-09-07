# InterviewMate AI

InterviewMate is a Next.js/Firebase application for creating AI interview sessions and reviewing candidate transcripts and reports.

The current five-day HR sprint explores a **recruiter-reviewed first-screen brief**: a draft organized by role criteria, with source quotations, missing evidence and recruiter corrections. Phase 1 desk research is complete; Phases 2–5 are planned. Human review time and the proposed AI workflow have not been evaluated yet.

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
npm run dev
```

Open [localhost:3000](http://localhost:3000). The setup guide records known startup and test issues; a complete live interview/Firebase flow has not been verified during this sprint.

## Documentation checks

```powershell
node docs/scripts/check-docs.cjs
```

This checks local Markdown links and anchors. It does not validate external websites or product behavior.
