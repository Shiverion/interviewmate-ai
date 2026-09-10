import { NextRequest } from "next/server";
import { z } from "zod";
import { createReviewerInvitation } from "@/lib/access/reviewer";
import { isVerifiedAdminRequest } from "@/lib/firebase/server-auth";
import { sameOrigin, limitedJson } from "@/lib/demo/http";

export const runtime = "nodejs";

const input = z.object({
  label: z.string().trim().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export async function POST(req: NextRequest) {
  if (!sameOrigin(req) || !(await isVerifiedAdminRequest(req)))
    return Response.json(
      { error: "Administrator access required." },
      { status: 403 }
    );
  try {
    const body = input.parse(await limitedJson(req, 2000));
    return Response.json(
      {
        invitation: await createReviewerInvitation(body),
        redeemPath: "/reviewer",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Could not create invitation.",
      },
      { status: 422 }
    );
  }
}
