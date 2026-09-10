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
    const config = grant
      ? configurationSchema.parse(
          req.body ? (await limitedJson(req, 30000)).configuration || {} : {}
        )
      : undefined;
    const duration =
      config?.durationMinutes === "unlimited"
        ? 30
        : config?.durationMinutes || 8;
    if (grant) await consumeReviewer(grant, duration);
    const lease = await reserve(
      grant ? `reviewer:${grant.id}` : visitor(req).id,
      undefined,
      false,
      grant
        ? {
            reviewerId: grant.id,
            dailyStarts: grant.dailyStarts,
            expiresAt: grant.expiresAt,
            durationMs: duration * 60000,
            configuration: config,
          }
        : undefined
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
