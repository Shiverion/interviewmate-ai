# InterviewMate AI

An AI-powered candidate screening platform featuring an interactive, bilingual virtual assistant. Build comprehensive pre-interview pipelines that evaluate candidates natively over Voice or Text, assessing communication, reasoning, and role-specific relevance automatically.

## Core Features
1. **Interactive AI Avatar:** Conducts real-time WebRTC voice interviews using OpenAI's Realtime API.
2. **Contextual Questioning:** Extracts the candidate's Resume (PDF) natively to inject specific, project-tailored context directly into the AI's system prompt.
3. **Pipeline Management:** A recruiter dashboard allowing you to schedule custom links and lock the interview formats (`Audio Only` vs `Audio & Text`).
4. **Automated Evaluation:** Generates a structured transcript and auto-grades candidates across a custom rubric (1-100%).
5. **BYOK (Bring Your Own Key):** Enterprise-ready, allowing recruiters to securely attach their own OpenAI keys.

## Architecture & Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Actions)
- **Database:** Supabase (Auth, RLS) & Firebase Firestore (Sessions, Templates)
- **Storage:** Firebase Storage (Resume PDF uploads)
- **AI/LLM:** OpenAI Realtime API (Voice) + GPT-4o-mini (Evaluation Pipeline)
- **Styling:** Tailwind CSS + custom design tokens
- **State Management:** Zustand (persisted local stores)

## Local Development Setup

### 1. Prerequisites
Ensure you have Node.js 18+ installed. 

### 2. Environment Variables
Create a `.env.local` file in the root directory and populate it with your specific service keys:

```bash
# OpenAI Key (Fallback if BYOK is disabled)
OPENAI_API_KEY=your_openai_api_key

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Data & Storage
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Public URL (for absolute linking in SEO / Sitemaps)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application. 

### 4. Database Setup
You will need to manually configure:
1. **Supabase**: Enable Google OAuth and Email/Password signups.
2. **Firebase Firestore**: We use two primary collections `interview_templates` and `interview_sessions`. Ensure your CORS rules permit your origin.
3. **Firebase Storage**: Create a `/resumes` bucket with public read access but restricted write access.

## Deployment
This project is configured out-of-the-box for **Vercel** with a GitHub Actions CI pipeline.
1. Connect your repository to Vercel.
2. Map all environment variables from `.env.local` natively into the Vercel dashboard.
3. Hit Deploy. The provided `next.config.ts` handles the `canvas` parsing dependency natively for Vercel Serverless environments.
