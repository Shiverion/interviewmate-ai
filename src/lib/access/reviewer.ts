import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
import { withLedger } from "@/lib/demo/ledger";
import { z } from "zod";
const invitation = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  label: z.string().max(100),
  codeHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.number(),
  revoked: z.boolean().default(false),
  dailyStarts: z.number().int().min(1).max(100).default(30),
  budgetUnits: z.number().min(1).max(10000).default(500),
});
export type ReviewerGrant = z.infer<typeof invitation>;
export const accessDirectory = () =>
  path.resolve(process.env.DEMO_STATE_DIR || ".demo-state");
export async function invitations() {
  try {
    const raw =
      process.env.REVIEWER_INVITES_JSON ||
      (await readFile(
        path.join(accessDirectory(), "reviewer-invites.json"),
        "utf8"
      ));
    return z.array(invitation).max(100).parse(JSON.parse(raw));
  } catch {
    return [];
  }
}
const secret = () => {
  const configured =
    process.env.DEMO_COOKIE_SECRET || process.env.REVIEWER_COOKIE_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "";
  try {
    return readFileSync(
      path.join(accessDirectory(), "reviewer-cookie-secret"),
      "utf8"
    ).trim();
  } catch {
    return "";
  }
};
const sign = (id: string) =>
  createHmac("sha256", secret()).update(id).digest("hex");
export async function reviewerGrant(cookie: string | undefined) {
  if (secret().length < 32 || !cookie) return null;
  const [id, sig] = cookie.split(".");
  if (
    !id ||
    !sig ||
    !/^[a-f0-9]{64}$/.test(sig) ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(sign(id)))
  )
    return null;
  return (
    (await invitations()).find(
      (i) => i.id === id && !i.revoked && i.expiresAt > Date.now()
    ) || null
  );
}
export function requestReviewer(req: Request) {
  const cookie = (req.headers.get("cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("interviewmate-reviewer="))
    ?.split("=")
    .slice(1)
    .join("=");
  return reviewerGrant(cookie);
}
export async function consumeReviewer(grant: ReviewerGrant, units: number) {
  return withLedger((d) => {
    const bucket = (d.reviewers ??= {});
    const item = (bucket[grant.id] ??= { units: 0, minute: 0, requests: 0 });
    const minute = Math.floor(Date.now() / 60000);
    if (item.minute !== minute) {
      item.minute = minute;
      item.requests = 0;
    }
    if (item.requests >= 12)
      throw Error("Reviewer rate limit reached. Retry in one minute.");
    if (item.units + units > grant.budgetUnits)
      throw Error("Reviewer budget ceiling reached. Contact the host.");
    item.requests++;
    item.units += units;
    return { used: item.units, limit: grant.budgetUnits };
  });
}
export async function redeemReviewer(code: string, visitorId: string) {
  if (secret().length < 32)
    throw Error(
      "Reviewer access needs a stable server cookie secret of at least 32 characters."
    );
  await withLedger((d) => {
    const minute = Math.floor(Date.now() / 60000);
    const counts = (d.redemptions ??= {});
    for (const k of Object.keys(counts))
      if (!k.startsWith(minute + ":")) delete counts[k];
    for (const k of [`${minute}:global`, `${minute}:${visitorId}`]) {
      if ((counts[k] || 0) >= (k.endsWith(":global") ? 100 : 5))
        throw Error("Too many invitation attempts. Retry in one minute.");
      counts[k] = (counts[k] || 0) + 1;
    }
  });
  const hash = createHash("sha256").update(code.trim()).digest("hex");
  const grant = (await invitations()).find(
    (i) =>
      timingSafeEqual(Buffer.from(i.codeHash), Buffer.from(hash)) &&
      !i.revoked &&
      i.expiresAt > Date.now()
  );
  if (!grant) throw Error("Invitation invalid, expired or revoked.");
  return { grant, cookie: grant.id + "." + sign(grant.id) };
}

export async function createReviewerInvitation(input: {
  label: string;
  expiresInDays: number;
}) {
  if (process.env.REVIEWER_INVITES_JSON)
    throw Error(
      "Invitation creation is managed by the configured invite store."
    );
  const dir = accessDirectory();
  await mkdir(dir, { recursive: true });
  if (secret().length < 32) {
    await writeFile(
      path.join(dir, "reviewer-cookie-secret"),
      randomBytes(32).toString("hex"),
      { flag: "wx", mode: 0o600 }
    ).catch((e) => {
      if (e.code !== "EEXIST") throw e;
    });
  }
  const file = path.join(dir, "reviewer-invites.json");
  let current: ReviewerGrant[] = [];
  try {
    current = z
      .array(invitation)
      .max(100)
      .parse(JSON.parse(await readFile(file, "utf8")));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const code = randomBytes(24).toString("base64url");
  const grant: ReviewerGrant = {
    id: randomUUID(),
    label: input.label,
    codeHash: createHash("sha256").update(code).digest("hex"),
    expiresAt: Date.now() + input.expiresInDays * 86400000,
    revoked: false,
    dailyStarts: 30,
    budgetUnits: 500,
  };
  current.push(grant);
  await writeFile(file, JSON.stringify(current, null, 2), {
    mode: 0o600,
  });
  return {
    id: grant.id,
    label: grant.label,
    code,
    expiresAt: grant.expiresAt,
    dailyStarts: grant.dailyStarts,
    budgetUnits: grant.budgetUnits,
  };
}
export async function saveHumanRecord(grant: ReviewerGrant, record: unknown) {
  await consumeReviewer(grant, 0);
  const body = JSON.stringify(record);
  if (body.length > 200000) throw Error("Review exceeds storage limit.");
  const id = createHash("sha256")
    .update(grant.id + body)
    .digest("hex");
  const dir = path.join(accessDirectory(), "human-reviews", grant.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, id + ".json"), body, {
    flag: "wx",
    mode: 0o600,
  }).catch((e) => {
    if (e.code !== "EEXIST") throw e;
  });
  return id;
}
