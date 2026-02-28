export function calculateOverallScore(scores: { communication: number, reasoning: number, relevance: number }): number {
    // Basic weighted average: Communication (30%), Reasoning (30%), Relevance (40%)
    const weighted = (scores.communication * 0.3) + (scores.reasoning * 0.3) + (scores.relevance * 0.4);
    // Convert 1-5 scale into a 0-100 percentage layout
    return Math.round((weighted / 5) * 100);
}

export function isPassingScore(scorePercentage: number, threshold: number = 70): boolean {
    return scorePercentage >= threshold;
}
