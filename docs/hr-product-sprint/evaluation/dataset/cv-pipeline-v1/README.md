# Bulk pipeline CV fixtures v1

These ten PDFs are fictional test data for `/pipeline`. All names and emails use `example.com`; they are not real candidates. The end-to-end procedure, including scheduled-link and access checks, is in the [CV pipeline validation checklist](../../cv-pipeline-validation.md).

## Suggested role brief

**Role title:** Senior Frontend Engineer - InterviewMate AI

**Job description:**

> We are looking for a Senior Frontend Engineer to build accessible, reliable interfaces for an AI recruiting platform. The role owns React and TypeScript features in Next.js, integrates Node.js and REST APIs, and works with Firebase authentication and data access. You will improve performance, write Jest and Cypress tests, maintain Git and GitHub CI/CD workflows, and collaborate with product, design and QA. Experience with Docker, AWS, accessibility, security, code review and system design is valuable. We expect clear technical reasoning, ownership of delivery and evidence of measurable outcomes.

Paste the role title and description into `/pipeline` before uploading the PDFs. The ATS scorer is deterministic, so this fixture should produce a clear spread when the same brief is used.

## Expected ranking bands

| Files | Fixture candidate | Expected fit |
|---|---|---|
| 01-03 | Aisha Rahman, Bima Santoso, Clara Nguyen | Strong match |
| 04-07 | Dimas Pratama, Emily Carter, Farhan Yusuf, Grace Lim | Partial / moderate match |
| 08-10 | Hendra Wijaya, Intan Maharani, Joko Setiawan | Weak or unrelated match |

The exact percentages are implementation output, not ground truth. Check that the strong group generally ranks above the partial group, and the unrelated group ranks lowest. Review any surprising order instead of treating the score as a hiring decision.

## Extraction checks

Each PDF includes a first-page name, an email address, a target title, experience dates and a skills section. The pipeline should:

- parse a non-empty CV text preview;
- populate the candidate name from the CV header when the filename is still the default;
- populate the candidate email from the CV text;
- leave both fields editable before an invitation is created;
- show the same email in the invitation row without requiring re-entry.

## Suggested test run

1. Sign in as the recruiter/admin and open `http://localhost:3000/pipeline`.
2. Paste the role brief above.
3. Upload all ten PDF files from this folder.
4. Click **Analyze and rank resumes** and wait for every row to finish.
5. Compare the order with the expected bands and inspect the extracted names/emails.
6. Apply **Top 5** or **Top 10**, uncheck one candidate, and create invitations for the remaining selected rows.
7. Copy one generated link and verify that the matching example.com email is required to open it. Record the result in the [validation checklist](../../cv-pipeline-validation.md); link creation is not email delivery.
