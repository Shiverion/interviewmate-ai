# Submission artifacts

- [Case study and engineering handoff](InterviewMate-Case-Study-and-Handoff.pdf): seven-page self-contained PDF, with live acceptance clearly pending.
- [Editable case-study content](case-study-content.json): edit the copy here, then rebuild with `python scripts/build-case-study.py` from the project root. The builder requires `reportlab` and `pypdfium2` and renders preview images to ignored `tmp/pdf-review/` for visual checking.
- [Five-minute video script](demo-script.md): shot list and narration; the final video has not been recorded.

The running Next.js app is the working prototype. [Setup and acceptance](../docs/hr-product-sprint/implementation/current-runbook.md) explains how to enter Reviewer Mode and what still needs a human. [Progress](../docs/README.md) is authoritative for test status. Regenerate the PDF after recording live results; do not leave prose claiming an unmeasured result.
