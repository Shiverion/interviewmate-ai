/** @jest-environment node */
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { redeemReviewer, reviewerGrant, consumeReviewer } from "./reviewer";
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
  const { cookie } = await redeemReviewer("test-code", "visitor");
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
test("budget ceiling survives repeated operations", async () => {
  const { grant } = await redeemReviewer("test-code", "visitor");
  await consumeReviewer(grant, 3);
  await expect(consumeReviewer(grant, 3)).rejects.toThrow("budget ceiling");
  expect(await consumeReviewer(grant, 2)).toEqual({ used: 5, limit: 5 });
});
test("invitation guessing is limited for a persistent visitor", async () => {
  for (let i = 0; i < 5; i++)
    await expect(redeemReviewer("incorrect", "visitor")).rejects.toThrow(
      "invalid"
    );
  await expect(redeemReviewer("test-code", "visitor")).rejects.toThrow(
    "Too many"
  );
});
