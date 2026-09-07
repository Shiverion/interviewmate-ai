# Synthetic discovery example

Updated: 2026-09-07. Status: desk research and explicit hypotheses.

[Documentation home](../../README.md) · [Sprint index](../README.md) · [Phase 1](../phases/01-discovery-and-ux.md)

This reasoning example informed the proposed brief structure. It is separate from the longer practice records and future evaluation runs.

## Synthetic discovery example

**Illustration authored by the project AI assistant; not a user interview, prototype-evaluator output, measured benchmark, or validated rubric.** This short fragment explores what an inspectable brief should contain. It is too short for a representative timing study. The longer [reviewer packet](../evaluation/practice/reviewer-packet.md) now supplies two practice records with a separate [reference guide](../evaluation/practice/reference-notes.md).

Role context: a frontend engineer builds web interfaces, investigates defects, and explains testing choices.

| Turn | Speaker | Exact text |
|---|---|---|
| T01 | Interviewer | Tell me about a frontend defect you investigated and what you did. |
| T02 | Candidate | The search results sometimes showed an older query. I reproduced it by typing quickly, saw requests finishing out of order in the network panel, and changed the component to ignore responses from earlier requests. |
| T03 | Interviewer | How did you check the change? |
| T04 | Candidate | I tested rapid typing manually. I have not added an automated regression test yet. |
| T05 | Interviewer | What accessibility checks did you run? |
| T06 | Candidate | We did not discuss accessibility in that task, and I cannot give you an example from it. |

Expected interpretation for exploration:

- Debugging: T02 supports a self-reported example of reproduction, diagnosis, and a proposed fix. It does not independently prove the fix worked in production.
- Testing: T04 supports manual checking and explicitly states the lack of an automated regression test for that change. It does not prove that the candidate cannot write tests.
- Accessibility: this example does not establish accessibility competence. Ask for a separate example; do not infer poor overall ability from T06.

Result of this reasoning exercise: the brief needs separate fields for source quotation, interpretation, evidence status, and follow-up. Requiring a strength and weakness for every input would not represent this fragment cleanly. The prototype evaluator was not run on this example.
