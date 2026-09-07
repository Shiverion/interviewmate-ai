# Inherited product overview

[Documentation home](../README.md) · [Local development](local-development.md) · [Sprint scope](../hr-product-sprint/decisions/001-sprint-scope.md)

Updated: 2026-09-07. Basis: repository review. The features below describe code present before the HR sprint, not a completed live acceptance test.

InterviewMate creates interview sessions, gives candidates an entry link, handles voice/text conversation and presents an AI-generated report to a recruiter. The sprint reuses this foundation to explore the work between a transcript and a reviewed hiring-manager brief.

## Existing capabilities and sprint use

| Area | Inherited implementation | Sprint treatment |
|---|---|---|
| Session setup | Role/JD, candidate details, PDF resume, questions, dates and candidate links | Reuse context; narrow to one fictional frontend role |
| Interview input | OpenAI Realtime voice/text flow, transcript handling and English/Indonesian prompt support | Saved English synthetic transcripts are the core demo input; voice remains optional after verification |
| Report | Seven numeric dimensions, strengths, weaknesses, notable moments, recommendation and transcript export | Reuse display/export foundation; design explicit citations, unknowns, corrections and reviewed state |
| Recruiter workspace | Dashboard, session list, score sorting and individual reports | Reuse navigation; no validated shortlisting algorithm claimed |
| Resume checker | Public `/ats-check`, PDF extraction and deterministic keyword/skill matching | Deferred; known matching defects make it unsuitable as the sprint's main evaluation task |
| Additional panels | Monaco editor, whiteboard, diff viewer and optional GitHub context | Outside the sprint's core scope |

The inherited evaluator's dimensions are communication, reasoning, relevance, technical depth, production experience, skill match and confidence. Its output is not a validated hiring assessment. The [recorded source baseline](../hr-product-sprint/evaluation/current-product-baseline.md) details mandatory scores/evidence, aggregate handling and the report's current lack of editing controls.

## Implementation map

| Component | Source | Responsibility |
|---|---|---|
| Interview creation | [CreateInterviewModal](../../src/components/dashboard/CreateInterviewModal.tsx) | Collect role and candidate inputs |
| Persistence | [Interview helpers](../../src/lib/firebase/interviews.ts) | Store session/template data |
| Candidate entry | [Apply page](<../../src/app/(public)/apply/[sessionId]/page.tsx>) | Load the candidate's session |
| Conversation state | [Interview store](../../src/lib/store/useInterviewStore.ts) | Connect and manage interview state |
| Evaluation | [Evaluate route](../../src/app/api/evaluate/route.ts) | Generate the structured AI report |
| Arithmetic helper | [Scoring utility](../../src/lib/utils/scoring.ts) | Weighted calculation; inspected evaluator does not call it |
| Recruiter report | [Report page](<../../src/app/(recruiter)/interviews/[sessionId]/page.tsx>) | Render results and export |

## Stack and verification boundaries

The [manifest](../../package.json) specifies Next.js 16.1.6, React 19.2.3 and Node.js 20.9.0 or newer. Other components include Firebase Auth/Firestore/Storage, Vercel AI SDK with OpenAI, Zustand, Tailwind CSS, Monaco, diff2html and pdfjs-dist. Consult the manifest and lockfile for dependency versions when changing the implementation.

Four isolated scoring tests passed during the initial review. TypeScript/lint and default development startup had unresolved issues, and a complete live interview/Firebase round trip was not verified. See [local development](local-development.md#known-verification-state) for the recorded boundaries.

The proposed Review Brief is still design work. Its input contract, prompt, review persistence and UI will be specified in [Phase 2](../hr-product-sprint/phases/02-solution-design-and-ai-logic.md), built in Phase 3 and evaluated in Phase 4. Earlier completion and performance claims remain in the [historical archive](../archive/README.md).
