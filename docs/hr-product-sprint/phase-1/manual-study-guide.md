# Manual baseline rehearsal: facilitator instructions

Version: phase1-practice-v1. Created: 2026-09-07.

Status: **Practice packet checked and ready for a willing human reviewer. No participant is assigned and no human session has been run.**

[Phase 1 progress](../01-discovery-and-ux.md) · [Participant packet](reviewer-packet.md) · [Blank brief](blank-review-brief.md) · [Raw timing log](baseline/human-review-log.csv)

## Purpose and limits

Practice the manual task that the prototype aims to assist: turn a supplied interview transcript into a concise, source-supported brief for a hiring manager. These fictional practice records are discovery materials, not the eight-case Phase 4 evaluation set.

A human can perform this task without professional recruiting experience. In that case, record their actual background and call the result a usability rehearsal. Do not report it as recruiter validation. The AI agents that authored the materials cannot stand in as timed human participants.

Current owner: project creator to arrange a willing human reviewer when available. No participant is assigned. The user's choice of desk research does not authorize outreach; none has been sent. Preparation can be completed without a participant, while timing stays pending in [Phase 4](../04-evaluation-and-iteration.md).

## Materials and separation

Give the participant only:

1. [Reviewer packet](reviewer-packet.md): fictional role, evidence criteria, and one assigned transcript.
2. A fresh copy of the [blank brief](blank-review-brief.md).
3. The task instruction below.

Keep [reference notes](reference-notes.md) away from the participant until the task ends. Record whether they previously read the cases or reference. Both practice cases are deliberately visible to the development team and must never be described as held-out evaluation material.

## Participant task

> You are preparing a brief for an engineering hiring manager after a first-round screen. Read the fictional role and assigned interview. For each of the four criteria, capture what the candidate actually said, point to the relevant turn, explain what it supports, and note any uncertainty or missing information. Add useful follow-up questions and check the brief before finishing. Do not choose whom to hire or assign a general candidate score.

The participant may inspect the full transcript throughout. For the manual condition, do not show AI-generated summaries or use AI to write the brief. Normal text editing, search and copying exact excerpts are allowed; record tools used.

## Run sequence

1. Record consent to participate in this small rehearsal, reviewer ID/background, familiarity with the materials, and any interruption or accessibility needs. Use a pseudonymous ID; no personal candidate records are needed.
2. Let the reviewer read the role/task instructions before timing. Record this familiarization separately if timed; do not include it silently in only one condition.
3. Start timing when the assigned transcript and blank brief become available for the task. If the reviewer has already seen the transcript, record that familiarity.
4. Stop when the reviewer declares the brief ready and has checked all four criteria, source references, evidence limitations and follow-ups. Record incomplete work as incomplete.
5. Capture active human time and total elapsed time. Pause active time for unrelated interruptions and record them; ordinary reading, searching, thinking and editing are active work. The manual condition has no AI generation wait.
6. Inspect the completed brief against the source and reference notes. Reference notes are author judgments and can be challenged. Do not alter the participant's original output; record any adjudication separately.
7. Ask the short debrief questions and append a real row to the raw timing log. Store the original brief under a run-specific filename if a session occurs.

Practical stop rule: allow up to 20 minutes per practice transcript, then record an incomplete task if necessary. This is a facilitator-selected cap, not an expected completion time or an industry baseline. Do not treat timed-out tasks as successful 20-minute completions.

## Completion checklist

- All four criteria have an entry, even if the entry says that evidence is missing.
- Every factual statement about the candidate has a candidate-turn reference or is removed.
- Quotes preserve meaning, speaker and important qualifying language.
- Self-reported work is not described as independently verified production performance.
- Missing, limited and conflicting evidence are described explicitly.
- Follow-ups address important unresolved information; they do not invent a deficiency.
- The output remains a brief for human review, with no global hire/no-hire ranking.

## Quality review

Split the brief into atomic factual candidate claims before counting. A sentence that asserts two separate facts counts as two claims. Record:

- Total factual claims and unsupported claims. A real quotation can still be used to support an unjustified conclusion.
- Quotes that do not occur in the assigned candidate turn or that omit meaning-changing qualifiers.
- Expected unknowns that were correctly retained and unsupported negative conclusions drawn from them. Use the predefined criterion checkpoints in the facilitator's reference notes (2 for P1-A, 4 for P1-B); these are authored expectations, not observed results. Count each criterion once and record reasonable reference disagreements separately.
- Substantive errors corrected during the task if observable; label retrospective guesses separately.
- Completed task yes/no and any unresolved interpretation disagreement.

Do not collapse these into a single hiring-accuracy percentage. When the relevant denominator is zero, use `Not applicable`.

## Debrief questions

1. Which step required the most searching or rereading?
2. Which conclusion felt hardest to justify from the interview?
3. What would you want to see before accepting a prewritten summary?
4. Would the resulting brief help you prepare a follow-up conversation? What is missing?

Record the actual response when a session happens. There are no answers or participant quotations yet.

## Later assisted comparison

After Phase 3, use the same completion rule and include generation setup, quote checking, correction and export. Record AI waiting time separately from active human time. Log prompt/model/role versions.

For a useful comparison, prepare the eight Phase 4 cases and counterbalance manual/assisted assignments between two reviewers when possible. Each reviewer should avoid seeing the same case twice. With one reviewer, use comparable distinct cases and report the small-sample and case-difficulty limitations. P1-A/P1-B can train the procedure but do not establish matched difficulty merely because their lengths are similar.

## Result status

| Item | Current state |
|---|---|
| Available practice cases | P1-A and P1-B, synthetic; see participant packet |
| Assigned human participants | None |
| Completed human tasks | 0 |
| Manual active/elapsed time | Not measured |
| Assisted active/elapsed time | Not measured |
| Participant feedback | Not collected |

The CSV contains a header only. Add a row only after an actual session; blank measurements are not zero. Do not replace missing data with vendor research, an estimated reading speed, a generated narrative or an agent's completion time.
