# InterviewMate

An English-first recruiting prototype that conducts structured or adaptive voice interviews, helps a human reviewer inspect competency evidence, and gives recruiters a bulk CV-to-interview pipeline. Bahasa Indonesia is a separate multilingual test.

The inherited Next.js application is the baseline. This revision replaces unexplained interview percentages with a cited 0–4 evidence rubric, explicit missing-evidence states and contextual human review. The prototype release is live at [interviewmate-ai.shiverion.com](https://interviewmate-ai.shiverion.com/); the latest evidence is the [production release record](docs/hr-product-sprint/evaluation/results/2026-09-11-production-release.md).

- [Product_Sprint.md](Product_Sprint.md): authoritative challenge, accepted requirements and decisions.
- [Five-phase progress](docs/README.md): current work, release checks and the remaining video artifact.
- [Case study, PRD and engineering handoff](deliverables/case-study-and-prd.md): editable source with UX/AI diagrams; use the [PDF export](deliverables/InterviewMate-Case-Study-and-Handoff.pdf) for a polished reviewer attachment.
- [MVP expected-output audit](deliverables/mvp-readiness-audit.md): D1–D5 evidence, prototype format and remaining baseline/video work.
- [Submission package](deliverables/README.md): current artifacts and superseded exports.
- [Setup and validation](docs/hr-product-sprint/implementation/current-runbook.md).
- [Bulk CV pipeline and candidate dashboard](docs/hr-product-sprint/implementation/2026-09-11-bulk-pipeline.md).
- [CV pipeline validation checklist](docs/hr-product-sprint/evaluation/cv-pipeline-validation.md).
- [Five-minute demo script](deliverables/demo-script.md).

## Run locally

Use Node 24 (Node 20.9 or newer also works locally). Run `npm install`, then `npm run dev`; open http://localhost:3000. Add personal provider keys in Settings, or configure host credentials for Demo/Reviewer Mode as described in the runbook. Signing in does not force API-key setup.

Reviewers enter a private invitation at `/reviewer`. Signed-in visitors use `/demo` for the hosted voice demo; the demo allowance is backed by the Firestore ledger and tied to the authenticated browser session. Production runs on Vercel with encrypted server-side credentials and no writable deployment filesystem.

### Reviewer admin login

The owner creates a separate seven-day email/password account for portfolio reviewers in Firebase Console: `reviewer@interviewmate.demo`. Keep account creation private, then share its password privately with reviewers. This demo account expires on 18 September 2026 at 00:00 UTC; update the cutoff in `src/lib/firebase/access.ts`, `firestore.rules` and `storage.rules` before issuing a new review window. It opens the full workspace without using the owner's Google account. The owner's UID pointer in `app_config/admin` remains controlled by the primary administrator.

Prototype status: the recorded release passed **191 tests across 25 suites**, TypeScript, production build and Node 24 CI. Production smoke and owner acceptance are documented. The MVP is demonstrable; the [submission audit](deliverables/mvp-readiness-audit.md) retains unmeasured baseline timing, the missing five-minute video and final access/portal checks. No hiring-validity, recruiter time-saving or independent model-quality claim is established.
