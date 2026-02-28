import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generateObject } from "ai";
import { z } from "zod";

// Ensure AI functionality is properly imported.
// In Next.js App Router, using ai-sdk requires creating an OpenAI instance if not using OpenAI generic handlers
import { createOpenAI } from "@ai-sdk/openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }

        console.log(`[EVALUATE] Starting evaluation for session: ${sessionId}`);
        console.log(`[EVALUATE] Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

        // 1. Fetch Session Data
        console.log(`[EVALUATE] Step 1: Fetching session ${sessionId}`);
        const sessionRef = doc(db, "interview_sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef).catch(err => {
            console.error(`[EVALUATE] Step 1 Failed: ${err.message}`);
            throw err;
        });

        if (!sessionSnap.exists()) {
            console.error(`[EVALUATE] Session ${sessionId} not found`);
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const sessionData = sessionSnap.data();
        console.log(`[EVALUATE] Step 1 OK: Session loaded for ${sessionData.candidate_name}`);

        // Prevent double evaluation
        if (sessionData.status === "evaluated") {
            return NextResponse.json({ message: "Already evaluated", evaluation: sessionData.evaluation }, { status: 200 });
        }

        const transcriptArr = sessionData.final_transcript || [];
        if (!transcriptArr || transcriptArr.length === 0) {
            return NextResponse.json({ error: "No transcript available to evaluate" }, { status: 400 });
        }

        // Parse transcript into a readable string for the LLM
        const formattedTranscript = transcriptArr.map((t: any) => `[${t.role.toUpperCase()}]: ${t.text}`).join("\n");

        // 2. Fetch Job Template Data
        console.log(`[EVALUATE] Step 2: Fetching template ${sessionData.template_id}`);
        const templateRef = doc(db, "interview_templates", sessionData.template_id);
        const templateSnap = await getDoc(templateRef).catch(err => {
            console.error(`[EVALUATE] Step 2 Failed: ${err.message}`);
            throw err;
        });

        let jobContext = "";
        if (templateSnap.exists()) {
            const temp = templateSnap.data();
            jobContext = `\nROLE: ${temp.job_title}\nDESCRIPTION:\n${temp.job_description}\n`;
            console.log(`[EVALUATE] Step 2 OK: Template loaded for ${temp.job_title}`);
        } else {
            console.warn(`[EVALUATE] Step 2: Template not found, proceeding without detail.`);
        }

        // Check for BYOK API Key or fallback to strictly server ENV
        const apiKey = req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key missing" }, { status: 401 });
        }

        const openai = createOpenAI({ apiKey });

        // 3. Define Zod Schema for strict Output JSON mapping
        const evaluationSchema = z.object({
            scores: z.object({
                communication: z.number().min(0).max(100).describe("Score from 0 to 100 evaluating clarity, structure, and professionalism of responses."),
                reasoning: z.number().min(0).max(100).describe("Score from 0 to 100 evaluating logical approach, problem-solving, and quality of answers."),
                relevance: z.number().min(0).max(100).describe("Score from 0 to 100 evaluating how well the candidate matched the job description and answered the specific questions asked.")
            }),
            feedback: z.string().describe("A 2-3 sentence overall summary feedback meant for the HR recruiter outlining strengths and weaknesses."),
            overallScore: z.number().min(0).max(100).describe("The mathematically derived average or weighted overall score from 0 to 100, rounded to nearest whole number."),
            is_passing: z.boolean().describe("Whether the candidate passed the interview. True if overallScore is 80 or above, false otherwise.")
        });

        // 4. Generate the Evaluation Matrix
        console.log(`[EVALUATE] Step 3: Generating evaluation with AI for session ${sessionId}`);
        const result = await generateObject({
            model: openai("gpt-4o"),
            schema: evaluationSchema,
            system: `You are an expert HR Recruiter and Technical Evaluator. Your goal is to review transcript records of candidate interviews and objectively grade them against the provided job context.${jobContext}\nCRITICAL INSTRUCTION: Analyze the transcript deeply. Be critical but fair. Score the candidate from 0 to 100. Generate a strict 'is_passing' boolean (requires overall score >= 80 to pass).`,
            prompt: `CANDIDATE TRANSCRIPT to Evaluate:\n"""\n${formattedTranscript}\n"""\n\nGenerate the structured evaluation.`
        });

        const evaluationData = result.object;
        console.log(`[EVALUATE] Step 3 OK: Generated evaluation for ${sessionId}. Score: ${evaluationData.overallScore}%`);

        // 5. Update Firestore Database
        console.log(`[EVALUATE] Step 4: Updating session document`);
        await updateDoc(sessionRef, {
            status: "evaluated",
            evaluation: evaluationData
        }).catch(err => {
            console.error(`[EVALUATE] Step 4 Failed: ${err.message}`);
            throw err;
        });
        console.log(`[EVALUATE] Step 4 OK: Session updated.`);

        return NextResponse.json({ success: true, evaluation: evaluationData }, { status: 200 });

    } catch (error: any) {
        console.error("Evaluation Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
