export interface EvaluationScores {
    communication: number;
    reasoning: number;
    relevance: number;
    technical_depth: number;
    production_experience: number;
    skill_match: number;
    confidence: number;
}

// Weighted average matching the evaluate/route.ts AI prompt weights
export function calculateOverallScore(scores: EvaluationScores): number {
    return Math.round(
        scores.communication * 0.15 +
        scores.reasoning * 0.20 +
        scores.relevance * 0.15 +
        scores.technical_depth * 0.20 +
        scores.production_experience * 0.15 +
        scores.skill_match * 0.10 +
        scores.confidence * 0.05
    );
}

export function isPassingScore(scorePercentage: number, threshold: number = 75): boolean {
    return scorePercentage >= threshold;
}

export type HiringRecommendation = "strong_hire" | "hire" | "borderline" | "no_hire";

export function getRecommendationFromScore(score: number): HiringRecommendation {
    if (score >= 90) return "strong_hire";
    if (score >= 75) return "hire";
    if (score >= 60) return "borderline";
    return "no_hire";
}
