# Loom script — recording version, ≤ 5 minutes

**Draft 2, 2026-09-23.** Iqbal's interactive rewrite, trimmed for length and corrected for attribution. Target **4:35–4:45**, which leaves buffer under the five-minute cap.

**Style:** use the document on screen as your cue. Do not read these sentences exactly — point, scroll, explain. The words below are the floor, not a teleprompter.

**Pace check.** ~690 spoken words: 4:19 at 160 wpm, 4:36 at 150, 4:56 at 140 — before pauses. You have eight tab switches; budget ~15 s for them. **If you speak slowly, or the first take passes 4:30 at the "What AI did" segment, drop the second paragraph of 2:10–2:50** (everything between "And it was sent back." and "So tests were necessary evidence") — the thirty-second diagram on screen carries that segment without it.

**Two rules, because the documents are scrupulous about them and a reviewer will cross-check:**
1. Never claim an execution step you did not perform. The harness was written and run by an agent; the patch rejection was made under *your* checklist and you accepted it in writing. Both phrasings below are already correct — keep them.
2. Never say "proves", "guarantees" or "catches every". Say "shows", "checks", "for the fixture set I tested".

---

## 0:00 – 0:45 — Why I chose this problem

*[Screen: `quest/intent.md` §1, then scroll to §6 Prioritization and point at row A]*

Hi, I'm Iqbal. This is InterviewMate, a Next.js app I originally built with AI assistance for a previous Quest with your team.

For this Quest I focused on the transcript-to-AI-evaluation flow.

*[Cursor over the three-route description in §1.]*

Three API routes make basically the same decision: which AI provider, which key, and whether fallback is allowed. Each route implemented that decision separately, and over time they drifted. One example — a key-handling fix from June reached an existing route, while the demo route added later repeated the older behaviour.

*[Scroll to §6, point at row A.]*

I ranked the problems I found on user impact, maintenance effort and operating cost. I chose this one because it had all three things I wanted: a real behaviour problem, a structural cause, and evidence that the same class of issue had already recurred.

## 0:45 – 1:15 — What the refactor actually changed

*[Screen: `quest/handoff.md` §1.2, five-policy table centred.]*

After the refactor the shared mechanism lives in one pure resolver. But I deliberately did not make every route behave the same.

*[Cursor down the five policy rows.]*

The policy stays explicit at each call site — five policy paths. There are only two intended behaviour changes. On the scheduled route, if fallback is explicitly off and the requested provider isn't configured, it now refuses instead of silently switching providers. And the demo route now trims server-side keys like the other two.

For the fixture set I tested, the remaining behaviour is preserved.

## 1:15 – 1:35 — Show the actual code

*[Screen: command **S2**, or the GitHub commit view. Point at the policy literal, especially `onUnconfigured`.]*

This is what it looks like in the route. The important thing isn't the line count — it's that the policy decision is visible here now, instead of hidden inside another copy of environment lookup and provider selection.

*[Pause ~2 s so the reviewer can read it.]*

## 1:35 – 2:10 — How I checked behaviour preservation

*[Screen: `quest/directive.md` Appendix B.3. Point at the first two rows.]*

Verification is where most of the work went. Before any route was wired, the harness was committed and run against the old implementation. Seven hundred thirty-five route cases. Seven hundred and three — the behaviour that should stay the same — already passed. Exactly thirty-two failed: seven for the scheduled fix, twenty-five for the demo fix.

*[Move to the After column.]*

After the refactor, all of them pass. The resolver adds two hundred fourteen contract cases, and the full suite is now eleven hundred forty tests.

## 2:10 – 2:50 — The AI patch that was rejected with green tests

*[Screen: `quest/review-example.md`, Example 1, "In thirty seconds" block. Follow the arrows with the cursor.]*

An AI-generated patch for the third route passed all seven hundred thirty-five route tests, and TypeScript was clean. And it was sent back.

It duplicated the header-parsing schema across two branches — structurally recreating the exact problem this refactor removes. Sixty-three changed lines. The revised version: one schema, one resolver call, forty-six lines, tests still passing.

So tests were necessary evidence. They weren't the whole review.

## 2:50 – 3:25 — What AI did, and what I was responsible for

*[Screen: `quest/directive.md` Appendix B.4. Point first at the Iqbal row.]*

AI did a lot of the execution: one model orchestrated and drafted, others implemented bounded changes, independent sessions reviewed.

These were the decisions I kept.

I chose the repository and the problem. I approved the behaviour contract before any route was edited. That rejection you just saw was made under a review checklist I wrote — and I own the call: I read the resolver and all three production route diffs myself, then signed off on the record. And I performed the handoff exercise personally.

I used AI heavily. I didn't delegate what behaviour was intended, or what evidence was enough to accept the change.

## 3:25 – 4:25 — The handoff result

*[Screen: `quest/handoff.md` §4.4, BEFORE/AFTER table centred.]*

This is the part I'd want you to push on.

I ran the same policy change before and after the refactor.

*[Point at Wall time.]*

Before: about seven minutes. After: about sixteen and a half. So the refactor did not make this task faster.

*[Point at Files touched.]*

One file before; the policy plus its resolver and route expectations after — more surface, more verification.

*[Point at Confidence.]*

At first I was confident: contract tests, route harness, full suite, types and lint all green. Then that got challenged.

*[Point at Surprises / friction.]*

During the AFTER run I accidentally added a second generated demo-no-grant test block instead of editing the existing one. Every check still passed. But the resolver count read two hundred fifty-six instead of two hundred fourteen — exactly forty-two extra cases. That anomaly is what exposed it.

I kept this run rather than rerunning for a cleaner number. It changed the handoff instructions; row-count assertions are a documented follow-up.

## 4:25 – 4:40 — Close on the limitation

*[Stay on §4.4, on "What the two runs show, and no more."]*

So the outcome isn't that change got faster, or that the system is error-proof. It made the provider policy explicit and behavioural changes more mechanically checkable — and the handoff exercise showed exactly where that verification is still weak.

One self-performed run. And the scheduled fix currently protects direct API callers rather than today's UI flow.

That's the result I'd ship with. Thank you.

---

## What changed from Iqbal's draft 1, and why

| Change | Reason |
|---|---|
| ~120 words cut | Draft 1 was 865 spoken words = 5:24 at 160 wpm, 5:46 at 150, before pauses and eight tab switches. The cap is a hard five minutes. |
| "I ran the new harness against the old implementation" → "the harness was committed and run against the old implementation" | `directive.md` B.4 credits the harness to Codex `gpt-6-astra`. |
| "I decided when an AI-generated patch should be rejected" → "made under a review checklist I wrote — and I own the call" | `review-example.md` "Who decided what": Claude made the call under Iqbal's Part 7 rules; Iqbal's signature is the acceptance. The corrected phrasing is also the stronger claim for a lead role. |
| "And I still sent it back" → "And it was sent back" | Same reason; the ownership sentence lands in the next segment. |
| Segment boundaries retimed to end at 4:40 | Draft 1's segments summed to exactly 5:00 — no buffer. |
| "So this gave me much stronger mechanical checks… green tests still aren't enough" cut | The next segment makes the point better. |

Everything else is Iqbal's draft 1 wording. Every number was checked against the committed documents.

## Commands to have ready

Run each once *before* recording so the output is already on screen; during the take you switch tabs rather than type. All are read-only. Run them from the repository root.

**S2 — the scheduled-route change (segment 0:50–2:10).** The narrowed hunk: the old `PROVIDERS.filter` + `find(...) || configured[0]` disappears, a policy literal takes its place, and the new 503 appears. 28 lines, one screen.

```bash
git diff -w -U1 50fa2dc..e5bd47b -- src/app/api/evaluate/scheduled/route.ts | sed -n '/^@@ -37/,/^@@ -60/p' | sed '$d'
```

*Alternative if you prefer syntax colour, or if the terminal reads badly on video:* open `https://github.com/Shiverion/interviewmate-ai/commit/0d88121` — the same change in GitHub's rendering, with the commit message stating what it preserves. Either is fine; do not show both.

*Whole-file diff, only if asked afterwards:* `git diff -w 50fa2dc..e5bd47b -- src/app/api/evaluate/scheduled/route.ts` — 68 lines, needs scrolling, avoid on camera.

**S3 — the baseline table (same segment, second half).** Open `quest/agent-notes.md`, scroll to "Baseline at H"; point at the 703 / 7 / 25 row. No command.

**S5 — the Y2 grep, optional, ~8 s.** Baseline count, then today:

```bash
git grep -cE "configured\[0\]|configured\.find" 50fa2dc -- src/app/api/evaluate src/app/api/demo/evaluate
```

```bash
grep -rnE "configured\[0\]|configured\.find" src/app/api/evaluate src/app/api/demo/evaluate
```

The first prints per-file counts at the baseline; the second prints nothing today. If the quoting fights PowerShell, skip it — the numbers are in Appendix B.3.

**Terminal setup:** font 16–18 pt, roughly 100 columns × 40 rows, clear the screen before each command, and stop the pager waiting for a keypress:

```bash
$env:GIT_PAGER = "cat"
```

## Recording notes

- **Total:** ~4:40 at 150 wpm. If over, cut the second paragraph of 2:10–3:30 (the directive v1 story) down to its last sentence — the rejected patch alone carries the segment.
- **Screens to have open in tabs, in order:** `intent.md` §1/§4 → `handoff.md` §1.2 → terminal with **S2** already run → `agent-notes.md` baseline table (S3) → `review-example.md` top → `council/directive-r1-codex.md` → `directive.md` B.4 → `handoff.md` §4.4. Eight tabs; rehearse the switching once.
- **Do not say** "proves," "guarantees," or "catches every." Say "shows," "checks," "for the asserted cases."
- **Do say** the three "I" sentences in segment 4 exactly — they are the accountable-judgment evidence.
- After recording: paste the Loom link into `directive.md` B.1 (the Loom row) and `effort-log.md`; tell me your final human hours; one last commit and push; then submit the Loom link, `intent.md`, `directive.md`.
