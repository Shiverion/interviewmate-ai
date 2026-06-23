import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

export const dynamic = 'force-dynamic';

type TranscriptLine = {
    role: "user" | "assistant";
    text: string;
};

export async function POST(req: Request) {
    try {
        const {
            sessionId,
            transcript,
            jobTitle,
            jobDescription,
            candidateName
        }: {
            sessionId?: string;
            transcript?: TranscriptLine[];
            jobTitle?: string;
            jobDescription?: string;
            candidateName?: string;
        } = await req.json();

        if (!sessionId && (!transcript || transcript.length === 0)) {
            return NextResponse.json({ error: "sessionId or transcript is required" }, { status: 400 });
        }

        const isDemoSession = !sessionId || sessionId.startsWith("demo-");
        console.log(`[EVALUATE] Starting evaluation. sessionId=${sessionId || "none"} demoMode=${isDemoSession}`);

        let sessionRef: ReturnType<typeof doc> | null = null;
        let sessionData: Record<string, unknown> | null = null;
        let transcriptArr: TranscriptLine[] = transcript || [];
        let jobContext = "";
        let shouldPersist = false;

        if (!isDemoSession && sessionId) {
            sessionRef = doc(db, "interview_sessions", sessionId);
            const sessionSnap = await getDoc(sessionRef).catch(err => {
                console.error(`[EVALUATE] Fetch failed: ${err.message}`);
                throw err;
            });

            if (sessionSnap.exists()) {
                sessionData = sessionSnap.data();
                shouldPersist = true;
            } else if (transcriptArr.length === 0) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 });
            }
        }

        if (shouldPersist && sessionData?.status === "evaluated") {
            return NextResponse.json(
                { message: "Already evaluated", evaluation: sessionData.evaluation, persisted: true },
                { status: 200 }
            );
        }

        if (transcriptArr.length === 0 && shouldPersist && Array.isArray(sessionData?.final_transcript)) {
            transcriptArr = sessionData.final_transcript as TranscriptLine[];
        }

        if (!transcriptArr || transcriptArr.length === 0) {
            return NextResponse.json({ error: "No transcript available to evaluate" }, { status: 400 });
        }

        const formattedTranscript = transcriptArr.map((t) => `[${t.role.toUpperCase()}]: ${t.text}`).join("\n");

        if (shouldPersist && sessionData?.template_id) {
            const templateRef = doc(db, "interview_templates", String(sessionData.template_id));
            const templateSnap = await getDoc(templateRef).catch(err => { throw err; });
            if (templateSnap.exists()) {
                const temp = templateSnap.data();
                jobContext = `\nROLE: ${temp.job_title}\nDESCRIPTION:\n${temp.job_description}\n`;
            }
        } else if (jobTitle || jobDescription) {
            jobContext = `\nROLE: ${jobTitle || "Not specified"}\nDESCRIPTION:\n${jobDescription || "Not specified"}\n`;
        }

        const apiKey = req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key missing" }, { status: 401 });
        }

        const openai = createOpenAI({ apiKey });

        // 7-dimension evaluation schema inspired by hiring-agent's rubric pattern
        const evaluationSchema = z.object({
            scores: z.object({
                communication: z.number().min(0).max(100).describe("Clarity, structure, vocabulary, and professionalism of spoken responses."),
                reasoning: z.number().min(0).max(100).describe("Logical approach, problem decomposition, and quality of analytical thinking."),
                relevance: z.number().min(0).max(100).describe("How directly the candidate addressed the specific questions and stayed on topic."),
                technical_depth: z.number().min(0).max(100).describe("Depth and accuracy of technical knowledge — specificity over buzzwords, real understanding."),
                production_experience: z.number().min(0).max(100).describe("Evidence of real shipped work: ownership, scale, real-world constraints, incident response."),
                skill_match: z.number().min(0).max(100).describe("How closely the candidate's demonstrated skills match the job description requirements."),
                confidence: z.number().min(0).max(100).describe("Decisiveness, clear conviction in answers, appropriate certainty vs. hedging.")
            }),
            evidence: z.object({
                strengths: z.array(z.string()).min(1).max(4).describe("Specific strengths with concrete examples from the transcript."),
                weaknesses: z.array(z.string()).min(1).max(4).describe("Specific gaps or weaknesses with concrete examples from the transcript."),
                notable_moments: z.array(z.string()).min(0).max(3).describe("Standout moments — either exceptionally strong or notably poor — worth flagging.")
            }),
            recommendation: z.enum(["strong_hire", "hire", "borderline", "no_hire"]).describe("Hiring recommendation: strong_hire (90+), hire (75-89), borderline (60-74), no_hire (<60)."),
            feedback: z.string().describe("3-4 sentence professional summary for the recruiter: overall impression, top strength, top gap, role fit verdict."),
            overallScore: z.number().min(0).max(100).describe("Weighted score: communication 15%, reasoning 20%, relevance 15%, technical_depth 20%, production_experience 15%, skill_match 10%, confidence 5%."),
            is_passing: z.boolean().describe("True if overallScore >= 75 AND recommendation is 'hire' or 'strong_hire'.")
        });

        console.log(`[EVALUATE] Generating 7-dimension evaluation for session ${sessionId || candidateName}`);
        const result = await generateObject({
            model: openai("gpt-4o"),
            schema: evaluationSchema,
            system: `You are a Senior Technical Recruiter and Hiring Manager. Evaluate interview transcripts with rigorous, evidence-based scoring across 7 dimensions. Be critical but fair — reward specificity, penalize vagueness and generic answers.${jobContext}\n\nWEIGHTED SCORING:\ncommunication 15% + reasoning 20% + relevance 15% + technical_depth 20% + production_experience 15% + skill_match 10% + confidence 5% = overallScore\n\nSet is_passing=true ONLY if overallScore>=75 AND recommendation is 'hire' or 'strong_hire'.`,
            prompt: `CANDIDATE TRANSCRIPT:\n"""\n${formattedTranscript}\n"""\n\nGenerate the full 7-dimension structured evaluation with evidence and recommendation.`
        });

        const evaluationData = result.object;
        console.log(`[EVALUATE] Done. Score: ${evaluationData.overallScore}% | Recommendation: ${evaluationData.recommendation}`);

        if (shouldPersist && sessionRef) {
            await updateDoc(sessionRef, {
                status: "evaluated",
                evaluation: evaluationData
            }).catch(err => { throw err; });
        }

        return NextResponse.json({ success: true, evaluation: evaluationData, persisted: shouldPersist }, { status: 200 });

    } catch (error: unknown) {
        console.error("Evaluation Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
