> Historical baseline observation from September 7. Source files have since changed; use commit history for the cited behavior. Current implementation is in the [runbook](../implementation/current-runbook.md).

# Problem, users and current workflow

Updated: 2026-09-07. Status: desk research and explicit hypotheses.

[Documentation home](../../README.md) · [Sprint index](../README.md) · [Phase 1](../phases/01-discovery-and-ux.md)

Read this for the problem hypothesis and inherited workflow. The selected scope is recorded in [D01](../../archive/pre-evidence-v2/hr-product-sprint/decisions/001-sprint-scope.md); source IDs refer to the [source register](source-register.md).

## Discovery decision

Explore **evidence-backed first-screen review** using the existing InterviewMate AI application. Focus on the work between a completed interview transcript and a brief ready for a hiring manager.

Working problem statement:

> A recruiter reviewing a frontend-engineer screen needs to turn candidate answers into a concise, job-specific brief. Reconstructing evidence, identifying unanswered criteria, and checking AI claims may make this handoff slow or unreliable. We will test whether a draft with traceable evidence reduces that review effort without reducing quality.

This is a research-informed hypothesis, not a finding from an interviewed customer. The user confirmed on 2026-09-07 that recruiter/hiring-manager access is unavailable and requested desk research first. Direct interviews are a future opportunity, not a prerequisite for starting the prototype.

## Target user and job to be done

| Element | Working definition | Evidence status |
|---|---|---|
| Primary user | A tech recruiter who prepares first-screen feedback for a hiring manager | Proposed segment |
| Scenario | One mid-level frontend-engineer vacancy; several synthetic candidates evaluated against the same role criteria | Scope choice, not a real vacancy |
| Secondary user | Engineering hiring manager reading and questioning the brief | Proposed downstream user |
| Affected participant | Candidate whose words may be summarized incorrectly or whose answer may be missing | Product risk to test |
| Existing tools | Interview notes/transcript plus a scorecard or document; existing AI note tools are also alternatives | Supported as available workflows; actual target-user usage unknown |
| Desired outcome | A brief the recruiter can verify, correct, and hand off with clear unknowns | Product hypothesis |

Job to be done: **When I finish a candidate screen, help me organize what was actually demonstrated against the role criteria, so I can prepare the next conversation without re-reading the entire interview or trusting an unexplained score.**

We have no defensible estimate yet for applicant volume, review minutes, salary impact, willingness to pay, or the prevalence of this bottleneck in Indonesian or global tech recruiting. Avoid invented persona names, interview quotations, and workload percentages.

## Current workflow map

The manual workflow below is reconstructed from sources and product reasoning, not observed with a participant.

| Step | User activity and artifact | Potential friction | Basis |
|---|---|---|---|
| 1. Align on role | Recruiter and manager define interview criteria | Vague criteria make feedback difficult to compare | E01/E02 plus inference |
| 2. Conduct screen | Ask questions; produce notes or a transcript | Missing follow-ups may leave important evidence absent | Hypothesis |
| 3. Reconstruct answers | Review notes/transcript after the screen | Searching and remembering may take effort | E06 reports this concern; target-user severity unknown |
| 4. Complete feedback | Map answers to criteria and write a brief | Generic praise, unsupported inference, or blank criteria | Hypothesis to test with synthetic cases |
| 5. Handoff | Manager reads the brief and requests clarification | Ambiguous claims may cause a second review | Hypothesis |

The existing app's source implements this path:

`Recruiter enters role + candidate + PDF + time window → generates candidate link → candidate enters interview room → conversation produces transcript → AI generates report → recruiter reads or downloads report`

| Code observation | UX consequence / opportunity | Repository evidence |
|---|---|---|
| Creation collects role/JD, questions, candidate details, PDF and dates; a new template is written for each session | Repeated candidate setup can repeat role preparation. A reusable role configuration is worth exploring. | [CreateInterviewModal](../../../src/components/dashboard/CreateInterviewModal.tsx), [interview persistence](../../../src/lib/firebase/interviews.ts) |
| Reports show scores, pass/fail, free-text evidence and transcript separately; inspected page has no correction/review controls | Recruiter must manually reconcile claims and source text. This is the selected product gap. | [Report page](<../../../src/app/(recruiter)/interviews/[sessionId]/page.tsx>) |
| Evaluator requires numeric scores and at least one strength and weakness; has no transcript citation IDs or insufficient-evidence state | Sparse answers can be pushed into overly definite reports. The schema needs an explicit way to report unknowns. | [Evaluation endpoint](../../../src/app/api/evaluate/route.ts) |
| Interview list can sort by score; dashboard shows recent sessions | Basic pipeline UI is reusable. Do not claim a validated job-level shortlist or ranking algorithm. | [Interview list](<../../../src/app/(recruiter)/interviews/page.tsx>), [dashboard](<../../../src/app/(recruiter)/dashboard/page.tsx>) |
| Interview connection expects a key in the browser; candidate entry and session timing have separate steps | Fresh-browser candidate onboarding needs a live check before depending on voice in the demo. | [Interview store](../../../src/lib/store/useInterviewStore.ts), [candidate entry](<../../../src/app/(public)/apply/[sessionId]/page.tsx>) |

These are source observations. The prior review did not complete a live interview/Firebase round trip. Four arithmetic tests passed, TypeScript/lint failed, and default local development encountered Tailwind resolution errors. Track repair and verification in Phase 3, not as demonstrated product readiness.

## Hypotheses and what would change our mind

| ID | Hypothesis | How to investigate | Evidence against it |
|---|---|---|---|
| H01 | Preparing usable post-screen feedback is a meaningful task for the target user | Desk evidence now; later a recent-example interview and observed task | Recruiter reports feedback is already quick or someone else owns it |
| H02 | Traceable drafts reduce total review effort | Compare manual and assisted completion on comparable synthetic inputs | Verification/correction takes as long as manual work |
| H03 | Explicit missing-evidence states reduce unsupported conclusions | Test sparse and incomplete transcripts against authored expectations | Report invents evidence or reviewer mistakes unknown for poor performance |
| H04 | One shared role framework improves comparability | Apply the same criteria to every synthetic case and inspect decisions | Criteria do not fit the role or different questions make results incomparable |
| H05 | A focused brief fits the handoff workflow | Later ask a manager to use it to prepare follow-ups | Extra export/copying or duplicate tools cost more effort than the brief saves |

Scope-changing findings: if feedback preparation is not painful, reconsider the problem before expanding features. If voice is unreliable, demonstrate transcript-to-brief as the core workflow. If evidence cannot be grounded reliably, keep the prototype exploratory and report the failure rather than presenting scores as dependable.

## Future direct-research guide

Use only if access becomes available; do not send outreach without user authorization. A short conversation can improve this draft, but cannot establish population-level conclusions.

1. Walk me through your most recent first-screen handoff. Who wrote it, and who used it?
2. What did you have in front of you: notes, transcript, recording, scorecard, or something else?
3. Which part required the most work? What happened the last time feedback was incomplete?
4. How do you distinguish an unanswered topic from weak evidence?
5. What makes you reopen a transcript or ask the interviewer for clarification?
6. Which existing tools already solve this? What still requires manual checking?
7. What would make an AI draft unusable or slower to review?
8. After discussing current behavior, show the concept and ask them to find and correct one unsupported claim.

Capture anonymized observations, exact quotations only when actually recorded, workarounds, contradictory evidence, and follow-up questions. Prefer a synthetic example over collecting real candidate information.
