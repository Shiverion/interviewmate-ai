# Interview pauses, warnings and recovery

[Phase 3](../phases/03-prototype-build.md) · [Phase 4](../phases/04-evaluation-and-iteration.md) · [Data governance](../evaluation/data-governance.md)

Updated: 2026-09-09. **Implemented prototype; live voice reconnection, hosted persistence and production enforcement remain unverified.** This guide supersedes the earlier nonterminating three/five-event design. Historical verification files retain the policy that was tested at the time.

## Product behavior

The candidate reads the English/Indonesian notice before starting. Browser signals are not proof of cheating and cannot identify AI tools, another page's contents, searches, or intent. The app can cover its own page; it cannot prevent another app/device from being used.

| Trigger | Current behavior |
|---|---|
| First 10 seconds of a new session | Startup grace |
| Hidden for less than 1 second after grace | No counted interruption |
| Hidden or unfocused for at least 1 second | Pause microphone/video capture, AI transport, answer submission and timer; show full-screen dialog |
| Second counted interruption OR 6 seconds continuously hidden | Final warning |
| Third counted interruption OR 15 seconds continuously hidden | End session and retain answers for human review |
| Window loses focus while still visible | Same pause/warning/end sequence, including another app used beside the visible interview |
| Cursor leaves page | Not collected |
| Technical/offline interruption or page closure | Recoverable checkpoint; time stays paused until reconnection |

Thresholds are provisional product defaults, not validated cheating thresholds. A continuous absence counts once across overlapping blur/visibility signals. The control interval closes when the page is both visible and focused; visible-but-unfocused time still counts. The separate advisory visibility recorder closes hidden intervals on visibility return and keeps focus context separately. Its counts need not equal the session-control total, which governs penalties. If a candidate keeps switching while already paused, each new qualifying absence still counts. Resume requires focus and does not reset counts or grant another startup grace period.

The focus extension is labelled `visibility-and-focus-v2` inside the compatible v1 checkpoint format. Existing nonterminal checkpoints receive a `focus_policy_updated` event when loaded; saved terminal states are preserved. Start a fresh rehearsal to acknowledge and test the revised notice. Focus loss can also come from browser chrome, dialogs or accessibility tools; this signal does not identify the app being used or prove misconduct. Simply seeing another window without moving focus may remain undetectable.

Long-absence thresholds are measured from the start of the absence after grace, not from the warning. Browser callbacks may be delayed, throttled or suspended. The app reconciles elapsed time when it can run again; this is not a guarantee of ending at exactly 15 seconds while suspended. A final-warning state can be reached while the candidate is away, so its visual message may not be seen before ending. The pre-start notice also discloses the whole sequence. Repeating sound is best effort, not proof a warning was heard.

## Return-to-page alerts

The large dialog covers the viewport and blurs the interview behind it. It uses a native modal dialog so underlying controls are inert and keyboard focus stays within it. Escape and outside clicks do not bypass the pause. The candidate explicitly chooses **I understand — resume with a new question**. This initiates reconnection for a live interview; the timer resumes only after connection succeeds.

Sound starts enabled for each mounted attempt and arms from the candidate's click/key gesture, including acknowledgment/start. Mute is available before starting and inside the dialog; re-enabling plays a preview. A pause plays one 660 Hz pulse every 2.5 seconds. Final warning plays three 880 Hz pulses every 1.2 seconds, with bounded gain rising from 0.035 to 0.06. Ending plays a single three-pulse lower-pitch pattern and stops repeating. Resume/recovery/completion stop pending warning tones; mute cancels scheduled pulses and closes the audio context. Device volume is never changed. These local oscillator tones need no API/file. Browser audio restrictions, suspension or device mute can prevent playback; a visible fallback remains. Media is disconnected while paused, including microphone and camera tracks. This trades reconnection latency for a clear transport stop.

The rehearsal shows monitoring off, startup countdown, readiness, remaining time, current question and session state. It has a clearly labelled simulated connection-loss action and a **New rehearsal** action that creates a separate attempt. The real interview does not offer that attempt-reset action.

## Recovery and replacement questions

Checkpoints persist completed transcript lines, partial assistant text, remaining time, interruption/recovery counts, terminal state and retired exchanges in this browser's localStorage. The normal context store still supplies the session identity after reopening. A recovered active/paused session opens in recovery, with its timer frozen. Sessions already ended stay ended through normal reload/reopen. Corrupt/unavailable checkpoints are held for recruiter help rather than silently granting a fresh session.

Before resuming, the current interrupted exchange is moved to a retired-material archive. Earlier question/answer exchanges remain in the active transcript. Replacement selection uses eight distinct authored behavioral scenarios in English/Indonesian, advancing through unused entries and skipping exact/partial textual matches to previous questions. The live voice response is instructed to ask the selected question exactly. The rehearsal displays it directly. A failed connection retry keeps its reserved replacement and does not discard another completed answer. Exhaustion requires recruiter help; it does not recycle the bank.

The bank is a prototype fallback, not calibrated role-specific or difficulty-matched content. Semantic paraphrase detection and the model's actual spoken adherence are not verified. Production needs an approved question pool organized by competency, language and difficulty, server-side selection/retirement, and a rule for exhausted pools. Changing a question reduces preparation opportunities; it cannot eliminate intentional interruption or distinguish a crash from deliberate closure.

Offline events and unexpected WebRTC/data-channel disconnects pause the session instead of marking it completed. Reopening restores the last available checkpoint; recovery attempts remain visible for review. Technical recovery preserves earlier interruption counts but does not count downtime as a new page violation. Repeated technical failures do not automatically imply misconduct.

## Reports, evaluation and governance

The recruiter report displays session-control status, counts, remaining time, replacements, event history and retired questions. The terminal save attempts a separate `session_control` field alongside `final_transcript`; the existing visibility record remains in `session_integrity`. Writes are best effort and failure is visible. A checkpoint can be downloaded from the full-screen dialog. Demo rehearsals make no Firebase write.

An automatically ended session skips the page's automatic evaluation request. An ended session is not an automatic rejection or score deduction. On a normally completed resumed interview, the evaluation input is the active transcript; retired exchanges are kept separately for human review and are not sent as evaluation evidence. Manual/other evaluation paths must apply the same exclusion before production use.

These checkpoints contain candidate answers and are **personal/session-linked data, not anonymous telemetry or training data**. Browser-local storage survives tab closure, can be read by same-origin code and by people with access to the browser profile, can fail, and can be modified or cleared. Use synthetic data for the sprint. There is no automatic retention/deletion job, encryption boundary, cross-device recovery, server checkpoint reconciliation, recruiter restart authorization flow, or tamper-resistant lock. Existing Firebase rule/configuration edits were not changed or deployed; owner/candidate authorization must be hardened before real deployment. Clearing storage or altering client code can bypass local limits.

Do not claim production anti-cheating enforcement. A production service must own active-time accounting, append-only audit events, question eligibility, terminal/restart state and resume authorization. It must also define retention/deletion, access isolation, recovery after device/storage loss, warning-delivery evidence and accessibility accommodations.

## Try it without an AI key

For repeatable steps, expected results and a blank result sheet, use the [manual validation checklist](../evaluation/session-control-validation.md). It separates no-key rehearsal checks from live voice and hosted-saving checks.

1. Run `npm run dev -- --hostname 127.0.0.1` and open [the rehearsal](http://127.0.0.1:3000/review-brief/integrity-demo).
2. If an earlier attempt is ended, choose **New rehearsal**. Read/acknowledge the notice, start and wait for **Monitoring ready**.
3. Switch away for one second, return, and check the full-screen pause. Resume and observe the changed question.
4. Repeat: the second interruption gives the final warning; the third ends the session. Reload to verify the normal UI retains the end state.
5. Start a separate rehearsal. Stay away for six seconds to test the final warning, or fifteen to test automatic end.
6. In another attempt, choose **Simulate connection loss**, note remaining time, reload and resume. Time should remain paused and the question should change.
7. Enable/test sound, try real network loss, reopen the same browser session, and check mobile/keyboard behavior. For a live voice test, working provider credentials and Firebase configuration are still needed.

Human follow-up: check real WebRTC reconnection, media stopping, model question delivery, permissions, browser suspension and network flapping on the browsers candidates will use. Calibrate thresholds and equivalent replacement questions with recruiters/candidates, including accessibility needs. Synthetic UI tests do not measure false-positive or cheating-detection accuracy.

The [owner's self-test](../evaluation/results/2026-09-09-session-control-self-test.md) records passing rehearsal checks with warning/sound caveats, the prior window-focus gap, and the Firebase hostname diagnosis. For live testing, use [localhost login](http://localhost:3000/login); changing hostnames creates a separate browser-storage context. The revised focus and sound behaviors still need manual retesting.

## Engineering map

- [Control engine and question bank](../../../src/lib/integrity/session-control.ts): thresholds, clock, transitions and retirement.
- [Recovery checkpoint store](../../../src/lib/integrity/control-store.ts): same-browser persistence and terminal-state restoration.
- [Live/rehearsal integration](../../../src/lib/integrity/useInterviewControl.ts): lifecycle signals, resume and terminal saving.
- [Visibility record policy](../../../src/lib/integrity/policy.ts), [store](../../../src/lib/integrity/store.ts) and [hook](../../../src/lib/integrity/useSessionIntegrity.ts).
- [Full-screen dialog](../../../src/components/interview/IntegrityAlert.tsx), [notice/panels](../../../src/components/interview/SessionIntegrity.tsx), [recovery report](../../../src/components/interview/SessionControlReport.tsx).
- [Bounded alert tones](../../../src/lib/integrity/alert-audio.ts): pulse patterns, gesture activation and cancellation.
- [Interview transport store](../../../src/lib/store/useInterviewStore.ts) and [WebRTC manager](../../../src/lib/audio/WebRTCAudioManager.ts).

Visibility policy v2 uses a versioned sessionStorage key and requires a new acknowledgment. Old v1 keys are left intact and old v1 reports retain their original three-second/nonterminating interpretation. New recovery checkpoints use a separate versioned localStorage prefix. Do not compare counts from different versions as equivalent.

## Verification

The [focus and sound follow-up checks](verification/2026-09-09-focus-and-sound-checks.json) record 107 unit tests, eight browser scenarios, type/lint/build results and the read-only Authentication hostname diagnosis. Audible warning delivery and actual windowed-browser behavior still need the owner's retest.

Run `npx jest --runInBand`, application/Cypress type checks, scoped ESLint, `npm run build`, `node docs/scripts/check-docs.cjs`, and the browser suite:

```powershell
npx cypress run --config baseUrl=http://127.0.0.1:3000 --spec cypress/e2e/integrity.cy.ts --browser electron
```

[Original record checks](verification/2026-09-08-session-integrity-checks.json) and [earlier alert checks](verification/2026-09-08-session-alert-checks.json) are historical. [Phase 4](../phases/04-evaluation-and-iteration.md#session-integrity-software-verification) records the current iteration and its practical limits.

Browser constraints: [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [Window blur](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event), and [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), inspected 2026-09-08.
