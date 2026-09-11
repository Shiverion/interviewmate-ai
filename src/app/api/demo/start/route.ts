import { NextRequest } from "next/server";
import { demoAvailability, reserve, startDemoReaper } from "@/lib/demo/ledger";
import { reply, sameOrigin, visitor, limitedJson } from "@/lib/demo/http";
import { requestReviewer, consumeReviewer } from "@/lib/access/reviewer";
import { configurationSchema } from "@/lib/interview/config";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const grant = await requestReviewer(req);
  if (!sameOrigin(req) || (!grant && !req.cookies.get("reviewer-demo")))
    return reply(req, { error: "Open the demo page first." }, 403);
  const unavailable = demoAvailability();
  if (unavailable) return reply(req, { error: unavailable }, 503);
  startDemoReaper();
  try {
    const payload = req.body ? await limitedJson(req, 50000) : {};
    const submitted = payload.configuration || {};
    const config = configurationSchema.parse(
      grant
        ? { ...submitted, allowedModes: "audio_and_text" }
        : {
            language: submitted.language,
            voiceProvider: submitted.voiceProvider,
            transcriptionModel: submitted.transcriptionModel,
            reasoningEffort: submitted.reasoningEffort,
            allowedModes: "audio_and_text",
            maxTurns: 8,
            durationMinutes: 10,
          }
    );
    const duration =
      config?.durationMinutes === "unlimited"
        ? 30
        : config?.durationMinutes || 8;
    if (
      config?.voiceProvider === "gemini" &&
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
    )
      return reply(
        req,
        {
          error:
            "The host has not configured Gemini voice. Choose OpenAI voice or ask the host to add a Gemini key.",
        },
        422
      );
    if (grant) await consumeReviewer(grant, duration);
    const lease = await reserve(
      grant ? `reviewer:${grant.id}` : visitor(req).id,
      undefined,
      false,
      grant
        ? {
            reviewerId: grant.id,
            dailyStarts: grant.dailyStarts,
            expiresAt: grant.expiresAt ?? Infinity,
            durationMs: duration * 60000,
            configuration: config,
            candidateName:
              typeof payload.candidateName === "string"
                ? payload.candidateName.slice(0, 100)
                : undefined,
            jobTitle:
              typeof payload.jobTitle === "string"
                ? payload.jobTitle.slice(0, 200)
                : undefined,
            jobDescription:
              typeof payload.jobDescription === "string"
                ? payload.jobDescription.slice(0, 6000)
                : undefined,
            resumeText:
              typeof payload.resumeText === "string"
                ? payload.resumeText.slice(0, 24000)
                : undefined,
          }
        : undefined,
      grant ? undefined : config
    );
    return reply(req, {
      sessionId: lease.id,
      expiresAt: lease.expiresAt,
      mode: grant ? "reviewer" : "demo",
      configuration: config,
    });
  } catch (e) {
    return reply(
      req,
      { error: e instanceof Error ? e.message : "Demo unavailable." },
      429
    );
  }
}
