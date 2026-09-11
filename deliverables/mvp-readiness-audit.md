# MVP readiness audit against the company challenge

Updated: 2026-09-11. Scope: documentation and source inspection, existing release evidence, and the builder's reported acceptance. No new live interview, recruiter study or model benchmark was run for this audit.

[Challenge](../Product_Sprint.md) · [Final case study and PRD](case-study-and-prd.md) · [Demo script](demo-script.md)

## Decision

**The MVP is demonstrable and the web app satisfies the working-prototype format.** Package the existing product rather than building additional prototype formats. The current case study/PRD is now consolidated in Markdown. Record the five-minute video and verify the submission links before handing it in.

There is one evidence gap in the literal D1/D4 expectations: manual-versus-assisted time/error comparison has not been measured. A baseline metric is defined, but its value is unknown. Earlier progress updates saying that every requirement had passed or that only the video remained were too broad. MVP acceptance, documented evidence, and completed submission are different statuses.

## D1–D5 expected-output audit

| Day | Expected output | Evidence available | Verdict |
|---|---|---|---|
| D1 | Target user | Tech recruiter preparing first-screen feedback for an engineering hiring manager; [discovery](../docs/hr-product-sprint/research/problem-and-workflow.md) | Documented; proposed user segment, no practitioner interviews |
| D1 | Problem and baseline metric | Evidence reconstruction and CV-to-interview handoff; active review minutes and correction count defined | Problem/metric defined; numerical baseline **not measured** |
| D1 | Near-future concept | Batch CV intake plus recruiter-controlled invitations and cited interview evidence | Documented and implemented |
| D1 | Five-day scope | Five separate [phase reports](../docs/hr-product-sprint/README.md); original app reuse disclosed | Documented; actual hours were not logged |
| D2 | Wireframe or UX flow | Existing [authored wireframe](../docs/hr-product-sprint/design/wireframe.html) and current Mermaid flow in the PRD | Available; Figma is not required |
| D2 | AI tools selected | Next.js, Firebase, OpenAI voice/transcription/evaluator and optional provider adapters | Source and release configuration documented |
| D2 | Prompt logic or agent workflow | Turn controller, bounded context, structured evidence extraction and deterministic validation | Source-linked in the PRD |
| D3 | Testable workflow with AI input/output | Deployed web app, input/output contract and error states | Available |
| D3 | Demonstrable core feature | CV batch → ATS ranking → checked invitations → interview → report | Builder-accepted; production smoke recorded |
| D4 | Mock HR cases and results | Authored transcripts, ten fictional CVs/JD, automated regression results and builder self-test observations | Available at prototype level; full frozen live benchmark not completed |
| D4 | UX adjustments from results | Transcript review before Send, duplicate-opening fixes, scroll layout, closing flow, feedback/report persistence fixes | Recorded builder feedback and reported acceptance; no independent usability score |
| D4 | Baseline comparison | Manual workflow and test protocol exist; no measured before/after times | **Evidence gap**, not a missing product feature |
| D5 | Runnable prototype or demo | [Production app](https://interviewmate-ai.shiverion.com/) and source/runbook | Available; reviewer must use valid access |
| D5 | Case study / PRD | [Consolidated case study and PRD](case-study-and-prd.md) | Created in this documentation revision |
| D5 | Five-minute Loom/video | [Segmented narration and shot list](demo-script.md) | Script ready; recording and final playback check outstanding |

## Required deliverables: three, not six

The challenge says **“Submit one of the following”** for the prototype. These are alternatives:

| Prototype alternative | What the format means | Our submission choice |
|---|---|---|
| No-code/low-code workflow | Executable Make, Zapier, Dify or similar workflow; diagram/PDF may explain it | Not selected; our app is coded |
| Prompt-chaining app | Testable app passing outputs through defined AI stages; accompanying prompt specification | Not a separate artifact we need to build |
| Interactive Figma + AI behavior spec | Clickable design prototype with explicit input/output and failure behavior | Not selected; no Figma artifact is claimed |
| Lightweight web app | Runnable application or hosted URL | **Selected: InterviewMate** |

A PDF or diagram alone does not demonstrate executable AI behavior. Our Mermaid diagram documents the existing web app. The other two required submission items are **one case study/handoff document** (Markdown is explicitly accepted) and **one five-minute video**. A separate PDF export, separate PRD file and Figma prototype are optional. The combined case study/PRD covers both narrative and engineering requirements.

## What data was actually used?

- **Authored synthetic transcripts:** eight base cases, two name/filler variants, 69 base turns and 32 base criterion judgments in [phase4-eval-v1](../docs/hr-product-sprint/evaluation/dataset/README.md). Assistant-authored reference judgments are provisional. The archived first live batch failed after one request; its remaining runs cannot be described as passed.
- **Fictional CV/JD fixture:** ten distinct PDF CVs and a Senior Frontend Engineer role brief in [cv-pipeline-v1](../docs/hr-product-sprint/evaluation/dataset/cv-pipeline-v1/README.md), with intended strong, partial and unrelated groups. Expected bands are fixture design, not measured hiring accuracy.
- **Builder self-test:** the owner acted as candidate and reviewer, reported live interview/evaluation issues, and later accepted the corrected flow. This is useful qualitative product feedback, with one evaluator and no independent agreement metric.
- **Seeded interview/feedback records:** showcase data for screen demonstrations. They are not additional participants, successful live model runs or customer satisfaction measurements.
- **External data:** desk-research sources exist, but this audit found no documented imported public HR dataset used in a completed benchmark or training run. Do not say that a model was trained or validated on an internet dataset.

English is the intended baseline. The clearest conversation examples supplied by the owner are Indonesian. They support the multilingual extension; they do not establish measured English transcription accuracy. Capture an English interaction for the video and label it as a demonstration.

## Smallest way to close the baseline gap

This needs human task performance, not another feature. Use two comparable synthetic transcripts and the same role/rubric. For the first, manually write the evidence brief before inspecting AI output. For the second, use the app and review/correct its brief. Time active work through a usable final brief; separately note generation wait. Record corrections, unsupported claims and missed evidence. Disclose that this is one builder, different cases and possible familiarity effects.

| Measurement | Manual | AI-assisted |
|---|---|---|
| Case ID / role / reviewer / date | Not recorded | Not recorded |
| Active minutes to reviewed brief | Not measured | Not measured |
| Waiting time | Not measured | Not measured |
| Unsupported claims / missed evidence / corrections | Not counted | Not counted |

Only calculate time reduction after measuring both values: `(manual minutes − assisted minutes) / manual minutes × 100`. Do not call that percentage model accuracy or general recruiter productivity. If this small study is not performed, submit with the gap disclosed; do not mark the literal comparison requirement as fulfilled.

## Submission checklist

- [x] Working web app and current release evidence exist.
- [x] Current Markdown case study/PRD includes UX, AI logic, evidence limits and engineering handoff.
- [x] Five-minute speech draft and capture plan exist.
- [ ] Add a measured builder baseline comparison, or explicitly retain the unmeasured limitation in the submitted case study.
- [ ] Record the video, add its URL and check playback permissions.
- [ ] Open the prototype and case-study link as the intended reviewer; share any temporary login privately and confirm its expiry covers the review date.
- [ ] Attach all three required items in the submission portal. Its copied “0 of 3” text is not a checked portal status.

No additional MVP features are needed to perform these steps.
