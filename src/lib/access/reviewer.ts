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
import { firestoreLedgerEnabled, withLedger } from "@/lib/demo/ledger";
import { z } from "zod";
const invitation = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  label: z.string().max(100),
  codeHash: z.string().regex(/^[a-f0-9]{64}$/),
  // Kept alongside codeHash (which alone verifies redemption) so the admin
  // can re-copy a link later — invitations predating this field have none.
  code: z.string().optional(),
  expiresAt: z.number().nullable(),
  revoked: z.boolean().default(false),
  dailyStarts: z.number().int().min(1).max(100).default(30),
  budgetUnits: z.number().min(1).max(10000).default(500),
  maxRedemptions: z.number().int().min(1).max(1000).nullable().default(null),
  redeemedBy: z.array(z.string()).max(1000).default([]),
  createdAt: z.number().default(() => Date.now()),
});
export type ReviewerGrant = z.infer<typeof invitation>;
export const accessDirectory = () =>
  path.resolve(process.env.DEMO_STATE_DIR || ".demo-state");
export async function invitations() {
  if (firestoreLedgerEnabled()) {
    const stored = await withLedger((data) => data.reviewerInvitations ?? []);
    return z.array(invitation).max(100).parse(stored);
  }
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
function notExpired(i: ReviewerGrant) {
  return i.expiresAt === null || i.expiresAt > Date.now();
}
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
      (i) => i.id === id && !i.revoked && notExpired(i)
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
export async function redeemReviewer(
  code: string,
  visitorId: string,
  email: string
) {
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
  const normalizedEmail = email.trim().toLowerCase();
  const hash = createHash("sha256").update(code.trim()).digest("hex");
  const list = await invitations();
  const grant = list.find(
    (i) =>
      timingSafeEqual(Buffer.from(i.codeHash), Buffer.from(hash)) &&
      !i.revoked &&
      notExpired(i)
  );
  if (!grant) throw Error("Invitation invalid, expired or revoked.");
  if (
    grant.maxRedemptions !== null &&
    !grant.redeemedBy.includes(normalizedEmail) &&
    grant.redeemedBy.length >= grant.maxRedemptions
  )
    throw Error(
      "This invitation has reached its maximum number of participants."
    );
  if (!grant.redeemedBy.includes(normalizedEmail)) {
    await writeInvitations((current) =>
      current.map((i) =>
        i.id === grant.id
          ? { ...i, redeemedBy: [...i.redeemedBy, normalizedEmail] }
          : i
      )
    );
  }
  return { grant, cookie: grant.id + "." + sign(grant.id) };
}

async function ensureCookieSecret() {
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
}

async function writeInvitations(
  mutate: (current: ReviewerGrant[]) => ReviewerGrant[]
) {
  if (firestoreLedgerEnabled()) {
    return withLedger((data) => {
      const current = z
        .array(invitation)
        .max(100)
        .parse(data.reviewerInvitations ?? []);
      const next = mutate(current);
      data.reviewerInvitations = next;
      return next;
    });
  }
  if (process.env.REVIEWER_INVITES_JSON)
    throw Error(
      "Invitation management is handled by the configured invite store."
    );
  const dir = accessDirectory();
  await mkdir(dir, { recursive: true });
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
  const next = mutate(current);
  await writeFile(file, JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

export async function createReviewerInvitation(input: {
  label: string;
  expiresInDays: number | null;
  maxRedemptions: number | null;
}) {
  await ensureCookieSecret();
  const code = randomBytes(24).toString("base64url");
  const grant: ReviewerGrant = {
    id: randomUUID(),
    label: input.label,
    codeHash: createHash("sha256").update(code).digest("hex"),
    code,
    expiresAt:
      input.expiresInDays == null
        ? null
        : Date.now() + input.expiresInDays * 86400000,
    revoked: false,
    dailyStarts: 30,
    budgetUnits: 500,
    maxRedemptions: input.maxRedemptions,
    redeemedBy: [],
    createdAt: Date.now(),
  };
  await writeInvitations((current) => [...current, grant]);
  return {
    id: grant.id,
    label: grant.label,
    code,
    expiresAt: grant.expiresAt,
    dailyStarts: grant.dailyStarts,
    budgetUnits: grant.budgetUnits,
    maxRedemptions: grant.maxRedemptions,
  };
}

export async function listReviewerInvitations() {
  const list = await invitations();
  return list
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((i) => ({
      id: i.id,
      label: i.label,
      code: i.code ?? null,
      expiresAt: i.expiresAt,
      revoked: i.revoked,
      maxRedemptions: i.maxRedemptions,
      redeemedCount: i.redeemedBy.length,
      createdAt: i.createdAt,
    }));
}

export async function setInvitationRevoked(id: string, revoked: boolean) {
  let found = false;
  await writeInvitations((current) =>
    current.map((i) => {
      if (i.id !== id) return i;
      found = true;
      return { ...i, revoked };
    })
  );
  if (!found) throw Error("Invitation not found.");
}

export async function deleteReviewerInvitation(id: string) {
  let found = false;
  await writeInvitations((current) => {
    const next = current.filter((i) => i.id !== id);
    found = next.length !== current.length;
    return next;
  });
  if (!found) throw Error("Invitation not found.");
}
export async function saveHumanRecord(grant: ReviewerGrant, record: unknown) {
  await consumeReviewer(grant, 0);
  const body = JSON.stringify(record);
  if (body.length > 200000) throw Error("Review exceeds storage limit.");
  const id = createHash("sha256")
    .update(grant.id + body)
    .digest("hex");
  if (firestoreLedgerEnabled()) {
    await withLedger((data) => {
      const reviews = (data.humanReviews ??= {});
      reviews[`${grant.id}:${id}`] = {
        grantId: grant.id,
        id,
        record,
      };
    });
    return id;
  }
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
