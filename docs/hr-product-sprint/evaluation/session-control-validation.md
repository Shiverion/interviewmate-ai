# Manual validation: interview pauses and recovery

[Evaluation home](README.md) · [Behavior and engineering guide](../implementation/session-integrity.md) · [Phase 4 report](../phases/04-evaluation-and-iteration.md)

Prepared: 2026-09-09; revised for the focus/sound follow-up to `170688d` on `codex/hr-product-sprint`. The [owner's previous-build results](results/2026-09-09-session-control-self-test.md) are preserved separately. **The revised checks below and their blank result sheet remain Not run.** The separate [software verification record](../implementation/verification/2026-09-09-session-control-checks.json) contains earlier automated results, not your observations.

Start with Part A, which needs no AI key, microphone or database. Then run Part B with a fictional live interview. English is the baseline; Indonesian is a separate language extension. You can run these checks yourself. An additional reviewer is helpful for judging wording and accessibility, but is not required to start.

## Before you start

1. Keep the local preview running. If the page does not load, follow [local development](../../product/local-development.md#install-and-start).
2. Open [the rehearsal](http://127.0.0.1:3000/review-brief/integrity-demo). Use a regular browser profile, and keep the same browser and address throughout recovery tests. Do not clear site storage during a test.
3. Open a second, harmless tab to switch to. Use a phone stopwatch or count aloud; switching to an on-screen timer would itself affect the test.
4. Choose **New rehearsal** before each numbered test unless it explicitly says to continue the same attempt. Save the resulting address so you can reopen that exact attempt.
5. Select **English**, read and acknowledge the notice, then select **Start local rehearsal**. Wait until **Monitoring ready** appears, after the 10-second startup grace. This is the standard start for each test.
6. Record your browser/version, device, date, language and build in the result sheet below. A short screen recording or screenshots can document what you see. Use fictional answers only; saved records contain session data.

For manual timing, use two seconds to cross the one-second pause threshold, seven seconds to cross the six-second warning threshold, and seventeen seconds to cross the fifteen-second end threshold. These margins avoid stopwatch ambiguity. Exact boundary behavior is covered by automated tests. Background browser scheduling can delay visible updates; record the actual behavior rather than assuming the deadline was met.

## Part A — rehearsal without provider setup

### A1. Notice and ordinary use

1. Choose **New rehearsal**. Before acknowledging, try to start.
2. Read the notice and check that it describes pause, final warning, ending, and recovery. Acknowledge it and start.
3. Stay on the page through startup grace and for another ten seconds. Move the cursor outside the page without switching tabs.

**Expected:** Start is disabled before acknowledgment. After starting, time decreases and the state is running. Cursor movement alone causes no interruption or warning. Record any warning during ordinary use as an unexpected result.

### A2. Full-screen pause, frozen timer and new question

1. Use the standard start on a fresh attempt. Note the current question.
2. Switch to the second tab for about two seconds, then return.
3. Note the remaining time shown in the dialog. Stay on the interview page for another ten seconds without resuming.
4. Press Escape. Press Tab several times and try clicking the obscured background.
5. Select **I understand — resume with a new question**.

**Expected:** One interruption; a large dialog covers the viewport and blurs the interview. The paused time remains unchanged while you wait. Escape and background clicks do not resume; keyboard focus stays in the dialog. Explicit resume returns to running, time starts decreasing, and the question differs from the interrupted one. No new startup grace is granted.

### A3. Second warning, third interruption ends

1. Continue the same attempt immediately after A2; it already has one interruption.
2. Switch away for two seconds and return. Read the final warning before resuming.
3. Resume, then switch away for another two seconds and return.
4. Reload the same address.

**Expected:** The second interruption shows a final warning describing the next penalty. The third ends the session. There is no resume action, and reload keeps the ended state. The message calls for human review rather than claiming cheating or automatic candidate rejection. **New rehearsal** is a demo-only way to start a different attempt.

### A4. One continuous absence escalates

1. Start a fresh attempt. Switch away once for about seven seconds, then return.
2. Record the warning and interruption count. Do not repeat a switch in this attempt.
3. Start another fresh attempt. Switch away once for about seventeen seconds, then return.

**Expected:** The seven-second case reaches final warning, with one counted interruption. The seventeen-second case ends, also from one continuous absence. Time should stop charging after the pause threshold, rather than losing the whole absence. Do not require the hidden dialog to be visible in the other tab: the app can only cover its own page. Record whether the warning was actually seen/heard before the end; entering a warning state does not establish delivery to the candidate.

### A5. Switching again while already paused

1. Start a fresh attempt, leave for two seconds and return to the pause dialog.
2. Without selecting resume, leave again for two seconds and return.
3. Still without resuming, repeat once more.

**Expected:** Counts progress from one to two to three. The second occurrence shows final warning and the third ends. Keeping the dialog open does not bypass repeated-absence counting. The interview timer stays frozen throughout.

### A6. Simulated connection loss, reload and recovery

1. Start a fresh attempt. Note the question, then select **Simulate connection loss** while keeping the page visible.
2. Note the paused remaining time and interruption count. Wait ten seconds, then reload the exact same address.
3. Check the recovery message and remaining time. Select resume.
4. After resuming, simulate another connection loss and select **Download saved record**. Keep the exported file as evidence for this attempt.

**Expected:** Recovery is offered and time does not decrease during downtime or reload. A simulated technical failure does not add a page-away violation. Resume changes the interrupted question and restarts the timer. The download contains the session state and recovery history. This rehearsal does not test real network failure, voice reconnection or hosted saving.

### A7. Closing and reopening the tab

1. Start a fresh attempt. Save its full address and note the question and remaining time.
2. Close only this rehearsal tab. Wait about twenty seconds.
3. Reopen the saved address in the same browser profile. Note the recovered time before choosing resume.

**Expected:** The attempt opens in recovery, retains approximately the last saved remaining time, and does not charge the closed period. Resume changes the question. Record any difference from the last visible time. This tests ordinary closure; it does not prove recovery from a forced browser/process crash. Keep actual crash testing as a separate developer-assisted check in a disposable browser profile.

### A8. Optional sound

1. Start a fresh attempt. Confirm **Mute alert sound** is already available: sound starts enabled and is activated by your acknowledgment/start click. To preview it, mute then select **Enable & test alert sound**.
2. Trigger a two-second absence and return. Note whether the pause tone played.
3. Resume and trigger the second interruption. Note whether the final-warning tone played.
4. Select **Mute alert sound**, then trigger the third interruption.

**Expected:** Sound starts enabled. Re-enabling plays a short preview. Pauses repeat a single tone every 2.5 seconds; final warning repeats faster three-pulse tones every 1.2 seconds with higher pitch and bounded gain. Resume stops repeating tones; mute suppresses scheduled and future tones. The full-screen message remains usable without sound. If the browser blocks sound, record that limitation and any visible fallback; do not mark audio passed because the dialog appeared. Repeat once while staying in another window to observe actual audibility there.

### A9. Indonesian and a narrow screen

1. Choose **New rehearsal**, select **Bahasa Indonesia** before starting, and repeat A2 and A3.
2. Check that the notice, pause, final warning, end message and resume action are understandable. Check the replacement question after resume.
3. Repeat the pause with a narrow browser window, or on a separately configured mobile device. Check that all dialog actions remain reachable by scrolling and keyboard where available.

**Expected:** Core notices and alerts communicate the same policy in Indonesian; the replacement question is Indonesian. No controls are clipped or hidden beyond reach. The rehearsal's initial authored question and some surrounding diagnostic labels remain English; record this as a known limitation, not proof of a fully localized interview. Narrow desktop layout is not a substitute for actual mobile background testing. Record the device used.

### A10. Normal completion

1. Start a fresh attempt and keep the page visible.
2. Select **Finish rehearsal**, then reload the same address.

**Expected:** The state is completed, rather than automatically ended, and does not return to an active interview on reload. No penalty warning appears. The rehearsal does not generate an AI evaluation or write to Firebase.

### A11. Another window beside the visible interview

1. Start a fresh attempt and wait for monitoring readiness. Arrange another harmless browser/app window beside the interview so both remain visible.
2. Click into the other window, type fictional text there, wait two seconds, and return to the interview.
3. Expect one pause, then resume. Repeat to test the second-interruption warning and third-interruption end.
4. On a separate attempt, focus the other window, hide the interview, then restore it and return focus, all within five seconds.

**Expected:** Sustained visible focus loss triggers the same sequence as hiding the page. The combined focus/visibility absence counts once. Cursor motion without moving focus is ignored. Note any harmless action, browser permission prompt or permitted tool that also triggers the rule; focus loss alone cannot prove AI use. Merely looking at another visible window while the interview stays focused may not be detectable.

## Part B — live interview and saved report

These checks need a fictional candidate/session, working microphone permissions, valid OpenAI access in the app's existing key setup, and an isolated configured Firebase project for report saving. Follow [local setup](../../product/local-development.md#prerequisites-and-environment). A server key alone is not established as sufficient for fresh candidate entry. The three-provider evaluation benchmark is a separate workflow and does not verify the live voice connection.

Keep keys out of screenshots and result files. If starting the voice session fails, record **Blocked — provider/setup** and the sanitized visible error. Do not mark downstream voice or saving checks passed from rehearsal behavior.

For the reported `auth/unauthorized-domain` issue, use [localhost login](http://localhost:3000/login). A read-only configuration check confirmed that this app's Firebase project authorizes `localhost` but not `127.0.0.1`. Alternatively add `127.0.0.1` (no protocol/port) in that project's Authentication → Settings → Authorized domains. Use one hostname consistently for Part B: the two hosts have separate browser storage, so settings and checkpoints do not automatically transfer. Successful sign-in still needs a human check.

### B1. Pause actually stops the live session

1. Open a new fictional session through the normal candidate flow, acknowledge the notice and start. Confirm that you can hear the interviewer and it receives an answer.
2. Complete one short fictional answer. Wait until the interviewer asks its next question and startup grace has ended.
3. Switch away for two seconds, return, and stay paused. Note the time. Say a distinctive fictional sentence while paused, such as “This sentence is spoken only during the pause.”
4. Check for continuing interviewer audio, new transcript text, enabled answer submission and microphone/camera capture indicators. Record whether camera capture was enabled before pausing; otherwise mark that subcheck Not applicable.
5. Resume and listen to the question. Check whether the pause-only sentence appears in the resumed transcript.

**Expected:** Timer and answer input stop; capture and AI transport stop rather than continuing behind the dialog. The pause-only sentence does not become an answer. Resuming reconnects and asks the replacement question without restarting the introduction or repeating the retired question. Earlier completed answers remain. Record connection delay and the actual spoken question; model adherence is a manual check.

### B2. Real network interruption and retry

1. In a separate fictional session, complete an answer and wait for the next question.
2. With the interview page visible, disconnect the test device's network for about twenty seconds. Record if changing network settings also hid the page, since that would mix two signals.
3. Check for recovery and a frozen timer. Attempt resume while still offline and record the response.
4. Restore the connection and explicitly resume. If connection fails again, keep the same attempt and retry once access works.

**Expected:** Technical downtime is recoverable, does not itself count as another page violation, and does not consume answer time. Offline/failed reconnection leaves the session paused. Successful reconnection changes the interrupted question; retries do not discard additional earlier answers or consume another replacement for the same pending resume. Record lost or repeated transcript content as a failure.

### B3. Live tab closure and recovery

1. Use a separate fictional session. Complete an answer, wait for a new question, and save the exact candidate/session address and remaining time.
2. Close only that tab, wait twenty seconds, then reopen it in the same browser profile.
3. Resume and compare the remaining time, earlier answer, and replacement question with your notes.

**Expected:** The same session is recoverable; completed answers and the last available clock checkpoint survive. Closed time is not deducted, and the interrupted question is replaced. If session identity cannot be restored, record the entry/recovery failure instead of starting a new session and calling it a pass.

### B4. Automatic end and recruiter evidence

1. Use a new fictional live session and retain at least one completed answer. Cause three separate two-second absences, resuming after the first two.
2. Confirm that the session ends on the third interruption. Download the saved record and reload to verify there is no resume action.
3. Open that exact session from the recruiter interview list. Compare status, earlier answers, interruption count, recovery history and retired questions with the downloaded record.

**Expected:** Capture/transport stop, and the candidate cannot resume through the normal UI. The report preserves evidence and separates retired exchanges from active answers. The automatic-end path does not produce an automatic score deduction/rejection or launch the page's automatic evaluation. A missing report or saving warning is a persistence failure, even if the local download works. An engineer can confirm that no evaluation request was made; do not infer this solely from an absent score.

### B5. Evaluation after a recovered, normally completed session

1. In another fictional live session, complete an answer, interrupt the next question, and resume with its replacement.
2. Answer the replacement and finish the interview through its normal completion flow.
3. Inspect the saved active transcript, retired exchanges, and any generated evaluation with the recruiter view and downloaded evidence where available.

**Expected:** Earlier completed answers and the replacement answer remain available for evaluation. The retired exchange is retained separately for review and is excluded from evaluation input. Ask an engineer to inspect the request if the UI cannot establish what was sent. An unavailable evaluation is Blocked, not a quality pass. This check establishes input handling only; use the [English-first pilot](english-first-pilot.md) for model-quality comparisons.

## Record your results

Copy this section into a dated Markdown record under `evaluation/results/` after you actually run the tests, and link it from the [Phase 4 report](../phases/04-evaluation-and-iteration.md). Keep English and Indonesian rows separate. Do not replace earlier failures when rerunning; add another run/date.

- Run date/time and timezone:
- Tester and relevant background (self-test is acceptable):
- Build/commit:
- Browser/version, device and operating system:
- Language and viewport/device:
- Rehearsal attempt address or fictional live session identifier:
- Provider/model shown, if testing live; otherwise Not applicable:
- Screen recording, screenshots and saved-record filenames:

| Test | Language | Result: Not run / Pass / Fail / Blocked | Actual observation, time/counts, evidence and issue |
|---|---|---|---|
| A1 — Notice and ordinary use | English | Not run | |
| A2 — Full-screen pause/resume | English | Not run | |
| A3 — Repeated interruption/end | English | Not run | |
| A4 — Continuous absence | English | Not run | |
| A5 — Switching while paused | English | Not run | |
| A6 — Simulated loss/reload | English | Not run | |
| A7 — Tab reopen | English | Not run | |
| A8 — Sound | English | Not run | |
| A9 — Language/layout | Indonesian | Not run | |
| A10 — Normal completion | English | Not run | |
| A11 — Visible-window focus and overlap | English | Not run | |
| B1 — Live pause/media/replacement | English | Not run | |
| B2 — Real network/retry | English | Not run | |
| B3 — Live tab reopen | English | Not run | |
| B4 — End and saved report | English | Not run | |
| B5 — Evaluation input after recovery | English | Not run | |

Mark Pass only when all applicable expected checks were observed. Explain any Not applicable subcheck. For failures, include the last action before the issue, expected versus actual behavior, whether it repeats, and the same-attempt evidence. If one check fails, preserve evidence before creating another attempt; continue independent checks where possible.

## What can be concluded

Part A passing supports a manual demonstration of the rehearsal on the tested browser. Part B passing adds evidence for that live provider/configuration and saved-session flow. Neither proves cheating detection, protection against altered browser storage, equivalent question difficulty, or reliability across devices. Actual forced crashes, browser suspension, server enforcement and recruiter calibration remain separate handoff work.

Before calling the live recovery flow validated, resolve failures involving a running timer while paused, continuing media capture, lost earlier answers, repeated retired questions, terminal-state bypass through the normal UI, or missing hosted evidence. Carry blocked checks explicitly into the handoff. Completing this checklist does not by itself complete Phase 4's separate model-quality and human-review work.
