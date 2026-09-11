# CV pipeline and scheduled-invite validation

Status: **Implemented and owner-accepted in production; checklist retained as the repeatable regression protocol.**

The production release smoke verified the hosted pipeline dependencies, Firestore ledger and scoped access. The owner also accepted the recruiter flow from role brief through batch CV parsing, ATS ranking, invitation creation and candidate-only interview access. This file does not fabricate row-by-row benchmark measurements; a future recruiter study can fill the result sheet with a fresh commit/browser/account record.

This checklist validates the automation described in the [bulk pipeline implementation note](../implementation/2026-09-11-bulk-pipeline.md). It tests workflow correctness, schedule snapshots and access isolation. It does not measure ATS hiring accuracy, recruiter time savings or candidate quality.

## Test setup

Use a fresh browser profile for the recruiter/admin and the fictional files in the [cv-pipeline-v1 fixture](dataset/cv-pipeline-v1/README.md). Deploy the current Firestore rules first, including the `pipeline_candidates` match. Keep the role brief in English for the baseline; repeat only the parsing smoke test with an Indonesian CV as a separate extension.

Suggested role: **Senior Frontend Engineer - InterviewMate AI**. The complete role text is in the fixture README.

## Step-by-step validation

1. Sign in as the recruiter/admin and open `/pipeline`. Confirm the primary navigation says **Pipeline** and the old `/interviews` route remains available for compatibility.
2. Enter the suggested role title and job description. Upload all ten PDFs from `dataset/cv-pipeline-v1` and choose **Analyze and rank resumes**.
3. Wait until every row has finished. Confirm each row has a non-empty parsed-CV preview, an editable candidate name, an editable email and an ATS score. Record any parse warning rather than correcting it silently.
4. Confirm the order is descending by score. The expected smoke-test bands are: Aisha Rahman/Bima Santoso/Clara Nguyen strongest; Dimas Pratama/Emily Carter/Farhan Yusuf/Grace Lim partial; Hendra Wijaya/Intan Maharani/Joko Setiawan weakest. Small ties or an unexpected order require inspection, not an automatic hiring conclusion.
5. Choose **Top 5**. Confirm only the five highest-ranked rows are preselected. Uncheck at least one preselected row and check one lower-ranked row. This proves Top-N is only a shortcut and the checkbox state is the final recruiter decision.
6. Correct one extracted name or email before creating links. Confirm the edited value is used in the invitation preview. Leave another candidate uninvited.
7. Configure a short scheduled interview, including language, duration, turn budget, Structured/Adaptive mode, rubric and any optional panels. Create links for the checked rows only.
8. Confirm every created session has the selected candidate email, role/configuration snapshot and ATS snapshot. Confirm the unselected row remains visible as `not_invited` and has no invitation link.
9. Open `/candidates`. Confirm the table is minimal by default and includes all ten screened rows, rank, candidate, email, ATS score and status. Expand at least one invited and one not-invited row; verify the detail includes parsed-CV data, ATS evidence, invitation/session state, evaluation state and the saved configuration.
10. In a separate browser, open one invitation with the matching fictional email. Confirm the candidate sees setup → live interview → permitted evaluation → done, and no recruiter navigation or other candidate data.
11. Try the same link with a different signed-in email. It must be denied. Try again after the session expiry; it must remain unavailable.
12. Return to the recruiter browser and confirm only the creator/admin can list the pipeline and candidate dashboard. A different recruiter account must not see these rows. Record a denied-read warning as a rules/deployment issue; never make the collection public to make the test pass.

## Result sheet

Record the date, commit, browser, account role and exact sanitized errors before changing code.

| Check | Expected | Result | Evidence / notes |
|---|---|---|---|
| 1. Batch upload and parse | 10 rows finish; non-empty previews or explicit warnings | Not run | |
| 2. Name/email extraction | 10 fictional names and emails populated and editable | Not run | |
| 3. ATS ordering | Strong group above partial group above weak group | Not run | |
| 4. Top-N preselection | Top 5 selects five rows only; manual edits persist | Not run | |
| 5. Invitation creation | Links created only for checked rows; email appears without re-entry | Not run | |
| 6. Snapshot integrity | Role, settings and ATS snapshot retained after setup changes | Not run | |
| 7. Candidate dashboard | All screened rows visible; details expand without a wide default grid | Not run | |
| 8. Candidate admission | Matching email can enter; different email and expired link cannot | Not run | |
| 9. Recruiter isolation | Creator/admin sees rows; another recruiter does not | Not run | |
| 10. Evaluation handoff | Completed invited session can be evaluated by recruiter/admin | Not run | |

## Interpretation rules

- A parse or score failure is a pipeline failure to investigate; it is not a reason to invent a candidate value.
- ATS scores are deterministic screening signals. They may help a recruiter prioritize review but must not automatically reject, rank for hiring, or select an interview slate without human confirmation.
- Link creation is not email delivery. The prototype creates and displays links; sending them remains a recruiter action.
- A successful software check does not prove voice quality, evaluation quality, fairness, legal compliance or production readiness.
- Keep results from the English baseline and Indonesian extension in separate rows. Do not pool them into one accuracy percentage.
