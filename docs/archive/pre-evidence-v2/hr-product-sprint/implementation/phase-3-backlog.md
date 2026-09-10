> Historical design before the September 10 evidence revision. Retained for baseline provenance; follow [current progress](../../../../README.md).

# Phase 3 implementation backlog

[Phase 3 report](../../../../hr-product-sprint/phases/03-prototype-build.md) · [Design package](../design/README.md) · [D02](../decisions/002-review-brief-design.md)

Updated: 2026-09-08. B01–B05 are implemented. B06 software verification is complete with seven browser tests; its successful live generation demonstration remains pending provider access. The [runbook](review-brief-runbook.md) owns setup and source locations, and the [Phase 3 report](../../../../hr-product-sprint/phases/03-prototype-build.md#verification-record) owns actual results. Eight-hour allocation is a plan, not recorded effort.

## Build sequence

| ID / allocation | Implementation task and proposed location | Done when |
|---|---|---|
| B01 / 1.5h | Stabilize local startup; add development-only `src/app/review-brief/page.tsx` with a small feature shell | Page loads from a fresh session without Firebase credentials or recruiter AuthGate/KeyGate; production page returns not found; record exact run/check commands |
| B02 / 1h | Port [contract](../../../../hr-product-sprint/design/review-brief-contract.cjs), [role profile](../../../../hr-product-sprint/design/role-profile.json) and prompt into `src/lib/review-brief/`; add fixture loader | Authored inputs/outputs match the spec; malformed inputs and invalid citations fail; preserve version/hash provenance |
| B03 / 1.5h | Add `src/app/api/review-brief/route.ts` using the [AI contract](../design/ai-contract.md) | Development guard, body bound, server key, one call, structured validation, timeout/refusal/error mapping and no-store response verified |
| B04 / 2h | Build input/role, criterion cards and source inspection in `src/components/review-brief/` | Bundled/imported synthetic input reaches a validated draft; source context is accessible; errors retain input; late responses are ignored |
| B05 / 1.25h | Add edits/removal/restore, per-criterion checks, reviewed revision and text/JSON exports | Original is preserved; edits invalidate review; exported content matches current reviewed revision and source type |
| B06 / 0.75h | Verify the end-to-end core flow and record setup, restrictions and changed files | Fresh browser walkthrough and relevant checks recorded; authored sample and live generation clearly distinguished |

Use installed Next.js, React, AI SDK, OpenAI and Zod packages; no new agent framework or database is required. Do not import the existing seven-score evaluator into the new feature or redesign its persisted report contract.

## Reuse and dependencies

- Reuse theme tokens, basic report/transcript presentation patterns and export mechanics after inspecting their coupling.
- The existing [root layout](../../../../../src/app/layout.tsx) mounts AuthProvider/KeyProvider. B01 must check their no-config behavior; a new route alone does not bypass all initialization.
- The existing [recruiter layout](<../../../../../src/app/(recruiter)/layout.tsx>) gates children behind login/key setup. Place the synthetic feature outside that route group.
- Existing startup/type/lint findings are listed in [local development](../../product/local-development.md#known-verification-state). Repair blockers in the selected demo path; record unrelated failures accurately.
- Live generation requires a configured server OpenAI key and access to the selected model. Fixture/contract work and the wireframe require no key.
- Serve development on loopback, for example `npm run dev -- --hostname 127.0.0.1`. Production page/API guards are part of B01/B03, not a substitute for future deployment access controls.

## Verification priorities

Map tests to [A01–A16](../design/acceptance-plan.md#software-and-ux-acceptance). Use meaningful behavior checks for source mismatch, status/claim invariants, stale requests, failed generation, revision invalidation and export fidelity. Mock provider errors for software tests; label them separately from live model evidence.

Run focused tests, relevant type/lint checks and one fresh-session browser walkthrough. Capture a genuine model input/output if available. If live generation is unavailable, say so and retain the authored design demo as such; do not mark the API demonstration complete.

## Timebox decisions

If voice or persistence threatens the core path, keep it deferred as D01/D02 already specify. If startup stabilization exceeds its allocation, record the specific blocker and revise the remaining allocation explicitly. Avoid adding resume ranking, full user management, dashboard polish or public deployment.

Phase 3 completion requires the core workflow and its validation evidence. The first real provider attempt returned AI_UNAVAILABLE; a successful live API demonstration is still open. Authored and mocked checks must remain labelled as such.
