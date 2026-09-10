/** @jest-environment node */
import { defaultConfiguration } from "@/lib/interview/config";
import { finalizeEvidence, type EvidenceDraft } from "./evidence";

const draft = (quote: string): EvidenceDraft => ({
  competencies: [
    {
      id: "reasoning",
      label: "Technical reasoning",
      description: "Decisions and tradeoffs.",
      level: 3,
      relevance: "direct",
      consistency: "consistent",
      quotes: [{ turn: 1, quote }],
      rationale: "The answer describes a concrete decision.",
    },
  ],
});

test("evidence quote matching tolerates punctuation and whitespace normalization", () => {
  const result = finalizeEvidence(
    draft("I built a queue, then measured retries."),
    [
      {
        role: "user",
        text: "I built a queue then measured retries",
      },
    ],
    defaultConfiguration()
  );
  expect(result.competencies[0].quotes).toHaveLength(1);
  expect(result.competencies[0].level).toBe(3);
});

test("unsupported quotes are dropped without discarding the evaluation", () => {
  const result = finalizeEvidence(
    draft("I launched a payment platform globally."),
    [{ role: "user", text: "I built a queue and measured retries." }],
    defaultConfiguration()
  );
  expect(result.competencies[0].quotes).toEqual([]);
  expect(result.competencies[0].level).toBe(0);
  expect(result.competencies[0].status).toBe("Not Assessed");
});
