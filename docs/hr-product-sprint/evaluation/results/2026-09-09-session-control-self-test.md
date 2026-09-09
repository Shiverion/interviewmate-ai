# Session-control self-test — 2026-09-09

[Validation protocol](../session-control-validation.md) · [Phase 4](../../phases/04-evaluation-and-iteration.md)

Evidence: the project owner's results reported in this task on 2026-09-09. This is a **user-reported manual self-test**, not independently observed or a model-quality study. Target: previous implementation `170688d`; the exact running build was not independently captured. The supplied browser context showed the local rehearsal at `127.0.0.1:3000` with attempt `session-control-170688d`.

Browser/version, operating system, precise durations, screenshots, audio recording and checkpoint exports: **Not collected**. English was the protocol default; the user did not separately specify the language of each run. A9 covered the protocol's Indonesian/layout check, with no device/viewport details supplied.

## Reported outcomes

| Check | User-reported result | Observation / qualification |
|---|---|---|
| A1 — Notice and ordinary use | Pass | No additional observation supplied |
| A2 — Full-screen pause/resume | Pass | No additional observation supplied |
| A3 — Repeated interruption/end | Pass | No additional observation supplied |
| A4 — Continuous absence | Pass | No additional observation supplied |
| A5 — Switching while paused | Pass with caveat | Warning was not seen while the user remained in another window; requested stronger escalating sound |
| A6 — Simulated loss/reload | Pass | No additional observation supplied |
| A7 — Tab reopen | Pass | Does not establish forced-process-crash recovery |
| A8 — Sound | Pass with change request | User prefers sound enabled by default |
| A9 — Language/layout | Pass | Device, viewport and detailed language observations not supplied |
| A10 — Normal completion | Pass | No additional observation supplied |
| B1–B5 — Live interview / saving / evaluation input | Blocked | Sign-in failed with `auth/unauthorized-domain`; downstream checks not executed |

Additional finding: switching tabs/windows was detected, but using another app in a separate window while the interview remained visible did not trigger the sequence. The previous implementation intentionally treated visible focus loss as context only; this is a gap against the owner's intended behavior.

Do not summarize these results as ten unqualified passes or a cheating-detection accuracy score. The reported warning-delivery and focus gaps remain material.

## Iteration prompted by this feedback

- Add sustained visible focus loss to the same one-second pause / six-second warning / fifteen-second end sequence, with second/third-interruption count thresholds preserved. Overlapping focus and visibility events represent one absence.
- Start sound enabled and arm it from a candidate click/key gesture. Repeat bounded tones during a pause; use faster triple pulses and higher pitch/gain for final warning. Retain mute and visible fallback. Device volume is unchanged.
- Keep the old evidence above unchanged. New sound/focus behavior requires a fresh manual retest, especially in the embedded browser and with two visible windows. These changes do not establish warning delivery while the browser is suspended or muted.

## Sign-in diagnosis

A read-only lookup of the configured Firebase project's public Authentication configuration returned HTTP 200: project `interviewmate-9bdd4` lists `localhost` among authorized domains, but does **not** list `127.0.0.1`. Its configured auth domain is `interviewmate-9bdd4.firebaseapp.com`. The local [login on localhost](http://localhost:3000/login) returned HTTP 200; successful account sign-in has not been observed.

Use `localhost` consistently for the new live test. Alternatively, the project owner can add the bare hostname `127.0.0.1` in Firebase Authentication → Settings → Authorized domains for this project. This is a hosted Authentication setting; local Firestore/Storage rules do not fix this error. No hosted setting or credentials were changed.

The two hostnames use separate browser storage. Existing rehearsal records and app settings on `127.0.0.1` do not automatically transfer to `localhost`. Download any evidence you need before switching; create a new fictional live session on the chosen origin rather than using this switch as a recovery test.

The updated login error explains the hostname and project to check. Resume B1 only after sign-in succeeds. Reference: [Firebase OAuth redirect domains](https://support.google.com/firebase/answer/6400741?hl=en), inspected 2026-09-09.

## Next manual checks

1. On a fresh rehearsal, verify sound is already enabled after acknowledging/starting; test mute and re-enable.
2. After startup grace, keep the interview visible and click into another window for two seconds. Return: expect one pause. Repeat to verify final warning and ending. Record whether any harmless browser interaction also triggers it.
3. In another attempt, remain in the other window through final warning; record whether the faster repeated tones are actually audible. Repeat with sound muted to verify suppression. A hidden visual warning is not a delivery guarantee.
4. Test overlap: focus the other window, then hide the interview, and return. It should count as one continuous absence, not two.
5. Sign in on `localhost`, then continue Part B. Record any new error separately from the resolved hostname diagnosis.

Status of these follow-up manual checks: **Not run**.
