import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requestReviewer, consumeReviewer } from "@/lib/access/reviewer";
import { isVerifiedAdminRequest } from "@/lib/firebase/server-auth";
import { withLedger } from "@/lib/demo/ledger";
import { limitedJson, sameOrigin } from "@/lib/demo/http";
import { configurationSchema } from "@/lib/interview/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const createInput = z
  .object({
    candidateName: z.string().min(1).max(100),
    jobTitle: z.string().min(1).max(200),
    jobDescription: z.string().max(6000),
    resumeText: z.string().max(24000).default(""),
    configuration: configurationSchema,
    startsAt: z.number(),
    endsAt: z.number(),
  })
  .refine((s) => s.endsAt > s.startsAt, "End date must follow start date");
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("admin") === "1") {
    if (!(await isVerifiedAdminRequest(req)))
      return Response.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    const results = await withLedger((d) => [
      ...Object.entries(d.leases)
        .filter(([, lease]) => lease.reviewerId && lease.evaluationResult)
        .map(([leaseId, lease]) => ({
          id: leaseId,
          invitationId: lease.reviewerId,
          candidateName: lease.candidateName,
          jobTitle: lease.jobTitle,
          evaluation: lease.evaluationResult,
          transcript: lease.transcript,
          model: lease.evaluationModel,
          provider: lease.evaluationProvider,
          completed: true,
        })),
      ...Object.values(d.reviewerSessions || {})
        .filter((session) => session.evaluation || session.feedback)
        .map((session) => ({
          id: session.id,
          invitationId: session.owner,
          candidateName: session.candidateName,
          jobTitle: session.jobTitle,
          evaluation: session.evaluation,
          feedback: session.feedback,
          transcript: session.transcript,
          model: session.model,
          provider: session.provider,
          completed: true,
        })),
    ]);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  const grant = await requestReviewer(req);
  if (!grant)
    return Response.json(
      { error: "Reviewer access required." },
      { status: 403 }
    );
  const id = req.nextUrl.searchParams.get("id");
  const result = await withLedger((d) =>
    Object.values(d.reviewerSessions || {}).filter(
      (s) => s.owner === grant.id && (!id || s.id === id)
    )
  );
  return Response.json(
    id ? { session: result[0] || null } : { sessions: result },
    { headers: { "Cache-Control": "no-store" } }
  );
}
export async function POST(req: NextRequest) {
  const grant = await requestReviewer(req);
  if (!grant || !sameOrigin(req))
    return Response.json(
      { error: "Reviewer access required." },
      { status: 403 }
    );
  try {
    await consumeReviewer(grant, 0);
    const submitted = await limitedJson(req, 50000);
    const body = createInput.parse({
      ...submitted,
      configuration: {
        ...(submitted.configuration || {}),
        allowedModes: "audio_and_text",
      },
    });
    const id = "reviewer-" + randomUUID();
    await withLedger((d) => {
      const sessions = (d.reviewerSessions ??= {});
      if (
        Object.values(sessions).filter((s) => s.owner === grant.id).length >=
        100
      )
        throw Error("Reviewer session storage limit reached.");
      sessions[id] = {
        ...body,
        id,
        owner: grant.id,
        status: "scheduled",
        createdAt: Date.now(),
        endsAt: Math.min(body.endsAt, grant.expiresAt),
      };
    });
    return Response.json({ id });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Scheduling failed." },
      { status: 422 }
    );
  }
}
export async function PUT(req: NextRequest) {
  const grant = await requestReviewer(req);
  if (!grant || !sameOrigin(req))
    return Response.json(
      { error: "Reviewer access required." },
      { status: 403 }
    );
  try {
    const body = z
      .object({
        id: z.string().max(100),
        transcript: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              text: z.string().max(5000),
            })
          )
          .max(100)
          .optional(),
        evaluation: z.unknown().optional(),
        model: z.string().max(100).optional(),
        provider: z.string().max(50).optional(),
        feedback: z
          .object({
            overall_experience: z.number().int().min(1).max(5),
            interviewer_clarity: z.number().int().min(1).max(5),
            transcription_accuracy: z.number().int().min(1).max(5),
            question_relevance: z.number().int().min(1).max(5),
            technical_reliability: z.number().int().min(1).max(5),
            comments: z.string().max(1000),
          })
          .optional(),
      })
      .parse(await limitedJson(req, 180000));
    await withLedger((d) => {
      const s = d.reviewerSessions?.[body.id];
      if (!s || s.owner !== grant.id) throw Error("Session unavailable.");
      const nextStatus = body.evaluation
        ? "evaluated"
        : s.status === "evaluated"
          ? "evaluated"
          : "completed";
      Object.assign(s, {
        ...body,
        status: nextStatus,
      });
    });
    return Response.json({ saved: true });
  } catch {
    return Response.json(
      { error: "Could not save reviewer session." },
      { status: 422 }
    );
  }
}
