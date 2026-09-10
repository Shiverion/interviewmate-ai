import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { configurationSchema } from "@/lib/interview/config";
import { createRealtimeCall, RealtimeFailure } from "@/lib/realtime/service";
import { limitedJson, sameOrigin } from "@/lib/demo/http";
import { POST as hostedVoice } from "@/app/api/demo/voice/route";
export const runtime = "nodejs";
const bodySchema = z.object({
  sdp: z.string().min(20).max(18000),
  configuration: configurationSchema,
  role: z.string().max(6500),
  cv: z.string().max(24000).optional(),
  projects: z.string().max(12000).optional(),
  recovery: z.string().max(8000).optional(),
});
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const key = req.headers.get("x-openai-key")?.trim();
  if (!key) return hostedVoice(req);
  try {
    const body = bodySchema.parse(await limitedJson(req, 75000));
    const result = await createRealtimeCall({ ...body, key, host: false });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Invalid interview configuration."
            : e instanceof Error
              ? e.message
              : "Connection failed.",
        ...(e instanceof RealtimeFailure ? { diagnostic: e.diagnostic } : {}),
      },
      { status: e instanceof RealtimeFailure ? e.status : 422 }
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const key = req.headers.get("x-openai-key")?.trim();
  if (!key) {
    const { DELETE: hostedClose } = await import("@/app/api/demo/voice/route");
    return hostedClose(req);
  }
  try {
    const { callId } = z
      .object({ callId: z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/) })
      .parse(await limitedJson(req, 1000));
    const r = await fetch(
      `https://api.openai.com/v1/realtime/calls/${callId}/hangup`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    return NextResponse.json(
      { stopped: r.ok || r.status === 404 },
      { status: r.ok || r.status === 404 ? 200 : 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "The connection is closing. Retry if needed." },
      { status: 502 }
    );
  }
}
