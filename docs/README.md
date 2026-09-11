# Five-day sprint progress

Updated: 2026-09-11. This is the authoritative progress tracker for the prototype release. [Product specification](../Product_Sprint.md) · [HR sprint index](hr-product-sprint/README.md) · [Current runbook](hr-product-sprint/implementation/current-runbook.md)

**Current state: MVP demonstrable; submission packaging in progress.** The production app is live at [interviewmate-ai.shiverion.com](https://interviewmate-ai.shiverion.com/). The [current case study and PRD](../deliverables/case-study-and-prd.md) now consolidates the handoff. The [literal D1–D5 audit](../deliverables/mvp-readiness-audit.md) identifies the unmeasured manual/assisted baseline as an evidence gap. Video recording and final access/portal checks remain outstanding; no new prototype format is required.

| Phase | Progress | Evidence and limit |
|---|---|---|
| [1 · Discovery](hr-product-sprint/phases/01-discovery-and-ux.md) | Complete for desk research | Target user, recruiting bottleneck, workflow, concept and baseline plan are documented. No recruiter access was available, so the manual baseline is a proposed measurement, not a measured claim. |
| [2 · Design](hr-product-sprint/phases/02-solution-design-and-ai-logic.md) | Complete | Shared configuration, evidence rubric, provider behavior, recovery, guardrails and data governance are implemented and documented. |
| [3 · Prototype](hr-product-sprint/phases/03-prototype-build.md) | Complete | Production supports batch CV/ATS ranking, invitation links, voice + text interviews, editable transcripts, evidence evaluation, recovery, reviewer access, feedback and scoped dashboards. |
| [4 · Evaluation](hr-product-sprint/phases/04-evaluation-and-iteration.md) | Prototype evidence available; baseline comparison incomplete | Authored cases, regression tests and builder self-tests exist; the frozen live batch did not complete. Human time comparison is unmeasured. |
| [5 · Handoff](hr-product-sprint/phases/05-case-study-and-handoff.md) | Handoff ready; video pending | Case study sources, phase reports, runbook, validation record and demo script are organized. Record and attach the final video before submission. |

## Current validation

- **191 tests / 25 suites** pass locally.
- `npx tsc --noEmit` and `npm run build` pass.
- GitHub Node 24 CI passed in [run 34555169845](https://github.com/Shiverion/interviewmate-ai/actions/runs/34555169845).
- Production smoke verified demo availability, AI configuration, hosted start and Firestore-backed usage ledger.
- Firebase rules, indexes, storage and Admin SDK access are deployed for `interviewmate-9bdd4`.
- The dated [production release record](hr-product-sprint/evaluation/results/2026-09-11-production-release.md) is the authoritative snapshot. Older result reports remain as historical evidence and keep their original test counts.

## Product spine

`role brief → batch CV parsing → deterministic ATS ranking → recruiter selection → invitation links → voice + text interview → evidence-based evaluation → human review`

The English workflow is the baseline. Bahasa Indonesia is reported separately as a multilingual extension. ATS and interview scores are review signals with source-linked evidence; the product does not make automated hiring decisions.

## Reading order

1. [Product_Sprint.md](../Product_Sprint.md) for the requirement and current readiness audit.
   [Current case study/PRD](../deliverables/case-study-and-prd.md) is the consolidated submission; [MVP audit](../deliverables/mvp-readiness-audit.md) maps every expected output.
2. [Production release record](hr-product-sprint/evaluation/results/2026-09-11-production-release.md) for the latest evidence.
3. [Phase reports](hr-product-sprint/README.md) for discovery, design, build, evaluation and handoff.
4. [Current runbook](hr-product-sprint/implementation/current-runbook.md) for setup, deployment and acceptance.
5. [Demo script](../deliverables/demo-script.md) for the five-minute recording.

## Deliberate limits

No recruiter time study or independent model calibration has been completed. Browser focus signals cannot prove cheating or inspect another device. Local model hosting, training on candidate data, OCR, eye tracking, exhaustive provider tournaments and enterprise compliance remain future work. These limits do not block the five-day prototype submission and are stated in the case study.

Archived files under `docs/archive/` preserve earlier design and pre-production evidence; they are not current instructions.
