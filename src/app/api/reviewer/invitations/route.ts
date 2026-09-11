import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createReviewerInvitation,
  listReviewerInvitations,
  setInvitationRevoked,
  deleteReviewerInvitation,
} from "@/lib/access/reviewer";
import { isVerifiedAdminRequest } from "@/lib/firebase/server-auth";
import { sameOrigin, limitedJson } from "@/lib/demo/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const input = z.object({
  label: z.string().trim().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(365).nullable().default(7),
  maxRedemptions: z.number().int().min(1).max(1000).nullable().default(null),
});

export async function GET(req: NextRequest) {
  if (!(await isVerifiedAdminRequest(req)))
    return Response.json(
      { error: "Administrator access required." },
      { status: 403 }
    );
  return Response.json(
    { invitations: await listReviewerInvitations() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

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

const idInput = z.object({ id: z.string().min(1).max(80) });

export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req) || !(await isVerifiedAdminRequest(req)))
    return Response.json(
      { error: "Administrator access required." },
      { status: 403 }
    );
  try {
    const body = idInput
      .extend({ revoked: z.boolean() })
      .parse(await limitedJson(req, 500));
    await setInvitationRevoked(body.id, body.revoked);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message : "Could not update invitation.",
      },
      { status: 422 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req) || !(await isVerifiedAdminRequest(req)))
    return Response.json(
      { error: "Administrator access required." },
      { status: 403 }
    );
  try {
    const body = idInput.parse(await limitedJson(req, 500));
    await deleteReviewerInvitation(body.id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message : "Could not delete invitation.",
      },
      { status: 422 }
    );
  }
}
