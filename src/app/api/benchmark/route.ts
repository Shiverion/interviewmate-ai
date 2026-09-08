import { benchmarkPost } from "@/lib/benchmark/server";
import { loadCases } from "@/lib/benchmark/dataset";
import { profiles } from "@/lib/benchmark/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = benchmarkPost;
export function GET() {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return Response.json(
    { ...loadCases(), providers: profiles() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
