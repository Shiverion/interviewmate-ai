import {
  DEFAULT_COMPETENCIES,
  defaultConfiguration,
  configurationSchema,
} from "./config";
import { speechKind, silenceAction } from "./turn-policy";
import {
  finalizeEvidence,
  eligibleEvidence,
  type EvidenceDraft,
} from "../ai/evidence";
import { validatedCvText, parsingFailure } from "../pdf/result";
import { rankRepositories, cleanReadme } from "../github/relevance";
const config = configurationSchema.parse({
  competencies: [...DEFAULT_COMPETENCIES],
});
const lines = [
  {
    role: "user" as const,
    text: "I chose a queue and measured a 30 percent reduction in retries.",
  },
];
const draft: EvidenceDraft = {
  competencies: [
    {
      id: "ownership",
      label: null,
      description: null,
      level: 4,
      relevance: "direct",
      consistency: "consistent",
      quotes: [{ turn: 1, quote: lines[0].text }],
      rationale: "Specific decision and measurement.",
    },
  ],
};
test("new interview configuration leaves additional competency rubric empty", () => {
  expect(defaultConfiguration().competencies).toEqual([]);
});
test("blank optional competency entries are ignored when restoring old setup state", () => {
  const parsed = configurationSchema.parse({
    competencies: [
      { id: "old_one", label: "Old option", description: "   " },
      {
        id: "system_design",
        label: "System design",
        description: "Architecture choices and tradeoffs.",
      },
    ],
  });
  expect(parsed.competencies).toEqual([
    {
      id: "system_design",
      label: "System design",
      description: "Architecture choices and tradeoffs.",
    },
  ]);
});
test("an empty rubric accepts competencies derived from the role context", () => {
  const derived = finalizeEvidence(
    {
      competencies: [
        {
          id: "api_design",
          label: "API design",
          description: "Designing reliable interfaces.",
          level: 3,
          relevance: "direct",
          consistency: "consistent",
          quotes: [{ turn: 1, quote: lines[0].text }],
          rationale: "The answer describes a concrete interface decision.",
        },
      ],
    },
    lines,
    defaultConfiguration()
  );
  expect(derived.competencies).toHaveLength(1);
  expect(derived.competencies[0].label).toBe("API design");
  expect(derived.dimensions.competencyCoverage.total).toBe(1);
});
test.each([
  "",
  "uh hmm",
  "emm anu",
  "[No Evidence Collected — candidate skipped this question]",
  "[Technical failure]",
])("no evidence is stable and never invents a percentage: %s", (text) => {
  const transcript = [{ role: "user" as const, text }];
  expect(eligibleEvidence(transcript)).toBe(false);
  const first = finalizeEvidence({ competencies: [] }, transcript, config);
  for (let i = 0; i < 5; i++)
    expect(finalizeEvidence({ competencies: [] }, transcript, config)).toEqual(
      first
    );
  expect(first.overallScore).toBeNull();
  expect(first.dimensions.evidenceQuality).toBeNull();
  expect(first.dimensions.evidenceScore).toBe(0);
  expect(first.status).toContain("Insufficient Evidence");
});
test("strong partial coverage retains assessed quality without scoring missing answers", () => {
  const result = finalizeEvidence(draft, lines, config);
  expect(result.dimensions.evidenceQuality).toBe(4);
  expect(result.dimensions.competencyCoverage).toEqual({
    assessed: 1,
    total: 4,
  });
  expect(result.dimensions.evidenceScore).toBe(25);
  expect(result.competencies[1].status).toBe("Not Assessed");
  expect(result.overallScore).toBeNull();
});
test("invalid citations are dropped while duplicate competencies are held", () => {
  const invalidCitation = finalizeEvidence(
    {
      ...draft,
      competencies: [
        {
          ...draft.competencies[0],
          quotes: [{ turn: 1, quote: "fabricated" }],
        },
      ],
    },
    lines,
    config
  );
  expect(invalidCitation.competencies[0].quotes).toEqual([]);
  expect(invalidCitation.competencies[0].level).toBe(0);
  expect(() =>
    finalizeEvidence(
      { competencies: [...draft.competencies, ...draft.competencies] },
      lines,
      config
    )
  ).toThrow("duplicate");
  const interviewerCitation = finalizeEvidence(
    draft,
    [{ role: "assistant", text: lines[0].text }],
    config
  );
  expect(interviewerCitation.competencies[0].quotes).toEqual([]);
});
test("deterministic aggregation is invariant to employer, university and title metadata (model fairness remains a separate live test)", () => {
  const profiles = [
    {
      employer: "Prestigious Inc",
      university: "Famous School",
      title: "Senior Engineer",
    },
    {
      employer: "Small Shop",
      university: "Community College",
      title: "Developer",
    },
  ];
  const outputs = profiles.map((profile) => {
    const parsed = configurationSchema.parse({ ...config, ...profile });
    expect(parsed).not.toHaveProperty("employer");
    return finalizeEvidence(draft, lines, parsed);
  });
  expect(outputs[0]).toEqual(outputs[1]);
});
test("fillers, thinking silence and microphone failures have distinct handling", () => {
  expect(speechKind("hmm, uh")).toBe("filler");
  expect(speechKind("uh, I chose a queue")).toBe("meaningful");
  expect(silenceAction(6999, true, false)).toBe("thinking");
  expect(silenceAction(7000, true, false)).toBe("take_your_time");
  expect(silenceAction(17000, true, false)).toBe("offer_repeat_skip");
  expect(silenceAction(20000, false, false)).toBe("microphone_issue");
  expect(silenceAction(20000, true, true)).toBe("listening");
});
test("failed, unsupported and error-string CVs are never grounding", () => {
  expect(validatedCvText(parsingFailure("failed", "Server failure"))).toBe("");
  expect(
    validatedCvText(parsingFailure("no_extractable_text", "Scanned PDF"))
  ).toBe("");
  expect(
    validatedCvText({
      status: "success",
      text: "SERVER_ERROR: unavailable",
      pageCount: 1,
      characterCount: 25,
      warnings: [],
      failureReason: null,
    })
  ).toBe("");
});
test("relevance wins over stars and README context is cleaned and bounded", () => {
  const shared = {
    description: "Project",
    language: "React",
    owner: { login: "candidate" },
    size: 200,
  };
  const top = rankRepositories(
    [
      { ...shared, name: "react-accessibility", stargazers_count: 0 },
      {
        ...shared,
        name: "hello-world-tutorial",
        stargazers_count: 100000,
        fork: true,
      },
    ],
    "React accessibility",
    "candidate"
  );
  expect(top[0].name).toBe("react-accessibility");
  expect(
    cleanReadme("<script>unsafe</script><!--hidden-->" + "x".repeat(9000))
  ).toHaveLength(3500);
  expect(cleanReadme("<script>unsafe</script>Useful")).toBe("Useful");
});
