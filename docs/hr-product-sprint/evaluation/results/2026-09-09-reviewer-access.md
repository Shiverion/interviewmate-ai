# Reviewer access validation — 2026-09-09

[Setup and architecture](../../implementation/reviewer-demo-and-access.md) · [Phase 4](../../phases/04-evaluation-and-iteration.md)

Scope: keyless navigation, redesigned UI, provider selection and limited hosted voice. This is software validation, not a recruiting-quality study.

| Check | Result |
|---|---|
| Unit tests | 122 passed across 16 suites; includes quota, signed ownership, origin checks, SDP exchange, opening-message trigger and three-provider evaluation routing |
| Browser tests | 10 passed: 8 integrity tests and 2 reviewer-demo tests; microphone/provider exchange mocked in the demo flow |
| Source lint | All changed TypeScript/TSX source files passed |
| Type checking | Production build checks the final source and test types |
| Visual inspection | Landing, reviewer demo and sign-in inspected in the local in-app browser; mobile demo width checked at 390px in the browser suite |
| Documentation navigation | 121 local links across 6 changed Markdown documents resolved before this result file was added |
| OpenAI credential | Read-only model listing returned HTTP 401; no interview data sent |
| Other hosted providers | Gemini and DeepSeek environment keys absent |
| Real voice, transcription and evaluation | Blocked by credentials; no successful run claimed |
| Signed-in scheduling and saved report | Human Part B check still pending |
| Published HTTPS demo | Not deployed or verified |

The build emits inherited PDF rendering warnings about optional `canvas`/DOMMatrix/Path2D support. The free reviewer demo does not upload or parse a CV. PDF parsing remains a separate scheduled-flow acceptance check.

The new startup regression test caught and guards against applying beta session settings to a GA hosted call. On readiness, hosted voice now requests its opening response using the server-provided configuration.

Replace the invalid host credential, then follow the runbook’s English baseline and Indonesian extension checks. Record exact model IDs, sanitized failures, transcript corrections and human disagreement. Do not use these software test counts as AI accuracy or fairness metrics.
