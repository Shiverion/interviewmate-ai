# Five-minute demo: shot list and English narration

Status: script ready; video not yet recorded. Target duration: **5:00**, including real interface actions and a short interview excerpt. Use English narration for the quest; Bahasa Indonesia may be a separately labelled optional clip.

[Case study and PRD](case-study-and-prd.md) · [MVP audit](mvp-readiness-audit.md)

## Before recording

- Use the deployed app and the [fictional CV batch/JD](../docs/hr-product-sprint/evaluation/dataset/cv-pipeline-v1/README.md). Have one prepared completed record available for the result segment.
- Sign in beforehand. For a candidate walkthrough, use a separate browser profile and an invitation tied to an email you can actually access. The fixture's example.com addresses are not usable login accounts: edit one demo candidate's email to your test account before creating its link.
- Capture a short real English interview exchange in advance if necessary. Label it “Recorded prototype session”; a seeded dashboard score must say “Illustrative seeded record.”
- Keep real names/emails, secrets and usable invitation codes out of the public recording. Show copying a link without publishing the full token.
- Record the parts separately, then combine them in the order below. Keep the candidate-session capture in its own window; switching tabs while an interview is active may trigger the disclosed integrity controls.
- Rehearse with a timer. Narration is deliberately short to leave time for clicks, AI playback and the answer draft. Do not read every table or model name aloud.

## Part 1 — Problem and user (0:00–0:30)

**Show:** title and role brief in Pipeline.

**Say:**

“InterviewMate helps a recruiter move from a batch of CVs to interview evidence they can inspect. The problem is the handoff: checking resumes, preparing separate invitations, and then reconstructing what each candidate actually demonstrated. I started with desk research and an existing interview app, then connected these steps into one working prototype.”

## Part 2 — CV intake and selection (0:30–1:20)

**Show:** paste JD, choose fictional PDFs, then show completed ranking. A cut over processing should be labelled, not presented as a measured speed result.

**Say:**

“I enter the role once and upload several fictional CVs. The app extracts names, email addresses and resume text, then scores each CV against the same job description. I can inspect and correct the extracted information. This ATS score uses keyword and experience heuristics, so it is a screening aid. I can select the top five, then change any checkbox. The recruiter decides who gets an invitation.”

**Action:** inspect one strong and one weak match; change one checkbox.

## Part 3 — Invitation setup (1:20–1:50)

**Show:** Continue to Step 4, selected candidates, English, duration/turn budget, empty additional rubric, copy link.

**Say:**

“The selected candidates move to a separate scheduling page. I set the interview language, duration and question budget. Additional competencies are optional. The invitation keeps a snapshot of the role, settings and ATS result. The app creates a link for each selected candidate; sharing the link is still the recruiter's action.”

## Part 4 — Candidate interview (1:50–2:55)

**Show:** authenticated candidate setup, one complete AI question, spoken answer appearing in the composer, one edit and Send. Reserve about 30 seconds here for actual audio and interaction.

**Say before the excerpt:**

“The candidate enters their own session. Voice and text work together. Their speech becomes an editable draft, and they choose when to send it. That gives them control when transcription gets a technical term wrong.”

**Example candidate answer, if appropriate to the actual question:**

“I built the React filters for an order search page. I added loading and empty states, and wrote tests for filters that returned no results.”

**Say after Send:**

“Sending commits the answer and clears the draft. The next question can follow the role and the evidence still missing. Recovery preserves completed answers when a technical interruption occurs.”

Do not stage an answer unrelated to the question. Show recovery only if there is time; it is not necessary to demonstrate every feature.

## Part 5 — Evidence, history and feedback (2:55–3:40)

**Show:** clearly labelled completed record; ATS, evidence score, coverage and one exact quotation. Briefly show feedback.

**Say:**

“The result separates the resume's ATS score from interview evidence. Each competency has a level and a quotation from the candidate's answer. The score out of one hundred summarizes supported evidence across the rubric; missing evidence affects coverage. It is not a hiring recommendation. The recruiter can open the full record, while the candidate can leave feedback on clarity, transcription, relevance and technical reliability.”

## Part 6 — AI logic and testing (3:40–4:25)

**Show:** AI diagram and evaluation table in the case study.

**Say:**

“The stages are explicit: parse the CV, calculate ATS matching, transcribe speech, run the interview, then generate and validate structured evidence. I used authored synthetic transcripts, ten fictional CVs and my own live self-tests. Reported problems led to transcript, turn-taking, layout and persistence fixes. The recorded release passed one hundred ninety-one automated tests. This is prototype validation with one builder; recruiter time savings and independent model accuracy are not measured.”

## Part 7 — Handoff and close (4:25–5:00)

**Show:** PRD source map, requirements and production URL.

**Say:**

“The handoff includes the workflow, acceptance criteria, AI input and output, scoring formulas, storage boundaries and error behavior. The app is deployed with server-side credentials. Next, I would measure manual versus assisted review and ask an independent recruiter to check the evidence levels. The MVP is ready to demonstrate the complete recruiting workflow, with those limitations documented.”

## Final checks and submission

Export one approximately five-minute video. Check that audio, text and score labels are readable; distinguish live/recorded sessions from seeded examples. Open the video link as someone without your account. Submit the app URL, [case study/PRD](case-study-and-prd.md) and video together.

**Video URL:** not recorded.
