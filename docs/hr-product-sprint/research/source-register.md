# Discovery sources and existing alternatives

Updated: 2026-09-07. Status: desk research and explicit hypotheses.

[Documentation home](../../README.md) · [Sprint index](../README.md) · [Phase 1](../phases/01-discovery-and-ux.md)

This is the canonical register for external evidence. Keep source IDs stable and update each source’s date, supported claim and limitations together.

## Evidence register

Evidence labels: **External** = a cited source reports it; **Code** = observed in this repository; **Hypothesis** = a proposition to test; **Proposed** = our design choice; **Measured** = an actual recorded study/run. An offline source inventory has now been executed; there are no measured user outcomes or prototype AI-quality results yet.

All external sources below were accessed on 2026-09-07. Dates are publication/update dates visible on the source, where available.

| ID | Source and date | Supported finding | Limit and implication |
|---|---|---|---|
| E01 | [OPM: Structured Interviews](https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews); page date not shown | Structured interviewing uses job-related competencies, shared questions, and common rating standards. | US federal assessment guidance supports a design principle; it does not validate our AI or this segment's pain. Use a common role framework. |
| E02 | [Greenhouse: Scorecard definitions](https://support.greenhouse.io/hc/en-us/articles/360007247412-Structured-hiring-Scorecard-definitions); updated 2022-07-08 | A role scorecard defines what interviews should examine; Greenhouse advises keeping the attributes concise and relevant. | Vendor workflow guidance, not a productivity study. Draft a small set of explicit criteria before generating a report. |
| E03 | [Greenhouse: Scorecard feedback report](https://support.greenhouse.io/hc/en-us/articles/203941419-Scorecard-feedback-report); updated 2026-03-02 | Existing recruiting software supports analysis of ratings by candidate, stage, interviewer, and job. | Establishes an existing workflow; does not demonstrate how often our user suffers inconsistency. Avoid claiming that scorecards themselves are novel. |
| E04 | [Greenhouse: Notetaker](https://support.greenhouse.io/hc/en-us/articles/50523570982939-Use-Greenhouse-Notetaker-to-record-and-summarize-interviews); updated 2026-08-19 | Per-question AI notes link to transcript moments, and the workflow encourages the interviewer to contribute an assessment. | Direct overlap with our concept. Traceable AI summaries are an existing capability, not an original market claim. |
| E05 | [Greenhouse: Summarize scorecards using AI](https://support.greenhouse.io/hc/en-us/articles/44504659750299-Summarize-scorecards-using-AI); updated 2026-04-03 | AI summaries can link key points to original scorecards and distinguish agreement from disagreement. | This aggregates scorecards, a different input from our single transcript. Useful adjacent pattern, not proof of our performance. |
| E06 | [Metaview: What 5.2M interviews reveal about scorecard completion](https://www.metaview.ai/resources/blog/ai-scorecard-completion-rate-study); published 2026-06-26 | In its reported observational comparison, submission was 28.6% for interviewer-written scorecards (26,498) versus 50.3% for Metaview-drafted scorecards (93,502). | Vendor corpus, nonrandomized groups, possible process differences. This association motivates testing drafting burden; it cannot establish causality, our baseline, or industry-wide prevalence. More filled fields do not establish better evidence. |

Synthesis: external evidence establishes structured feedback as a real recruiting activity and AI drafting as an existing product category. It provides a reason to investigate this workflow. It does **not** establish that a particular recruiter needs another tool, that transcript review is their largest bottleneck, or that InterviewMate will save time.

## Existing alternatives and product implication

| Alternative | What it already addresses | Question our sprint must answer |
|---|---|---|
| Manual role scorecard and notes | Explicit criteria and human judgment | Does AI assistance reduce preparation/review effort at comparable quality? |
| Existing InterviewMate report | Immediate scores, evidence text, summary, and transcript export | Does a traceable, editable brief improve on this existing report? |
| Greenhouse Notetaker / AI scorecard summaries | Drafting and links to original information [E04, E05] | Can a small, testable prototype demonstrate a coherent version of the workflow? |
| Metaview-assisted scorecard workflow | AI draft followed by human review [E06] | What remains difficult after a draft is available? We do not yet know. |

The sprint's contribution is a documented product decision and evaluated implementation within InterviewMate. We are not claiming a new category or superiority over these tools. An ATS integration would matter for adoption, but is outside this five-day build.
