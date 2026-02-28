# InterviewMate AI — Roadmap

## Overview

Comprehensive 10-phase roadmap for building InterviewMate AI as a solo developer. Phases are ordered to prioritize the core AI/Avatar experience early on.

**Total Estimated Timeline**: 10-14 weeks
**Budget Tier**: Standard

---

## Phases

### Phase 1: Project Scaffolding & Design System — ⏳ Planned
**Goal**: Set up Next.js project, configure Supabase, establish design system and UI foundations.

**Deliverables**:
- [ ] Next.js 14+ project with App Router
- [ ] Supabase project connected (client SDK configured)
- [ ] Design system: color palette, typography (Inter/Outfit), spacing tokens
- [ ] Global layout: responsive shell with nav, sidebar skeleton
- [ ] Tailwind CSS or vanilla CSS setup with dark mode support
- [ ] ESLint + Prettier + TypeScript strict mode

**Estimated Effort**: 6-8 hours
**Infrastructure Cost**: $0 (free tiers)
**Dependencies**: None

---

### Phase 2: Authentication & User Management — ⏳ Planned
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

### Phase 3: Graphical Virtual Assistant (Avatar) — ⏳ Planned
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

### Phase 4: Interactive Voice Interview — ⏳ Planned
**Goal**: Real-time voice conversation between candidate and AI avatar.

**Deliverables**:
- [ ] OpenAI Realtime API integration for bidirectional voice
- [ ] WebRTC/WebSocket audio streaming
- [ ] Connect voice state to Phase 3 Avatar states
- [ ] Candidate mic capture with real-time transcription (Whisper)
- [ ] Conversation flow management (question → answer → next)
- [ ] 3-minute per-answer timeout
- [ ] Audio recording storage (Supabase Storage)
- [ ] Graceful error handling (mic permissions, network issues)

**Estimated Effort**: 20-24 hours
**Infrastructure Cost**: ~$50-100/month (OpenAI Realtime + Whisper during dev)
**Dependencies**: Phase 3

---

### Phase 5: Interview Session CRUD & Scheduling — ⏳ Planned
**Goal**: Core interview session management and recruiter-driven scheduling.

**Deliverables**:
- [ ] Database schema: interviews, candidates, questions, responses tables
- [ ] Create interview template (Job Title + Job Description)
- [ ] Mode 1 (Recruiter Scheduled): Recruiter uploads candidate CV and schedules an interview instance
- [ ] Mode 2 (Generic Link): Generate a generic URL for candidates to apply directly
- [ ] Interview session list/dashboard for recruiters
- [ ] Session states: Draft → Active → Closed
- [ ] RLS policies for session isolation

**Estimated Effort**: 12-14 hours
**Infrastructure Cost**: $0 (Supabase free tier)
**Dependencies**: Phase 2

---

### Phase 6: Resume Upload & AI Question Generation — ⏳ Planned
**Goal**: Handle CV processing and generate tailored questions based on the selected mode.

**Deliverables**:
- [ ] Candidate landing page
- [ ] Mode 2 CV Upload: UI for candidates to upload CV (PDF/DOCX) on generic link
- [ ] Resume parser (extract text from PDF/DOCX) for both recruiter and candidate flows
- [ ] OpenAI Agent: generate 5-7 tailored questions from JD + resume
- [ ] 2-3 standard behavioral questions appended
- [ ] Question set stored in DB, ready for the Voice/Text interview

**Estimated Effort**: 10-12 hours
**Infrastructure Cost**: ~$5-10/month (OpenAI API during dev)
**Dependencies**: Phase 5

---

### Phase 7: Text Interview Mode — ⏳ Planned
**Goal**: Chat-based interview alternative with avatar still visible.

**Deliverables**:
- [ ] Chat UI component (message bubbles, typing indicator)
- [ ] Avatar present but in "text mode" (no speech, shows reactions via Lottie/SVG)
- [ ] Same question flow as voice mode
- [ ] Mode selection screen: Voice vs Text
- [ ] Interview progress indicator

**Estimated Effort**: 8-10 hours
**Infrastructure Cost**: ~$5/month (OpenAI API)
**Dependencies**: Phase 3, Phase 6

---

### Phase 8: Automated Evaluation & Scoring — ⏳ Planned
**Goal**: Post-interview AI evaluation with structured scoring.

**Deliverables**:
- [ ] Transcript assembly from voice/text responses
- [ ] OpenAI Agent: evaluate against rubric (Communication, Reasoning, Relevance)
- [ ] Per-question scoring (1-5 scale) + per-question feedback
- [ ] Weighted overall score calculation
- [ ] Score storage in DB
- [ ] Evaluation status indicator (processing → complete)

**Estimated Effort**: 10-12 hours
**Infrastructure Cost**: ~$10-20/month (OpenAI API)
**Dependencies**: Phase 4 or 7

---

### Phase 9: Reports, Dashboard & Notifications — ⏳ Planned
**Goal**: Recruiter-facing views for reviewing results and managing candidates.

**Deliverables**:
- [ ] Candidate ranking dashboard (sortable table)
- [ ] Individual candidate report page (scores + transcript + audio playback)
- [ ] Transcript download (TXT format)
- [ ] Summary cards for top candidates
- [ ] Email notification on interview completion (Resend or Supabase Edge Functions)
- [ ] Dashboard filters and search

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
