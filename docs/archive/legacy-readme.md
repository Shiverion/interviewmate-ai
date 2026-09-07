> **Historical document.** Archived on 2026-09-07 from the pre-sprint product. The original body is preserved below; completion, security, performance and setup claims are not verified sprint evidence. Use the [documentation home](../README.md) for current guidance.

---

# InterviewMate AI

An AI-powered candidate screening platform. Recruiters create interview sessions, candidates receive a unique link and are interviewed by a live AI avatar over voice or text. Results are evaluated automatically across 7 dimensions and surfaced in a recruiter dashboard.

## Features

### Interview Engine
- **Live AI Avatar** — WebRTC voice interview via OpenAI Realtime API with bilingual (EN/ID) support
- **Voice & Text modes** — candidate chooses; text shows real-time subtitles
- **PDF Resume parsing** — resume extracted server-side and injected into the AI's system prompt for contextual questioning
- **GitHub Enrichment** — optional: link a candidate's GitHub username on the template; AI references their real repos

### Visual Panels (split-screen beside the AI avatar)
- **Code Editor** — Monaco (VS Code engine), 12 languages, live-synced to recruiter view via Firestore
- **Whiteboard** — HTML5 canvas with color/brush/eraser, Firestore snapshot sync
- **Code Review** — recruiter supplies a git diff; rendered side-by-side for candidate to critique

### Evaluation
- **7-dimension scoring**: Communication (15%), Reasoning (20%), Relevance (15%), Technical Depth (20%), Production Experience (15%), Skill Match (10%), Confidence (5%)
- **Evidence extraction**: strengths, weaknesses, notable moments
- **Hiring recommendation**: `strong_hire` / `hire` / `borderline` / `no_hire`
- **ATS Pre-screen**: keyword matching runs automatically when candidate opens their link

### ATS Resume Checker (`/ats-check`)
Standalone public tool — no login, no API key required. Upload a PDF resume, paste a job description, get instant scores:
- Overall match %, keyword match %, skills coverage %, experience fit %
- Matched and missing keyword clouds
- Resume strengths and ATS red flags
- Fully algorithmic — zero external API calls

### Recruiter Dashboard
- Session pipeline with status tracking
- Per-candidate report: ATS score card + 7-dimension evaluation grid + evidence + transcript download

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | Firebase Authentication (Google + Email) |
| Database | Firebase Firestore |
| Storage | Firebase Storage (resume PDFs) |
| AI — Voice | OpenAI Realtime API (WebRTC) |
| AI — Evaluation | OpenAI GPT-4o via Vercel AI SDK |
| State | Zustand with persist middleware |
| Styling | Tailwind CSS v4 + custom design tokens |
| Code Editor | `@monaco-editor/react` |
| Diff Viewer | `diff2html` |
| PDF Parsing | `pdfjs-dist` |

## Local Development

### 1. Prerequisites
Node.js 18+

### 2. Environment Variables
Create `.env.local` in the project root (no spaces around `=`):

```bash
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# OpenAI — used for AI evaluation and voice interviews
# Recruiters can also bring their own key via Settings (BYOK)
OPENAI_API_KEY=sk-...

# Optional: raises GitHub API rate limit for /api/github-enrich
GITHUB_TOKEN=ghp_...
```

> The ATS Resume Checker (`/ats-check`) uses deterministic keyword matching — no API key needed.

### 3. Install and Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Firebase Setup
- **Auth**: Enable Email/Password and Google providers
- **Firestore**: Collections used: `interview_sessions`, `interview_templates`, `interview_code`, `interview_whiteboard`
- **Storage**: Create `/resumes` bucket; allow authenticated writes, public reads

## Deployment

Configured for **Vercel**:
1. Connect repository to Vercel
2. Add all `NEXT_PUBLIC_*` and `OPENAI_API_KEY` environment variables in the Vercel dashboard
3. Deploy — `next.config.ts` handles `canvas` and `pdfjs-dist` server-side dependencies automatically
