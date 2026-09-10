import { NextRequest, NextResponse } from "next/server";
import { requestReviewer, redeemReviewer } from "@/lib/access/reviewer";
import { limitedJson, sameOrigin, visitor, reply } from "@/lib/demo/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const grant = await requestReviewer(req);
  return NextResponse.json(
    {
      mode: grant ? "reviewer" : "demo",
      reviewer: grant
        ? {
            id: grant.id,
            label: grant.label,
            expiresAt: grant.expiresAt,
            dailyStarts: grant.dailyStarts,
            budgetUnits: grant.budgetUnits,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = await limitedJson(req, 1000);
    if (typeof body.code !== "string" || body.code.length > 200)
      throw Error("Enter an invitation code.");
    const { grant, cookie } = await redeemReviewer(body.code, visitor(req).id);
    const res = reply(req, {
      mode: "reviewer",
      expiresAt: grant.expiresAt,
    });
    res.cookies.set("interviewmate-reviewer", cookie, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: Math.floor((grant.expiresAt - Date.now()) / 1000),
    });
    return res;
  } catch (e) {
    return reply(
      req,
      { error: e instanceof Error ? e.message : "Invitation unavailable." },
      403
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const res = NextResponse.json({ mode: "demo" });
  res.cookies.delete("interviewmate-reviewer");
  return res;
}
