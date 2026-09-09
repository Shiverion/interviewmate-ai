/** @jest-environment node */
import {
  initialState,
  start,
  observe,
  finish,
  report,
  reportSchema,
  POLICY,
  type IntegrityState,
} from "../policy";
const running = () =>
  start({ ...initialState("test-session"), acknowledgedAt: 0 }, 0);

test("historical v1 reports retain their original rules and mixed versions are rejected", () => {
  const current = report(running());
  const old = {
    ...current,
    version: "session-integrity-v1",
    policy: {
      ...current.policy,
      hiddenMinimumMs: 3000,
      warningAt: 3,
      reviewAt: 5,
      autoTerminate: false,
    },
  };
  expect(reportSchema.safeParse(old).success).toBe(true);
  expect(reportSchema.safeParse(current).success).toBe(true);
  expect(
    reportSchema.safeParse({ ...old, policy: current.policy }).success
  ).toBe(false);
});

test("reconnection preserves counts and reports the unobserved interval", () => {
  const ended = finish(away(running(), 11000), 15000);
  const resumed = start(ended, 30000);
  expect(resumed).toMatchObject({ count: 1, coverageGaps: 1, active: true });
});
function away(s: IntegrityState, at: number, ms = 3000) {
  return observe(observe(s, true, false, at), false, true, at + ms);
}
test("no monitoring before acknowledgment or before an active interview", () => {
  const fresh = initialState("test");
  expect(start(fresh, 0)).toBe(fresh);
  expect(observe(fresh, true, false, 10000)).toBe(fresh);
});
test("startup grace excludes permission and setup interruptions", () => {
  expect(away(running(), 100, 3500).count).toBe(0);
  expect(away(running(), 9000, 1500).count).toBe(0);
  expect(away(running(), 9000, 4000).count).toBe(1);
});
test("brief switches below one second are ignored; boundary qualifies", () => {
  expect(away(running(), 11000, 999).count).toBe(0);
  expect(away(running(), 11000, 1000).count).toBe(1);
});
test("blur, hide, visible and focus notifications form one episode", () => {
  let s = observe(running(), false, false, 11000);
  s = observe(s, true, false, 11100);
  s = observe(s, true, false, 12000);
  s = observe(s, false, false, 14500);
  s = observe(s, false, true, 14600);
  s = observe(s, false, true, 14601);
  expect(s.count).toBe(1);
  expect(s.events).toHaveLength(1);
  expect(s.events[0].hiddenMs).toBe(3400);
});
test("long visible focus loss is context only, never a warning count", () => {
  let s = observe(running(), false, false, 11000);
  s = observe(s, false, true, 25000);
  expect(s.count).toBe(0);
  expect(s.focusCount).toBe(1);
});
test("returning to a visible tab reports the hidden event before keyboard focus returns", () => {
  let s = observe(running(), true, false, 11000);
  s = observe(s, false, false, 14500);
  expect(s.count).toBe(1);
  expect(s.events[0].hiddenMs).toBe(3500);
  s = observe(s, false, true, 14600);
  expect(s.events).toHaveLength(1);
  expect(s.count).toBe(1);
});
test("brief hidden time does not borrow duration from long focus loss", () => {
  let s = observe(running(), false, false, 11000);
  s = observe(s, true, false, 25000);
  s = observe(s, false, true, 25500);
  expect(s.count).toBe(0);
  expect(s.focusCount).toBe(1);
  expect(s.events[0].hiddenMs).toBe(500);
});
test("timers are unnecessary: delayed return accounts for one long absence", () => {
  const s = away(running(), 11000, 120000);
  expect(s.count).toBe(1);
  expect(s.events[0].hiddenMs).toBe(120000);
});
test("recorder preserves history while the separate session control enforces termination", () => {
  let s = running();
  for (let i = 0; i < 10; i++) s = away(s, 11000 + i * 4000);
  expect(s.count).toBe(10);
  expect(s.active).toBe(true);
  expect(s.completed).toBe(false);
  expect(POLICY).toMatchObject({
    warningAt: 2,
    reviewAt: 3,
    autoTerminate: true,
  });
});
test("finish captures an open absence once and ignores later signals", () => {
  let s = observe(running(), true, false, 11000);
  s = finish(s, 15000);
  expect(s.count).toBe(1);
  expect(s.active).toBe(false);
  expect(finish(s, 20000)).toBe(s);
  expect(observe(s, true, false, 22000)).toBe(s);
});
test("bounded history retains aggregate counts and explains omissions", () => {
  let s = running();
  for (let i = 0; i < 205; i++) s = away(s, 11000 + i * 4000);
  expect(s.events).toHaveLength(200);
  expect(s.count).toBe(205);
  expect(s.droppedEvents).toBe(5);
  expect(reportSchema.safeParse(report(s)).success).toBe(true);
});
test("report contains no cursor, clipboard, URL, video or transcript content", () => {
  const r = report(away(running(), 11000));
  expect(Object.keys(r.events[0]).sort()).toEqual([
    "awayMs",
    "endedAt",
    "hiddenMs",
    "id",
    "kind",
    "reason",
    "startedAt",
  ]);
  expect(r.source).toBe("client_reported");
});
