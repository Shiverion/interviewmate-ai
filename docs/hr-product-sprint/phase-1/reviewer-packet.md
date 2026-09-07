# Phase 1 reviewer packet

Created: 2026-09-07. Packet version: `p1-practice-v1`.

**All role details, projects, questions, and candidate responses below are fictional and were authored by the project AI assistant. No recruiter or hiring manager has validated this material.** These are development/practice cases, not real interviews, outputs from the prototype evaluator, a validated assessment, or held-out evaluation data. They must never be relabeled as Phase 4's held-out cases. Case IDs are `P1-A` and `P1-B`; turn IDs identify text locations, not times or interview duration.

Use this packet to practice producing a brief from supplied interview evidence. Capture what the candidate reports, what remains uncertain, and a useful follow-up for each criterion. Do not produce a numeric competence score, rank the candidates, or infer an overall hiring outcome. An interview answer is self-report; it does not independently verify a deployed feature or a person's competence.

The facilitator keeps the separate reference notes out of view until the participant has finished the assigned review. The participant should receive this packet, the blank brief, and the task instructions only. Any prior reading of the reference notes must be recorded as case familiarity.

## Fixed fictional role context

Role version: `frontend-discovery-v1`.

A product team is hiring a **mid-level frontend engineer** to build and maintain a browser-based operations dashboard. Users filter records, inspect results, and export selected data. The team uses React and TypeScript, works with an existing HTTP API, and collaborates with design, backend engineering, and quality assurance.

Typical work includes implementing interface behavior, managing asynchronous data and loading/error states, investigating user-reported defects, checking changes before release, and making interface controls usable with a keyboard. The engineer can seek help when a problem requires deeper specialist knowledge. This exercise does not assume that every applicant has owned an entire product or performed every kind of accessibility test.

The four provisional evidence criteria are fixed for both cases:

| ID | Criterion | Look for in the supplied answers | Evidence boundary |
|---|---|---|---|
| R1 | Frontend implementation/data flow | A specific account of interface behavior, data movement, implementation choices, and the person's contribution | Familiar terminology or team ownership alone does not establish individual implementation |
| R2 | Debugging/problem diagnosis | A reported symptom, an investigation, observations supporting a cause, and what the person changed or checked | A reported fix does not independently prove a production outcome |
| R3 | Verification/testing | Specific checks, their expected behavior, and the limits of the checks actually performed | A green team test suite does not establish coverage of this particular change |
| R4 | Accessible interfaces | Concrete interface behavior and accessibility checks the person describes doing | General intentions, library use, or an untested design do not establish accessible behavior |

These criteria are a practice framework, not a validated job analysis. Record missing evidence as unknown rather than as proof of inability. An explicit limitation applies to the described work; avoid turning it into a global judgment about the candidate. Conflicting statements need clarification rather than an invented explanation.

## Shared interview guide

The two cases use the same five core questions. Q1 and Q3 each include one shared clarification. The fixed format helps isolate differences in the evidence available to a reviewer; it does not make the cases an experimental control or validate the hiring criteria.

1. Describe a frontend feature you worked on. How did data move from a user action to the interface, and what did you implement?
2. Walk me through a user-facing defect you investigated. What did you observe, and how did you decide what was causing it?
3. How did you check the change and decide it was ready for release?
4. What accessibility work or checks did you perform on this interface?
5. Looking back, what were the limits of your ownership or evidence, and what would you investigate or ask for help with next?

## Case P1-A

### Transcript

**P1-A-T01 — Interviewer, Q1:** Describe a frontend feature you worked on. How did data move from a user action to the interface, and what did you implement?

**P1-A-T02 — Candidate:** I worked on the order-search screen in an operations dashboard. I implemented the React filter controls and the component that requested and displayed results. The text input held the current search value; after a short delay, an effect sent the filters to our existing API. The component showed loading, empty, and error states separately. I also put the selected filters into the URL so another team member could open the same view. The API contract already existed. I agreed the parameter names with a backend engineer rather than changing the endpoint myself.

**P1-A-T03 — Interviewer, clarification:** What happened when the inputs changed again before the previous request finished?

**P1-A-T04 — Candidate:** Originally, either response could update the result state. I added a request sequence number and only applied a response if its number matched the latest request. I also aborted the earlier request when starting another, but kept the sequence check because cancellation alone was not the behavior I wanted the interface to depend on.

**P1-A-T05 — Interviewer, Q2:** Walk me through a user-facing defect you investigated. What did you observe, and how did you decide what was causing it?

**P1-A-T06 — Candidate:** A support colleague said the table sometimes showed orders for an earlier search. I reproduced it by throttling the browser network and changing the query twice. The request for the first query finished after the second and replaced its results. I compared the query values and completion order in the network panel, then logged which response updated state. That gave me a specific explanation to test. I made the sequence-check change and repeated those steps. I did not find a backend filtering issue in that reproduction, although that does not rule out every possible backend defect.

**P1-A-T07 — Interviewer, Q3:** How did you check the change and decide it was ready for release?

**P1-A-T08 — Candidate:** I added a component test with two mocked requests. It resolved the second request first, then the first, and checked that the table still displayed the second query's rows. I also checked the empty and failed response states. I manually repeated rapid input changes in the browser. Another frontend engineer reviewed the change, and quality assurance ran our existing search checklist. Those checks supported releasing it to the test environment and then through our normal release process. I did not measure whether the change reduced support tickets afterward.

**P1-A-T09 — Interviewer, clarification:** What did those checks leave untested or uncertain?

**P1-A-T10 — Candidate:** The component test used mocked responses, so it did not cover the real API or authentication. We had no automated browser regression for this request-order case. I would add that if we saw repeated integration failures, and I would want to check whether navigating away during a request produces confusing error messages.

**P1-A-T11 — Interviewer, Q4:** What accessibility work or checks did you perform on this interface?

**P1-A-T12 — Candidate:** I used native inputs with associated labels and checked the filter controls using only the keyboard. I verified that focus remained in the search field when results changed and that the clear-filter button had an understandable name. I added a status message for loading and the result count. I have not tested how that announcement behaves with a screen reader, so I cannot claim that part works well. I would ask a colleague familiar with assistive technology to review it and help me check for repeated announcements while typing.

**P1-A-T13 — Interviewer, Q5:** Looking back, what were the limits of your ownership or evidence, and what would you investigate or ask for help with next?

**P1-A-T14 — Candidate:** I owned the filter and result-state code; another engineer maintained the table's shared rendering component, and backend owned the query service. My evidence is the reproduction and checks I described, not a measured production improvement. Next I would verify the screen-reader announcements and add a browser regression around the real request flow. I would also ask support whether their original symptom returned.

## Case P1-B

### Transcript

**P1-B-T01 — Interviewer, Q1:** Describe a frontend feature you worked on. How did data move from a user action to the interface, and what did you implement?

**P1-B-T02 — Candidate:** I worked on an issue-search screen for an operations dashboard. It had React filters, a table, and an export action. I wrote the result-table component and export logic myself. A user selected the filters and the page called our existing API, then showed the returned items. We wanted it to feel responsive, and the team discussed loading and error handling. I remember using our shared request helper rather than writing a separate networking layer. I cannot explain the helper's internals now. The backend engineer supplied the endpoint and most of the response shape.

**P1-B-T03 — Interviewer, clarification:** What happened when the inputs changed again before the previous request finished?

**P1-B-T04 — Candidate:** I think the request helper dealt with that, but I did not check whether it cancelled earlier requests or just kept the latest result. We discussed a delay after typing. I do not remember whether that delay was already in the shared filter component or added for this screen. I would need to look at the code to answer accurately.

**P1-B-T05 — Interviewer, Q2:** Walk me through a user-facing defect you investigated. What did you observe, and how did you decide what was causing it?

**P1-B-T06 — Candidate:** Someone reported that old issues appeared after changing a filter. I opened the page and tried a few searches, but the problem did not occur while I was watching. I told the backend engineer it might be cached data because I had seen caching cause something similar elsewhere. I did not capture a network trace or compare response order. They made a change later, and the ticket was closed. I remember seeing the screen behave normally afterward. I cannot say whether their change fixed the reported cause or whether the same steps were used to check it.

**P1-B-T07 — Interviewer, Q3:** How did you check the change and decide it was ready for release?

**P1-B-T08 — Candidate:** I used the screen in the test environment, changed a few filters, and tried an export. The table displayed rows and a file downloaded. I do not remember which filter combinations I used or whether I checked the file contents against the table. The team's automated checks were green, and a reviewer approved the pull request. I did not add a test for this change. Quality assurance also looked at the screen, but I was not present for that check and cannot tell you which cases they covered. The release decision was made by the team lead.

**P1-B-T09 — Interviewer, clarification:** What did those checks leave untested or uncertain?

**P1-B-T10 — Candidate:** I cannot identify a regression test for rapid filter changes, an empty result, or an API error. Those cases may exist in the suite, but I have not inspected them. The green result told me that the checks which ran passed; it did not tell me whether they exercised this particular screen or the reported defect.

**P1-B-T11 — Interviewer, Q4:** What accessibility work or checks did you perform on this interface?

**P1-B-T12 — Candidate:** We used the team's component library and the design had labels for the controls. I assumed the library handled most accessibility behavior. I did not do a keyboard-only pass or use a screen reader on this screen. I remember discussing a loading message, but I do not know whether it was announced or only visible. I would first check whether I can reach and operate the filters without a mouse, then ask someone with more experience to help inspect focus and announcements. That is what I would do next, not something I completed during the project.

**P1-B-T13 — Interviewer, Q5:** Looking back, what were the limits of your ownership or evidence, and what would you investigate or ask for help with next?

**P1-B-T14 — Candidate:** Another engineer wrote both the result-table component and the export logic; I did not modify those files. My changes were the filter labels and the page layout. I joined the discussions, but I cannot reconstruct every implementation choice. Next I would review the request helper with that engineer, reproduce the reported stale-result sequence, and identify which tests actually cover it before suggesting another fix.
