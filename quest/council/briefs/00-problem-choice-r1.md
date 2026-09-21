# Council question: existing project vs. new tiny service for a hiring "Quest"

You are ONE advisor in a small panel. Write your answer directly in this response. Do not delegate, do not spawn subagents, do not wait for anyone. Keep it under 400 words. Do not over-analyze — give a clear recommendation with reasons and one concrete plan sketch.

## The Quest (summary)
"Make AI-Assisted Code Easier to Trust and Change." Role: AI-native engineering lead. Suggested effort 6–8 hours total incl. docs and a 5-min Loom.
- Use a SMALL repo the candidate owns (or a licensed sample). If needed, create a tiny service with ONE user-facing flow and deliberately introduce a clearly labelled defect (e.g. duplicated business logic, unreliable retries, missing validation, expensive repeated query). Limit to one flow.
- Tasks: compare ≥3 quality problems, baseline, pick one by user impact / maintenance effort / operating cost; state non-goals. Write a quality yardstick + initial directive for an AI coding agent. Implement & review a focused change; keep an example of AI output corrected/rejected; readable diff + decision record. Before/after checks (correctness + a measure like execution time, requests per op, steps to modify). Handoff exercise + review checklist.
- Deliverables: Loom, intent.md, directive.md (with appendix linking repo, diff, checks, review example, decision record).
- Scoring: problem selection & scope 20%, engineering & review quality 30%, verification & maintainability 25%, human+AI workflow 15%, communication/handoff 10%. Pass ≥76.
- Allowed to adapt existing work but must label what pre-existed vs. what changed; no retroactive-instruction claims. No secrets, no employer/customer data.

## Candidate existing projects (candidate = Iqbal, AI/data engineer)
1. **InterviewMate** (Virtual AI Interviewer Assistant) — Next.js, Firebase, OpenAI realtime. ~183 source files, 136 commits, has Jest tests + Cypress. Largest and most mature. Many subsystems (ai, audio, realtime, integrity, benchmark, keys...).
2. **Paprika** — Next.js 15 + Firebase + Gemini 2.5 Flash; turns academic papers into infographics/quizzes/etc. ~42 source files, 12 commits, NO tests. One core flow: `POST /api/analyze` (paper-fetcher → pdf-parser → gemini → usage/credits + rate-limiter via Firestore fixed window). Billing-protected. A service-account JSON file sits in the repo root (would need sanitizing).
3. **Financial wellness agent** — FastAPI backend (routers: ai, auth, goals, market, portfolio, receipts, transactions; services: agent_service, ai_service, market_agent...) + frontend, Redis, DB. 21 commits, no tests visible. Larger surface.

Option 4: build a NEW tiny service (one flow, seeded defect) purely for the quest.

## Question
Should Iqbal (a) adapt one existing project — and if so which, and which single flow — or (b) build a new tiny service with a labelled defect? Judge against the rubric and the 6–8h budget. Consider: credibility with reviewers (real recurring problem vs. synthetic), reproducibility for the reviewer (can they run it without Firebase/OpenAI keys?), risk of scope creep, and how easy it is to show a measurable before/after. End with: recommendation, the one flow, three candidate problems to compare, and the metric to measure.
