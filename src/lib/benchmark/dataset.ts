import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CRITERIA, validateRequest } from "../review-brief/contract";
import adaptations from "../../../docs/hr-product-sprint/evaluation/dataset/id-pilot-v1/adaptations.json";
import { inputHash } from "../review-brief/handler";
import type { BenchmarkCase, Reference } from "./types";

export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
type OriginalReference = {
  scenario: string;
  criteria: Record<
    (typeof CRITERIA)[number],
    {
      expectedStatus: string;
      rationale: string;
      unknownCheckpoints: { description: string }[];
      permissibleClaims: { support: { turnId: string; quote: string }[] }[];
    }
  >;
};
export function loadCases() {
  const root = path.join(
    process.cwd(),
    "docs/hr-product-sprint/evaluation/dataset/v1"
  );
  const read = (name: string) =>
    JSON.parse(readFileSync(path.join(root, name), "utf8"));
  const catalog = read("catalog.json") as {
    cases: { id: string; kind: "base" | "variant"; split: string }[];
  };
  const cases: BenchmarkCase[] = catalog.cases.map((item) => {
    const checked = validateRequest(read(item.id + ".request.json"));
    if (!checked.ok) throw new Error("Invalid frozen dataset");
    const raw = read(item.id + ".reference.json") as OriginalReference;
    const reference: Reference = {
      scenario: raw.scenario,
      criteria: Object.fromEntries(
        CRITERIA.map((id) => [
          id,
          {
            expectedStatus: raw.criteria[id].expectedStatus,
            rationale: raw.criteria[id].rationale,
            unknowns: raw.criteria[id].unknownCheckpoints.map(
              (x) => x.description
            ),
            support: raw.criteria[id].permissibleClaims.flatMap(
              (x) => x.support
            ),
          },
        ])
      ) as Reference["criteria"],
    };
    return {
      id: item.id,
      language: "en",
      kind: item.kind,
      pairedWith: item.kind === "variant" ? item.id.split("-")[0] : null,
      split: item.split,
      input: checked.data,
      inputHash: inputHash(checked.data),
      reference,
      referenceHash: digest(reference),
    };
  });
  for (const [id, texts] of Object.entries(adaptations.translations)) {
    const original = cases.find((c) => c.id === id)!;
    if (texts.length !== original.input.turns.length)
      throw new Error("Adaptation turn count changed");
    const checked = validateRequest({
      ...original.input,
      transcriptId: "ID-" + id,
      transcriptVersion: adaptations.version,
      turns: original.input.turns.map((turn, index) => ({
        ...turn,
        id: "ID-" + turn.id,
        text: texts[index],
      })),
    });
    if (!checked.ok) throw new Error("Invalid adaptation");
    const input = checked.data;
    const reference: Reference = {
      ...original.reference,
      criteria: Object.fromEntries(
        CRITERIA.map((key) => [
          key,
          {
            ...original.reference.criteria[key],
            support: original.reference.criteria[key].support.map((support) => {
              const turn = input.turns.find(
                (t) => t.id === "ID-" + support.turnId
              )!;
              return { turnId: turn.id, quote: turn.text };
            }),
          },
        ])
      ) as Reference["criteria"],
    };
    cases.push({
      id: input.transcriptId,
      language: "id",
      kind: "adaptation",
      pairedWith: id,
      split: "development_adaptation_pending_human_review",
      input,
      inputHash: inputHash(input),
      reference,
      referenceHash: digest(reference),
    });
  }
  return {
    cases,
    datasetHash: digest({
      cases,
      adaptationAuthorship: adaptations.authorship,
    }),
  };
}
