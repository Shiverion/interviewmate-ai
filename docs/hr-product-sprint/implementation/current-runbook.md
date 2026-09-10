# Current setup and validation

Updated: 2026-09-10. [Specification](../../../Product_Sprint.md) · [Progress](../../README.md). This runbook supersedes the archived setup instructions.

## Host setup

1. Run `npm install` and `npm run dev`. Use `http://localhost:3000` consistently; Firebase authorization for localhost does not authorize 127.0.0.1. Add your actual public domain to Firebase authorized domains before testing it.
2. In your private `.env.local`, configure `OPENAI_API_KEY` with valid Realtime access. The last recorded key check returned 401; replacing that key is a human action. Optionally set `GOOGLE_GENERATIVE_AI_API_KEY` and `DEEPSEEK_API_KEY` for other evaluators. Restart the server after changes. Never paste keys into a report, repository or chat.
3. Run `node scripts/reviewer-invite.mjs create "Sprint reviewer"`. Read the code from the ignored `.demo-state/reviewer-invitation.txt` and redeem it at `/reviewer`. A local invitation has already been prepared during this revision. Share codes privately. Run `node scripts/reviewer-invite.mjs revoke INVITATION_ID` to revoke one. The invitation file stores hashes; its separate delivery file contains the code.
4. For production use a persistent Node host, HTTPS, private durable `DEMO_STATE_DIR`, `DEMO_RUNTIME=persistent-node`, and a stable random `DEMO_COOKIE_SECRET` of at least 32 characters. The local fallback secret is development-only. Do not deploy this file-ledger implementation on ephemeral/serverless disks. Set provider billing alerts/limits and monitor cleanup failures.
5. Keep Firebase configuration for the ordinary recruiter pipeline. Reviewer scheduling and records use separate private host storage and do not require creating a fake Firebase user. Never change Firebase rules to public access to bypass a failed acceptance check.

## Access and limits

| Mode | Credentials | Limits and storage |
|---|---|---|
| BYOK | Personal keys entered in Settings; temporary request headers, never written by backend | Provider-account limits; keys remain in browser storage until removed. Shared-device users should clear them. |
| Demo | Host keys remain server-side | Five starts per signed browser cookie per UTC day, eight-minute funding window, eight connections, bounded answer/evaluation inputs. Clearing cookies can evade the per-browser limit; the shared host cap is the backstop. |
| Reviewer | Server-validated signed invitation | Default 30 starts/day, 12 billable/record operations per minute, 500 usage units, seven-day expiry; up to 100 stored scheduled tests, shared start cap and one active lease per invitation. Revocation checked on requests and call cleanup. |

Voice reserves one usage unit per funded minute; an evaluation reserves three. Unlimited active interview time has a 30-minute hosted funding window, displayed before use. Units cap operations, not exact currency cost. Host downtime or failed provider hangup can extend a call: persistent monitoring and provider billing controls are release requirements. A production Redis/database transaction store and verified identity replace the prototype's cookie/file limits.

## Configuration and flow

Personal setup, scheduling and Reviewer Mode use `InterviewSetupForm` and `interview-config-v2`. Duration is 5, 10, 15 minutes or Unlimited. Every new question/follow-up consumes a turn; evidence coverage is calculated independently. Structured mode follows core questions; Adaptive mode requests relevant follow-ups. Adaptive topicality is prompt-directed and still needs human testing.

Recruiter scheduling snapshots configuration and role context. CV parsing returns status, bounded text, pages, characters, warnings and failure reason; confirm the preview or explicitly continue without CV. Scanned PDFs have no extractable text; no OCR is included. GitHub metadata is ranked before retrieving up to three cleaned, bounded READMEs. Retrieval failure is non-blocking and repository ownership does not prove personal contribution.

All voice rooms use `/api/realtime` and `src/lib/realtime/service.ts`. Old token creation is retired. An initial failure offers Retry Connection, Return to Setup and Exit Interview. Recovery retains completed answers and replaces the interrupted question. Technical interruption and skipped answers never directly reduce competency scores. Browser focus/visibility does not establish cheating and cannot inspect other devices or another app's content.

## Step-by-step acceptance

1. **No keys:** sign in, arrive at Dashboard; open personal setup and verify missing-key guidance prevents a paid voice start. Open `/interview` without context and verify recovery/navigation actions. No forced `/setup` redirect.
2. **Reviewer access:** redeem a code; verify expiration, limits and diagnostics. Open Evaluation Sandbox. An incognito visitor without a code must not access its data. Test revocation with a disposable invitation, not the invitation used by an active reviewer.
3. **Configuration:** create Structured 5-minute and Adaptive 10-minute sessions; confirm custom questions, language, rubric and panels. Create a scheduled synthetic session, change setup afterward, reopen the link and verify the saved configuration.
4. **CV/GitHub:** try a text PDF, scanned PDF and non-PDF. Check preview and explicit no-CV continuation. Try a relevant GitHub username, then an unavailable one; the latter must still permit entry.
5. **English voice baseline:** with valid credentials, acknowledge the rules and start. Say only “uh, hmm”; no new question should follow. Give a meaningful answer, pause briefly and continue; verify approximately 2.5 seconds of quiet before a response. Wait after question playback: gentle text at about seven seconds, repeat/skip choices at seventeen. Mute/unplug the microphone; technical silence must remain separate.
6. **Adaptive and budget:** supply an answer with unclear ownership, then answer the follow-up clearly. Confirm one relevant follow-up, no repeated answered detail, and closing when the turn budget is exhausted. Record failures; prompt instructions alone do not prove compliance.
7. **Recovery:** use the [session-control checklist](../evaluation/session-control-validation.md). Confirm fullscreen pause overlay, warning, termination thresholds and interrupted-question replacement. Also fail initialization intentionally, return to setup and verify configuration remains.
8. **Evidence:** run empty, filler-only, partial, clear, contradictory and injected transcripts. Empty output must be Not Assessed with no percentage. Quotes must exist in candidate turns. Strong partial evidence keeps its assessed quality while uncovered criteria remain Not Assessed.
9. **Human review:** open a candidate or synthetic report, select all judgments, type ID/notes, reload, submit, reload again. Judgments must persist and completed fields become read-only; export includes source/version/model/rubric/hash and timestamp. Browser checks cover this path with synthetic data.
10. **Providers:** record primary/active model, fallback reason and errors. BYOK fallback requires the explicit Settings checkbox; it may send the transcript to another configured provider. Provider diagnostics reflect real requests and become stale; no inference health probes are sent. Model failures should produce no saved assessment.
11. **Indonesian extension:** repeat the same scenarios in Bahasa Indonesia with corrected reference transcripts. Keep its results separate from English. A single bilingual evaluator is useful for a pilot but not inter-rater agreement.
12. **Release:** record live test evidence, complete the PDF result table, record the five-minute video, deploy and redeem a fresh reviewer invitation on HTTPS. Do not mark the quest complete until those steps succeed.

## Engineer handoff

Configuration: `src/lib/interview/config.ts`; turn policy: `turn-policy.ts`; connection orchestration: `src/lib/store/useInterviewStore.ts`; evidence validation: `src/lib/ai/evidence.ts`; provider adapter: `evaluation.ts`; access/usage: `src/lib/access/reviewer.ts` and `src/lib/demo/ledger.ts`. Human reviews persist locally and, with an invitation, to private host files. No training job or analytics export consumes these records automatically.

Run `npm test -- --runInBand`, `npx tsc --noEmit`, `npm run build`, and `npx cypress run --spec "cypress/e2e/revision.cy.ts,cypress/e2e/reviewer-demo.cy.ts,cypress/e2e/integrity.cy.ts"`. The revision browser test requires a valid local invitation and writes clearly synthetic local records. It does not call a paid model.

Before real hiring: design server-authoritative admission/configuration and auditing, scoped candidate tokens, retention/deletion tooling, accessible accommodations, validated scoring and independent human oversight. Existing browser checkpoints and reviewer-uploaded records are client-reported evidence, not tamper-proof audit records.
