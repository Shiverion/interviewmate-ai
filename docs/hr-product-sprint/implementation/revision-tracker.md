# September 10–11 requirement matrix

[Accepted specification](../../../Product_Sprint.md) · [Authoritative progress](../../README.md) · [Runbook](current-runbook.md) · [Production release record](../evaluation/results/2026-09-11-production-release.md). “Implemented” describes the shipped behavior; production smoke and owner acceptance are recorded separately from independent model-quality evidence.

| # | Requirement | Implementation / evidence | Remaining validation |
|---|---|---|---|
| 1 | Recovery/navigation | Explicit retry/setup/exit, checkpointed context and replacement questions; browser recovery checks pass and the owner accepted the production flow. | Broader device/browser coverage remains future work. |
| 2 | Independent model study | Baseline commit/file hashes frozen; model-only and rubric-v2 experiments separated; override variables and exported run provenance retained. | Run comparable models with working credentials; latency/cost telemetry and selection. |
| 3 | Access modes | BYOK, capped Demo, signed invitations; expiry/revocation/rate/budget tests pass; Firestore-backed hosted ledger and production HTTPS path are live. | Server-authoritative identity, retention and abuse controls are future hardening. |
| 4 | Provider diagnostics | Cached real-request health, primary/active provider/model and visible fallback; no inference probes. | Observe successful/failed real calls and fallback. |
| 5 | Turn handling | Filler classifier, 2.5-second buffer, 7/17-second silence prompts, explicit mic failure and skip states. | Human microphone timing and naturalness tests. |
| 6 | Adaptive follow-ups | Configurable strategy and bounded question count; relevance/non-repetition in instructions. | Live topicality and budget adherence; no validated autonomous planning claim. |
| 7 | Evidence rubric | 0–4 evidence, assessed-only quality, coverage, relevance, consistency/confidence; deterministic no-answer; unsupported quotes rejected. | Calibrate levels with independent humans. |
| 8 | Shared realtime | All room types call one GA service; legacy token creation retired; hosted OpenAI voice path smoke-tested. | Independent voice-quality study across providers remains deferred. |
| 9 | Shared setup/snapshots | One schema/form; duration/turns/language/questions/rubric/context/panels; configuration and role snapshots. | Real Firebase candidate admission and saved report. |
| 10 | Prestige neutrality | Evidence-only prompt and excluded irrelevant metadata; deterministic counterfactual test. | Transcript-embedded prestige variants through live models and human review. |
| 11 | Relevant GitHub | Rank metadata before bounded README retrieval; stars ignored, penalties tested; optional failures non-blocking. | Judge selection quality on representative profiles. |
| 12 | CV validation | Structured parsing, preview/confirmation and no-CV continuation; error-string regression fixed. | Representative text/scanned/encrypted PDFs in live setup. |
| 13 | Contextual review | No primary Review Brief navigation; invitation-gated synthetic sandbox; separate reviewer records/stat filtering; owner accepted reviewer walkthrough. | Broader external reviewer sample remains future research. |
| 14 | Persistent judgments | ID/notes retain selections; reload restores v2 draft/completed records; browser test exercises private server storage and read-only completion. | Independent ground-truth collection. |
| 15 | Submission | Runnable production app, seven-page PDF, editable content, release record and five-minute video script. | Record and attach the five-minute video. |
| 16 | Documentation | Root overview, full sprint spec, living progress; earlier conflicting design archived; obsolete root PRD/report notices removed. | Keep final results and PDF synchronized. |
| 17 | Automated CV pipeline and scheduling | `/pipeline` parses and scores a multi-CV batch, supports Top 5/10/20 preselection and recruiter checkboxes, creates scheduled links with ATS/config snapshots, and `/candidates` shows persisted screened/invited rows with expandable details. | Deploy/check `pipeline_candidates` rules, run the 10-CV fixture, verify email extraction, selected-link creation, candidate-only admission, schedule expiry and recruiter dashboard isolation. |

The prototype release is complete for the five-day build. Keep the independent model study and recruiter calibration as explicit future work; the remaining submission action is the five-minute video. Source hashes establish provenance, not truth; browser integrity signals and client records are not a tamper-proof hiring audit.
