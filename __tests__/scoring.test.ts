import { calculateOverallScore, isPassingScore } from '../src/lib/utils/scoring';

describe('AI Evaluation Scoring Utilities', () => {

    it('calculates the perfect score correctly', () => {
        const scores = { communication: 5, reasoning: 5, relevance: 5 };
        const percentage = calculateOverallScore(scores);
        expect(percentage).toBe(100);
    });

    it('calculates a weighted average correctly', () => {
        // Communication 3, Reasoning 4, Relevance 5
        // (3*0.3) + (4*0.3) + (5*0.4) = 0.9 + 1.2 + 2.0 = 4.1
        // (4.1/5) * 100 = 82
        const scores = { communication: 3, reasoning: 4, relevance: 5 };
        const percentage = calculateOverallScore(scores);
        expect(percentage).toBe(82);
    });

    it('determines passing threshold correctly', () => {
        expect(isPassingScore(82)).toBe(true);
        expect(isPassingScore(65)).toBe(false);
        expect(isPassingScore(70)).toBe(true); // default threshold inclusive
    });

    it('allows custom passing thresholds', () => {
        expect(isPassingScore(85, 90)).toBe(false);
        expect(isPassingScore(85, 80)).toBe(true);
    });
});
