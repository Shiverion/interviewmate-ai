# Lightweight session-integrity guardrails

[Phase 3 progress](../phases/03-prototype-build.md) · [Phase 4](../phases/04-evaluation-and-iteration.md) · [Data governance](../evaluation/data-governance.md)

Updated: 2026-09-08. **Implemented; rule/browser tests verify the feature. Live Firebase persistence and real-candidate false-positive rates are not established.**

## Product behavior

The candidate interview room now presents a notice before Start Interview is enabled. During active interviews, deterministic browser signals produce an advisory record. This is a deterrent and a review aid, not proof of cheating or a way to block access to AI.

| Signal / threshold | Behavior |
|---|---|
| First 10 seconds after monitoring begins/resumes | Grace period for setup and permissions |
| Page hidden less than 3 seconds | Ignored |
| Page hidden at least 3 seconds after grace | One counted event per continuous away episode |
| Repeated blur/visibility/focus notifications | Combined into the same episode |
| Focus lost while page remains visible, at least 10 seconds | Context event only; does not increase warning count |
| Cursor leaves the page | Not collected or counted |
| 1–2 counted events | Neutral reminder and optional candidate context |
| 3–4 counted events | Nonblocking warning |
| 5 or more counted events | Human review suggested; interview remains active |
| Any number of events | No automatic termination, candidate score deduction, or hiring decision |

Three and five are provisional product thresholds, not validated cheating thresholds. Durations use event timestamps rather than background timer ticks, since browsers throttle background timers. A long uninterrupted absence is one event, with its duration retained.

Window blur can reflect permission dialogs, browser controls, accessibility tools, or other interruptions. Hidden-page events can also reflect minimization or a locked screen. A page cannot reliably identify other apps, URLs, search activity, AI tools, a second device, or intent. The browser API limitations are described by [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) and [Window blur](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event), checked 2026-09-08.

## Candidate experience

The English and Indonesian notices describe what is recorded, the thresholds, possible recruiter review, and the absence of automatic penalties. Candidates should arrange permitted resources and accommodations with the recruiter before starting. Acknowledgment confirms the notice was read; it is not a claim that all privacy/legal requirements are satisfied.

A compact in-session panel displays counts, warnings and **Review events and add context**. Candidates may select technical issue/device permission, accessibility need, interruption, permitted resource, or other. No free-text explanation, cursor coordinates, clipboard content, keystrokes, extra camera recording, eye tracking, or browser history is collected. Detailed circumstances can be discussed directly with the recruiter.

Explanations are available while monitoring is active. At completion the report is read-only and can be exported as JSON. This guardrail never calls interview termination or passes its data into AI evaluation prompts. Existing interview duration/completion behavior remains independent.

## Recruiter experience and persistence

The existing candidate report includes **Session integrity · human review**, with counts, the event timeline and candidate context. Its transcript/report text export also includes the advisory summary. A missing or invalid record is shown as unavailable, not as proof of compliance.

Client-side sessionStorage retains the record for the interview ID across reloads in the same browser tab. An active record restored after reload reports a coverage gap; reconnecting after a stopped monitoring interval retains counts and reports the gap. Storage denial is visible and the interview continues with memory-only tracking. Normal tab closure can remove sessionStorage; it is not durable server evidence.

At completed status, scheduled sessions attempt a separate Firestore update to `interview_sessions/<sessionId>.session_integrity`. It contains no score or transcript update. Failures remain visible to the candidate, with JSON export available. Demo/standalone rehearsals do not write to Firebase. Network loss, abrupt closure or departure before completion may prevent server saving. Candidate context is stored with the events and remains labelled candidate-provided.

The current working Firebase rules allow broad authenticated access to interview sessions. Those pre-existing, uncommitted configuration/rule files were not changed or deployed. Owner/candidate authorization and server-side append-only recording require hardening and verification before real deployment. Client events can be modified, disabled, cleared, or spoofed; sessionStorage and acknowledgment are not anti-tamper boundaries.

Keep these records under interview access/retention controls because they are associated with a session and candidate. There is no background analytics upload, model training, extra API key, or ML dependency. The latest 200 events are retained; older omissions are counted and aggregate totals preserved. Browser-tampered input is schema-checked before report rendering, but schema validation does not authenticate evidence.

## Try it without an AI key

1. Run `npm run dev -- --hostname 127.0.0.1`.
2. Open [the local rehearsal](http://127.0.0.1:3000/review-brief/integrity-demo).
3. Read/acknowledge the notice and select **Start local rehearsal**.
4. Allow ten seconds for startup grace. Switch to another tab for at least three seconds, then return.
5. Repeat until three events: expect a warning. At five: expect a human-review suggestion and an active session.
6. Add a context category, finish the rehearsal, and export the record.
7. Separately try a quick switch, moving the cursor out of the page, and a visible-window focus loss. Cursor movement should do nothing; focus-only context should not increase the counted events.

The rehearsal uses the same hook, policy, storage and panels as the interview room. Its route returns 404 in production. The actual interview room's guardrail remains enabled when that room runs; its existing AI/Firebase requirements still apply. Rehearsal counts persist in the tab so reload is not presented as a way to reset them.

Human follow-up: try real tab switching in the browsers candidates will use, permission dialogs, assistive tools and permitted resources. Record false-positive examples before choosing production thresholds. Recruiters should discuss flagged events and accommodations with the candidate; no second reviewer is required to begin the local rehearsal.

## Engineering map

- [Deterministic policy and schemas](../../../src/lib/integrity/policy.ts): the single threshold source, episode accounting, bounded report and text formatter.
- [Browser record store](../../../src/lib/integrity/store.ts): persistence, acknowledgment, candidate context and visible storage/sync status.
- [Session hook](../../../src/lib/integrity/useSessionIntegrity.ts): active-only listeners, cleanup and completion saving.
- [Candidate and recruiter panels](../../../src/components/interview/SessionIntegrity.tsx).
- [Interview room integration](../../../src/app/(public)/interview/page.tsx) and [recruiter report integration](../../../src/app/(recruiter)/interviews/[sessionId]/page.tsx).
- [Rehearsal page](../../../src/app/review-brief/integrity-demo/page.tsx).

Change thresholds in POLICY with a new policy version, corresponding notice text, boundary tests, and a documented rationale. Preserve historical reports and do not compare counts from different policies as equivalent.

## Verification

[Recorded results](verification/2026-09-08-session-integrity-checks.json): all 84 Jest checks passed (19 guardrail checks), four guardrail browser checks passed, and production build/scoped lint passed. The rehearsal returned 200 in development and 404 in production.

```powershell
npx jest --runInBand
npx tsc --noEmit
npx tsc --project cypress/tsconfig.json --noEmit
npx cypress run --config baseUrl=http://127.0.0.1:3000 --spec cypress/e2e/integrity.cy.ts --browser electron
npm run build
node docs/scripts/check-docs.cjs
```

Unit tests exercise timing boundaries, startup grace, duplicate signals, focus-only context, long absences, nontermination, history bounds, reload recovery, storage denial, session isolation and mocked completion saving. Browser tests simulate visibility events, validate the actual interview start gate and check the Indonesian/mobile UI. They are software checks, not a live cheating-detection accuracy study. Firebase writes are mocked in tests; no production rules were deployed.
