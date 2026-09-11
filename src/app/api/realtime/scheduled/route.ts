import { NextRequest } from "next/server";
import { z } from "zod";
import { configurationSchema } from "@/lib/interview/config";
import { createRealtimeCall, RealtimeFailure } from "@/lib/realtime/service";
import { limitedJson, sameOrigin } from "@/lib/demo/http";
import {
  requireScheduledSession,
  ScheduledSessionAccessError,
} from "@/lib/firebase/scheduled-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sdp: z.string().min(20).max(18000),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{10,150}$/),
  configuration: configurationSchema,
  role: z.string().max(6500).optional(),
  cv: z.string().max(24000).optional(),
  projects: z.string().max(12000).optional(),
  recovery: z.string().max(8000).optional(),
});

export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = bodySchema.parse(await limitedJson(req, 75000));
    const session = await requireScheduledSession(req, body.sessionId);
    const configuration = configurationSchema.parse(
      session.data.configuration || body.configuration
    );
    const roleSnapshot =
      session.data.role_snapshot && typeof session.data.role_snapshot === "object"
        ? session.data.role_snapshot
        : {};
    const role = [roleSnapshot.job_title, roleSnapshot.job_description]
      .filter((value): value is string => typeof value === "string" && !!value.trim())
      .join("\n")
      .slice(0, 6500);
    const cv =
      session.data.cv_parsing && typeof session.data.cv_parsing === "object"
        ? String(session.data.cv_parsing.text || "").slice(0, 24000)
        : undefined;
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key)
      return Response.json(
        { error: "The hosted interview provider is not configured." },
        { status: 503 }
      );
    const result = await createRealtimeCall({
      key,
      sdp: body.sdp,
      configuration,
      role: role || body.role || "Interview",
      cv: cv || body.cv,
      projects: body.projects,
      recovery: body.recovery,
      host: true,
    });
    return Response.json(
      { ...result, sessionId: body.sessionId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const status =
      error instanceof ScheduledSessionAccessError
        ? error.status
        : error instanceof RealtimeFailure
          ? error.status
          : error instanceof z.ZodError
            ? 422
            : 502;
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid interview configuration."
            : error instanceof Error
              ? error.message
              : "Connection failed.",
        ...(error instanceof RealtimeFailure
          ? { diagnostic: error.diagnostic }
          : {}),
      },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = z
      .object({
        sessionId: z.string().regex(/^[A-Za-z0-9_-]{10,150}$/),
        callId: z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/),
      })
      .parse(await limitedJson(req, 1000));
    await requireScheduledSession(req, body.sessionId, { allowCompleted: true });
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) return Response.json({ stopped: true });
    const response = await fetch(
      `https://api.openai.com/v1/realtime/calls/${body.callId}/hangup`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    return Response.json(
      { stopped: response.ok || response.status === 404 },
      { status: response.ok || response.status === 404 ? 200 : 502 }
    );
  } catch (error) {
    const status =
      error instanceof ScheduledSessionAccessError
        ? error.status
        : error instanceof z.ZodError
          ? 422
          : 502;
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not stop the interview." },
      { status }
    );
  }
}
