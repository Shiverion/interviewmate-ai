import { benchmarkPost } from "@/lib/benchmark/server";
import { loadCases } from "@/lib/benchmark/dataset";
import { profiles } from "@/lib/benchmark/providers";
import { requestReviewer, consumeReviewer } from "@/lib/access/reviewer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const grant = await requestReviewer(req);
  if (!grant)
    return Response.json(
      { error: { message: "Reviewer access required." } },
      { status: 403 }
    );
  try {
    await consumeReviewer(grant, 3);
  } catch {
    return Response.json(
      { error: { message: "Reviewer budget or rate limit reached." } },
      { status: 429 }
    );
  }
  return benchmarkPost(req, true);
}
export async function GET(req: Request) {
  if (!(await requestReviewer(req))) return new Response(null, { status: 404 });
  return Response.json(
    { ...loadCases(), providers: profiles() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
