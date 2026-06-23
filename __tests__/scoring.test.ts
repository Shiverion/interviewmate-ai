import { calculateOverallScore, isPassingScore, type EvaluationScores } from '../src/lib/utils/scoring';

const perfectScores: EvaluationScores = {
    communication: 100,
    reasoning: 100,
    relevance: 100,
    technical_depth: 100,
    production_experience: 100,
    skill_match: 100,
    confidence: 100
};

describe('AI Evaluation Scoring Utilities', () => {

    it('calculates the perfect score correctly', () => {
        const percentage = calculateOverallScore(perfectScores);
        expect(percentage).toBe(100);
    });

    it('calculates weighted average correctly', () => {
        // communication 15% + reasoning 20% + relevance 15% + technical_depth 20%
        // + production_experience 15% + skill_match 10% + confidence 5%
        const scores: EvaluationScores = {
            communication: 80,
            reasoning: 70,
            relevance: 90,
            technical_depth: 60,
            production_experience: 75,
            skill_match: 85,
            confidence: 65
        };
        const expected = Math.round(80*0.15 + 70*0.20 + 90*0.15 + 60*0.20 + 75*0.15 + 85*0.10 + 65*0.05);
        expect(calculateOverallScore(scores)).toBe(expected);
    });

    it('determines passing threshold correctly (default 75)', () => {
        expect(isPassingScore(80)).toBe(true);
        expect(isPassingScore(74)).toBe(false);
        expect(isPassingScore(75)).toBe(true);
    });

    it('allows custom passing thresholds', () => {
        expect(isPassingScore(85, 90)).toBe(false);
        expect(isPassingScore(85, 80)).toBe(true);
    });
});
