# Submission artifacts

The quest requires three deliverables. The prototype formats are alternatives; this project selects the **lightweight web app**.

| Submit | Artifact | Status |
|---|---|---|
| Working prototype | [InterviewMate production](https://interviewmate-ai.shiverion.com/) and [runbook](../docs/hr-product-sprint/implementation/current-runbook.md) | Deployed; share valid reviewer access privately |
| Case study and handoff | [Case study and PRD](case-study-and-prd.md) and [PDF submission package](InterviewMate-Submission-Package.pdf) | Markdown is the editable source of truth; PDF includes the main handoff, rendered diagrams, and selected current reports as appendices |
| Interactive reader | `/case-study` on the production domain | Public, auth-free summary with phase tabs, workflow explorer, AI boundaries and PDF download |
| Five-minute video | [Segmented speech draft and shot list](demo-script.md) | Script ready; recording/link outstanding |

Read the [MVP readiness audit](mvp-readiness-audit.md) for every D1–D5 expectation. Manual-versus-assisted baseline timing remains unmeasured; either collect the small builder pilot or disclose that gap. No separate Figma, no-code flow or prompt-chaining app is needed.

## Export maintenance

Regenerate the PDF from the current Markdown with `python scripts/build-submission-pdf.py`. The exporter also renders page previews under `tmp/pdf-review/` for visual QA. Do not use the historical [JSON source](case-study-content.json) as the source for a submission; it contains pre-release model/settings and outdated blockers. Keep the Markdown as the editable source of truth and use the [PDF submission package](InterviewMate-Submission-Package.pdf) when a polished, widely readable attachment is preferred. The earlier `InterviewMate-Case-Study-and-Handoff.pdf` is retained as a superseded export.

[Progress](../docs/README.md) · [Release evidence](../docs/hr-product-sprint/evaluation/results/2026-09-11-production-release.md)
