# InterviewMate AI — Requirements

## Functional Requirements

### FR1: User Management
- **FR1.1:** Two roles — Admin/Recruiter and Candidate
- **FR1.2:** Recruiters sign up/login via Supabase Auth (email + password, Google OAuth)
- **FR1.3:** Candidates access interviews via unique public link (no account needed)
- **FR1.4:** RBAC enforcement — recruiters only see their own data (Supabase RLS)

### FR2: Interview Session Management
- **FR2.1:** Recruiter creates interview by providing Job Title + Job Description
- **FR2.2:** System generates an interview template that can be used multiple times
- **FR2.3:** Recruiter can view all sessions and templates on their dashboard
- **FR2.4:** Session states: Draft → Active → Closed

### FR3: Resume-Based Question Generation (Dual Modes)
- **FR3.1:** Mode 1 (Recruiter Scheduled): Recruiter provides CV from database/upload, schedules the interview, and system pre-generates questions. Recruiter sends specific link to candidate.
- **FR3.2:** Mode 2 (Candidate Upload): Candidate accesses a generic public interview link and uploads their CV directly (PDF/DOCX, max 5MB).
- **FR3.3:** System parses the resume (either pre-loaded or candidate-uploaded) to extract key skills/experience.
- **FR3.4:** OpenAI Agent generates 5-7 tailored questions from JD + resume context.
- **FR3.5:** 2-3 standard behavioral questions are appended.
- **FR3.6:** Questions are presented one at a time.

### FR4: Graphical Virtual Assistant (NEW)
- **FR4.1:** Animated AI avatar displayed during interview sessions
- **FR4.2:** Avatar lip-syncs with AI speech output
- **FR4.3:** Avatar shows emotional states (neutral, listening, thinking, speaking)
- **FR4.4:** Responsive design — avatar works on desktop and mobile
- **FR4.5:** Avatar will be a lightweight 2D animated character (e.g., Lottie/SVG) to ensure fast loading and high performance.

### FR5: Interactive Voice Conversation (Enhanced)
- **FR5.1:** Real-time bidirectional voice using OpenAI Realtime API
- **FR5.2:** Avatar speaks questions aloud with synchronized animation
- **FR5.3:** Candidate responds via microphone with real-time transcription
- **FR5.4:** Natural conversation flow — not strictly turn-based
- **FR5.5:** Fallback to text mode if voice is unavailable or user prefers text
- **FR5.6:** 3-minute max recording per answer (voice mode)

### FR6: Text Interview Mode
- **FR6.1:** Standard chat interface as alternative to voice
- **FR6.2:** Avatar still visible but doesn't speak (types in chat bubbles)
- **FR6.3:** Same question flow as voice mode

### FR7: Automated Evaluation & Scoring
- **FR7.1:** OpenAI Agent evaluates full transcript post-interview
- **FR7.2:** Scores on 1-5 scale: Communication Clarity, Reasoning Ability, Response Relevance
- **FR7.3:** Weighted overall score calculated and displayed
- **FR7.4:** Evaluation includes per-question feedback

### FR8: Interview Transcript Generation
- **FR8.1:** Full timestamped transcript for every completed interview
- **FR8.2:** Clear separation of AI questions vs candidate answers
- **FR8.3:** Available for viewing and download (TXT format)

### FR9: Candidate Ranking Dashboard
- **FR9.1:** Dashboard per interview session with candidate table
- **FR9.2:** Columns: Name, Completion Date, Overall Score, Report Link
- **FR9.3:** Sortable by Overall Score (ascending/descending)
- **FR9.4:** Quick-view summary cards for top candidates

### FR10: Notifications
- **FR10.1:** Email notification to recruiter when candidate completes interview
- **FR10.2:** Email via Supabase Edge Functions or Resend

---

## Non-Functional Requirements

### NFR1: Performance
- API response times < 200ms for 95% of requests
- Real-time transcription latency < 2 seconds
- Avatar animation at 30+ FPS on modern browsers
- Dashboard loads < 3s with 500 candidates

### NFR2: Scalability
- Serverless architecture (Vercel + Supabase)
- Support 100 concurrent interview sessions at peak

### NFR3: Security
- AES-256 encryption at rest and in transit
- RBAC via Supabase Row Level Security
- Input sanitization (XSS, injection prevention)
- GDPR-compliant data handling and deletion

### NFR4: Availability
- 99.9% uptime target

### NFR5: Usability & Accessibility
- Intuitive UI, minimal training needed
- WCAG 2.1 Level AA compliance
- Mobile-responsive design

---

## Technology Decisions

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| Frontend | Next.js 14+ (App Router) | Remix, SvelteKit |
| Backend/DB | Supabase (Postgres + Auth + Storage) | Firebase, PlanetScale |
| Hosting | Vercel | Netlify, Railway |
| AI Agent | OpenAI Agents SDK | LangChain, custom |
| Voice | OpenAI Realtime API | Web Speech API, Deepgram |
| Transcription | Whisper API | Google STT, AssemblyAI |
| Avatar | 2D Animation (Lottie/SVG) | 3D Avatar (too heavy) |
| Email | Resend or Supabase Edge Functions | SendGrid, Mailgun |
| Testing | Jest + Cypress | Vitest + Playwright |
