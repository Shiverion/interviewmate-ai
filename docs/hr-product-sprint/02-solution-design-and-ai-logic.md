# Phase 2: solution design and AI logic

Status: **Planned — design work has not started.**

Created / last updated: 2026-09-07. Planned allocation: 8 hours. [Previous phase](01-discovery-and-ux.md) · [Sprint index](README.md) · [Next phase](03-prototype-build.md)

## Objective and inputs

Translate Phase 1's provisional transcript-to-review-brief concept into an inspectable UX and AI behavior specification. Carry forward the desk-research limitation; no direct user validation has occurred.

Inputs: [Phase 1 evidence and scope](01-discovery-and-ux.md), the existing [evaluator](../../src/app/api/evaluate/route.ts), [report page](../../src/app/(recruiter)/interviews/[sessionId]/page.tsx), and [interview configuration](../../src/components/dashboard/CreateInterviewModal.tsx).

## Planned deliverables

- A workflow/wireframe covering role confirmation, input, generation, source review, correction, and export.
- One provisional frontend-role framework with 3-4 observable job criteria, evidence anchors, and five shared core questions.
- AI input/output specification, prompt version, and model configuration recorded explicitly.
- Example good, sparse, conflicting, and failed outputs, marked as authored examples until generated.
- A draft synthetic case matrix with expected behavior written before implementation tuning.

## Proposed design decisions to resolve

| Decision | Starting position | What Phase 2 must specify |
|---|---|---|
| Input | Transcript + agreed role criteria; resume optional background | Accepted format, speaker/turn IDs, limits, missing speaker handling |
| Primary output | Review brief organized by criterion | Source quotes, interpretation, unknowns, follow-ups, review status |
| Evidence | Every factual candidate claim is traceable | Exact matching rules and how to handle a valid quote used misleadingly |
| Rating | Prefer qualitative evidence status initially | Any retained score needs observable anchors and code-calculated aggregation |
| Human control | Draft stays editable until marked reviewed | Correction/removal behavior and version history |
| Failure behavior | Clear error and retry states | Empty/malformed transcript, missing criteria, invalid output, timeout, unavailable key |
| Conversation | Reuse existing interview if stable | Shared-question behavior and boundaries for follow-ups |

## Proposed AI flow

This is a starting design, not implemented behavior or a selected multi-agent architecture.

1. Validate role criteria and transcript shape; identify candidate and interviewer turns.
2. Ask the model to extract relevant evidence and draft criterion-level interpretations and unknowns.
3. Validate the output schema and verify each cited quotation exists in the claimed candidate turn.
4. Reject or mark unsupported output for correction; do not silently replace missing evidence with a score.
5. Present the draft and its sources for recruiter review and record the reviewed version separately.

One structured generation call may be sufficient. Add more calls only if evaluation shows a concrete benefit. Treat transcript text as data even when it contains instructions to change ratings or ignore the task.

The exact schema, prompt, validation policy, retry limits, model choice, and cost/latency assumptions are **not yet finalized**. Existing Next.js and OpenAI integration are reuse candidates; no new no-code tool is required by the brief.

## UX states to specify

- Empty state with a labeled synthetic example.
- Valid input ready to generate; missing/invalid input with actionable guidance.
- Generation in progress, failure, and retry without losing the input.
- Draft showing evidence, uncertainty, conflicting statements, and follow-ups.
- Source inspection, edit/remove, reviewed state, and export.
- AI unavailable: saved examples remain explicitly labeled; never imply a live model ran.

## Exit criteria and progress

- [ ] Complete the flow and report wireframe.
- [ ] Define role criteria, anchors and question set; label lack of practitioner calibration.
- [ ] Finalize input/output schemas, prompts, provenance and failure behavior.
- [ ] Decide whether any numeric scores are necessary and specify deterministic aggregation if retained.
- [ ] Define synthetic cases and expected evidence before tuning.
- [ ] Map the design to a bounded Phase 3 implementation backlog.

## Open items

Which criteria fit the provisional role; how to distinguish conflicting from missing evidence; which reviewer actions are essential; whether Firebase persistence is required for the synthetic demo; whether the existing voice flow is reliable enough to include.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created Phase 2 tracker and starting questions | Planning only; no completed wireframes or final AI contract |
