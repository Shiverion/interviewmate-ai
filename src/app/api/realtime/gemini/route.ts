import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { limitedJson, sameOrigin, visitor } from "@/lib/demo/http";
import { requestReviewer } from "@/lib/access/reviewer";
import { attachCall, ownedLease, startDemoReaper } from "@/lib/demo/ledger";
import { configurationSchema } from "@/lib/interview/config";
import {
  openGeminiSession,
  sendGeminiTurn,
  cancelGeminiSession,
  closeGeminiSession,
} from "@/lib/realtime/gemini-sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect"),
    sessionId: z.string().max(100),
    configuration: configurationSchema,
    role: z.string().max(6500),
    cv: z.string().max(24000).optional(),
    projects: z.string().max(12000).optional(),
    recovery: z.string().max(8000).optional(),
  }),
  z.object({
    action: z.literal("send"),
    id: z.string().regex(/^gemini-[a-f0-9-]{36}$/),
    text: z.string().max(20000),
    instructions: z.string().max(4000),
  }),
  z.object({
    action: z.literal("close"),
    id: z.string().regex(/^gemini-[a-f0-9-]{36}$/),
  }),
]);
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  let createdId: string | undefined;
  try {
    const suppliedKey = req.headers.get("x-gemini-key")?.trim();
    const grant = suppliedKey ? null : await requestReviewer(req);
    if (!suppliedKey && !grant && !req.cookies.get("reviewer-demo"))
      return Response.json(
        { error: "Open the demo or provide your Gemini key." },
        { status: 401 }
      );
    const owner = suppliedKey
      ? `byok:${createHash("sha256").update(suppliedKey).digest("hex")}`
      : grant
        ? `reviewer:${grant.id}`
        : visitor(req).id;
    const body = schema.parse(await limitedJson(req, 75000));
    if (body.action === "send") {
      sendGeminiTurn(body.id, owner, body.text, body.instructions);
      return Response.json({ sent: true });
    }
    if (body.action === "close") {
      cancelGeminiSession(body.id, owner);
      return Response.json({ stopped: true });
    }
    const key = suppliedKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key)
      return Response.json(
        { error: "Gemini voice needs a configured Gemini key." },
        { status: 422 }
      );
    let configuration = body.configuration;
    let expiresAt =
      Date.now() +
      (configuration.durationMinutes === "unlimited"
        ? 30
        : configuration.durationMinutes) *
        60000;
    if (!suppliedKey) {
      const lease = await ownedLease(owner, body.sessionId);
      if (
        lease.expiresAt <= Date.now() ||
        !lease.callIds.some((id) => !id.startsWith("gemini-"))
      )
        throw Error("Start the funded transcription connection first.");
      configuration = configurationSchema.parse(
        lease.configuration || {
          language: body.configuration.language,
          voiceProvider: "gemini",
          maxTurns: 8,
        }
      );
      expiresAt = lease.expiresAt;
      startDemoReaper();
    }
    if (configuration.voiceProvider !== "gemini")
      throw Error("This interview is configured for OpenAI voice.");
    const result = await openGeminiSession({
      ...body,
      key,
      owner,
      configuration,
      expiresAt,
      leaseId: suppliedKey ? undefined : body.sessionId,
      role: suppliedKey || grant ? body.role : "Frontend Engineer",
      cv: suppliedKey || grant ? body.cv : undefined,
      projects: suppliedKey || grant ? body.projects : undefined,
    });
    createdId = result.id;
    if (!suppliedKey) await attachCall(body.sessionId, result.id);
    req.signal.addEventListener("abort", () => closeGeminiSession(result.id), {
      once: true,
    });
    if (req.signal.aborted) closeGeminiSession(result.id);
    return new Response(result.stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (createdId) closeGeminiSession(createdId);
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid voice request."
            : error instanceof Error
              ? error.message
              : "Voice unavailable.",
      },
      { status: 422 }
    );
  }
}
