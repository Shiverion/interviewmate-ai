import { PROVIDERS } from "@/lib/ai/catalog";
import { healthSnapshot } from "@/lib/ai/health";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      health: healthSnapshot(),
      providers: PROVIDERS.map((p) => ({
        id: p.id,
        configured: !!process.env[p.env]?.trim(),
        model: process.env[`EVALUATION_${p.id.toUpperCase()}_MODEL`] || p.model,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
