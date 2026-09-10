# InterviewMate

An English-first recruiting prototype that conducts structured or adaptive voice interviews and helps a human reviewer inspect competency evidence. Bahasa Indonesia is a separate multilingual test.

The inherited Next.js application is the baseline. This revision replaces unexplained interview percentages with a cited 0–4 evidence rubric, explicit missing-evidence states and contextual human review.

- [Product_Sprint.md](Product_Sprint.md): authoritative challenge, accepted requirements and decisions.
- [Five-phase progress](docs/README.md): current work, measured checks and release blockers.
- [Case study and engineering handoff](deliverables/InterviewMate-Case-Study-and-Handoff.pdf): reviewer-facing PDF.
- [Setup and validation](docs/hr-product-sprint/implementation/current-runbook.md).
- [Five-minute demo script](deliverables/demo-script.md).

## Run locally

Use Node 20.9 or newer. Run `npm install`, then `npm run dev`; open http://localhost:3000. Add personal provider keys in Settings, or configure host credentials for Demo/Reviewer Mode as described in the runbook. Signing in does not force API-key setup.

Reviewers enter a private invitation at `/reviewer`. Ordinary visitors use `/demo`. Production hosting requires a persistent Node runtime and durable private usage storage; this sponsored voice implementation is not ready for ephemeral hosting.

Prototype status: 138 automated tests and 24 selected browser checks pass, along with source lint and the production build. Successful live voice, model-quality benchmarks, independent human review and final video footage remain release gates. No hiring-validity or time-saving claim is established.
