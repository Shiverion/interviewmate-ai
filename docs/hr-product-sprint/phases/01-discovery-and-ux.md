> September 10 revision: see [current progress](../../README.md) and [implementation matrix](../implementation/revision-tracker.md). Earlier entries below are a dated phase history, not a claim that the expanded scope has passed live acceptance.

# Phase 1: discovery and UX workflow

Status: **Complete for desk research; manual timing baseline intentionally unmeasured.**

Updated: 2026-09-08 (Asia/Jakarta). Planned allocation: 8 hours; actual hours not recorded.

[Documentation home](../../README.md) · [Sprint index](../README.md) · [Next phase](02-solution-design-and-ai-logic.md)

## Outcome

Reuse InterviewMate to explore **a recruiter-reviewed first-screen brief** for one fictional frontend-engineer role. The draft should connect claims to candidate turns, expose missing evidence and support correction before handoff. [D01](../../archive/pre-evidence-v2/hr-product-sprint/decisions/001-sprint-scope.md) owns the scope and unresolved design decisions.

The user chose desk research because recruiter/hiring-manager access is unavailable. This is enough to start a small design experiment, but demand, time savings, hiring accuracy and reduced bias remain unvalidated. Human timing is carried into Phase 4.

### Release note — 2026-09-11

The discovery decision remains valid in the production prototype: the target user is a recruiter managing a first-screen queue, and the chosen workflow is role brief → batch CV/ATS screening → recruiter-controlled interview invitations → evidence-based review. No recruiter access became available, so this report does not claim a measured manual baseline. The limitation is documented in the case study rather than treated as a product blocker.

## Deliverables and reading order

| Read | Artifact | Purpose |
|---|---|---|
| 1 | [Problem and workflow](../research/problem-and-workflow.md) | Target user, task, repository observations and hypotheses |
| 2 | [Source register](../research/source-register.md) | Six external sources, alternatives and evidence limits |
| 3 | [D01: sprint scope](../../archive/pre-evidence-v2/hr-product-sprint/decisions/001-sprint-scope.md) | Reuse decision, selected journey, scope and timeboxes |
| 4 | [Discovery example](../research/discovery-example.md) | Short illustration of evidence versus interpretation |
| 5 | [Evaluation materials](../evaluation/README.md) | Practice records, source baseline and future human protocol |

## Verification

The [source audit](../evaluation/current-product-baseline.md) ran successfully; it inventories the inherited schema and report controls, not live AI behavior. Practice-material checks found 14 turns per case (643 words for P1-A, 673 for P1-B) and verified all 28 quoted reference snippets against their cited candidate turns. The references preserve self-report, testing limits and the ownership contradiction. These are internal artifact checks, not recruiter agreement; similar length does not establish equal difficulty.

## Exit criteria

- [x] Establish desk research as the agreed discovery method.
- [x] Define a provisional user, problem, and job to be done.
- [x] Review primary sources with limitations and existing alternatives.
- [x] Map the existing app and hypothesized manual workflow.
- [x] Set a narrow concept and five-day scope.
- [x] Define baseline measures and a comparison protocol.
- [x] Explore one explicitly synthetic example.
- [x] Prepare two realistic practice records, separate source annotations, a blank brief, task instructions and an empty raw timing log.
- [x] Record a reproducible current-product capability inventory, clearly separate from human timing and AI-quality evaluation.
- [x] Resolve the discovery scope and hand the decision into Phase 2 through [D01](../../archive/pre-evidence-v2/hr-product-sprint/decisions/001-sprint-scope.md).
- [ ] Collect an empirical human timing baseline. No participant is assigned; this outstanding evidence is tracked in [Phase 4](04-evaluation-and-iteration.md), not marked complete.

## Open items and next action

- Human timing is **not measured**; the [study guide](../evaluation/manual-study-guide.md) is ready when a human reviewer is available.
- Real workflow fit and provisional role criteria still need practitioner validation.
- The [Phase 2 package](../../archive/pre-evidence-v2/hr-product-sprint/design/README.md) now specifies screens, schemas, prompts, review states and acceptance rules. Product implementation is next in Phase 3.

## Progress log

| Date | Progress | Evidence / next action |
|---|---|---|
| 2026-09-07 | Reviewed the existing product and historical planning context | Reuse the interview/report foundation; keep this sprint distinct from legacy phases |
| 2026-09-07 | User selected desk research | No direct user findings are claimed |
| 2026-09-07 | Documented six external sources, alternatives, workflow and hypotheses | Category is established; target-user severity remains unknown |
| 2026-09-07 | Prepared synthetic illustration, measurement protocol and scope | Next: realistic cases, human baseline when available, then detailed design |
| 2026-09-07 | Committed sprint documents on `codex/hr-product-sprint` as `0e9eba2` | Six phase/index documents saved; inherited Firebase changes excluded |
| 2026-09-07 | Prepared full Phase 1 practice and measurement materials and checked source annotations | Two synthetic practice records; no participant session or prototype evaluation run |
| 2026-09-07 | Executed source inventory and finalized D01 discovery scope | Discovery package ready for Phase 2; human timing explicitly pending |
| 2026-09-07 | Organized research, decisions and evaluation materials into dedicated folders | Progress report now links to canonical artifacts; research conclusions unchanged |
| 2026-09-08 | Handed discovery into the completed Phase 2 specification | Practitioner validation and human timing remain pending |
