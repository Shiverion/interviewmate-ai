import { z } from "zod";

export const evaluationSchema = z.object({
  scores: z.object({
    communication: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Clarity, structure, vocabulary, and professionalism of spoken responses."
      ),
    reasoning: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Logical approach, problem decomposition, and quality of analytical thinking."
      ),
    relevance: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "How directly the candidate addressed the specific questions and stayed on topic."
      ),
    technical_depth: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Depth and accuracy of technical knowledge — specificity over buzzwords, real understanding."
      ),
    production_experience: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Evidence of real shipped work: ownership, scale, real-world constraints, incident response."
      ),
    skill_match: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "How closely the candidate's demonstrated skills match the job description requirements."
      ),
    confidence: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "Decisiveness, clear conviction in answers, appropriate certainty vs. hedging."
      ),
  }),
  evidence: z.object({
    strengths: z
      .array(z.string())
      .min(1)
      .max(4)
      .describe(
        "Specific strengths with concrete examples from the transcript."
      ),
    weaknesses: z
      .array(z.string())
      .min(1)
      .max(4)
      .describe(
        "Specific gaps or weaknesses with concrete examples from the transcript."
      ),
    notable_moments: z
      .array(z.string())
      .min(0)
      .max(3)
      .describe(
        "Standout moments — either exceptionally strong or notably poor — worth flagging."
      ),
  }),
  recommendation: z
    .enum(["strong_hire", "hire", "borderline", "no_hire"])
    .describe(
      "Hiring recommendation: strong_hire (90+), hire (75-89), borderline (60-74), no_hire (<60)."
    ),
  feedback: z
    .string()
    .describe(
      "3-4 sentence professional summary for the recruiter: overall impression, top strength, top gap, role fit verdict."
    ),
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Weighted score: communication 15%, reasoning 20%, relevance 15%, technical_depth 20%, production_experience 15%, skill_match 10%, confidence 5%."
    ),
  is_passing: z
    .boolean()
    .describe(
      "True if overallScore >= 75 AND recommendation is 'hire' or 'strong_hire'."
    ),
});
