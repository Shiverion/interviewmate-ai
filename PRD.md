# Product Requirements Document: InterviewMate AI

## 1. Executive Summary

InterviewMate AI is an enterprise-grade, cloud-native platform designed to automate and scale the initial candidate screening process. By leveraging a conversational AI powered by OpenAI Agents, the system conducts adaptive, structured interviews via voice or text. It automatically transcribes, evaluates, and scores candidate responses against key metrics like communication clarity, reasoning, and relevance. The platform provides recruiters and hiring managers with a ranked dashboard and structured reports, drastically reducing manual screening time, eliminating scheduling conflicts, and ensuring consistent, unbiased evaluation. This enables organizations to identify and shortlist top talent faster, improve recruiter productivity, and enhance the overall hiring workflow.

## 2. Product Scope Definition

This document outlines the requirements for the Minimum Viable Product (MVP) of InterviewMate AI. The primary goal of the MVP is to deliver a functional, end-to-end automated screening experience for a single job role.

**Phase 1: MVP (Target: Q3 2024)**
-   Core user roles: Recruiter/Admin and Candidate.
-   Ability to create a new interview session based on a job description and an uploaded resume.
-   Support for both voice (with real-time transcription) and text-based interview modes.
-   Automated evaluation using a standardized, non-customizable rubric.
-   Generation of interview transcripts and summary reports.
-   A dashboard for recruiters to view and rank all candidates for a specific interview session.
-   Secure user authentication and data handling.

**Phase 2: V2 (Target: Q1 2025)**
-   Integration with major Applicant Tracking Systems (ATS) like Greenhouse and Lever.
-   Customizable evaluation rubrics.
-   Advanced analytics on candidate performance trends.
-   Team collaboration features (e.g., sharing reports, adding notes).

## 3. Target Audience & Personas

### Persona 1: Sarah, The Recruiter

-   **Role:** Corporate Recruiter at a mid-to-large sized tech company.
-   **Goals:**
    -   Quickly identify the top 10-15% of candidates from a pool of 200+ applicants.
    -   Reduce time-to-shortlist from one week to two days.
    -   Provide hiring managers with consistently evaluated, high-quality candidates.
-   **Pain Points:**
    -   Spends 60% of her week on repetitive, first-round phone screens.
    -   Scheduling calls across different time zones is a logistical nightmare.
    -   Subjectivity and fatigue lead to inconsistent evaluations between candidates.
    -   High volume of applicants for popular roles leads to a significant backlog.

### Persona 2: David, The Hiring Manager

-   **Role:** Engineering Manager.
-   **Goals:**
    -   Interview only the most relevant and qualified candidates.
    -   Ensure the initial screening process accurately assesses core reasoning and communication skills.
    -   Make data-driven decisions on who to advance to technical rounds.
-   **Pain Points:**
    -   Wastes valuable time in interviews with candidates who are a poor fit.
    -   Receives inconsistent feedback and notes from recruiters.
    -   Wants to understand a candidate's thought process, not just their resume keywords.

### Persona 3: Alex, The Job Seeker

-   **Role:** Software Engineer applying for a new role.
-   **Goals:**
    -   Demonstrate skills beyond the resume in a fair and objective manner.
    -   Complete the initial screening process on their own schedule, without taking time off work.
    -   Receive a clear and consistent interview experience.
-   **Pain Points:**
    -   Frustrated by long waiting times to hear back after applying.
    -   Feels that 15-minute phone screens are too short to showcase their abilities.
    -   Experiences interview bias and inconsistent questioning from different screeners.

## 4. Core Problems & Objectives

| Core Problem | Business Objective |
| :--- | :--- |
| **High Time & Cost:** Manual screening is resource-intensive and slow. | **Reduce Time-to-Hire:** Decrease the average time from application to shortlist by 50%. |
| **Inconsistent Evaluation:** Human bias and fatigue lead to varied screening quality. | **Improve Evaluation Consistency:** Standardize initial screening with a consistent, rubric-based AI evaluator. |
| **Lack of Scalability:** Difficult to screen hundreds of applicants for a role quickly. | **Increase Recruiter Productivity:** Enable a single recruiter to manage 5x the volume of initial screenings. |
| **Poor Candidate Experience:** Scheduling delays and generic screens frustrate applicants. | **Enhance Candidate Experience:** Provide an on-demand, flexible, and fair initial interview process. |

## 5. Success Metrics (KPIs)

| Category | Metric | Target (First 6 Months) |
| :--- | :--- | :--- |
| **Product Adoption** | Number of interviews conducted per week | > 500 |
| | Number of active organizations | > 25 |
| **User Engagement** | Average interview completion rate | > 85% |
| | Recruiter dashboard weekly active users (WAU) | 70% of registered recruiters |
| **Customer Value** | Customer-reported reduction in time-to-shortlist | > 40% |
| | Net Promoter Score (NPS) | > 40 |
| **Business Impact** | Trial-to-paid conversion rate | > 15% |
| | Monthly Recurring Revenue (MRR) | Achieve $10k MRR |

## 6. Key Features & User Stories

| Feature ID | Feature Name | User Story | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **F01** | **Interview Session Creation** | As a recruiter, I want to create a new interview session by providing a job description so that I can generate a unique link to send to candidates. | - User can create a new "Interview" entity.<br>- Must input a Job Title and Job Description.<br>- System generates a unique, shareable URL for the interview session. |
| **F02** | **Resume-Based Interview Generation** | As a recruiter, I want the AI to automatically generate interview questions based on the job description and the candidate's resume to ensure a personalized and relevant screening. | - On accessing the interview link, the candidate is prompted to upload a resume (PDF, DOCX).<br>- The system parses the resume and JD to identify key skills.<br>- An OpenAI Agent generates a set of 5-7 tailored questions based on this context.<br>- The system includes 2-3 standard behavioral questions. |
| **F03** | **Multi-Modal Interview Interface** | As a candidate, I want to choose between a voice or text-based interview so that I can participate in the format I am most comfortable with. | - Candidate is presented with a clear choice: "Voice Interview" or "Text Interview".<br>- **Voice Mode:** Uses the microphone, provides real-time transcription via Whisper, and has a visible "Stop Recording" button for each answer.<br>- **Text Mode:** Provides a standard chat interface for typing responses. |
| **F04** | **Automated Evaluation & Scoring** | As a recruiter, I want the system to automatically score candidate responses against a standard rubric so I can quickly assess their quality. | - After the interview, an OpenAI Agent evaluates the full transcript.<br>- Scores are assigned on a 1-5 scale for: **Communication Clarity**, **Reasoning Ability**, and **Response Relevance**.<br>- An overall weighted score is calculated and displayed. |
| **F05** | **Interview Transcript Generation** | As a hiring manager, I want to review a full transcript of the interview to understand the candidate's exact responses. | - A full, time-stamped transcript is generated for every completed interview.<br>- The transcript clearly separates AI questions from candidate answers.<br>- Transcript is available for viewing and download (TXT format) from the report page. |
| **F06** | **Candidate Ranking Dashboard** | As a recruiter, I want a dashboard that ranks all candidates for a job so I can easily identify the top performers to move forward. | - A dashboard view exists for each interview session.<br>- It displays a table of candidates with columns for Name, Completion Date, Overall Score, and a link to the detailed report.<br>- The dashboard can be sorted by Overall Score (descending/ascending). |

## 7. Functional Requirements

-   **User Management:**
    -   System must support two roles: Admin/Recruiter and Candidate.
    -   Recruiters must sign up and log in to access their dashboard.
    -   Candidates access interviews via a unique, public link and do not require an account.
-   **Interview Logic:**
    -   The AI agent must present one question at a time.
    -   For voice interviews, there will be a 3-minute maximum recording time per question.
    -   The system must confirm that audio/text for an answer is submitted before proceeding to the next question.
-   **Data Handling:**
    -   Resumes must be parsable from PDF and DOCX formats, with a file size limit of 5MB.
    -   All interview data (transcripts, scores, resumes) must be securely stored and associated with the correct candidate and interview session.
-   **Notifications:**
    -   The recruiter who created the interview session will receive an email notification when a candidate completes an interview.

## 8. Non-Functional Requirements

| Category | Requirement |
| :--- | :--- |
| **Performance** | - API response times must be < 200ms for 95% of requests.<br>- Real-time transcription latency should be < 2 seconds.<br>- Candidate dashboard must load in < 3 seconds with up to 500 candidates. |
| **Scalability** | - The system must be built on a serverless architecture to handle fluctuating loads.<br>- Designed to support at least 100 concurrent interview sessions during peak hours. |
| **Security** | - All data at rest and in transit must be encrypted (AES-256).<br>- Role-Based Access Control (RBAC) must be enforced to ensure recruiters can only see their own data.<br>- All user-provided data must be sanitized to prevent XSS and other injection attacks.<br>- The platform must be compliant with GDPR principles for data privacy and deletion. |
| **Availability** | - The platform must maintain 99.9% uptime. |
| **Usability & Accessibility** | - The user interface must be intuitive and require minimal training.<br>- The platform must comply with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. |

## 9. Architecture Decision Record (ADR)

The technical architecture is designed for rapid development, scalability, and operational efficiency, leveraging a modern, serverless stack.

**Technology Rationale:**
-   **Frontend Framework: Next.js**
    -   **Decision:** We will use Next.js for the entire frontend application.
    -   **Justification:** Next.js offers excellent performance through Server-Side Rendering (SSR) and Static Site Generation (SSG), which is crucial for a fast user experience. Its file-based routing and API routes simplify development. Vercel, our chosen hosting platform, provides first-class, optimized support for Next.js.
-   **Backend & Database: Supabase**
    -   **Decision:** We will use Supabase as our backend-as-a-service platform.
    -   **Justification:** Supabase provides a managed Postgres database, authentication, and storage out-of-the-box. This significantly reduces backend development and maintenance overhead. Its Row Level Security (RLS) is critical for enforcing data isolation between different customer organizations securely.
-   **Deployment & Hosting: Vercel**
    -   **Decision:** The application will be deployed and hosted on Vercel.
    -   **Justification:** Vercel offers a seamless CI/CD pipeline integrated with GitHub. Its serverless architecture automatically scales with traffic, ensuring high availability and performance without manual infrastructure management. It is the most cost-effective and efficient way to deploy and scale a Next.js application.
-   **Core AI Services:**
    -   **OpenAI Agents:** For dynamic interview conversation and response evaluation.
    -   **Whisper API:** For high-accuracy, real-time speech-to-text transcription.
-   **Containerization (for AI services if needed): Docker**
    -   While the main app is serverless, any custom, long-running AI processing tasks will be containerized using Docker and deployed on a service like Azure Container Apps or Google Cloud Run, invoked by the Vercel backend.

## 10. Verification Workflow

-   **Unit & Integration Testing:** The engineering team will write unit tests (Jest) for critical business logic and integration tests for API endpoints. A code coverage target of 80% is required for all new code.
-   **End-to-End (E2E) Testing:** An automated E2E test suite (Cypress) will be created to validate the core user flows:
    1.  Recruiter creates an interview session.
    2.  Candidate receives a link, uploads a resume, and completes a voice-based interview.
    3.  Candidate completes a text-based interview.
    4.  Recruiter views the completed interview report and score on the dashboard.
-   **User Acceptance Testing (UAT):** A two-week UAT phase will be conducted with a pilot group of 5 friendly recruiters. They will be tasked with using the platform for their real-world screening needs and providing feedback via a structured survey.
-   **Performance & Security Audits:** Before public launch, the platform will undergo a performance load test and a third-party security audit to validate NFRs.

## 11. Governance Responsibility

| Role | Name | Responsibilities |
| :--- | :--- | :--- |
| **Product Owner** | [Insert Name] | Owns the product backlog, prioritizes features, and is the final approver for feature releases. |
| **Technical Lead** | [Insert Name] | Owns the technical architecture, ensures code quality, and leads the engineering team. Approves all major technical decisions. |
| **Design Lead** | [Insert Name] | Owns the user experience and interface design. Approves all UI/UX changes before implementation. |

**Approval Process:** All features must be reviewed and approved by the Product Owner, Technical Lead, and Design Lead before being moved into a development sprint.

## 12. Budget & Operational Cost (Estimated)

This is a preliminary estimate for the monthly operational cost of the platform at a moderate scale (500 interviews/week).

| Category | Item | Estimated Monthly Cost (USD) | Notes |
| :--- | :--- | :--- | :--- |
| **Cloud Infrastructure** | Vercel Pro Plan | $20 | For core application hosting. |
| | Supabase Pro Plan | $25 | For database, auth, and storage. |
| **API Services** | OpenAI API (GPT-4) | $1,500 - $2,500 | Assumes ~20k tokens per interview. Highly variable. |
| | Whisper API | $200 - $400 | Assumes ~10 minutes of audio per voice interview. |
| **Human Resources** | 2x Sr. Engineers, 1x PM (part-time) | [Project-based, not operational] | Initial build cost is capitalized. |
| **Total Estimated Monthly Cost** | | **$1,745 - $2,945** | |

## 13. Out of Scope

The following features and functionalities are explicitly **out of scope** for the MVP release to ensure a focused and timely launch:

-   **Direct ATS Integrations:** No direct API integrations with platforms like Greenhouse, Lever, or Workday. Recruiters will manage candidates within InterviewMate AI.
-   **Video Interviews:** The platform will not support video recording or analysis.
-   **Customizable Rubrics:** All interviews will be graded against a single, standardized rubric. The ability for organizations to define their own scoring criteria is slated for V2.
-   **Multi-Language Support:** The platform will only support English for the MVP.
-   **Team Collaboration Features:** No functionality for multiple recruiters to share notes, comment on reports, or manage a shared pool of interviews.
-   **Live Interviews:** The platform only supports asynchronous, on-demand interviews. There is no functionality for a live interview with a human.