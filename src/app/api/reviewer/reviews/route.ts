import { NextRequest } from "next/server";
import { requestReviewer, saveHumanRecord } from "@/lib/access/reviewer";
import { limitedJson, sameOrigin } from "@/lib/demo/http";
import { z } from "zod";
import { createHash } from "node:crypto";
const record = z.object({
  version: z.literal("human-ground-truth-v2"),
  source: z
    .object({
      sessionId: z.string().optional(),
      fixtureId: z.string().optional(),
      transcriptVersion: z.string(),
      model: z.string(),
      provider: z.string(),
      synthetic: z.boolean(),
    })
    .refine((s) => !!s.sessionId || !!s.fixtureId),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  rubricVersion: z.string(),
  evaluation: z.unknown(),
  transcript: z.unknown(),
  reviewerId: z.string().trim().min(1).max(80),
  criteriaJudgments: z.record(
    z.string(),
    z.enum(["supported", "overstated", "understated", "not_assessable"])
  ),
  notes: z.string().max(3000),
  submittedAt: z.iso.datetime(),
});
export async function POST(req: NextRequest) {
  const grant = await requestReviewer(req);
  if (!grant || !sameOrigin(req))
    return Response.json(
      { error: "Reviewer access required." },
      { status: 403 }
    );
  try {
    const raw = await limitedJson(req, 200000);
    const body = record.parse(raw);
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          transcript: raw.transcript,
          source: raw.source,
          assessment: raw.evaluation,
        })
      )
      .digest("hex");
    if (hash !== body.sourceHash) throw Error("Source mismatch");
    const evaluation = z
      .object({
        schemaVersion: z.literal("competency-evidence-v2"),
        competencies: z
          .array(z.object({ id: z.string() }))
          .min(1)
          .max(8),
      })
      .parse(body.evaluation);
    if (
      body.rubricVersion !== evaluation.schemaVersion ||
      evaluation.competencies.some((c) => !body.criteriaJudgments[c.id]) ||
      Object.keys(body.criteriaJudgments).length !==
        evaluation.competencies.length
    )
      throw Error("Incomplete judgments");
    const id = await saveHumanRecord(grant, {
      ...body,
      receivedAt: new Date().toISOString(),
      invitationId: grant.id,
    });
    return Response.json({ id, saved: true });
  } catch {
    return Response.json(
      { error: "Review is invalid or could not be saved." },
      { status: 422 }
    );
  }
}
