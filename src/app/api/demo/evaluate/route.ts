import { NextRequest } from "next/server";
import { z } from "zod";
import {
  claimEvaluation,
  demoAvailability,
  ownedLease,
  saveEvaluation,
} from "@/lib/demo/ledger";
import { limitedJson, reply, sameOrigin, visitor } from "@/lib/demo/http";
import { assessEvidence } from "@/lib/ai/assess";
import { resolveProvider } from "@/lib/ai/provider-resolution";
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
  role: z.string().max(6500).optional(),
  cv: z.string().max(24000).optional(),
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
    // With a grant and *no* configured provider the old code fell back to the
    // literal "openai"; the resolver keeps the requested provider instead. Both
    // are unreachable: demoAvailability() above already returned 503 unless
    // OPENAI_API_KEY is set, so at least one provider is always configured here.
    const resolution = resolveProvider({
      requested: body.provider,
      policy: grant
        ? {
            credentialSource: "server",
            allowFallback: true,
            onUnconfigured: "substitute",
            onNoneConfigured: "proceed",
          }
        : {
            credentialSource: "server",
            allowFallback: body.allowFallback,
            onUnconfigured: "proceed",
            onNoneConfigured: "proceed",
          },
      env: process.env,
    });
    if (!resolution.ok) throw new Error("Evaluation unavailable.");
    const selectedProvider = resolution.provider;
    await claimEvaluation(owner, body.sessionId, selectedProvider);
    if (grant) await consumeReviewer(grant, 3);
    const result = await assessEvidence(
      selectedProvider,
      resolution.key,
      body.transcript,
      lease.configuration || configurationSchema.parse({}),
      {
        host: true,
        fallbackKeys: resolution.fallbackKeys ?? {},
        jobContext: {
          role:
            body.role ||
            [lease.jobTitle, lease.jobDescription].filter(Boolean).join("\n"),
          cvText: lease.resumeText || body.cv,
        },
      }
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
