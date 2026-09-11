/** @jest-environment node */
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  createReviewerInvitation,
  redeemReviewer,
  reviewerGrant,
  consumeReviewer,
  listReviewerInvitations,
  setInvitationRevoked,
  deleteReviewerInvitation,
} from "./reviewer";
const env = { ...process.env };
let dir: string;
let invitation: Record<string, unknown>;
beforeEach(async () => {
  await mkdir("tmp", { recursive: true });
  dir = await mkdtemp(path.join(process.cwd(), "tmp", "reviewer-test-"));
  process.env.DEMO_STATE_DIR = dir;
  process.env.DEMO_COOKIE_SECRET = "a".repeat(64);
  delete process.env.REVIEWER_INVITES_JSON;
  invitation = {
    id: "test-reviewer",
    label: "Synthetic reviewer",
    codeHash: createHash("sha256").update("test-code").digest("hex"),
    expiresAt: Date.now() + 60000,
    revoked: false,
    dailyStarts: 30,
    budgetUnits: 5,
    maxRedemptions: null,
    redeemedBy: [],
    createdAt: Date.now(),
  };
  await writeFile(
    path.join(dir, "reviewer-invites.json"),
    JSON.stringify([invitation])
  );
});
afterEach(() => {
  process.env = { ...env };
});
test("only a signed unexpired unrevoked invitation grants access", async () => {
  expect(await reviewerGrant("test-reviewer.bad")).toBeNull();
  const { cookie } = await redeemReviewer(
    "test-code",
    "visitor",
    "a@example.com"
  );
  expect((await reviewerGrant(cookie))?.id).toBe("test-reviewer");
  invitation.revoked = true;
  await writeFile(
    path.join(dir, "reviewer-invites.json"),
    JSON.stringify([invitation])
  );
  expect(await reviewerGrant(cookie)).toBeNull();
  invitation.revoked = false;
  invitation.expiresAt = Date.now() - 1;
  await writeFile(
    path.join(dir, "reviewer-invites.json"),
    JSON.stringify([invitation])
  );
  expect(await reviewerGrant(cookie)).toBeNull();
});
test("a null expiresAt never expires", async () => {
  invitation.expiresAt = null;
  await writeFile(
    path.join(dir, "reviewer-invites.json"),
    JSON.stringify([invitation])
  );
  const { cookie } = await redeemReviewer(
    "test-code",
    "visitor",
    "a@example.com"
  );
  expect((await reviewerGrant(cookie))?.id).toBe("test-reviewer");
});
test("budget ceiling survives repeated operations", async () => {
  const { grant } = await redeemReviewer(
    "test-code",
    "visitor",
    "a@example.com"
  );
  await consumeReviewer(grant, 3);
  await expect(consumeReviewer(grant, 3)).rejects.toThrow("budget ceiling");
  expect(await consumeReviewer(grant, 2)).toEqual({ used: 5, limit: 5 });
});
test("invitation guessing is limited for a persistent visitor", async () => {
  for (let i = 0; i < 5; i++)
    await expect(
      redeemReviewer("incorrect", "visitor", "a@example.com")
    ).rejects.toThrow("invalid");
  await expect(
    redeemReviewer("test-code", "visitor", "a@example.com")
  ).rejects.toThrow("Too many");
});
test("a maxRedemptions cap blocks new distinct emails once reached", async () => {
  invitation.maxRedemptions = 1;
  await writeFile(
    path.join(dir, "reviewer-invites.json"),
    JSON.stringify([invitation])
  );
  await redeemReviewer("test-code", "visitor-a", "first@example.com");
  // The same email redeeming again is fine (idempotent), a different one isn't.
  await redeemReviewer("test-code", "visitor-a", "first@example.com");
  await expect(
    redeemReviewer("test-code", "visitor-b", "second@example.com")
  ).rejects.toThrow("maximum number of participants");
});
test("administrator invitation creation returns a redeemable private code", async () => {
  const created = await createReviewerInvitation({
    label: "Created from dashboard",
    expiresInDays: 2,
    maxRedemptions: null,
  });
  expect(created.code).toHaveLength(32);
  const { grant } = await redeemReviewer(
    created.code,
    "new-visitor",
    "a@example.com"
  );
  expect(grant.id).toBe(created.id);
  expect(grant.label).toBe("Created from dashboard");
});
test("administrator invitation creation supports no expiration", async () => {
  const created = await createReviewerInvitation({
    label: "Forever",
    expiresInDays: null,
    maxRedemptions: null,
  });
  expect(created.expiresAt).toBeNull();
});
test("admin can list, revoke and delete invitations", async () => {
  const created = await createReviewerInvitation({
    label: "Manage me",
    expiresInDays: 7,
    maxRedemptions: 5,
  });
  let list = await listReviewerInvitations();
  expect(list.find((i) => i.id === created.id)?.revoked).toBe(false);
  expect(list.find((i) => i.id === created.id)?.code).toBe(created.code);
  // The default fixture invitation predates the `code` field entirely.
  expect(list.find((i) => i.id === "test-reviewer")?.code).toBeNull();
  await setInvitationRevoked(created.id, true);
  list = await listReviewerInvitations();
  expect(list.find((i) => i.id === created.id)?.revoked).toBe(true);
  await expect(
    redeemReviewer(created.code, "visitor", "a@example.com")
  ).rejects.toThrow("invalid");
  await deleteReviewerInvitation(created.id);
  list = await listReviewerInvitations();
  expect(list.find((i) => i.id === created.id)).toBeUndefined();
});
