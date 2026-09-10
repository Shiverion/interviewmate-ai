# Bulk candidate pipeline

Updated: 2026-09-11. This note documents the first implementation of the recruiter bulk pipeline described in the sprint extension.

## Outcome

Recruiters can now open `/pipeline`, paste one role brief, upload multiple CV PDFs, rank the CVs with the existing `/api/ats-score` logic used by `/ats-check`, select candidates, and create interview invitation links in one flow. The primary navigation points to `/pipeline`; `/interviews` remains available for existing interview records.

The **Candidates** navigation item opens `/candidates`, a compact dashboard of persisted pipeline candidates and interview sessions. Rows show rank, candidate, email, ATS score and status; expanding a row reveals the invitation, role setup, ATS evidence, evaluation state and parsed-CV details without turning the default view into a wide data grid. Candidates remain visible with `screened` or `not_invited` status even when the recruiter does not create a link.

## Recruiter flow

1. Enter a role title and job description (at least 50 characters is recommended for useful keyword coverage).
2. Upload up to 50 PDF resumes. Each file is parsed through `/api/parse-resume` and scored against the same job description through `/api/ats-score`.
3. Review the descending ATS ranking. Candidate names can be corrected, and an email is auto-filled when the parser finds one. The email remains editable.
4. Optionally preselect the Top 5, Top 10, Top 20 or all ranked candidates. Checkboxes remain the final recruiter decision.
5. Configure the interview, validity window and mandatory voice + text mode, then create links for the selected candidates.
6. Copy or open each `/apply/{sessionId}` link. The candidate must sign in with the email stored on that row.

## Data and access

PDFs are sent to the existing parser for text extraction. The original PDF is uploaded to Firebase Storage only when a recruiter creates a session for that candidate. The session stores the validated CV parsing result and an ATS score snapshot so the recruiter can inspect the source score later. Existing Firestore ownership rules still scope records to the recruiter; invited candidates can only open their own active session.

## Automation boundary and state

The pipeline is a short, inspectable workflow rather than an autonomous hiring agent:

`uploaded → parsed → screened → not_invited | invited → in_progress → completed → evaluated`

Parsing, name/email extraction, ATS scoring, descending sort, status updates and scheduled-link creation for checked rows are automatic. Correcting extracted fields, choosing the final candidates, confirming the interview window and sharing links remain recruiter actions. The system does not reject candidates, send email, make a hiring recommendation or learn from candidate data.

When a recruiter creates a link, the role brief, interview settings, preferred language, questions/rubric and ATS snapshot are copied into the scheduled session. Later changes to recruiter defaults do not change that invitation. The candidate's invited email is the admission key; the candidate can complete setup, the live voice + text interview and the permitted evaluation view, while the recruiter/admin owns the pipeline and final assessment record. An expired session cannot be reopened by the candidate.

The `/candidates` view is the read surface for this state machine. It keeps every screened row, including `not_invited` candidates, and expands a row to show identity, ATS evidence, role/session snapshot, invitation status, evaluation status and parsed-CV details. It is a focused pipeline dashboard, not a validated hiring-ranking report.

## Implementation map

| Area | File | Responsibility |
|---|---|---|
| Bulk UI | `src/app/(recruiter)/pipeline/page.tsx` | Upload, parse, score, sort, select and create links |
| Candidate dashboard | `src/app/(recruiter)/candidates/page.tsx` | Minimal ranking table with expandable candidate details |
| Pipeline persistence | `src/lib/firebase/pipeline.ts` and `firestore.rules` | Owner-scoped `pipeline_candidates` records linked to interview sessions |
| Detail route | `src/app/(recruiter)/pipeline/[sessionId]/page.tsx` | Canonical pipeline report URL; reuses the existing report page |
| ATS scoring | `src/app/api/ats-score/route.ts` | Deterministic keyword, skill and experience scoring |
| PDF parsing | `src/app/api/parse-resume/route.ts` | Bounded PDF text extraction and warnings |
| Session creation | `src/lib/firebase/interviews.ts` | Scheduled interview and invitation persistence, including `ats_score` snapshot |
| Navigation | `src/components/layout/Header.tsx` | `/pipeline` as the recruiter navigation target |

## Verification

- `npx tsc --noEmit` passed.
- Targeted ESLint passed for the pipeline, navigation, session creation and linked pages.
- `npm test -- --runInBand` passed: 24 suites, 180 tests.
- `npm run build` passed and emitted `/pipeline` and `/pipeline/[sessionId]` routes.

The exact live workflow to record is in the [CV pipeline validation checklist](../evaluation/cv-pipeline-validation.md). It covers the 10-CV fixture, expected score ordering, name/email parsing, Top-N preselection, manual unchecking, scheduled-link creation, configuration snapshot/expiry, candidate-only access and recruiter dashboard isolation.

The Firebase rules deployment must include the `pipeline_candidates` match before relying on persistence. Until then, `/pipeline` still ranks resumes locally and `/candidates` shows any existing interview sessions with a visible availability notice.

## Known limits

- Invitation creation requires a candidate sign-in email because Firestore admission is email-scoped. A missing email must be entered before that row can be invited.
- The Top-N control is a preselection aid; recruiters can change the checkboxes before creating links.
- Batch state currently lives in the page until links are created. Persisted sessions retain the ATS snapshot, but a later version can add a dedicated requisition-level pipeline record for re-opening an unfinished batch.
- ATS output is a screening signal and does not make a hiring decision. Human review remains required.
- The deterministic score has not been calibrated against recruiter labels; expected fixture ordering is a smoke-test oracle only. Do not report it as ATS accuracy or time saved.

## Next practical validation

Use two or more synthetic PDFs with one English job description, confirm ranking order and email extraction, create links for a subset, and verify each invited account can open only its own link. Repeat with a Bahasa Indonesia CV as a multilingual extension while keeping the English role brief as the baseline.
