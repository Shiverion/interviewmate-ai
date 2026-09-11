# Submission artifacts

- [Case study and engineering handoff](InterviewMate-Case-Study-and-Handoff.pdf): seven-page self-contained PDF. The editable Markdown reports and [production release record](../docs/hr-product-sprint/evaluation/results/2026-09-11-production-release.md) contain the latest release evidence; regenerate this PDF if the submission portal needs the refreshed text.
- [Editable case-study content](case-study-content.json): edit the copy here, then rebuild with `python scripts/build-case-study.py` from the project root. The builder requires `reportlab` and `pypdfium2` and renders preview images to ignored `tmp/pdf-review/` for visual checking.
- [Five-minute video script](demo-script.md): shot list and narration; the final video has not been recorded.

The running Next.js app is the working prototype. [Setup and acceptance](../docs/hr-product-sprint/implementation/current-runbook.md) explains the production path. [Progress](../docs/README.md) is authoritative for test status. The remaining submission action is the five-minute recording; keep any PDF refresh honest about the absence of independent recruiter/model benchmarks.
