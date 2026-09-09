import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
const state = globalThis as typeof globalThis & { demoCookieSecret?: string };
function secret() {
  return (
    process.env.DEMO_COOKIE_SECRET ||
    (state.demoCookieSecret ??= randomBytes(32).toString("hex"))
  );
}
const signature = (id: string) =>
  createHmac("sha256", secret()).update(id).digest("hex");
const visitors = new WeakMap<NextRequest, { id: string; cookie: string }>();
export function visitor(req: NextRequest) {
  const existing = visitors.get(req);
  if (existing) return existing;
  const raw = req.cookies.get("reviewer-demo")?.value || "";
  const [id, sig] = raw.split(".");
  if (
    id &&
    /^[a-f0-9-]{36}$/.test(id) &&
    /^[a-f0-9]{64}$/.test(sig || "") &&
    timingSafeEqual(Buffer.from(signature(id)), Buffer.from(sig))
  )
    return { id, cookie: raw };
  const next = randomUUID();
  const value = { id: next, cookie: next + "." + signature(next) };
  visitors.set(req, value);
  return value;
}
export function reply(req: NextRequest, body: unknown, status = 200) {
  const res = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  res.cookies.set("reviewer-demo", visitor(req).cookie, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 86400 * 7,
  });
  return res;
}
export function sameOrigin(req: NextRequest) {
  return req.headers.get("origin") === req.nextUrl.origin;
}
export async function limitedJson(req: Request, limit = 24000) {
  const reader = req.body?.getReader();
  if (!reader) throw Error("Missing request body.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) {
        await reader.cancel();
        throw Error("Request too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
