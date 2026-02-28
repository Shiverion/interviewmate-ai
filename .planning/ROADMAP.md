# InterviewMate AI — Roadmap

## Overview

Comprehensive 10-phase roadmap for building InterviewMate AI as a solo developer. Phases are ordered to prioritize the core AI/Avatar experience early on.

**Total Estimated Timeline**: 10-14 weeks
**Budget Tier**: Standard

---

## Phases

### Phase 1: Project Scaffolding & Design System — ✅ Complete
**Goal**: Set up Next.js project, configure Supabase, establish design system and UI foundations.

**Deliverables**:
- [x] Next.js 14+ project with App Router
- [x] Firebase project connected (client SDK configured)
- [x] Design system: color palette, typography (Inter/Outfit), spacing tokens
- [x] Global layout: responsive shell with nav, sidebar skeleton
- [x] Tailwind CSS or vanilla CSS setup with dark mode support
- [x] ESLint + Prettier + TypeScript strict mode

**Estimated Effort**: 6-8 hours
**Infrastructure Cost**: $0 (free tiers)
**Dependencies**: None

---

### Phase 2: Authentication & User Management — ✅ Complete
**Goal**: Implement recruiter auth and role-based access control.

**Deliverables**:
- [ ] Supabase Auth: email/password + Google OAuth
- [ ] Sign up / Login / Logout flows
- [ ] Protected routes (middleware-based)
- [ ] User profile table with RLS policies
- [ ] Role enforcement (recruiter vs candidate — candidates are anonymous)

**Estimated Effort**: 8-10 hours
**Infrastructure Cost**: $0 (Supabase free tier)
**Dependencies**: Phase 1

---

### Phase 3: Graphical Virtual Assistant (Avatar) — ✅ Complete
**Goal**: Build the 2D animated AI avatar that will be the visual face of the interview.

**Deliverables**:
- [ ] 2D Avatar technology integration (Lottie/SVG animations)
- [ ] Avatar component: idle, listening, thinking, speaking states
- [ ] Lip-sync / state reactivity system (driven by audio/events)
- [ ] Responsive layout: avatar + interview controls
- [ ] Mobile-friendly avatar scaling
- [ ] Avatar loading states and fallbacks

**Estimated Effort**: 12-16 hours
**Infrastructure Cost**: $0
**Dependencies**: Phase 1

---

### Phase 4: Interactive Voice Interview — ✅ Complete
**Goal**: Real-time voice conversation between candidate and AI avatar.

**Deliverables**:
- [x] OpenAI Realtime API integration for bidirectional voice
- [x] WebRTC/WebSocket audio streaming
- [x] Connect voice state to Phase 3 Avatar states
- [x] Candidate mic capture with real-time transcription (Whisper)
- [x] Conversation flow management (question → answer → next)
- [x] 3-minute per-answer timeout
- [x] Audio voice/transcript syncing
- [x] Graceful error handling (mic permissions, network issues)

**Estimated Effort**: 20-24 hours
**Infrastructure Cost**: ~$50-100/month (OpenAI Realtime + Whisper during dev)
**Dependencies**: Phase 3

---

### Phase 5: Interview Session CRUD & Scheduling — ✅ Complete
**Goal**: Core interview session management and recruiter-driven scheduling.

**Deliverables**:
- [x] Firestore collections: `interview_templates`, `interview_sessions`
- [x] Create interview template (Job Title + Job Description)
- [x] Recruiter Scheduled Link Mode: Recruiter provides candidate Name + uploads CV to generate an interview instance.
- [x] Scheduled links have an explicit Start/End date set by the recruiter.
- [x] Interview session list/dashboard for recruiters
- [x] Session states: Draft -> Active (until expiration) -> Closed
- [x] Firebase Security Rules for session isolation

**Estimated Effort**: 12-14 hours
**Infrastructure Cost**: $0 (Firebase free tier)
**Dependencies**: Phase 2

---

### Phase 6: AI Rules, Auto-Ending & Subtitles — ✅ Complete
**Goal**: Implement strict AI instructions, extract CV context, stream subtitles, and enforce a persistent interview timer.

**Deliverables**:
- [x] Integrate `pdf-parse` to extract Candidate Resume natively on the server.
- [x] Inject Resume text directly into the OpenAI Realtime `systemInstructions`.
- [x] Add an `end_interview` function hook allowing AI to natively decide when the interview is complete.
- [x] Hook the function trigger into a Firestore `updateDoc` to autosave the transcript.
- [x] Emit `transcript_delta` chunks from WebRTC locally into the Zustand store.
- [x] Render `activeDeltaMessage` in the UI to stream the AI's words.
- [x] Implement a persistent 15-minute global timer synced to Firestore `started_at` to aggressively end the interview.

**Estimated Effort**: 10-12 hours
**Infrastructure Cost**: ~$5-10/month (OpenAI API during dev)
**Dependencies**: Phase 5

---

### Phase 7: Text Interview Mode — ✅ Complete
**Goal**: Chat-based interview alternative with avatar still visible.

**Deliverables**:
- [x] Chat UI component (message bubbles, typing indicator)
- [x] Avatar present but in "text mode" (no speech, shows reactions via Lottie/SVG)
- [x] Same question flow as voice mode
- [x] Mode selection screen: Voice vs Text
- [x] Interview progress indicator

**Estimated Effort**: 8-10 hours
**Infrastructure Cost**: ~$5/month (OpenAI API)
**Dependencies**: Phase 3, Phase 6

---

### Phase 8: Automated Evaluation & Scoring — ✅ Complete
**Goal**: Post-interview AI evaluation with structured scoring.

**Deliverables**:
- [x] Transcript assembly from voice/text responses
- [x] OpenAI Agent: evaluate against rubric (Communication, Reasoning, Relevance)
- [x] Per-question scoring (1-5 scale) + per-question feedback
- [x] Weighted overall score calculation
- [x] Score storage in DB
- [x] Evaluation status indicator (processing → complete)

**Estimated Effort**: 10-12 hours
**Infrastructure Cost**: ~$10-20/month (OpenAI API)
**Dependencies**: Phase 4 or 7

---

### Phase 9: Reports, Dashboard & Notifications — ✅ Complete
**Goal**: Recruiter-facing views for reviewing results and managing candidates.

**Deliverables**:
- [x] Candidate ranking dashboard (sortable table)
- [x] Individual candidate report page (scores + transcript string layout)
- [x] Transcript download (TXT format)
- [x] Summary cards for top candidates
- [x] Database filtering capabilities natively
- [x] Dashboard filters and search

**Estimated Effort**: 12-14 hours
**Infrastructure Cost**: ~$5/month (email service)
**Dependencies**: Phase 8

---

### Phase 10: Polish, Testing & Deployment — ⏳ Planned
**Goal**: Production-ready quality with testing, CI/CD, and deployment.

**Deliverables**:
- [ ] Unit tests (Jest) — 80% coverage target
- [ ] E2E tests (Cypress) — core user flows
- [ ] Performance optimization (Lighthouse 90+)
- [ ] WCAG 2.1 AA accessibility audit
- [ ] SEO fundamentals (meta tags, OG images)
- [ ] Error monitoring (Sentry or similar)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Vercel production deployment
- [ ] README.md with setup instructions

**Estimated Effort**: 14-16 hours
**Infrastructure Cost**: ~$20-45/month (Vercel Pro + Supabase Pro)
**Dependencies**: Phase 9

---

## Budget Tracking

| Phase | Est. Hours | Actual | Infra/Month | Status |
|-------|-----------|--------|-------------|--------|
| 1 — Scaffolding | 6-8h | - | $0 | ⏳ |
| 2 — Auth | 8-10h | - | $0 | ⏳ |
| 3 — Avatar (2D) | 12-16h | - | $0 | ⏳ |
| 4 — Voice Interview | 20-24h | - | $50-100 | ⏳ |
| 5 — Session CRUD | 12-14h | - | $0 | ⏳ |
| 6 — Resume/Questions| 10-12h | - | $5-10 | ⏳ |
| 7 — Text Interview | 8-10h | - | $5 | ⏳ |
| 8 — Evaluation | 10-12h | - | $10-20 | ⏳ |
| 9 — Dashboard/Reports| 12-14h | - | $5 | ⏳ |
| 10 — Polish + Deploy| 14-16h | - | $20-45 | ⏳ |
| **Totals** | **~112-136h** | - | **$95-180/mo** | - |

**Operational at scale** (500 interviews/week): $1,745-$2,945/month
