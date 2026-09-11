# Five-minute demo video draft

**Status:** ready to record · **Target:** 5:00 maximum · **Narration:** English baseline

This version follows the requested viewer journey: public overview → sign-in → workspace → recruiting problem → pipeline setup → invitation session → evidence/history/feedback → AI logic and handoff. Record each section separately and edit them into one continuous story.

[Case study and PRD](case-study-and-prd.md) · [MVP audit](mvp-readiness-audit.md) · [Production app](https://interviewmate-ai.shiverion.com/)

## Recording rules

- Use a separate browser profile for the candidate invitation. Keep credentials, invitation tokens, API keys and real candidate data out of the recording.
- Use the fictional CV batch in [the evaluation dataset](../docs/hr-product-sprint/evaluation/dataset/cv-pipeline-v1/README.md).
- The invitation walkthrough below intentionally ends without submitting an answer. Use a clearly labelled completed record for the evidence result so the video does not imply that an empty session has been evaluated.
- Record the public pages and candidate session separately. This lets you retake a voice clip without repeating the whole demo.
- Keep the browser zoom high enough for the ATS score, editable transcript, evidence percentage and dates to be readable.

## Demo fixture to prepare

Use this same fixture in `/pipeline` so the actions and narration stay consistent.

**Role title:** Data Scientist — Fraud Detection

**Job description:**

> Build and operate fraud-detection models from raw transaction data through production. Own feature engineering, imbalanced classification, metric selection, threshold calibration, monitoring and retraining. Explain false-positive and false-negative trade-offs with concrete evidence, and collaborate with risk, product and engineering. Experience with Python, SQL, scikit-learn or gradient-boosting models, experiment tracking and production monitoring is useful.

**Interview settings:**

| Setting | Demo value |
| --- | --- |
| Duration | 5 minutes |
| Maximum turns | 3 |
| Interview approach | Structured Interview |
| Preferred language | English |
| Interview voice | GPT-Realtime 2.1 Mini |
| Transcription | GPT-Transcribe |
| Voice reasoning | Low |
| Interaction mode | Voice + text · Required |
| Technical panel | None |
| Core questions | Leave empty; derive from the role brief and CV context |
| Additional competency rubric | Leave empty; derive from the role brief and validated CV context |
| GitHub username | Leave empty for the core recording; optional retrieval can be shown only if a public profile is prepared |
| Link validity | Start now; expire in 7 days |

Upload the ten fictional CVs, review the ATS ranking, then select one top-ranked row such as **Hendra Wijaya** for the invitation walkthrough. The exact selected name may change if the ranking is rerun.

## Core five-minute take

### 1. Public landing page — 0:00–0:20

**Show:** the unauthenticated landing page and its overview copy.

**Say:**

> “This is InterviewMate, an AI-assisted recruiting workspace. The public landing page explains the product before sign-in: recruiters can move from CV intake to interview evidence, while candidates get a focused voice-and-text interview. I will show the complete path in a few minutes.”

### 2. Login and access modes — 0:20–0:45

**Show:** `/login`, the Google and email options, then sign in with the prepared account. Do not reveal the password on camera.

**Say:**

> “Authentication separates the recruiter workspace from the public demo. An administrator can manage the pipeline, candidates, interview history and feedback. A regular signed-in user can use the allowed demo and candidate features without seeing another recruiter's records. Reviewer access is a separate temporary account, so the owner's account is never shared.”

If the account-choice screen takes time, use a short cut and keep the narration unchanged.

### 3. Workspace dashboard — 0:45–1:05

**Show:** `/dashboard`, the workspace summary, recent conversations and navigation into Pipeline, Candidates, Interview history and Feedback.

**Say:**

> “The workspace is the recruiter's control center. It summarizes scheduled, completed and evaluated work, then links to the batch pipeline, candidate records, interview history and feedback. The production workflow starts in Pipeline; the dashboard is where the recruiter checks progress and returns to evidence.”

### 4. Recruiting problem and target user — 1:05–1:25

**Show:** the role brief area in `/pipeline` and the case-study title card.

**Say:**

> “The target user is a recruiter handling many applicants for one role. The bottleneck is the handoff between resume review, interview invitations and evidence review. Information gets copied between tools, and a score alone does not show what a candidate actually demonstrated. InterviewMate connects those steps around traceable evidence and human review.”

### 5. Pipeline, ATS ranking and interview setup — 1:25–2:25

**Show:** paste the fixture role title and job description, upload the ten fictional PDFs, show the completed ranking, expand one row, select a candidate and continue to the interview-link page.

**Say:**

> “I enter the role once and upload a batch of CV PDFs. The app extracts each candidate's name, email and bounded resume text, then applies the same deterministic ATS scoring logic to every row. The score is a screening signal, not an automatic rejection. I can inspect the extracted fields, sort the ranking, use a Top 5, 10 or 20 shortcut, and still change every checkbox before inviting anyone.”

> “On the next page I set the shared interview behavior: five minutes, three turns, structured approach, English, GPT-Realtime 2.1 Mini, GPT-Transcribe, low reasoning and mandatory voice plus text. I leave core questions and additional competencies empty so the role brief and validated CV context drive the interview. I create one link for the selected top-ranked candidate.”

**Action:** briefly show one strong and one weak ATS row, then show the selected candidate and the generated-link confirmation. Do not present the upload duration as a measured benchmark.

### 6. Invitation, guardrail, evidence, history and feedback — 2:25–4:10

#### Candidate invitation and guardrail — 2:25–3:20

**Show:** open one generated invitation link in the separate browser profile, show candidate setup, start the interview, capture the first AI question, then end the session without answering.

**Say:**

> “The invitation opens a constrained candidate journey: setup, interview and the permitted evaluation view. The candidate speaks first, reviews the transcript draft and explicitly sends an answer when they are ready. For this walkthrough I will not submit an answer; I am showing the session controls.”

**Controlled demonstration:** trigger one safe focus change or tab switch. Show the pause/warning state, then resume. If the product creates a fresh question after recovery, show that the question changes rather than replaying the interrupted one.

**Say:**

> “The guardrail is deterministic. A focus change pauses the session and explains what happened. When the candidate resumes, the timer remains paused during the interruption and the next question can change, so a browser interruption cannot be used to replay an answer. This is a disclosed integrity signal, not an automatic cheating verdict.”

End the invitation from the visible session control. Do not claim that this intentionally empty session has an assessment.

#### Completed result and human feedback — 3:20–4:10

**Show:** a prepared completed record in `/interview history` or `/interviews`, then the expanded record, ATS score, evidence percentage, coverage, exact quotation, completion time and feedback form. Label seeded data as **illustrative seeded record** if applicable.

**Say:**

> “For the result view I open a completed record. ATS describes resume-to-role fit; the interview assessment describes supported evidence from submitted answers. The report uses a percentage out of one hundred, competency coverage and source-linked quotations. Missing or technical-failure answers do not become an automatic hiring penalty, and the product does not make a hiring decision. The recruiter can inspect the full history, while the candidate can leave feedback on clarity, transcription, relevance and technical reliability.”

### 7. AI logic, testing and engineering handoff — 4:10–5:00

**Show:** the approved AI-boundaries diagram, the evaluation table, then the case-study handoff page and production URL.

**Say:**

> “The AI path is explicit: bounded CV and job context, candidate voice input, language-aware transcription, an editable draft, explicit send, eligible-answer filtering, structured evidence, schema and quotation validation, then a percentage score with human review. I tested the workflow with ten fictional CVs, synthetic transcripts and English live self-tests, with Bahasa Indonesia as a multilingual extension. The tests exposed duplicate openings, transcript accumulation, turn-taking and persistence issues; those were fixed before the production release.”

> “The handoff documents the workflow, AI inputs and outputs, scoring rules, recovery behavior, storage boundaries, access modes and known limitations. Candidate records stay scoped to the recruiter workspace, reviewer access is separate from the owner account, and public materials do not contain credentials. The next production step is independent recruiter timing and calibration, plus privacy-reviewed feedback learning. The MVP is live from CV intake to interview evidence.”

## Optional additions if time remains

Add **one** of these only if the edited core take is comfortably below five minutes:

- **Bahasa Indonesia extension, 10–15 seconds:** show the language setting and one transcript line. Say: “English is the baseline; Bahasa Indonesia is tested as a multilingual extension.”
- **GitHub context, 10–15 seconds:** show the optional field only with a prepared public profile. Say: “GitHub context is bounded and non-blocking; the interview still works when the field is empty or retrieval is unavailable.”
- **Feedback learning, 10–15 seconds:** show the feedback form. Say: “Feedback is for product improvement. Future transcript learning would require consent, PII masking and a held-out quality check.”

Do not add all three. The required story is the recruiting workflow, candidate controls, evidence result and engineering handoff.

## Final export checklist

- Keep the final edit at or below **5:00**.
- Confirm the problem, UX flow, AI behavior, test results and handoff are visible or spoken.
- Label seeded records and recorded sessions; do not present them as a live candidate result.
- Hide credentials, invitation tokens, real candidate email addresses and API keys.
- Check that the production URL and case-study link open from a fresh browser.
- Upload the video together with the public prototype link and the private reviewer PDF. The video URL is the remaining submission artifact once recording is complete.

**Video URL:** not recorded.
