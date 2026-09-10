import { NextRequest } from "next/server";
import { z } from "zod";
import {
  claimEvaluation,
  demoAvailability,
  ownedLease,
  saveEvaluation,
} from "@/lib/demo/ledger";
import { limitedJson, reply, sameOrigin, visitor } from "@/lib/demo/http";
import { PROVIDERS, type AIProvider } from "@/lib/ai/catalog";
import { assessEvidence } from "@/lib/ai/assess";
import { configurationSchema } from "@/lib/interview/config";
import { requestReviewer, consumeReviewer } from "@/lib/access/reviewer";
export const runtime = "nodejs";
const input = z.object({
  sessionId: z.string().max(100),
  provider: z.enum(["openai", "gemini", "deepseek"]),
  allowFallback: z.boolean().default(false),
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
  if (!sameOrigin(req)) return reply(req, { error: "Invalid origin." }, 403);
  const unavailable = demoAvailability();
  if (unavailable) return reply(req, { error: unavailable }, 503);
  try {
    const body = input.parse(await limitedJson(req, 150000)),
      grant = await requestReviewer(req),
      owner = grant ? `reviewer:${grant.id}` : visitor(req).id,
      lease = await ownedLease(owner, body.sessionId);
    const configuredProviders = PROVIDERS.filter((p) =>
      process.env[p.env]?.trim()
    );
    const selectedProvider = grant
      ? (configuredProviders.find((p) => p.id === body.provider) ||
          configuredProviders[0])?.id || "openai"
      : body.provider;
    await claimEvaluation(owner, body.sessionId, selectedProvider);
    if (grant) await consumeReviewer(grant, 3);
    const provider = PROVIDERS.find((p) => p.id === selectedProvider)!;
    const fallbackKeys: Partial<Record<AIProvider, string>> = {};
    if (body.allowFallback || grant)
      for (const p of PROVIDERS) {
        if (process.env[p.env]) fallbackKeys[p.id] = process.env[p.env];
      }
    const result = await assessEvidence(
      selectedProvider,
      process.env[provider.env],
      body.transcript,
      lease.configuration || configurationSchema.parse({}),
      { host: true, fallbackKeys }
    );
    await saveEvaluation(owner, body.sessionId, {
      transcript: body.transcript,
      evaluation: result.object,
      model: result.model,
      provider: result.provider,
    });
    return reply(req, {
      evaluation: result.object,
      provider: result.provider,
      model: result.model,
      diagnostic: grant ? result.diagnostic : undefined,
      persisted: true,
    });
  } catch (e) {
    return reply(
      req,
      {
        error:
          e instanceof z.ZodError
            ? "Transcript exceeds input limits."
            : e instanceof Error
              ? e.message
              : "Evaluation unavailable.",
      },
      502
    );
  }
}
