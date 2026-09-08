import { localHandler } from "@/lib/review-brief/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return Response.json(
      {
        ok: false,
        attemptId: "not-enabled",
        error: {
          code: "NOT_ENABLED",
          message: "This prototype is available only in local development.",
          retryable: false,
          issues: [],
        },
      },
      { status: 404 }
    );
  return localHandler()(request);
}
