/** @jest-environment node */
import { mkdtemp, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  attachCall,
  claimEvaluation,
  demoAvailability,
  DEMO_LIMITS,
  hangupCalls,
  ownedLease,
  quota,
  releasePending,
  reserve,
  withLedger,
} from "../ledger";
const environment = { ...process.env };
beforeEach(async () => {
  await mkdir(path.join(process.cwd(), "tmp"), { recursive: true });
  process.env.DEMO_STATE_DIR = await mkdtemp(
    path.join(process.cwd(), "tmp", "demo-quota-")
  );
});
afterEach(() => {
  process.env = { ...environment };
  jest.restoreAllMocks();
});
test("five atomic daily reservations persist, and a sixth fails", async () => {
  const attempts = await Promise.allSettled(
    Array.from({ length: 6 }, () => reserve("guest", undefined, false))
  );
  expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(5);
  expect((await quota("guest")).remaining).toBe(0);
  expect((await quota("other")).remaining).toBe(5);
});
test("global budget also limits newly minted visitors", async () => {
  for (let i = 0; i < DEMO_LIMITS.globalStarts; i++)
    await reserve("guest-" + i, undefined, false);
  await expect(reserve("another", undefined, false)).rejects.toThrow(
    "allowance"
  );
});
test("ownership, concurrent connects and reconnect allowance are enforced", async () => {
  const lease = await reserve("guest", undefined, false);
  await expect(reserve("intruder", lease.id)).rejects.toThrow(
    "another browser"
  );
  await reserve("guest", lease.id);
  await expect(reserve("guest", lease.id)).rejects.toThrow("pending");
  for (let i = 1; i < DEMO_LIMITS.connections; i++) {
    await releasePending(lease.id);
    await reserve("guest", lease.id);
  }
  await releasePending(lease.id);
  await expect(reserve("guest", lease.id)).rejects.toThrow("allowance");
  expect((await quota("guest")).remaining).toBe(4);
});
test("expiry is authoritative across a new read of stored state", async () => {
  const lease = await reserve("guest", undefined, false);
  await withLedger((d) => {
    d.leases[lease.id].expiresAt = Date.now() - 1;
  });
  await expect(reserve("guest", lease.id)).rejects.toThrow("eight-minute");
});
test("reaper retries failures and removes only successfully stopped calls", async () => {
  const lease = await reserve("guest", undefined, false);
  await attachCall(lease.id, "rtc_test");
  await withLedger((d) => {
    d.leases[lease.id].expiresAt = Date.now() - 1;
  });
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 500 }));
  await hangupCalls();
  expect((await ownedLease("guest", lease.id)).callIds).toEqual(["rtc_test"]);
  fetcher.mockResolvedValue(new Response(null, { status: 200 }));
  await hangupCalls();
  expect((await ownedLease("guest", lease.id)).callIds).toEqual([]);
});
test("evaluation attempts can be repeated for an owned session", async () => {
  const lease = await reserve("guest", undefined, false);
  await claimEvaluation("guest", lease.id, "gemini");
  await claimEvaluation("guest", lease.id, "gemini");
  await expect(claimEvaluation("other", lease.id, "openai")).rejects.toThrow();
  await claimEvaluation("guest", lease.id, "openai");
});
test("funded production demos fail closed without a persistent runtime", () => {
  process.env = {
    ...process.env,
    NODE_ENV: "production",
    OPENAI_API_KEY: "test-only",
    VERCEL: "1",
  };
  expect(demoAvailability()).toContain("persistent");
});
