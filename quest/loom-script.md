# Loom script — ≤ 5 minutes

**Draft 1, 2026-09-22.** Spoken lines in plain text; what is on screen in *[brackets]*. Timings are targets; at a normal speaking pace this runs about 4:40, leaving buffer. Read it once aloud with a stopwatch before recording. Numbers are the committed ones — if you change a number, change it in the document first.

Rule for the recording: say what you did, what the AI did, and what you did not verify — in that order, every time it comes up. Nothing on screen that isn't in the repository.

---

## 0:00 – 0:50 — The problem, and why it ranked first

*[Screen: `quest/intent.md` §1, then scroll to the §4 table row A]*

Hi, I'm Iqbal. This is InterviewMate, a Next.js app I built with AI assistance for a previous Quest with your team. I picked it deliberately: it's the kind of code the Quest is about — shipped fast, AI-assisted, and now needing to be trusted and changed.

The flow is transcript-to-AI-evaluation. Three API routes each re-implemented "which provider, which key, which fallbacks." They had drifted. The clearest evidence is in git: a June fix that trimmed API keys landed in one route and missed the demo route created in September. Thirteen of the repo's commits touch these three files; five are fixes.

I compared three problems — this duplication, the fallback-chain semantics, and repeated per-request work — and scored them on user impact, maintenance effort and operating cost. The duplication won because it was the only one with a user-facing symptom, a structural cause, *and* a dated recurrence. Everything else — auth, the reviewer routes, the fallback semantics — I declared out of scope.

## 0:50 – 2:10 — The result

*[Screen: `quest/handoff.md` §1.2 — the five-literal policy table]*

The change moves the mechanism into one pure module and leaves the policy as five literals, one per path, at the call sites. Exactly two behaviours change: the scheduled route now refuses instead of silently substituting a provider when the caller turned fallback off; and the demo route trims server keys like the other two already did. Everything else is preserved — and that word "preserved" is where the work was.

*[Screen: terminal — `git diff -w 50fa2dc..e5bd47b -- src/app/api/evaluate/scheduled/route.ts`]*

Here's the scheduled route: thirty-seven changed lines. The literal says what the policy is.

*[Screen: `quest/agent-notes.md`, "Baseline at H" table]*

Before any route was touched, the test harness was committed against the unmodified routes: seven hundred thirty-five cases, tagged. Seven hundred and three "preserved" cases passed on the old code; exactly the thirty-two cases tagged as the two fixes failed. After wiring: zero failing, and the whole suite went from one ninety-one to eleven forty tests. The grep for env-based provider selection in the routes goes from thirteen lines to zero.

## 2:10 – 3:30 — The most important revision

*[Screen: `quest/review-example.md`, the "In thirty seconds" block]*

The AI patch for the third route passed every test — seven thirty-five out of seven thirty-five — and I sent it back. It had written the header-parsing schema twice, once per branch. Sixty-three changed lines. Green tests, and still the wrong change, because it reintroduced exactly the drift pattern the whole effort exists to remove. The second version: one schema, one resolver call, forty-six lines. The rejected patch is in the repo, extracted verbatim from the agent's session log.

*[Screen: `quest/council/directive-r1-codex.md`, first paragraph]*

The revision that mattered most, though, happened before any code. My first directive — the instructions for the coding agent — described a "behaviour-preserving" refactor whose contract would have added two *undeclared* behaviour changes: a new refusal on one route, a new substitution on another. Two independent reviewer models caught it, from different angles, before an agent wrote a line. That is why the directive says "exactly two changes" and lists them.

## 3:30 – 4:30 — How I worked with AI, and what I decided

*[Screen: `quest/directive.md` Appendix B.4 — the who-did-what table]*

Honest accounting: one orchestrating model drafted every document and made every commit. Cheaper models wrote the code under the directive, which had file boundaries and stop rules — the first implementation run actually *stopped* correctly when seven hundred preserved cases failed on a harness bug. Every document and the production diff were reviewed by independent model sessions that hadn't seen the drafting — two reviewers at first, three later, after I noticed the panel only had two.

My decisions are listed — thirteen of them. Choosing this repo. Approving the contract table before any route edit. Deciding cheaper models implement and stronger ones review. Adding the third reviewer. And I read the resolver and the three route diffs myself before signing the review record.

## 4:30 – 5:00 — The handoff, and the limits

*[Screen: `quest/handoff.md` §4.4 table]*

I performed the handoff exercise myself, timed: seven minutes on the old code, sixteen and a half on the new. The refactor did not make the change faster. It made behavioural changes checkable — and then my own run found the one place it still isn't: I duplicated a hand-mirrored test block by mistake, and every check stayed green. That's recorded, and it's follow-up number eight.

Limits: the scheduled fix reaches direct API callers only — the shipped UI never turns fallback off. Every timing is n equals one. No second engineer has tried this yet; the agent runs are labelled as agents. Everything else is in the appendix. Thank you.

---

## Recording notes

- **Total:** ~4:40 at 150 wpm. If over, cut the second paragraph of 2:10–3:30 (the directive v1 story) down to its last sentence — the rejected patch alone carries the segment.
- **Screens to have open in tabs, in order:** `intent.md` §1/§4 → `handoff.md` §1.2 → terminal with the scheduled diff pre-run → `agent-notes.md` baseline table → `review-example.md` top → `council/directive-r1-codex.md` → `directive.md` B.4 → `handoff.md` §4.4.
- **Do not say** "proves," "guarantees," or "catches every." Say "shows," "checks," "for the asserted cases."
- **Do say** the three "I" sentences in segment 4 exactly — they are the accountable-judgment evidence.
- After recording: paste the Loom link into `directive.md` B.1 (the Loom row) and `effort-log.md`; tell me your final human hours; one last commit and push; then submit the Loom link, `intent.md`, `directive.md`.
