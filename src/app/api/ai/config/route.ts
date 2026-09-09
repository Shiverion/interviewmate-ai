import { PROVIDERS } from "@/lib/ai/catalog";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      providers: PROVIDERS.map((p) => ({
        id: p.id,
        configured: !!process.env[p.env]?.trim(),
        model: process.env[`EVALUATION_${p.id.toUpperCase()}_MODEL`] || p.model,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
