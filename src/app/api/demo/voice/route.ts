import { NextRequest } from "next/server";
import { z } from "zod";
import {
  attachCall,
  DEMO_LIMITS,
  demoAvailability,
  hangupCalls,
  ownedLease,
  quota,
  releasePending,
  reserve,
  startDemoReaper,
} from "@/lib/demo/ledger";
import { limitedJson, reply, sameOrigin, visitor } from "@/lib/demo/http";
import { requestReviewer } from "@/lib/access/reviewer";
import { configurationSchema } from "@/lib/interview/config";
import { createRealtimeCall, RealtimeFailure } from "@/lib/realtime/service";
import { languageSchema } from "@/lib/interview/language";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const grant = await requestReviewer(req),
    unavailable = demoAvailability();
  if (unavailable)
    return reply(req, {
      available: false,
      message: unavailable,
      limits: DEMO_LIMITS,
    });
  startDemoReaper();
  try {
    return reply(req, {
      available: true,
      mode: grant ? "reviewer" : "demo",
      dailyLimit: grant?.dailyStarts || 5,
      limits: DEMO_LIMITS,
      ...(await quota(
        grant ? `reviewer:${grant.id}` : visitor(req).id,
        grant?.dailyStarts,
        grant ? 100 : DEMO_LIMITS.globalStarts
      )),
    });
  } catch {
    return reply(
      req,
      { available: false, message: "Usage storage unavailable." },
      503
    );
  }
}
const input = z.object({
  sdp: z.string().min(20).max(18000),
  sessionId: z.string().regex(/^demo-reviewer-[a-f0-9-]{36}$/),
  language: languageSchema.optional(),
  configuration: configurationSchema.optional(),
  role: z.string().max(6500).optional(),
  cv: z.string().max(24000).optional(),
  projects: z.string().max(12000).optional(),
  recovery: z.string().max(8000).optional(),
});
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return reply(req, { error: "Open the demo to connect." }, 403);
  const unavailable = demoAvailability();
  if (unavailable) return reply(req, { error: unavailable }, 503);
  const grant = await requestReviewer(req),
    owner = grant ? `reviewer:${grant.id}` : visitor(req).id;
  if (!req.cookies.get("reviewer-demo") && !grant)
    return reply(req, { error: "Open the demo page first." }, 401);
  let reservation: Awaited<ReturnType<typeof reserve>> | undefined;
  try {
    const body = input.parse(await limitedJson(req, 75000));
    reservation = await reserve(owner, body.sessionId);
    await hangupCalls(reservation.id);
    if ((await ownedLease(owner, reservation.id)).callIds.length)
      throw Error("Previous connection is still closing. Retry shortly.");
    startDemoReaper();
    const configuration = configurationSchema.parse(
      reservation.configuration || {
        language: body.language || body.configuration?.language,
        maxTurns: 8,
      }
    );
    if (
      configuration.voiceProvider === "gemini" &&
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
    )
      throw Error(
        "The host has not configured Gemini voice. Choose OpenAI voice or add the host Gemini key."
      );
    const result = await createRealtimeCall({
      key: process.env.OPENAI_API_KEY!,
      sdp: body.sdp,
      configuration,
      role: grant ? body.role || "Frontend Engineer" : "Frontend Engineer",
      cv: grant ? body.cv : undefined,
      projects: grant ? body.projects : undefined,
      recovery: body.recovery,
      host: true,
    });
    try {
      await attachCall(reservation.id, result.callId);
    } catch {
      await fetch(
        `https://api.openai.com/v1/realtime/calls/${result.callId}/hangup`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          signal: AbortSignal.timeout(10000),
        }
      );
      throw Error("Could not save call usage.");
    }
    return reply(req, {
      sdp: result.sdp,
      sessionId: reservation.id,
      expiresAt: reservation.expiresAt,
      diagnostic: grant ? result.diagnostic : undefined,
    });
  } catch (e) {
    if (reservation) await releasePending(reservation.id).catch(() => {});
    return reply(
      req,
      {
        error:
          e instanceof z.ZodError
            ? "Invalid voice request."
            : e instanceof Error
              ? e.message
              : "Connection failed.",
        ...(e instanceof RealtimeFailure && grant
          ? { diagnostic: e.diagnostic }
          : {}),
      },
      e instanceof z.ZodError ? 422 : reservation ? 502 : 429
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return reply(req, { error: "Invalid origin." }, 403);
  try {
    const { sessionId } = z
      .object({ sessionId: z.string().max(100) })
      .parse(await limitedJson(req, 200));
    const grant = await requestReviewer(req),
      owner = grant ? `reviewer:${grant.id}` : visitor(req).id;
    await ownedLease(owner, sessionId);
    await hangupCalls(sessionId);
    const pending = (await ownedLease(owner, sessionId)).callIds.length > 0;
    return reply(
      req,
      { stopped: !pending, retryPending: pending },
      pending ? 202 : 200
    );
  } catch {
    return reply(
      req,
      { error: "Could not stop the demo. Expiry enforcement will retry." },
      400
    );
  }
}
