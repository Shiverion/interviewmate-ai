> Historical design before the September 10 evidence revision. Retained for baseline provenance; follow [current progress](../../../../README.md).

# D02: review-brief design and prototype architecture

[Phase 2](../../../../hr-product-sprint/phases/02-solution-design-and-ai-logic.md) · [Design package](../design/README.md) · [D01 scope](001-sprint-scope.md)

Decision ID: D02. Date: 2026-09-07. Status: selected for implementation; live behavior unverified. This resolves D01's design questions without expanding the selected problem.

## Decisions and reasons

| Choice | Selected behavior | Reason / tradeoff |
|---|---|---|
| Assessment | Four qualitative evidence statuses, no numeric score or hiring recommendation | Focus on support and gaps; avoid translating sparse evidence into a hiring score |
| Input | One fixed synthetic frontend role; structured English transcripts with immutable speaker/turn IDs | Repeatable source checks and comparable cases; arbitrary role setup deferred |
| AI workflow | One structured generation per explicit attempt, then deterministic checks and human review | Small, inspectable implementation; no autonomous recruiting actions or extra agent calls |
| Model | Pin `gpt-4o-2024-08-06` as the first test configuration | Reuse the existing provider/model family and record a stable version; this is not a claim it is the best model |
| UI | Two-column criterion review and source panel; single-column on narrow screens | Keep evidence inspection adjacent to the claim |
| Review | Edit/remove claims, change evidence status, retain limitations and follow-up, mark each criterion checked, then mark the brief reviewed | Review is an explicit human action with a specific revision |
| Persistence | React memory for the local synthetic demo; reviewed JSON/text download | Avoid database migration in the core path; refresh loses work, with a clear warning |
| Integration | New local-only `/review-brief` page and `/api/review-brief` route inside the existing Next.js repo | Isolate the new evidence contract from the existing seven-score evaluator |
| Access | Development mode only, bound to loopback; server environment key | Core demo avoids recruiter AuthGate/KeyGate and does not accept browser-supplied provider keys |
| Deployment | Production page/API return not found until a later deployment/access decision | A runnable local web app satisfies the sprint prototype format; public rollout is outside this timebox |

The inherited root layout still mounts shared providers. Phase 3 must verify that the new route loads without a Firebase configuration and without a key gate; merely adding a new page does not establish this. The new feature itself must not import Firebase persistence or the old evaluator. Keep existing recruiter routes and their contracts intact.

## Decisions to revisit with evidence

Model availability must be checked with an actual call in Phase 3. If unavailable, record a new explicit model configuration/version before running comparisons; do not silently fall back. If one call cannot produce grounded drafts reliably, retain failed outputs and reconsider the prompt or call structure based on Phase 4 evidence.

The role anchors and review workflow remain provisional without recruiter/HM calibration. Database persistence, authenticated sharing, voice input and production access can be designed later when they address a demonstrated need. Human timing is still pending.

Detailed acceptance behavior is owned by the [UX spec](../design/ux-spec.md), [AI contract](../design/ai-contract.md) and [acceptance plan](../design/acceptance-plan.md).
