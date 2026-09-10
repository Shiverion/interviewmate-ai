import { z } from "zod";
import { assessEvidence } from "@/lib/ai/assess";
import { isProvider, PROVIDERS, type AIProvider } from "@/lib/ai/catalog";
import { configurationSchema } from "@/lib/interview/config";
import { limitedJson } from "@/lib/demo/http";
import { isVerifiedAdminRequest } from "@/lib/firebase/server-auth";
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
  role: z.string().max(6500).optional(),
  cv: z.string().max(24000).optional(),
});
export async function POST(req: Request) {
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== new URL(req.url).origin
  )
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = input.parse(await limitedJson(req, 150000));
    const requestedProvider = req.headers.get("x-ai-provider") || "openai";
    if (!isProvider(requestedProvider))
      return Response.json({ error: "Unknown provider." }, { status: 400 });
    let provider: AIProvider = requestedProvider;
    let key =
      req.headers.get("x-ai-key") ||
      (provider === "openai" ? req.headers.get("x-openai-key") : "") ||
      undefined;
    // Recruiters can review and retry evaluations with the server-side
    // workspace provider. Candidate browsers still need their own key for
    // personal interviews, while the verified administrator never needs to
    // copy a provider key into the browser.
    const hostedAdmin = !key && (await isVerifiedAdminRequest(req));
    if (hostedAdmin) {
      const configured = PROVIDERS.filter((item) =>
        process.env[item.env]?.trim()
      );
      const selected =
        configured.find((item) => item.id === requestedProvider) || configured[0];
      if (selected) {
        provider = selected.id;
        key = process.env[selected.env]?.trim();
      }
    }
    let fallbackKeys: Partial<Record<AIProvider, string>> | undefined;
    if (req.headers.get("x-ai-allow-fallback") === "true" || hostedAdmin) {
      const browserKeys = z
        .object({
          openai: z.string().max(500).optional(),
          gemini: z.string().max(500).optional(),
          deepseek: z.string().max(500).optional(),
        })
        .parse(JSON.parse(req.headers.get("x-ai-fallback-keys") || "{}"));
      const serverKeys = hostedAdmin
        ? Object.fromEntries(
            PROVIDERS.filter((item) => process.env[item.env]?.trim()).map(
              (item) => [item.id, process.env[item.env]!.trim()]
            )
          )
        : {};
      fallbackKeys = { ...serverKeys, ...browserKeys } as Partial<
        Record<AIProvider, string>
      >;
    }
    const result = await assessEvidence(
      provider,
      key,
      body.transcript,
      body.configuration || configurationSchema.parse({}),
      {
        fallbackKeys,
        host: hostedAdmin,
        jobContext: { role: body.role, cvText: body.cv },
      }
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
