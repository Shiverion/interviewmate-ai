# Five-minute demo video draft

**Status:** ready to record · **Target:** 5:00 maximum · **Narration:** English baseline

This script follows the challenge brief in the order a reviewer needs to understand it: the recruiting bottleneck, the recruiter workflow, the candidate experience, the AI logic, the test evidence and the engineering handoff. Record the core take first. Optional clips are listed at the end and should only be added if the final edit stays under five minutes.

[Case study and PRD](case-study-and-prd.md) · [MVP audit](mvp-readiness-audit.md) · [Production app](https://interviewmate-ai.shiverion.com/)

## Before recording

- Use the deployed app and the fictional CV batch in [the evaluation dataset](../docs/hr-product-sprint/evaluation/dataset/cv-pipeline-v1/README.md).
- Prepare one completed, clearly labelled record for the results segment. If it is seeded, say **“illustrative seeded record”** on screen or in the narration.
- Sign in before recording. Keep the private reviewer password, invitation tokens, real candidate data and API keys out of the video.
- Use a separate browser profile for the candidate interview. Integrity controls can react to tab switching during a live session.
- Record the pipeline, candidate interview and case-study diagrams as separate clips, then edit them together. This makes the demo resilient if live audio takes longer than expected.
- Keep the browser zoom high enough for the ATS score, editable transcript, evidence score and dates to be readable.

## Core five-minute take

### 1. Recruiting problem and target user — 0:00–0:30

**Show:** `/pipeline` role brief and the case-study title card.

**Say:**

> “InterviewMate is for a recruiter who has a batch of applicants but needs a traceable first-screen workflow. The bottleneck is the handoff between resume review, interview invitations and evidence review. Information gets copied between tools, and a score alone does not show what a candidate actually demonstrated. I started with desk research and reused the existing interview app as the baseline, then connected the workflow around evidence and human review.”

### 2. CV intake, parsing and ATS ranking — 0:30–1:15

**Show:** enter the job description, upload the fictional CV batch, wait for the completed ranking, expand one row and select candidates.

**Say:**

> “The recruiter enters the role once and uploads several CV PDFs. InterviewMate extracts the candidate name, email and bounded resume text, then applies the same deterministic ATS scoring logic to every row. The score is a screening signal, not an automatic rejection. I can inspect the extracted fields, sort the ranking, use a Top 5, 10 or 20 shortcut, and still change every checkbox before inviting anyone.”

**Action:** briefly show one strong match and one weak match. Avoid presenting processing time as a measured benchmark.

### 3. Interview link setup — 1:15–1:50

**Show:** selected candidates, the separate invitation page, English language, duration/turn budget, empty optional competency rubric, and the create-link action.

**Say:**

> “The selected rows move to a separate link-creation step. The recruiter chooses the shared interview language, duration and maximum turns. Competencies default to the job description and validated CV context; an additional rubric is optional. Each link keeps a snapshot of the role, settings and ATS result, so later records remain interpretable. The recruiter decides how and when to share the link.”

### 4. Candidate voice plus text interview — 1:50–3:00

**Show:** candidate setup, the first AI question, the voice waveform, the editable transcript draft, one small edit, and **Send answer**. Keep one real answer excerpt to about 25–35 seconds.

**Say before the excerpt:**

> “The candidate gets a focused session rather than the recruiter workspace. Voice and typing are mandatory together: the candidate speaks, reviews the transcription, edits names or technical terms, and explicitly sends the answer. The draft is not committed automatically.”

**Show/send a relevant answer. Then say:**

> “Once the answer is sent, the draft clears and the committed answer becomes the interview record. The interviewer can ask a targeted follow-up based on the role and the evidence still missing. If a technical interruption occurs, completed answers and the session configuration can be recovered without replaying the same committed answer.”

Do not stage an answer that does not match the visible question. If live audio is unreliable, use a labelled recording of the prototype session rather than implying it is a fresh live result.

### 5. Evidence result, history and feedback — 3:00–3:40

**Show:** the completed record in `/interview history` or `/interviews`, ATS score, evidence percentage, competency coverage, one exact quotation, completion date and the feedback form.

**Say:**

> “The result keeps two signals separate. ATS describes resume-to-role fit; the interview assessment describes supported evidence from submitted answers. The report uses a percentage out of one hundred, competency coverage and source-linked quotations. Missing or technical-failure answers do not become an automatic hiring penalty, and the product does not make a hiring decision. A recruiter can inspect the full record and the candidate can leave structured feedback on clarity, transcription, relevance and technical reliability.”

### 6. AI logic and evaluation evidence — 3:40–4:25

**Show:** the approved AI-boundaries diagram, then the evaluation table or case-study phase panel.

**Say:**

> “The AI path is explicit: bounded CV and job context, candidate voice input, language-aware transcription, an editable draft, explicit send, eligible-answer filtering, structured evidence, schema and quotation validation, then a percentage score with human review. I tested the workflow with ten fictional CVs, synthetic transcripts and English live self-tests, with Bahasa Indonesia as a multilingual extension. The tests exposed duplicate openings, transcript accumulation, turn-taking and persistence issues; those were fixed before the production release. The release also passed the recorded automated test suite. This is prototype evidence from one builder, not a claim of independent recruiter accuracy.”

### 7. Engineering handoff and close — 4:25–5:00

**Show:** the case-study handoff page, requirements/acceptance criteria, production URL and the privacy/data-governance note.

**Say:**

> “The handoff documents the workflow, AI inputs and outputs, scoring rules, recovery behavior, storage boundaries, access modes and known limitations. Candidate records stay scoped to the recruiter workspace; reviewer access is separate from the owner account, and public materials do not contain credentials. The next production step is independent recruiter timing and calibration, plus privacy-reviewed feedback learning. The MVP is live and demonstrates one complete path from CV intake to interview evidence.”

## Optional clips if time remains

Add no more than one short clip, or trim the core take before adding any of these:

- **Bahasa Indonesia extension (10–15 seconds):** show the language setting and one transcript line. Say: “English is the baseline; Bahasa Indonesia is tested as a multilingual extension.”
- **Recovery and integrity (10–15 seconds):** show the paused warning or recovery state. Say: “The deterministic guardrail discloses a focus change, pauses the session and preserves committed answers; it is a review signal, not an automated cheating verdict.”
- **Feedback loop (10–15 seconds):** show the feedback form. Say: “Feedback is used for product improvement. Any future transcript learning would require consent, PII masking and a held-out quality check.”

Do not add all three. The recruiting workflow and evidence handoff are the required story.

## Final export checklist

- Keep the final edit at or below **5:00**.
- Confirm the problem, UX flow, AI behavior, test results and handoff are all visible or spoken.
- Label seeded records and recorded sessions; do not present them as a live candidate result.
- Hide credentials, invitation tokens, real candidate email addresses and API keys.
- Check that the production URL and case-study link open from a fresh browser.
- Upload the video together with the public prototype link and the private reviewer PDF. The video URL is the remaining submission artifact once recording is complete.

**Video URL:** not recorded.
