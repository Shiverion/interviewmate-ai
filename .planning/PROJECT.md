# InterviewMate AI — Project Vision

## Overview

InterviewMate AI is an AI-powered candidate screening platform that automates first-round interviews using a **graphical virtual assistant with interactive voice capabilities**. Candidates interact with an animated AI avatar that conducts adaptive, structured interviews via real-time voice conversation or text. The system evaluates responses against standardized rubrics and provides recruiters with ranked dashboards and structured reports.

## Core Value Proposition

- **For Recruiters:** Reduce time-to-shortlist by 50%, screen 5x more candidates with consistent evaluation
- **For Candidates:** On-demand, flexible interviews with an engaging, human-like AI avatar experience
- **For Hiring Managers:** Data-driven shortlisting with full transcripts and rubric-based scoring

## Key Differentiators

1. **Graphical Virtual Assistant** — Animated avatar provides a human-like interview experience (not a static chatbot)
2. **Interactive Voice Conversation** — Real-time bidirectional voice using OpenAI Realtime API
3. **Resume-Aware Questioning** — AI generates tailored questions from JD + resume context
4. **Consistent Evaluation** — Standardized rubric scoring eliminates human bias

## Technical Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js | SSR/SSG, Vercel-optimized, file-based routing |
| Backend/DB | Firebase (Firestore + Auth + Storage) | Managed NoSQL, auth, storage, security rules |
| Hosting | Vercel | Serverless, auto-scaling, GitHub CI/CD |
| AI Core | OpenAI Agents + Realtime API | Conversation management + real-time voice |
| Transcription | Whisper API | High-accuracy speech-to-text |
| Avatar | 2D animated avatar (e.g., Lottie/SVG) | Visual engagement during interviews, lightweight |

## Constraints

- Solo developer
- Standard budget tier (~$1,745-$2,945/mo operational at scale)
- English only for MVP
- No ATS integrations, video, or live human interviews in MVP
- GDPR-compliant data handling

## Success Criteria

- >500 interviews/week at scale
- >85% interview completion rate
- >40% reduction in time-to-shortlist
- NPS >40
