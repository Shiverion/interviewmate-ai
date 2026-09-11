# 5-Day Remote HR Product Sprint

## Current release status — 2026-09-11

### Submission audit correction — 2026-09-11

The web-app MVP is demonstrable, but the literal D1/D4 manual-versus-assisted baseline comparison is still **not measured**. Synthetic fixtures, regression checks and builder self-tests are prototype evidence, not a completed independent model study. See the [expected-output audit](deliverables/mvp-readiness-audit.md) for each D1–D5 requirement.

The [current case study and PRD](deliverables/case-study-and-prd.md) now consolidates the engineering handoff, UX/AI diagrams, contracts, scoring and evidence limits. It supersedes the earlier PDF/JSON draft. The [five-minute speech draft](deliverables/demo-script.md) is ready; video recording, reviewer access verification and portal attachment remain outstanding.

**Prototype format clarification:** the challenge says **submit one** of its prototype options. We select the runnable lightweight web app. No separate Figma, no-code workflow or prompt-chaining app is required. Diagrams support the Markdown handoff.

**Verdict: the prototype is ready for the portfolio demonstration and engineering handoff.** Production is running at [interviewmate-ai.shiverion.com](https://interviewmate-ai.shiverion.com/) with server-side OpenAI access, Firestore-backed reviewer/demo state, scoped recruiter records, and the completed voice + text interview workflow. The five-minute demo video is still a submission artifact to record; it is not represented as completed here.

### Release evidence

| Check | Result |
| --- | --- |
| Release branch / commit | `main` / `fea1d2e` |
| Automated tests | **191 tests / 25 suites passed** |
| Type checking and production build | Passed (`npx tsc --noEmit`, `npm run build`) |
| CI | GitHub Node 24 workflow passed: [run 34555169845](https://github.com/Shiverion/interviewmate-ai/actions/runs/34555169845) |
| Production smoke | Demo voice availability, AI configuration, hosted start, and Firestore usage ledger verified |
| Firebase | Rules, indexes, storage, and Admin SDK service-account access deployed for `interviewmate-9bdd4` |
| Deployment | Vercel production alias serves the public domain; encrypted `OPENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `DEMO_COOKIE_SECRET`, and `NEXT_PUBLIC_APP_URL` are configured |

### Phase readiness

| Phase | Current result | Evidence and honest limit |
| --- | --- | --- |
| 1 — Discovery and workflow | Complete for desk research | Target user, bottleneck, workflow, concept, and baseline plan are documented. No recruiter time study was available, so the baseline remains a proposed measurement rather than a measured claim. |
| 2 — Solution design and AI logic | Complete | UX flow, prompt/rubric behavior, provider configuration, recovery, guardrails, and data-governance decisions are implemented and documented. |
| 3 — Working prototype | Complete | Production prototype supports batch CV/ATS ranking, invitations, voice + text interviews, editable transcripts, evidence evaluation, recovery, reviewer access, feedback, and scoped dashboards. |
| 4 — Evaluation and iteration | Prototype validation available; baseline comparison incomplete | Synthetic inputs, regression results and owner acceptance exist. The original frozen live batch did not complete; manual/assisted timing and independent calibration remain unmeasured. |
| 5 — Handoff and submission | Current Markdown handoff ready; video pending | Consolidated case study/PRD, diagrams and narration are available. Record the video and verify all three submission links/access. |

### Scope decisions for the submission

Future improvement: [feedback-driven learning with local PII preparation](docs/hr-product-sprint/implementation/future-feedback-and-learning.md). The existing form can inform issue triage; transcript reuse, local masking/normalization, curated datasets and optional fine-tuning remain proposed work with permission, privacy and held-out quality gates. No training on candidate history is enabled for the MVP.

- The primary baseline is English. Bahasa Indonesia is a separate multilingual extension result, not a replacement baseline.
- The automated CV pipeline is the product spine: one role brief → batch CV parsing → deterministic ATS ranking → recruiter selection → invitation links → interview → evidence-based evaluation.
- The product does not make automated hiring decisions. ATS and interview scores are review signals, with source-linked evidence and explicit human review language.
- Reviewer/demo access is hosted with server-side credentials and Firestore ledger state. Personal sessions can use BYOK; candidate data remains scoped to its owner/admin workspace.
- Local model hosting, model training on candidate data, eye tracking, OCR, exhaustive provider tournaments, and enterprise compliance are deliberately deferred to avoid overengineering the five-day prototype.

The dated [production release record](docs/hr-product-sprint/evaluation/results/2026-09-11-production-release.md) is the authoritative validation snapshot. Earlier reports remain below for traceability and are labelled historical where their pre-production results differ from the release.

<details>
<summary>Historical pre-release audit and planning — superseded by the current MVP audit</summary>

## Historical pre-release audit and lean finish plan — 2026-09-10

**Historical snapshot:** the following section was written before the final production validation. Its open items and older test counts should not be read as the current release status.

**Verdict: not all requirements have passed. The software implementation is substantially built; live product evaluation and final submission are incomplete.** This is an internal readiness assessment, not a verdict from the quest evaluator.

The original company challenge and our later 16 improvements are different scopes. The company asks for a useful working prototype, an honest case study/handoff and a five-minute video. It does not require enterprise infrastructure, custom-model training, a large model tournament or a statistically representative hiring study. We should now freeze feature development and finish the evidence and deliverables.

This section is the current priority order. The original challenge and all accepted improvements remain below for traceability. A deferred item is **not** being relabelled as passed. Earlier references to production readiness or independent reviewer calibration are engineering next steps, not additional company submission requirements.

### Evidence checked

- Implementation commit: `5ac77a0` on `codex/hr-product-sprint`.
- Recorded validation: **138 automated tests / 18 suites; 24 selected browser checks; source lint; type checking; production build passed**. The [dated record](docs/hr-product-sprint/evaluation/results/2026-09-10-evidence-revision.md) records the runs and their limits. This audit read those results and relevant source; it did not rerun unchanged tests.
- Model responses in automated tests were mocked. The no-answer assessment is deterministic and does not call a provider. These checks do not prove live speech quality, semantic grading accuracy or fairness.
- The seven-page [PDF](deliverables/InterviewMate-Case-Study-and-Handoff.pdf), [editable content](deliverables/case-study-content.json), [video script](deliverables/demo-script.md) and [setup guide](docs/hr-product-sprint/implementation/current-runbook.md) exist.
- Updated provider check: OpenAI HTTP 200 and one successful synthetic GPT-5.6 Luna evaluation; Gemini/DeepSeek host keys remain absent. See the [model/access validation record](docs/hr-product-sprint/implementation/2026-09-10-models-and-access.md). Human voice and comparative accuracy are not yet validated.
- No completed live model-comparison results, timed human baseline, final video or verified public reviewer deployment are recorded. The “0 of 3 attached” text later in this file was copied from the challenge page; it is not a live submission-portal status check.

### Original five-day challenge: did we meet it?

| Phase                      | What is ready                                                                                                            | What prevents a complete pass                                                                                                                                  | Readiness                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1 — Discovery and workflow | Target recruiter, first-screen handoff problem, desk research, workflow, reuse decision and concept.                     | A measured baseline metric is missing. A small builder pilot can supply a clearly labelled baseline; access to a recruiter is helpful, not required to submit. | Mostly ready                         |
| 2 — UX and AI design       | Workflow/design artifacts, shared configuration, provider selection, prompts, evidence rubric, recovery and review flow. | Update the case study with any adjustments found during the live pilot.                                                                                        | Ready for prototype scope            |
| 3 — Working prototype      | Next.js app, voice orchestration, bulk CV pipeline, ATS ranking, scheduling, evidence reports, reviewer access and tested UI/logic. | Demonstrate a successful real voice → transcript → assessment → saved human review flow. Check the bulk scheduled path if included in the demo. | Implemented; live acceptance pending |
| 4 — Evaluate and iterate   | Synthetic cases, frozen historical data, regression tests, evaluation workspace, 10-CV pipeline fixture and result logging. | Actual model outputs, human judgments, observed failures and a manual-versus-assisted baseline comparison; bulk-pipeline live checks remain open. | Incomplete |
| 5 — Handoff and submission | PDF draft, editable sources, organized documentation, pipeline handoff and five-minute script. | Insert measured pilot results, record the video and verify the reviewer can access the submitted prototype. | Incomplete |

### All 16 accepted improvements: current status

“Software-verified” means the relevant code/UI checks passed, not that every real-world behavior is proven. “Built; live check” means the feature exists but cannot yet be marked fully passed.

| #   | Requirement                                | Status                                | Smallest remaining check or honest limitation                                                                                                                                                                                                     |
| --- | ------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Retry, return to setup and exit            | Built; live check                     | Intentionally fail a real voice connection, recover, and confirm completed answers/configuration remain. Browser recovery behavior has passed.                                                                                                    |
| 2   | Baseline and model comparison              | Incomplete                            | Keep the frozen model/prompt/data baseline. Compare a small identical case set against one alternative first. A broad comparison across every provider is deferred, not passed.                                                                   |
| 3   | BYOK / Demo / Reviewer access              | Built; host check                     | Verify one funded reviewer session and its limits. Demo limits identify a browser cookie, not a verified person; budget units bound operations, not exact currency spending. Retain basic caps and private keys; defer enterprise infrastructure. |
| 4   | Provider health and fallback visibility    | Built; live check                     | Observe a real success/error and one controlled fallback. Do not claim fallback works across live providers based only on mocked calls.                                                                                                           |
| 5   | Fillers, buffer, silence and mic failure   | Built; live check                     | Speak fillers, pause/continue, wait for repeat/skip, and mute/disconnect the mic. Event/timing logic is tested; natural conversation is not yet measured.                                                                                         |
| 6   | Structured / Adaptive interviewing         | Built; live check                     | Demonstrate a relevant follow-up without repeating answered detail and confirm the turn budget. Adaptive relevance currently relies on model instructions; a separate planning agent is unnecessary for this sprint.                              |
| 7   | Explicit evidence rubric                   | Logic verified; model grading pending | Empty input abstains deterministically, quotes are checked, and missing coverage does not lower assessed quality. Human-check real levels and whether the quotes actually support them.                                                           |
| 8   | One shared realtime service                | Code verified; live check             | Use the shared service successfully in the personal/reviewer room and a scheduled interview. There is no need for another transport rewrite.                                                                                                      |
| 9   | Shared configuration and snapshots         | Built; live check                     | Confirm a scheduled link retains its settings. Hosted Unlimited has a separate funding deadline; the public demo is deliberately limited. This is not literally unlimited hosted usage.                                                           |
| 10  | Prestige-neutral evaluation                | Partially verified                    | Metadata invariance is tested, but identical answers with different employer/school/title labels inside the transcript still need a real model counterfactual check. Do not claim the model is bias-free.                                         |
| 11  | Two-stage GitHub context                   | Built; sample check                   | Try one relevant public profile and one unavailable username. Check useful README context and non-blocking failure; no larger retrieval system is needed.                                                                                         |
| 12  | CV parsing and preview                     | Built; sample check                   | Try a text PDF, scanned PDF and invalid file; verify preview or explicit no-CV continuation. Error-string rejection is tested. Defer OCR.                                                                                                         |
| 13  | Contextual review / synthetic separation   | Software-verified                     | Navigation/access and synthetic reviewer storage are implemented. Verify the deployed reviewer path once; further product expansion is unnecessary.                                                                                               |
| 14  | Stable judgments and source-linked records | Software-verified                     | Browser tests cover typing, reload, submission and read-only completion; records contain source/model/rubric provenance. Collect a few actual human judgments next.                                                                               |
| 15  | Prototype, PDF and video                   | Incomplete                            | PDF is a draft with honest gaps; video is a script only. Finish real test evidence, update the PDF and record the five-minute demo.                                                                                                               |
| 16  | Documentation cleanup                      | Complete for this revision            | Authoritative documents are identified, earlier designs archived, obsolete root reports removed and 504 checked links resolve. Keep final results synchronized.                                                                                   |

### Finish the quest without overengineering

1. **Make the existing primary stack work.** Configure a valid voice credential and one evaluator. Recheck access without exposing keys. Do not add providers or change models just to increase the model count.
2. **Run a small live acceptance session.** One English structured session, one English adaptive/recovery session and one short Bahasa Indonesia extension can cover the interaction checks above. Reuse the scheduled path for one English session. Record observed behavior and fix reproducible blockers only.
3. **Run a small synthetic evaluation pilot.** Reuse roughly five existing scenarios: concrete evidence, vague answers, missing evidence, contradictory ownership and an injection attempt. Also record the deterministic empty case, repeat a clear and a sparse case, and add a same-evidence prestige variant. Use the same rubric and keep original outputs, corrections and failures. This is a pilot, not a comprehensive benchmark.
4. **Human-check and time the work.** The builder may be the sole reviewer for this submission. For two comparable synthetic transcripts, time manually producing a brief and time verifying/correcting an AI draft; record the order, minutes, errors and learning effects. Label this a single-reviewer convenience pilot, not a recruiter productivity study. A second reviewer is a future improvement, not a blocker.
5. **Keep the optional model comparison small.** To address our added comparison requirement, run the same small case set through one alternative with prompt/rubric/data fixed. Record actual model, results, failure rate and elapsed time; use observed provider usage for cost if available. If access is unavailable, retain the primary and explicitly mark the comparison deferred. The original quest does not require all providers to be benchmarked.
6. **Finish the three artifacts.** Add actual pilot results and limitations to the PDF; record the five-minute video; provide a working reviewer-accessible prototype link or accepted runnable package. If offering hosted voice, verify its actual host and usage caps. Attach the artifacts and check access from a fresh browser.

The next action is **provider setup followed by the English live acceptance check**, not Phase 6 or another feature build. The [runbook](docs/hr-product-sprint/implementation/current-runbook.md) contains the detailed steps; use the smaller sequence above to prioritize them.

### Current implementation extension — automated CV pipeline, 2026-09-11

The recruiter workflow now includes a focused automation from a role brief to scheduled interview invitations. This is an additive sprint extension built on the existing recruiter and ATS flows; it does not replace the evidence-based interview evaluation.

`/pipeline` accepts one role brief and a batch of up to 50 PDF CVs. For each file it parses bounded text, extracts an editable name and email, applies the existing deterministic ATS scorer, and sorts candidates by score. The recruiter may use Top 5/10/20 as a preselection shortcut, then must confirm the final checkbox selection before links are created. The score is a screening signal, not an automated rejection or hiring decision.

Creating a selected row's link snapshots the role/interview configuration and ATS result into the existing scheduled-session flow. The candidate signs in with the invited email, completes the same setup and live voice + text interview, and receives the allowed evaluation view. `/candidates` is the compact recruiter dashboard for all screened rows, including `not_invited` candidates, invited sessions and expandable parsed-CV/ATS/evaluation details. `/interviews` remains a compatibility route for older records.

The automation boundary is intentional:

- **Automatic:** PDF parsing, name/email extraction, deterministic ATS scoring, descending sort, status updates, invitation creation for checked rows, and configuration snapshots.
- **Recruiter-controlled:** correcting extracted identity fields, choosing or unchecking candidates, confirming the role and schedule, and sharing the generated links.
- **Not automated:** final hiring decisions, candidate rejection, sending email, model training, or continuous learning from candidate data.

Pipeline records are creator-owned. The `pipeline_candidates` Firestore rule, indexes and storage configuration are deployed in the production Firebase project; a denied read must surface as an availability warning rather than broadening access. Original PDFs are stored only for an invited scheduled session; uninvited rows retain bounded parsed/ATS metadata. See the [implementation note](docs/hr-product-sprint/implementation/2026-09-11-bulk-pipeline.md) and the [validation checklist](docs/hr-product-sprint/evaluation/cv-pipeline-validation.md).

### Defer until after submission

- Additional LLM/transcription integrations or an exhaustive multi-provider, multi-language test matrix. The shipped defaults are `gpt-realtime-2.1-mini`, `gpt-transcribe` and `gpt-5.6-luna`; optional adapters remain available for a later controlled comparison.
- Local model hosting, custom model training, automatic candidate-data collection and continuous learning.
- Eye tracking, extra proctoring signals, OCR and more advanced GitHub retrieval.
- A separate adaptive-planning agent, broad analytics dashboards beyond the focused Candidates view, another frontend redesign and new report formats.
- Enterprise databases, distributed queues, extensive production compliance work and statistically powered fairness studies.

**Keep the existing essentials:** server-only host keys, reviewer admission, basic rate/usage caps, honest synthetic labels, safe recovery, human review and evidence-based abstention. If reviewers are given a publicly hosted voice demo, the current hosting/cleanup requirements still apply; “prototype” does not make exposed keys or unbounded spending acceptable.

### Submission definition of done

- [x] A fresh reviewer can access and finish the demonstrated workflow without supplying a personal API key; this was accepted on the production path.
- [ ] At least one recorded English live interview produces a usable transcript, evidence assessment and saved human review; the claimed adaptive/recovery behavior is shown working.
- [ ] A small synthetic pilot has actual outputs, human checks, failure notes and a clearly labelled baseline comparison. Indonesian results are reported separately if included.
- [ ] The PDF contains those actual results and honest limitations rather than only planned tests.
- [ ] The approximately five-minute video is recorded and playable.
- [ ] All three deliverables are attached/shared and their access is verified.

No overall completion percentage is assigned: more feature code does not compensate for missing evaluation evidence or a missing required video.

</details>

## Original company challenge

Over 5 days of remote work, identify a real recruiting problem, design a near-future AI-native HR solution, build a functional prototype, evaluate its logic with mock data, and submit a portfolio-ready case study designed for engineering handoff.

## Objective

Build a useful HR/Recruiting prototype that clearly answers:

- What recruiting bottleneck did you solve?

- Who had this problem?

- What is your near-future HR solution?

- How did you prototype the AI logic/UX?

- How do you know it works?

You may choose the problem yourself. The solution can be related to:

- Automated resume screening and scoring

- AI-assisted interview question generation for Hiring Managers

- Candidate matching algorithms and reasoning

- Conversational AI for candidate pre-screening

- Interview evaluation and feedback summarization

- Cold outreach automation for passive sourcing

The problem can be small. It must be real and highly relevant to modern recruiting.

**Domains:** Recruiting · HR · Talent Acquisition

## Format

| | |

|---|---|

| **Duration** | 5 days |

| **Schedule** | Monday to Friday |

| **Work style** | Remote (Expected commitment: 8 hours per day) |

| **Output** | Working prototype (no-code/UI+logic) + Case Study (Handoff doc) + Demo Video |

| **Company support** | Lightweight check-ins only |

## Daily Rhythm

### Day 1: Discovery & UX Workflow

Define the HR problem and the user's current workflow.

**Expected output**

- Target user (e.g., Tech Recruiter overwhelmed by 500+ inbound resumes)

- Problem statement and baseline metric (Time spent, error rate)

- Near-future solution concept

- 5-day scope

### Day 2: Solution Design and AI Logic

Design the UX flow and map out how AI will solve the problem.

**Expected output**

- Wireframe or UX flow map

- Selection of AI tools (e.g., OpenAI API via Make/Zapier, V0, Lovable, Dify, or Figma AI)

- First draft of prompt logic or agent workflow

### Day 3: Build the Prototype

Create a functional representation of the product. Remember, perfect coding is not required, but the logic and experience must be testable.

**Expected output**

- A working low-code/no-code workflow OR an interactive prototype with clear AI input/output specifications

- Core feature is demonstrable

### Day 4: Evaluate with HR Data

Test your solution using synthetic data (e.g., 5 fake resumes, a mock interview transcript, or a dummy job description).

**Expected output**

- Test cases and results (Where did the AI hallucinate? Did the matching algorithm make sense?)

- UX adjustments based on test results

- Baseline comparison (e.g., "Manual screening takes 5 mins/resume; this prototype does it in 10 seconds with 85% accuracy")

### Day 5: Engineering Handoff and Case Study

Prepare the final submission so an engineer and designer could take your work and build the production version.

**Expected output**

- Runnable prototype or interactive workflow demo

- Case study / PRD (Product Requirements Document)

- 5-minute Loom video

## Deliverables

### Working Prototype (The Near-Future Solution)

Submit one of the following:

- A no-code/low-code workflow

- A prompt-chaining app showing the AI logic

- An interactive Figma prototype coupled with a detailed AI behavior spec

- A lightweight web app built with tools like Cursor, Claude, or Lovable

### Case Study & Handoff Document

Submit a Notion page or Markdown document covering:

- **The Problem & User:** Who are we solving this for in the HR space?

- **The Solution & UX:** How does the user interact with this feature?

- **Evaluation:** How did it perform with mock HR data? What were the limitations (e.g., AI bias)?

- **Next Steps for Engineers:** What does the dev team need to know to build this perfectly?

### Demo Video

Submit a 5-minute Loom or screen-recorded demo showing:

- The recruiting problem

- The UX flow of your prototype

- The AI working in the background

- The test results and engineering handoff points

## How Your Submission Is Evaluated

### HR/Recruiting Domain Empathy

Did you target a real, painful bottleneck in the hiring process? Is the solution practical for Recruiters, HMs, or Candidates?

### Product & UX Sense

Is the proposed workflow intuitive? Did you design an experience that makes the user's life easier, rather than just adding another clunky tool?

### AI Prototyping & Logic

We don't need perfect code, but did you structure the AI logic well? Are your prompts, data flows, and agent behaviors well-thought-out?

### Evaluation & Testing

Did you test your prototype with realistic HR data (resumes, job descriptions)? Did you identify where the AI might fail or show bias?

### Handoff Readiness

Can our engineering and design teams look at your case study and immediately understand what needs to be built and why?

## Submit Your Work

Every deliverable below is required — attach all of them to submit. Files can be a PDF, image, document or zip archive, up to 25 MB each. Your progress is saved as you go, so you can close this page and come back to finish.

### Your Deliverables

**0 of 3 attached**

#### Working Prototype (The Near-Future Solution)

- https://...

- Add link

- No file chosen

- Upload file

#### Case Study & Handoff Document

- https://...

- Add link

- No file chosen

- Upload file

#### Demo Video

- [https://www.loom.com/share/](https://www.loom.com/share/)...

- Add link

### Anything Else (Optional)

Extra files or links that do not belong to one of the deliverables above.

- Attach every deliverable above first. Extras unlock once your checklist is complete.

- No file chosen

- Finish your deliverables to add extra files

### Add Links

Paste a GitHub repo, a live URL, a Loom demo, or any link to your work.

- Finish your deliverables first

- Label (optional)

- Add

**Submit Quest**

## Accepted revision requirements — 2026-09-10

# Things to Fix / Improve

**1. Add interview recovery and safe navigation.** Once a user enters `/interview`, there is currently no reliable recovery path if initialization, authentication, WebRTC, or an API request fails. Add `Retry Connection`, `Return to Setup`, and `Exit Interview` actions while preserving the user's interview configuration where possible so a technical failure does not force them to recreate the entire setup. A browser Back button should not be the main recovery mechanism; the application should explicitly handle failed initialization and allow the user to recover from the interview route safely.

**2. Re-evaluate the current model stack instead of blindly upgrading it.** The current OpenAI and Gemini models should be benchmarked against newer fast and cost-efficient alternatives rather than replaced simply because newer models exist. For realtime interviewing, prioritize latency, natural turn-taking, interruption handling, speech reliability, availability, and cost rather than maximum reasoning capability. For post-interview evaluation, prioritize structured-output consistency, evidence grounding, repeatability, rubric adherence, latency, and cost. Establish the current system as a baseline first and then benchmark alternatives against the same evaluation dataset so model changes can be measured independently from scoring or product-logic improvements.

**3. Implement three clearly separated access modes: BYOK, Demo, and Reviewer.** BYOK users should be able to use their own provider credentials, and these credentials must never be persisted in Firestore, analytics, logs, or platform-owned backend storage beyond any temporary operation strictly required to establish a provider session. Demo Mode should use InterviewMate's server-side provider credentials with a normal usage limit such as five interview attempts per user per day. Reviewer Mode should use a server-validated invitation code that unlocks the application's full functionality, higher or apparently unlimited interview usage, Evaluation Sandbox, Human Review, and useful provider diagnostics while still enforcing backend expiration, revocation, rate limits, session limits, abuse protection, and a budget ceiling. InterviewMate-owned API keys must remain exclusively server-side.

**4. Add provider health, active-provider, and fallback visibility.** InterviewMate should understand whether each configured provider is `Ready`, `Degraded`, `Rate Limited`, `Unavailable`, or `Misconfigured`, and it should know which provider is primary, which one is currently active, whether fallback was triggered, and why. This diagnostic information should primarily be visible to recruiters and reviewers rather than candidates. Provider health should be derived from recent successful requests, actual provider errors, authentication failures, rate-limit responses, and cached server-side state rather than continuously sending unnecessary inference requests solely to maintain a status indicator.

**5. Redesign realtime turn-taking, interruption, and silence handling.** The current realtime conversation behavior is too sensitive, especially when the candidate says short fillers such as “uh”, “hmm”, or begins speaking without completing an answer. These events should not automatically cause the AI to interpret the answer as complete or advance to another question. The system should distinguish between filler-only speech, meaningful speech, interruption, thinking silence, completed answers, and microphone failure. After meaningful speech ends, provide approximately a 2–3 second end-of-turn buffer before the AI responds. For silence, allow a natural thinking period first, provide a gentle message such as “Take your time” after roughly seven seconds, and if silence continues for another approximately ten seconds, offer to repeat or skip the question before moving forward. A skipped question should be recorded as `No Evidence Collected` rather than directly penalizing competency, while microphone or technical failures must be handled separately and must never negatively affect candidate scoring.

**6. Add optional adaptive follow-up interviewing.** Recruiters should be able to choose between `Structured Interview` and `Adaptive Interview` before starting a session. Structured mode should follow the planned core questions, while Adaptive mode may ask evidence-driven follow-ups based on the current question, the candidate's answer, the competency being assessed, and remaining evidence gaps. Follow-up questions should explore relevant areas such as personal ownership, technical decisions, tradeoffs, validation, reasoning, outcomes, or missing detail, but they must remain directly connected to the current topic and must not ask for information the candidate has already clearly provided. Each follow-up should count as one interview turn toward the configured question budget, while competency coverage should be tracked independently from the number of questions or turns completed.

**7. Redesign scoring around explicit evidence, competency coverage, and reliability.** The current scoring system requires major validation because two equivalent no-answer tests produced materially different scores of approximately 40% and 60%, suggesting insufficient scoring stability and weak grounding in explicit metrics. Replace opaque percentage generation with an explicit competency rubric and separate dimensions such as `Evidence Quality`, `Competency Coverage`, `Response Relevance`, `Consistency`, and `Assessment Confidence`. Competency evidence could use a clear scale such as `0 = No Evidence`, `1 = Weak or Vague`, `2 = Partial Evidence`, `3 = Clear Evidence`, and `4 = Strong Concrete Evidence`. Interview completion must remain separate from answer quality, so a candidate who reaches only five of seven questions but provides strong evidence can still score highly on assessed competencies, while unreached areas should be marked `Not Assessed` or `Insufficient Evidence`. If overall evidence is too limited to support a reliable conclusion, InterviewMate should return `Insufficient Evidence for Reliable Overall Assessment` instead of manufacturing a precise score.

**8. Fix and migrate the Scheduled Interview Realtime API flow.** Scheduled interviews currently fail during realtime-session creation, and the larger architectural issue is that Demo Room, Scheduled Interview, and Reviewer sessions should not maintain separate realtime initialization implementations. Create one shared realtime service responsible for authentication, ephemeral credentials, session configuration, provider selection, WebRTC connection, fallback behavior, and error handling, and make every interview mode use that same implementation. This reduces the risk that one workflow silently remains on an outdated endpoint or configuration while another continues to work.

**9. Unify Demo Room and Scheduled Interview configuration.** Demo Room and Scheduled Interview should use one shared interview configuration schema and the same underlying defaults instead of exposing inconsistent settings. The shared configuration should include duration, maximum interview turns, Structured or Adaptive mode, competency rubric, preferred language, allowed interaction modes, custom questions, GitHub enrichment, technical or visual panels, and other interview behavior. Add duration options such as `5 minutes`, `10 minutes`, `15 minutes`, and `Unlimited`, where Unlimited ends only when the candidate or interviewer manually ends the session or all configured interview objectives are complete. Follow-up questions defined in Adaptive mode should count as one interview turn, and scheduled interviews should snapshot their configuration at creation time so later recruiter-setting changes do not silently modify an interview that has already been sent to a candidate.

**10. Make scoring evidence-based and prestige-neutral.** Candidate scores must not directly increase or decrease because of company reputation, university prestige, job-title prestige, candidate name, gender, age-related wording, location, or other irrelevant attributes. Senior-level capability may still be evaluated when it is relevant to the role, but it should be inferred from demonstrated scope of responsibility, ownership, technical decisions, leadership, cross-functional influence, system complexity, and measurable outcomes rather than simply seeing a title such as “Senior Engineer” or a famous employer name. Add counterfactual fairness tests where two profiles contain identical interview evidence but different employer, university, or title labels, and verify that their competency scores remain equivalent.

**11. Redesign GitHub enrichment into relevance-aware two-stage retrieval.** The current GitHub enrichment already fetches real candidate profile and repository metadata, but repository selection is still too lightweight and the interviewer currently does not deeply inspect selected project content. Redesign this into a two-stage pipeline where InterviewMate first fetches lightweight repository metadata such as name, description, language, topics, stars, fork status, archived status, and recent activity, then ranks repositories against the job description and candidate context before selecting only the 2–3 most relevant or technically substantial projects. Only after that selection should the system retrieve README content when available, clean and bound that content, and inject only useful project context into the interview prompt. Job relevance, CV/project overlap, technical depth, relevant technologies, recent meaningful activity, and candidate ownership should matter more than raw star count, while forks, archived repositories, trivial tutorials, and irrelevant projects should be deprioritized. GitHub enrichment must remain optional, and enrichment failure must never prevent the candidate from starting the interview.

**12. Add robust CV parsing validation and fail-safe behavior.** Resume parsing currently extracts PDF text and uses it for ATS analysis and interview grounding, but parsing output is not sufficiently validated before being treated as candidate context. Parsing failures or server error strings must never be passed into the interviewer as though they were actual CV content. Replace the existing loose return contract with a structured parsing result such as `success`, `partial`, `failed`, `no_extractable_text`, or `unsupported`, together with extracted text, page count, character count, warnings, and failure reason. Before an interview begins, show the recruiter a short `CV Context Preview` or clear parsing status so they can confirm that the system actually read the resume. If the PDF cannot be parsed, the product should either ask for a replacement file or explicitly continue without CV grounding, and the AI must never fabricate resume-based questions. Image-only or scanned PDFs can initially be marked as having no extractable text rather than introducing rushed OCR during the five-day sprint.

**13. Remove Review Brief from primary navigation and make it contextual.** `/review-brief` should not appear as a normal top-level navigation item because it is an evaluation and human-annotation workflow rather than a primary recruiter or candidate destination. Normal application navigation should remain focused on routes such as `Dashboard`, `Pipeline`, and `Settings`, while Review Brief should be reached contextually from the relevant candidate, evaluation, or Reviewer Mode. Synthetic fixtures such as `P1-A · Detailed account`, `P1-B · Conflicting ownership`, and `P2-SPARSE · Incomplete coverage` should appear in a reviewer-only `Evaluation Sandbox` and be clearly labelled `Synthetic Evaluation` so they are not confused with real candidates. Synthetic evaluation cases must also be excluded from production statistics such as Candidates Screened, Average Score, Completion Rate, and Active Interviews.

**14. Fix Review Brief state persistence and connect every review to its originating source.** Selected review criteria currently risk becoming unchecked after the reviewer enters a reviewer ID or writes notes, which is a form-state bug that must be fixed because it undermines the validity of human evaluation. Review selections should remain stable while the reviewer types, adds notes, scrolls, or interacts with unrelated controls, and should only reset when a different transcript or fixture is loaded, the reviewer explicitly requests a reset, or a new review is intentionally started. Submitted reviews should become persisted or read-only completed records rather than visually reverting as though no review occurred. Every review should be linked to a specific candidate/session or synthetic fixture and record transcript or fixture version, rubric version, AI evaluation/model version, reviewer ID, criteria judgments, notes, and submission timestamp so human judgments can be used as reliable ground truth when evaluating the AI scoring system.

**15. Design the submission and reviewer experience around three strong deliverables supported by clear internal sprint documentation.** Keep the fully working Next.js application as the primary `Working Prototype`, including the realtime interview workflow, adaptive questioning, evidence-grounded evaluation, Reviewer Mode, Evaluation Sandbox, Human Review, and provider/fallback behavior, while keeping evaluation tooling hidden from ordinary navigation and exposing it contextually through Reviewer Mode. The primary `Case Study & Handoff Document` should be a polished self-contained PDF covering the recruiting problem and target users, the existing InterviewMate baseline, discovery findings, product and UX decisions, AI architecture, interview logic, evaluation methodology, synthetic test cases, results, failure cases, fairness and governance, technical limitations, engineering handoff, and next steps. The third deliverable should be the required approximately five-minute Demo Video showing the recruiting problem, interview setup, realtime and adaptive behavior, evidence-grounded evaluation, Evaluation Sandbox and Human Review, test results, limitations, and key engineering handoff points. `Product_Sprint.md` should remain the detailed sprint specification and source of truth containing the complete challenge context, requirements, findings, product decisions, architecture decisions, evaluation strategy, implementation scope, and deliverable plan, while `docs/README.md` should remain the living five-day progress tracker documenting completed work, current work, known issues, validation status, evaluation results, implementation changes, and remaining tasks. These Markdown documents should support rather than replace the reviewer-facing PDF, and separate PowerPoint or standalone HTML reports should not be prioritized unless the company specifically asks for them.

**16. Clean up obsolete and conflicting Markdown documentation before submission.** Audit all repository Markdown files and remove or archive documents that no longer represent the current sprint scope, architecture, product direction, evaluation methodology, or submission requirements. Files such as the original `PRD.md`, `PROJECT_REPORT.md`, outdated planning documents, duplicate reports, early architecture notes, temporary research files, or other Markdown documents that do not directly help explain the current MUST Product Sprint should not remain alongside the authoritative documentation if they may confuse reviewers about which version of InterviewMate is current. `Product_Sprint.md` should remain the authoritative detailed sprint specification, `docs/README.md` should remain the authoritative progress tracker, and the root `README.md` should remain a concise current product overview with clear links to the relevant sprint documentation. Historical documentation should only be moved into something such as `docs/archive/` when it retains meaningful reference value; otherwise it should be removed entirely so the final submission repository presents one coherent and current version of the product.

## Current implementation decisions — 2026-09-10

The accepted 16 requirements above supersede the original narrow review-brief scope. Reuse the Next.js baseline (commit `29e40ba`) and its Firebase recruiter pipeline; do not rebuild from scratch. Preserve frozen historical evaluation data and prompts for independent model comparison.

- Primary user: recruiter preparing an evidence-backed first-screen handoff. Discovery is desk research; user pain and time savings remain hypotheses.
- English is the baseline; Bahasa Indonesia is a separately reported multilingual extension. A single builder reviewer is a pilot, not independent validation.
- Current defaults: GPT-Realtime 2.1 Mini voice, GPT-Transcribe (GPT-Live-Transcribe optional), GPT-5.6 Luna / Gemini 3.5 Flash-Lite / DeepSeek Flash evaluation. Optional Gemini 3.1 Flash Live uses OpenAI transcription and a server-held voice connection. Low reasoning is the default; Medium is available as documented. New choices are not an accuracy ranking.
- Recruiting data is creator-owned, with verified administrator access for miqbal.izzulhaq@gmail.com. Scheduled candidates sign in with the invited email and cannot write assessment scores. Firestore/Storage rules are deployed; old public CV tokens were revoked.
- Recruiter CV intake is available at `/pipeline`: upload a batch, parse names/emails, rank with the deterministic ATS signal, manually select candidates and create scheduled links. `/candidates` is the compact owner-scoped dashboard for screened, invited and not-invited rows; the latest `pipeline_candidates` rule must be included when rules are redeployed.
- Configuration v2 snapshots duration, turn budget, strategy, language, rubric, interaction modes, custom questions and optional technical/GitHub context. Hosted funding expiry remains separate from paused active time.
- Evidence rubric v2 exposes assessed quality, coverage, relevance, consistency and provisional confidence. No generated percentage or automated hiring recommendation. Exact candidate quotations are validated; relevance and semantic correctness still require human review.
- BYOK uses temporary request credentials; platform keys stay server-side. Reviewer invitations are signed, expiring and revocable, with rate/usage limits. Synthetic reviewer sessions use separate private storage.
- Personal data is not collected for training. Public GitHub context is optional and does not establish ownership. Production retention/deletion and infrastructure billing controls require engineering work.
- Deliverables: runnable Next.js prototype, self-contained PDF and approximately five-minute recorded demo. Markdown supports these artifacts. See [current runbook](docs/hr-product-sprint/implementation/current-runbook.md), [study protocol](docs/hr-product-sprint/evaluation/model-comparison-v2.md), [live tracker](docs/README.md), and [demo script](deliverables/demo-script.md).

## Current reviewer journey decision — 2026-09-10

The reviewer invitation is a constrained candidate journey. The administrator generates a signed invitation from Dashboard, shares it privately, and the recipient redeems it at `/reviewer`. The recipient can only set up the interview (role, language, shared voice/transcription settings, rubric, technical panel and optional CV), complete the live interview, review the evidence-based evaluation once, and finish. Voice + text is mandatory: the candidate speaks, edits the transcript draft when needed, and explicitly sends each answer. Reviewer recipients do not receive recruiter dashboard access, Evaluation Sandbox, Human Review controls or access to other candidates. The completed evaluation is saved in private server-side reviewer storage and surfaced only to the verified administrator's Dashboard.

This decision narrows the earlier Reviewer Mode wording in requirements 3 and 15 for the current prototype. Evaluation Sandbox and Human Review remain internal contextual tools for the administrator and sprint validation; they are not part of the link recipients use. The prototype still does not claim tamper-proof evidence, production retention/deletion controls or hiring validity.
