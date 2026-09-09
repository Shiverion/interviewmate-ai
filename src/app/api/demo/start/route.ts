import { NextRequest } from "next/server";
import { demoAvailability, reserve, startDemoReaper } from "@/lib/demo/ledger";
import { reply, sameOrigin, visitor } from "@/lib/demo/http";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req) || !req.cookies.get("reviewer-demo"))
    return reply(req, { error: "Open the demo page first." }, 403);
  const unavailable = demoAvailability();
  if (unavailable) return reply(req, { error: unavailable }, 503);
  startDemoReaper();
  try {
    const lease = await reserve(visitor(req).id, undefined, false);
    return reply(req, { sessionId: lease.id, expiresAt: lease.expiresAt });
  } catch (e) {
    return reply(
      req,
      { error: e instanceof Error ? e.message : "Demo unavailable." },
      429
    );
  }
}
