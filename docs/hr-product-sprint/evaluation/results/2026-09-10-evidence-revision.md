# Evidence revision validation — 2026-09-10

[Progress](../../../README.md) · [Requirement matrix](../../implementation/revision-tracker.md) · [Setup and acceptance](../../implementation/current-runbook.md)

Scope: software validation of the September 10 revision. All candidate/reviewer test records are synthetic. No paid model was called by the automated tests.

| Check | Recorded outcome |
|---|---|
| Full automated suite | Final run: 138 tests passed across 18 suites. Includes transport-event buffer/budget checks and late-transcription handling. |
| Type checking | Passed. |
| Production build | Passed; 21 static pages plus dynamic API/candidate/report routes compiled. |
| Selected browser flows | 12 passed: 8 integrity/recovery, 2 limited voice-demo setup, 2 evidence/reviewer record flows. |
| Supplemental sandbox browser flows | 12 passed: 7 Review Brief and 5 benchmark workspace checks. Total selected browser coverage: 24 passing. Provider responses mocked. |
| Source lint | All changed/new TypeScript and TSX files passed. |
| Documentation | 504 local links checked; all targets/anchors resolved and all 50 checked Markdown documents reachable from the root README. |
| New server-backed browser path | Private local invitation redeemed; synthetic session created; deterministic empty assessment persisted; judgment values survived typing/reload; completed human review became read-only after reload. |
| Provider network calls | Mocked for automated model/transport checks; empty assessment uses a deterministic path with no provider request. |
| PDF | Seven pages generated and visually checked for readable layout, clipping and source notes. |
| Live voice/model comparison | Pending; last recorded key check was OpenAI 401, other host provider keys absent. |
| Human pilot / final video | Not completed. Script and recording requirements prepared. |

Regressions caught: a server-error string in a falsely successful CV parse; legacy percentage rendering incompatible with null overall score; synthetic scheduling selecting the ordinary Firebase pipeline when already signed in; separate retired realtime behavior; stale review form selections. The new changes address these paths. Test counts do not imply model accuracy, fairness, recruiter time savings or production readiness.

The first supplemental browser run failed three outdated expectations: editing a submitted record, clearing checks after notes, and visiting the old 127.0.0.1 origin without the localhost reviewer cookie. Tests were updated to assert the newly requested behavior and the authenticated origin; the rerun passed all 12. No force-click or disabled check bypass was used. The earlier CV regression was fixed in implementation rather than weakening its test.
