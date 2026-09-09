import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { evaluateWithProvider } from "@/lib/ai/evaluation";
import { evaluationSchema } from "@/lib/ai/evaluation-schema";
import { isProvider } from "@/lib/ai/catalog";

export const dynamic = "force-dynamic";

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
      candidateName,
    }: {
      sessionId?: string;
      transcript?: TranscriptLine[];
      jobTitle?: string;
      jobDescription?: string;
      candidateName?: string;
    } = await req.json();

    if (!sessionId && (!transcript || transcript.length === 0)) {
      return NextResponse.json(
        { error: "sessionId or transcript is required" },
        { status: 400 }
      );
    }

    const isDemoSession = !sessionId || sessionId.startsWith("demo-");
    console.log(
      `[EVALUATE] Starting evaluation. sessionId=${sessionId || "none"} demoMode=${isDemoSession}`
    );

    let sessionRef: ReturnType<typeof doc> | null = null;
    let sessionData: Record<string, unknown> | null = null;
    let transcriptArr: TranscriptLine[] = transcript || [];
    let jobContext = "";
    let shouldPersist = false;

    if (!isDemoSession && sessionId) {
      sessionRef = doc(db, "interview_sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef).catch((err) => {
        console.error(`[EVALUATE] Fetch failed: ${err.message}`);
        throw err;
      });

      if (sessionSnap.exists()) {
        sessionData = sessionSnap.data();
        shouldPersist = true;
      } else if (transcriptArr.length === 0) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
    }

    if (shouldPersist && sessionData?.status === "evaluated") {
      return NextResponse.json(
        {
          message: "Already evaluated",
          evaluation: sessionData.evaluation,
          persisted: true,
        },
        { status: 200 }
      );
    }

    if (
      transcriptArr.length === 0 &&
      shouldPersist &&
      Array.isArray(sessionData?.final_transcript)
    ) {
      transcriptArr = sessionData.final_transcript as TranscriptLine[];
    }

    if (!transcriptArr || transcriptArr.length === 0) {
      return NextResponse.json(
        { error: "No transcript available to evaluate" },
        { status: 400 }
      );
    }

    const formattedTranscript = transcriptArr
      .map((t) => `[${t.role.toUpperCase()}]: ${t.text}`)
      .join("\n");

    if (shouldPersist && sessionData?.template_id) {
      const templateRef = doc(
        db,
        "interview_templates",
        String(sessionData.template_id)
      );
      const templateSnap = await getDoc(templateRef).catch((err) => {
        throw err;
      });
      if (templateSnap.exists()) {
        const temp = templateSnap.data();
        jobContext = `\nROLE: ${temp.job_title}\nDESCRIPTION:\n${temp.job_description}\n`;
      }
    } else if (jobTitle || jobDescription) {
      jobContext = `\nROLE: ${jobTitle || "Not specified"}\nDESCRIPTION:\n${jobDescription || "Not specified"}\n`;
    }

    const selection = req.headers.get("x-ai-provider") || "openai";
    if (!isProvider(selection))
      return NextResponse.json(
        { error: "Unknown evaluation provider" },
        { status: 400 }
      );
    const apiKey = (
      req.headers.get("x-ai-key") ||
      (selection === "openai" ? req.headers.get("x-openai-key") : "") ||
      ""
    ).trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Add a key for the selected evaluation provider in Settings.",
        },
        { status: 401 }
      );
    }

    // 7-dimension evaluation schema inspired by hiring-agent's rubric pattern

    console.log(
      `[EVALUATE] Generating 7-dimension evaluation for session ${sessionId || candidateName}`
    );
    const result = await evaluateWithProvider(
      selection,
      apiKey,
      evaluationSchema,
      `You are a Senior Technical Recruiter and Hiring Manager. Evaluate interview transcripts with rigorous, evidence-based scoring across 7 dimensions. Be critical but fair — reward specificity, penalize vagueness and generic answers.${jobContext}\n\nWEIGHTED SCORING:\ncommunication 15% + reasoning 20% + relevance 15% + technical_depth 20% + production_experience 15% + skill_match 10% + confidence 5% = overallScore\n\nSet is_passing=true ONLY if overallScore>=75 AND recommendation is 'hire' or 'strong_hire'.`,
      `CANDIDATE TRANSCRIPT:\n"""\n${formattedTranscript}\n"""\n\nGenerate the full 7-dimension structured evaluation with evidence and recommendation.`
    );

    const evaluationData = result.object;
    console.log(
      `[EVALUATE] Done. Score: ${evaluationData.overallScore}% | Recommendation: ${evaluationData.recommendation}`
    );

    if (shouldPersist && sessionRef) {
      await updateDoc(sessionRef, {
        status: "evaluated",
        evaluation: evaluationData,
        evaluation_provider: result.provider,
        evaluation_model: result.model,
      }).catch((err) => {
        throw err;
      });
    }

    return NextResponse.json(
      {
        success: true,
        evaluation: evaluationData,
        persisted: shouldPersist,
        provider: result.provider,
        model: result.model,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Evaluation Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
