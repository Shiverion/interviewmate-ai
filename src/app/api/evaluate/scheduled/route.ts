import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { assessEvidence } from "@/lib/ai/assess";
import { resolveProvider } from "@/lib/ai/provider-resolution";
import { configurationSchema } from "@/lib/interview/config";
import { limitedJson, sameOrigin } from "@/lib/demo/http";
import {
  requireScheduledSession,
  ScheduledSessionAccessError,
} from "@/lib/firebase/scheduled-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const input = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{10,150}$/),
  provider: z.enum(["openai", "gemini", "deepseek"]).default("openai"),
  allowFallback: z.boolean().default(true),
  transcript: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        text: z.string().max(5000),
      })
    )
    .max(100),
});

export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = input.parse(await limitedJson(req, 150000));
    const session = await requireScheduledSession(req, body.sessionId, {
      allowCompleted: true,
    });
    const resolution = resolveProvider({
      requested: body.provider,
      policy: {
        credentialSource: "server",
        allowFallback: body.allowFallback,
        onUnconfigured: body.allowFallback ? "substitute" : "refuse",
        onNoneConfigured: "refuse",
      },
      env: process.env,
    });
    if (!resolution.ok)
      return Response.json(
        {
          error:
            resolution.reason === "no_provider_configured"
              ? "No hosted evaluation provider is configured."
              : "Requested evaluation provider is not configured and fallback is disabled.",
        },
        { status: 503 }
      );
    const configuration = configurationSchema.parse(session.data.configuration || {});
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
    const result = await assessEvidence(
      resolution.provider,
      resolution.key,
      body.transcript,
      configuration,
      {
        host: true,
        fallbackKeys: resolution.fallbackKeys,
        jobContext: { role, cvText: cv },
      }
    );
    await session.ref.update({
      evaluation: result.object,
      evaluation_model: result.model,
      evaluation_provider: result.provider,
      status: "evaluated",
      evaluated_at: FieldValue.serverTimestamp(),
    });
    return Response.json(
      {
        evaluation: result.object,
        provider: result.provider,
        model: result.model,
        diagnostic: result.diagnostic,
        persisted: true,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const status =
      error instanceof ScheduledSessionAccessError
        ? error.status
        : error instanceof z.ZodError
          ? 422
          : 502;
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Transcript exceeds input limits."
            : error instanceof Error
              ? error.message
              : "Evaluation unavailable.",
      },
      { status }
    );
  }
}
