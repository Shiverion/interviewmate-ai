import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { resumeText, jobTitle, jobDescription, sessionId } = await req.json() as {
            resumeText: string;
            jobTitle: string;
            jobDescription: string;
            sessionId?: string;
        };

        if (!resumeText || !jobDescription) {
            return NextResponse.json({ error: "resumeText and jobDescription are required" }, { status: 400 });
        }

        const apiKey = req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key missing" }, { status: 401 });
        }

        const openai = createOpenAI({ apiKey });

        const atsSchema = z.object({
            overall_match: z.number().min(0).max(100).describe("Overall ATS compatibility score (0-100) between this resume and the job description."),
            keyword_match: z.number().min(0).max(100).describe("Percentage of key JD terms, technologies, and skills found in the resume."),
            experience_alignment: z.number().min(0).max(100).describe("How well the candidate's experience level and domain matches what the JD requires."),
            skills_coverage: z.number().min(0).max(100).describe("Percentage of required/preferred skills from JD that appear in the resume."),
            matched_keywords: z.array(z.string()).describe("List of JD keywords that were found in the resume."),
            missing_keywords: z.array(z.string()).describe("Important JD keywords missing from the resume that an ATS would flag."),
            red_flags: z.array(z.string()).describe("Potential ATS red flags: employment gaps, inconsistent titles, missing sections, etc."),
            strengths: z.array(z.string()).describe("Resume strengths relevant to this specific role."),
            summary: z.string().describe("2-3 sentence ATS screening summary for the recruiter.")
        });

        console.log(`[ATS-SCORE] Scoring resume against JD for role: ${jobTitle}`);

        const result = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: atsSchema,
            system: `You are an expert ATS (Applicant Tracking System) and recruiting specialist. Analyze resume-JD compatibility like a top-tier ATS would. Focus on keyword density, skill coverage, experience alignment, and formatting signals. Be precise with keyword extraction.`,
            prompt: `JOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n"""\n${jobDescription.substring(0, 4000)}\n"""\n\nCANDIDATE RESUME:\n"""\n${resumeText.substring(0, 6000)}\n"""\n\nGenerate a detailed ATS compatibility analysis.`
        });

        const atsData = result.object;
        console.log(`[ATS-SCORE] Done. Overall match: ${atsData.overall_match}%`);

        // Persist to Firestore if sessionId provided
        if (sessionId && !sessionId.startsWith("demo-")) {
            try {
                const sessionRef = doc(db, "interview_sessions", sessionId);
                await updateDoc(sessionRef, { ats_score: atsData });
                console.log(`[ATS-SCORE] Persisted to session ${sessionId}`);
            } catch (e) {
                console.warn("[ATS-SCORE] Failed to persist, continuing anyway:", e);
            }
        }

        return NextResponse.json({ success: true, ats_score: atsData }, { status: 200 });

    } catch (error: unknown) {
        console.error("ATS Score Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
