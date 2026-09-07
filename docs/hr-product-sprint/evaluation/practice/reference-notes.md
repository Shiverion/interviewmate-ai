# Phase 1 reference notes — facilitator only

Created: 2026-09-07. Reference version: `p1-practice-v1`.

**Reference annotations authored by the project AI assistant for fictional development/practice cases `P1-A` and `P1-B`.** These are not recruiter-validated ground truth, outputs from the prototype evaluator, competence scores, or hiring recommendations. They describe support available in the supplied text. Equivalent, appropriately qualified interpretations may be acceptable. Assistant-authored cases and references are not an independent assessment standard.

Keep these notes separate from the [reviewer packet](reviewer-packet.md) until the participant has finished the assigned task. Record any prior exposure. Both cases remain development/practice material after use and must never become held-out Phase 4 cases. There are no interview timestamps or measured durations in this material.

## Annotation principles

- An exact quotation can establish what the candidate said. It does not independently establish that the work occurred, that the code was correct, or that a production outcome improved.
- Distinguish a reported action, a reported limitation, a topic not established, and conflicting statements. Do not collapse them into a competence score.
- Cautious wording or explicit uncertainty is not evidence of poor ability. Similarly, polished or detailed wording is not independent evidence of ability.
- A suggested future action is not evidence that the candidate already performed it.
- Do not infer protected characteristics, personality, honesty, seniority, global role fit, or a hiring outcome from these cases.
- Follow-ups should resolve a specific evidence gap, not invite invented certainty. Record acceptable alternatives rather than requiring verbatim reference wording.

## P1-A source annotations

| Criterion | Exact supporting snippets and source turns | Permissible interpretation | Unsupported interpretation | Useful follow-up |
|---|---|---|---|---|
| R1 — Frontend implementation/data flow | `P1-A-T02`: "I implemented the React filter controls and the component that requested and displayed results." `P1-A-T04`: "I added a request sequence number and only applied a response if its number matched the latest request." `P1-A-T14`: "another engineer maintained the table's shared rendering component" | The candidate describes personally implementing filters and result-state behavior while using a shared table and an existing API. The response includes a mechanism intended to prevent old responses replacing new ones. | They built the entire dashboard, owned the backend, or proved that this implementation handles every asynchronous edge case. | Ask how request state is reset when filters are cleared or the component unmounts; use an example to check the explanation. |
| R2 — Debugging/problem diagnosis | `P1-A-T06`: "I reproduced it by throttling the browser network and changing the query twice." "The request for the first query finished after the second and replaced its results." "I compared the query values and completion order in the network panel, then logged which response updated state." | The answer reports a reproducible stale-results symptom and observations consistent with response-order overwriting. It connects the proposed change to that explanation. | The bug was conclusively the only defect, backend behavior was proven correct, or production incident frequency fell. | Ask what observation would distinguish this hypothesis from a server returning incorrectly filtered rows, and what happened when the reproduction was repeated after the fix. |
| R3 — Verification/testing | `P1-A-T08`: "It resolved the second request first, then the first, and checked that the table still displayed the second query's rows." `P1-A-T10`: "The component test used mocked responses, so it did not cover the real API or authentication." "We had no automated browser regression for this request-order case." | The candidate reports a targeted component test and manual checking, with explicit integration and browser-regression limits. This is evidence of a described test approach, not verified test execution. | Full end-to-end coverage, zero remaining defects, or no testing ability because one type of test was absent. | Ask to sketch the assertion or explain a matched integration check that would catch an API-contract failure. |
| R4 — Accessible interfaces | `P1-A-T12`: "I used native inputs with associated labels and checked the filter controls using only the keyboard." "I verified that focus remained in the search field when results changed" and "I have not tested how that announcement behaves with a screen reader" | The candidate reports label, keyboard and focus checks. Screen-reader behavior for the status message remains unverified; the answer identifies that specific limitation. | The screen meets an accessibility standard, all assistive technologies work, or the candidate cannot implement accessible interfaces. | Ask how the loading/result-count message would be tested with a screen reader, including frequent query changes and repeated announcements. |

Cross-criterion qualifications:

- `P1-A-T08` states: "I did not measure whether the change reduced support tickets afterward." Do not invent a business-impact percentage, production success rate or user-satisfaction improvement.
- `P1-A-T14` states: "My evidence is the reproduction and checks I described, not a measured production improvement." Preserve this distinction if the brief includes a result.
- The accessibility and browser-test limits are bounded gaps in evidence for this work. They do not justify a global negative judgment. A brief may reasonably prioritize screen-reader verification as a follow-up without assigning a competence score.

## P1-B source annotations

| Criterion | Exact supporting snippets and source turns | Permissible interpretation | Unsupported interpretation | Useful follow-up |
|---|---|---|---|---|
| R1 — Frontend implementation/data flow | `P1-B-T02`: "I wrote the result-table component and export logic myself." `P1-B-T04`: "I did not check whether it cancelled earlier requests or just kept the latest result." `P1-B-T14`: "Another engineer wrote both the result-table component and the export logic; I did not modify those files." | The individual implementation claim conflicts across the transcript. The request helper's concurrency behavior is not established. The later statement identifies labels/layout as the contribution, but the reviewer should retain and clarify the conflict rather than silently choose an account. | The candidate authored all result/export behavior, authored none of the project, intentionally misled the interviewer, or lacks frontend ability. | Quote both ownership statements and ask the candidate to distinguish which files or behaviors they personally changed from team work. Then ask for one concrete data-flow example from that contribution. |
| R2 — Debugging/problem diagnosis | `P1-B-T06`: "the problem did not occur while I was watching." "I told the backend engineer it might be cached data" and "I did not capture a network trace or compare response order." "I cannot say whether their change fixed the reported cause" | The candidate reports attempting searches and raising an unverified caching hypothesis. The supplied answer does not establish reproduction, a diagnosed cause or the effect of the later change. | Caching caused the defect, the candidate fixed it, the team verified it with the original steps, or the candidate is unable to debug. | Ask how they would collect evidence to distinguish cached results from response-order overwriting, and what specific sequence was reported by the user. |
| R3 — Verification/testing | `P1-B-T08`: "The table displayed rows and a file downloaded." "I did not add a test for this change." `P1-B-T10`: "I cannot identify a regression test for rapid filter changes, an empty result, or an API error." "Those cases may exist in the suite, but I have not inspected them." | The candidate reports a limited manual check. New automated tests were not added by this candidate, and existing coverage is unknown. There is no evidence that the export contents matched the intended filtered data. | No automated tests exist, no one tested the feature, the green suite proves this defect is covered, or the candidate cannot write tests. | Ask which assertion would verify exported contents against the selected filters and how they would locate or add a regression for stale results. |
| R4 — Accessible interfaces | `P1-B-T12`: "I assumed the library handled most accessibility behavior." "I did not do a keyboard-only pass or use a screen reader on this screen." "That is what I would do next, not something I completed during the project." | The candidate explicitly reports not performing these accessibility checks on the described screen. Library behavior, focus and announcements remain unverified. The proposed keyboard check is a future plan. | The interface is accessible because a component library was used, the candidate already performed the proposed checks, or the candidate has no accessibility knowledge or experience anywhere. | Ask for a concrete keyboard interaction they would test first, the expected focus behavior, and how they would determine whether the loading message is announced. |

Cross-criterion qualifications:

- The ownership contradiction is about the same result-table component and export logic. It is a reason to ask for clarification, not evidence of a personality trait or intent. Record both `P1-B-T02` and `P1-B-T14` if mentioning it.
- The transcript supports specific limits in the described investigation and checks. It does not support a blanket statement that the candidate never investigates, never tests, or cannot do the work.
- A reported team review, green test suite, and closed ticket do not reveal the checks performed or resolve the original symptom. Avoid converting these into proof of correctness.
- Explicit uncertainty should be retained as uncertainty. It must not be penalized as generic lack of confidence.

## Predefined unknown checkpoints for the rehearsal log

For the practice CSV, `expected_unknowns` counts criterion entries with a predefined material uncertainty below, once per criterion. It does not count every sentence or imply that the entire criterion lacks evidence. These are assistant-authored reference choices, not measured outcomes or recruiter labels.

| Case / criterion | Material uncertainty the brief should preserve |
|---|---|
| P1-A / R3 | Mocked component checks do not establish real API/authentication coverage; no browser regression exists for this request-order case. |
| P1-A / R4 | The loading/result announcement has not been checked with a screen reader. |
| P1-B / R1 | The conflicting accounts leave personal ownership of the result-table/export implementation unresolved. |
| P1-B / R2 | The reported stale-results cause and the effect of the later change were not established by the candidate's investigation. |
| P1-B / R3 | Existing automated coverage of the reported defect is unknown, and the downloaded contents were not verified in the account. |
| P1-B / R4 | Component-library use does not establish keyboard, focus or announcement behavior on this screen; the described checks are future plans. |

Thus the authored expected counts are 2 for P1-A and 4 for P1-B. `correctly_flagged_unknowns` is measured only from an actual completed brief. Count a checkpoint as retained when the brief captures its material limitation without asserting a resolution; accept equivalent wording. Also record any additional reasonable uncertainty or disagreement rather than forcing it into this limited count. Leave all timing-log rows absent until a human session occurs.

## Review of a completed practice brief

Use these as factual review prompts, not a numeric assessment of the candidate:

1. Can each factual candidate claim be located in the cited case and turn? Is any quoted text exact?
2. Does the interpretation stay within the quote and its surrounding context?
3. Does the brief distinguish self-reported work from an independently verified outcome?
4. Are specific missing or unverified checks recorded without turning them into global inability?
5. If conflicting ownership claims are discussed, are both source turns preserved and is clarification requested?
6. Are completed actions distinguished from future proposals?
7. Does each follow-up address a specific uncertainty relevant to R1-R4?
8. Does the brief avoid numerical competence scoring, candidate ranking and automatic hiring conclusions?

These checks can support correction counts or discussion in a creator-run rehearsal. They do not supply recruiter validation, a representative quality benchmark or measured timing. Log reference disagreements rather than treating these notes as unquestionable truth.
