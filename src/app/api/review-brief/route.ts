import { localHandler } from "@/lib/review-brief/server";
import { requestReviewer, consumeReviewer } from "@/lib/access/reviewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const grant = await requestReviewer(request);
  if (!grant)
    return Response.json(
      {
        ok: false,
        attemptId: "not-enabled",
        error: {
          code: "NOT_ENABLED",
          message: "Reviewer invitation required.",
          retryable: false,
          issues: [],
        },
      },
      { status: 404 }
    );
  try {
    await consumeReviewer(grant, 3);
  } catch {
    return Response.json(
      { error: { message: "Reviewer request or budget limit reached." } },
      { status: 429 }
    );
  }
  return localHandler(true)(request);
}
