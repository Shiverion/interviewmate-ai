import { z } from "zod";
import { assessEvidence } from "@/lib/ai/assess";
import { isProvider, type AIProvider } from "@/lib/ai/catalog";
import { configurationSchema } from "@/lib/interview/config";
import { limitedJson } from "@/lib/demo/http";
export const dynamic = "force-dynamic";
const input = z.object({
  sessionId: z.string().max(200).optional(),
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(5000),
      })
    )
    .max(100),
  configuration: configurationSchema.optional(),
});
export async function POST(req: Request) {
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== new URL(req.url).origin
  )
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = input.parse(await limitedJson(req, 150000)),
      provider = req.headers.get("x-ai-provider") || "openai";
    if (!isProvider(provider))
      return Response.json({ error: "Unknown provider." }, { status: 400 });
    const key =
      req.headers.get("x-ai-key") ||
      (provider === "openai" ? req.headers.get("x-openai-key") : "") ||
      undefined;
    let fallbackKeys: Partial<Record<AIProvider, string>> | undefined;
    if (req.headers.get("x-ai-allow-fallback") === "true")
      fallbackKeys = z
        .object({
          openai: z.string().max(500).optional(),
          gemini: z.string().max(500).optional(),
          deepseek: z.string().max(500).optional(),
        })
        .parse(JSON.parse(req.headers.get("x-ai-fallback-keys") || "{}"));
    const result = await assessEvidence(
      provider,
      key,
      body.transcript,
      body.configuration || configurationSchema.parse({}),
      { fallbackKeys }
    );
    return Response.json(
      {
        success: true,
        evaluation: result.object,
        provider: result.provider,
        model: result.model,
        diagnostic: result.diagnostic,
        persisted: false,
        source: {
          sessionId: body.sessionId || null,
          rubricVersion: result.object.schemaVersion,
          evaluatedAt: new Date().toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Invalid transcript or interview configuration."
            : e instanceof Error
              ? e.message
              : "Evaluation unavailable.",
      },
      { status: 422 }
    );
  }
}
