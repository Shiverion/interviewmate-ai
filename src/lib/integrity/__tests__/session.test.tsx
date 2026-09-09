import { act, renderHook, waitFor } from "@testing-library/react";
import { useIntegrityStore } from "../store";
import { useSessionIntegrity } from "../useSessionIntegrity";
import { updateDoc } from "firebase/firestore";
import { isFirebaseReady } from "@/lib/firebase/config";
import type { IntegrityReport } from "../policy";
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => "session-ref"),
  updateDoc: jest.fn(async () => {}),
}));
jest.mock("@/lib/firebase/config", () => ({
  db: {},
  isFirebaseReady: jest.fn(() => true),
}));
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(100000);
  sessionStorage.clear();
  useIntegrityStore.setState({
    record: null,
    storageUnavailable: false,
    sync: "local",
  });
  jest.mocked(updateDoc).mockClear();
  jest.mocked(isFirebaseReady).mockReturnValue(true);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  jest.spyOn(document, "hasFocus").mockReturnValue(true);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
function signal(hidden: boolean, ms = 0) {
  act(() => {
    jest.advanceTimersByTime(ms);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: hidden,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
function setup(sessionId?: string) {
  const hook = renderHook(
    ({ status }) => useSessionIntegrity("same-session", status, sessionId),
    { initialProps: { status: "setup" } }
  );
  act(() => useIntegrityStore.getState().acknowledge());
  hook.rerender({ status: "active" });
  act(() => jest.advanceTimersByTime(10000));
  return hook;
}
test("listeners ignore cursor movement and focus-only changes do not count", () => {
  const h = setup();
  act(() => {
    document.dispatchEvent(new MouseEvent("mouseleave"));
    window.dispatchEvent(new Event("blur"));
    jest.advanceTimersByTime(11000);
    window.dispatchEvent(new Event("focus"));
  });
  expect(h.result.current.record?.count).toBe(0);
  expect(h.result.current.record?.focusCount).toBe(1);
  h.unmount();
});
test("end-of-session storage writes only the advisory field, not a score", async () => {
  const h = setup("scheduled-session");
  signal(true);
  signal(false, 3000);
  act(() => useIntegrityStore.getState().explain(1, "technical_issue"));
  h.rerender({ status: "completed" });
  await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
  const payload = jest.mocked(updateDoc).mock.calls[0][1] as unknown as {
    session_integrity: IntegrityReport;
  };
  expect(Object.keys(payload)).toEqual(["session_integrity"]);
  expect(payload.session_integrity.hiddenCount).toBe(1);
  expect(payload.session_integrity.events[0].reason).toBe("technical_issue");
  expect(h.result.current.sync).toBe("saved");
});
test("demo is local only and completion removes monitoring listeners", () => {
  const h = setup("demo-test");
  signal(true);
  signal(false, 3000);
  h.rerender({ status: "completed" });
  signal(true);
  signal(false, 3000);
  expect(h.result.current.record?.count).toBe(1);
  expect(updateDoc).not.toHaveBeenCalled();
});
test("failed server save is surfaced without terminating or clearing the record", async () => {
  jest.mocked(updateDoc).mockRejectedValueOnce(Error("test-only"));
  const h = setup("scheduled-session");
  signal(true);
  signal(false, 3000);
  h.rerender({ status: "completed" });
  await waitFor(() => expect(h.result.current.sync).toBe("failed"));
  expect(h.result.current.record?.count).toBe(1);
});
test("refresh restores counts and flags an active-page coverage gap", () => {
  const h = setup("demo-test");
  signal(true);
  signal(false, 3000);
  const raw = sessionStorage.getItem(
    "interview-integrity:same-session:session-integrity-v2"
  )!;
  h.unmount();
  sessionStorage.setItem(
    "interview-integrity:same-session:session-integrity-v2",
    raw
  );
  useIntegrityStore.setState({ record: null });
  useIntegrityStore.getState().prepare("same-session");
  expect(useIntegrityStore.getState().record).toMatchObject({
    count: 1,
    coverageGaps: 1,
    active: false,
  });
});
test("storage denial is visible and does not block the interview", () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("denied");
  });
  const h = setup();
  expect(h.result.current.storageUnavailable).toBe(true);
  signal(true);
  signal(false, 3000);
  expect(h.result.current.record).toMatchObject({ active: true, count: 1 });
});
test("switching sessions isolates counts and acknowledgments", () => {
  const h = setup();
  signal(true);
  signal(false, 3000);
  act(() => useIntegrityStore.getState().prepare("other-session"));
  expect(useIntegrityStore.getState().record).toMatchObject({
    count: 0,
    acknowledgedAt: null,
  });
  h.unmount();
});
