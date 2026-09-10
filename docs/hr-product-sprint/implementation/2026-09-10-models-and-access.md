# Model refresh and private recruiting workspace

Updated: 2026-09-10. [Current runbook](current-runbook.md) · [Sprint tracker](../../README.md) · [Product specification](../../../Product_Sprint.md)

## Implemented behavior

Recruiting records belong to the Firebase UID that creates the interview. Sending or knowing a link does not transfer ownership. Dashboard and Pipeline queries select that UID; opening a report directly is checked by both the UI and Firestore rules. Templates, legacy candidate reports and stored CVs are also restricted. Ownership cannot be changed through an update.

The verified email `miqbal.izzulhaq@gmail.com` is the administrator. This account sees all recruiter interviews, including legacy ownerless records. An unverified account with that email has no admin privilege. Rules use the Firebase authentication token, never a role supplied by the page or an editable user profile.

A scheduled candidate must sign in using the verified email on the invitation. Candidates can get their own session during its access window and submit answers, integrity records and technical workspace content. They cannot list recruiting records, change invitation settings, extend expiry, assign ownership or save an assessment score. Final assessment persistence belongs to the recruiter/admin; candidate-side assessment output remains local. Recruiters can run **Evaluate** from Pipeline after submission. Existing invitations without a candidate email should be recreated with the correct email.

Reviewer invitations follow a separate sponsored path. The administrator creates a signed invitation from Dashboard (or the local invite script), shares the code privately, and the recipient redeems it at `/reviewer`. The recipient can provide role details, choose the shared interview settings, upload an optional CV, complete the live voice interview, edit each transcript in the voice + text composer before sending, and view the completed evidence evaluation once. The recipient is not shown recruiter navigation, Evaluation Sandbox or Human Review controls. The result is written to the private host ledger and returned to the verified administrator's Dashboard; it is never mixed into another user's Firestore candidate list.

The Additional competency rubric is optional and empty in a fresh setup. With no selected additions, interview questions and evaluation competencies are derived from the job description and validated CV context. The setup dropdown offers common extra lenses such as system design, debugging, testing and quality, accessibility, security and privacy, product thinking, leadership and delivery.

The free fictional demo remains available without Google sign-in. Invitation-based reviewer records remain in separate private host storage; the verified administrator can see completed reviewer evaluations in the Dashboard. The invitation recipient follows a candidate-only flow: setup, live interview, one evaluation view, done.

Account changes clear previous interview context, transcripts, recovery, local review drafts and personal API keys, and remount private pages. A reload or token refresh for the same account preserves recovery. Browser storage is still a prototype convenience, not encrypted storage or a replacement for secure device access.

CV uploads now use owner/session paths without publishing download URLs. CV retrieval uses authenticated Storage access. Two legacy public CV download tokens were revoked on the configured project and both old links rejected anonymous retrieval. Files were preserved. A candidate can retrieve only their invited session's CV during the access window.

## Current model choices

| Purpose                          | Model                           | Reasoning / language                                                    |
| -------------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| Default live voice               | `gpt-realtime-2.1-mini`         | Low default; Medium selectable                                          |
| Alternative live voice           | `gemini-3.1-flash-live-preview` | Low default; Medium selectable                                          |
| Default transcription            | `gpt-transcribe`                | Explicit selected-language hint                                         |
| Streaming transcription option   | `gpt-live-transcribe`           | Explicit language hint; draft text kept separate from committed answers |
| OpenAI evaluation / review brief | `gpt-5.6-luna`                  | Low default                                                             |
| Gemini evaluation                | `gemini-3.5-flash-lite`         | Low default                                                             |
| DeepSeek evaluation              | `deepseek-flash`                | Thinking enabled, Low                                                   |

For OpenAI/Gemini evaluation, the host may set `EVALUATION_REASONING_EFFORT=medium`; other values fall back to Low. Benchmark model overrides retain distinct configuration hashes. Old benchmark records are not rewritten or counted as results for these new models.

Reviewer evaluation is selected from the host's configured providers. A browser's personal provider preference cannot make a reviewer request use an unavailable host key; the route chooses the requested host provider when configured and otherwise falls back to the first configured host provider.

**Gemini voice architecture:** microphone audio goes to OpenAI transcription through WebRTC. Only completed candidate text is sent to Gemini Live when the shared interview controller accepts a turn. Gemini streams its spoken reply through a server-held connection. This option requires both keys and has combined transcription/voice cost. The host closes connections on cancellation, funding expiry and revocation; a stalled response has a deadline. It requires a persistent Node host, not an arbitrary serverless deployment.

English remains the baseline. A fixed language applies to transcription hints and interviewer welcome, questions, repeats, recovery and closing. Auto-detect omits the transcription hint, asks for a preferred language at the opening and directs the interviewer to keep the established language. Prompts and hints reduce language switching; they cannot guarantee recognition or spoken-language accuracy. Other language options are unvalidated until tested.

## Completed verification

- Firestore and Storage rules published to `interviewmate-9bdd4` on 2026-09-10.
- 44 emulator checks passed: owner/admin/candidate/anonymous boundaries, queries and direct IDs, unverified admin denial, immutable ownership, expiry/revocation, protected scores and private CVs.
- 168 application tests passed across 24 suites, including account switching, preserved same-account recovery, streaming transcript deduplication, language-preserving response instructions, Gemini ownership/expiry/cancellation and queued interruption handling.
- TypeScript, changed-source lint and production build passed after the reviewer-flow revision. 169 application tests pass across 24 suites; 12 targeted browser checks pass across revision, reviewer-demo and integrity flows. The reviewer acceptance path covers candidate-only navigation and explicit transcript sending; admin invitation creation is covered by the helper test and the live dashboard action still needs a signed-in manual check.
- OpenAI model-list request returned HTTP 200 and listed all four requested OpenAI models.
- One live synthetic evaluation through `/api/evaluate` returned HTTP 200 using `gpt-5.6-luna`, approximately **7,706 ms** end-to-end including local route processing. It returned four rubric entries, status **Evidence available for human review**, and no overall score because evidence coverage was insufficient. This is an integration smoke test, not an accuracy, cost or latency benchmark.
- Gemini and DeepSeek host credentials are absent. No successful live Gemini voice/assessment or DeepSeek run is claimed. No human microphone test was performed in this revision.

## Your remaining setup and validation

1. Open `http://localhost:3000` consistently. Your existing OpenAI server key now passes the access check. Set `GOOGLE_GENERATIVE_AI_API_KEY` in private `.env.local` for hosted Gemini voice/evaluation; optionally add `DEEPSEEK_API_KEY` for the third evaluator. Restart the server after changes. Personal sessions use keys entered in Settings; Gemini voice needs both OpenAI and Gemini keys.
2. Sign out and back in with your Google admin account. Confirm **Admin workspace · All recruiters** appears and existing interviews are visible. Changing accounts intentionally removes locally saved personal keys; enter them again if needed.
3. In a separate browser profile, sign in with another Google account. Its Dashboard/Pipeline should be empty until that account creates interviews. Opening an admin-owned report URL must not reveal the report. Create one synthetic interview there; confirm it appears for that creator and your admin account.
4. Schedule a synthetic interview using the candidate's actual Google sign-in email. Open the link in the candidate profile. Verify the correct email can join and a different account cannot. Submit answers, then open Pipeline as the recruiter and run Evaluate. Verify only the recruiter/admin can persist the assessment.
5. Try two short voice sessions with the same scripted answers: English first, then Bahasa Indonesia. Record wrong-language words, omitted words, language of the spoken questions, interruptions and reconnect behavior. Repeat with GPT-Live-Transcribe. Test Auto-detect separately; do not merge its results into the English baseline.
6. After adding Gemini, repeat the same script with Gemini voice. Review the transcript against your recording before scoring evaluation quality. Keep the models unranked until there are comparable human-reviewed results. Finish the small pilot, update the PDF and record the five-minute demo.

## Engineering notes and reproducible checks

- Access policy: `src/lib/firebase/access.ts`, `firestore.rules`, `storage.rules`. Changing the administrator requires updating the helper and both rule files together, testing and redeploying.
- Rule checks: `firebase emulators:exec --only firestore,storage --project demo-interviewmate --config firebase.emulators.json "node scripts/test-access-rules.mjs"`. Uses synthetic records in local emulators, not production data.
- Rules deployment: `firebase deploy --only firestore:rules,storage --project interviewmate-9bdd4 --config firebase.json`. Auth must have project permissions.
- Scheduled candidate writes remain client-originated, untrusted evidence. This change provides data isolation; it does not prove the authenticity of interview answers or integrity events. Server-authoritative recording, retention/deletion and stronger identity guarantees are later production work.
- Firebase rules are deployed; application changes still need deployment when publishing the public reviewer site. Existing sessions without an ownership field are admin-only; do not guess ownership from candidate email.

## Provider references

Model identifiers and request fields were checked against official documentation: [OpenAI Realtime call creation](https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/create), [OpenAI transcription](https://developers.openai.com/api/docs/guides/realtime-transcription), and [Gemini Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities). Preview model behavior and account availability still require live verification.
