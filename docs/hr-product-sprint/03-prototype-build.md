# Phase 3: prototype build

Status: **Planned — sprint implementation has not started.**

Created / last updated: 2026-09-07. Planned allocation: 8 hours. [Previous phase](02-solution-design-and-ai-logic.md) · [Sprint index](README.md) · [Next phase](04-evaluation-and-iteration.md)

## Objective

Build the Phase 2 behavior as a runnable synthetic transcript-to-review-brief workflow. Reuse InterviewMate's existing components and make the demonstrated boundary explicit.

## Inherited implementation and known verification limits

The repository already contains interview setup, candidate entry, voice/text plumbing, transcript handling, AI evaluation, reports, and export. Source presence does not prove the full deployed flow works.

The pre-sprint review observed:

- Four isolated scoring utility tests passed. The default test command also scanned a nested historical worktree, duplicating tests.
- TypeScript checking failed on test assertion types; lint failed and scanned that nested worktree too.
- Default local development hit a Tailwind resolution error after a workspace-root warning. An alternate webpack server started, but a browser walkthrough was not completed.
- The model supplies total score and pass/fail; deterministic helpers are not integrated into that route.
- Reports lack traceable citation IDs and a reviewer correction workflow.
- Local Firebase rules permit broad authenticated record access and public resume reads; deployed rules were not inspected.
- Fresh-browser candidate key setup and device/timer sequencing need verification if the interview is included.

These are inherited findings, not fixes made during this phase. Do not change deployed permissions or use real candidate records as part of the synthetic demo.

## Proposed build order

1. Establish a reliable local run path and resolve blockers in the chosen demo flow.
2. Add a clearly labeled synthetic example/transcript input using the Phase 2 contract.
3. Implement structured draft generation, citation checks, and explicit missing-evidence behavior.
4. Adapt the report UI to show source turns and permit review/correction.
5. Export a brief that distinguishes model draft from reviewer edits and includes provenance.
6. Verify the core workflow from a fresh session and document actual setup steps.

Reuse candidates: [evaluation route](../../src/app/api/evaluate/route.ts), [report page](../../src/app/(recruiter)/interviews/[sessionId]/page.tsx), [scoring helper](../../src/lib/utils/scoring.ts), and [demo room](../../src/components/dashboard/DemoRoomModal.tsx).

If stabilizing voice consumes the planned two-hour stabilization allocation without a dependable path, focus the core demo on a supplied synthetic transcript. Keep voice as an optional demonstration only after it passes a fresh-session check. This is a scope decision, not permission to present prerecorded output as live AI.

## Verification to perform

| Check | Evidence required | Current result |
|---|---|---|
| Local startup / relevant type and lint checks | Exact commands and outcomes | Not run in this phase |
| Synthetic input to generated draft | Run record with input, prompt/model version, raw output | Not run |
| Citation and missing-input handling | Relevant behavioral cases, including invalid citations | Not run |
| Source review and correction | UI walkthrough and saved/exported corrected brief | Not run |
| Failure and retry | Invalid input/API failure with recoverable UI | Not run |
| Optional candidate interview | Fresh-browser entry through transcript/report, including prerequisites | Not run |

Write tests for behavior that matters: invalid citations, sparse input, failure recovery, deterministic calculations if used, and preserving reviewer corrections. Documentation-only changes do not need app tests. Keep AI-quality evaluation in Phase 4 distinct from software correctness.

## Exit criteria and progress

- [ ] Core feature runs with clearly labeled synthetic data.
- [ ] Genuine AI generation has been demonstrated, or the deliverable is explicitly an interactive prototype with an AI behavior spec.
- [ ] Reviewer can trace claims, identify unknowns, and correct the brief.
- [ ] Errors do not produce fabricated success states.
- [ ] Fresh setup instructions and configuration requirements are verified.
- [ ] Relevant checks pass, or material failures and demo restrictions are documented.
- [ ] Actual changed files and inherited functionality are recorded below.

## Implementation record

No sprint product-code changes yet. Add an entry per completed change with file links, behavior, reason, verification and remaining limits.

## Progress log

| Date | Work completed | Evidence / consequence |
|---|---|---|
| 2026-09-07 | Created build tracker and carried forward inherited risks | No new prototype behavior or repaired checks claimed |
