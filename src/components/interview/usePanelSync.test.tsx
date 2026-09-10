import { act, renderHook } from "@testing-library/react";
import { onSnapshot, updateDoc, doc } from "firebase/firestore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { usePanelSync } from "./usePanelSync";

jest.mock("firebase/firestore", () => ({ doc: jest.fn(() => ({})), onSnapshot: jest.fn(), updateDoc: jest.fn() }));
jest.mock("@/lib/firebase/config", () => ({ db: {}, isFirebaseReady: () => true }));
jest.mock("@/components/providers/AuthProvider", () => ({ useAuthContext: jest.fn() }));

const authMock = jest.mocked(useAuthContext);
const listen = jest.mocked(onSnapshot);
const write = jest.mocked(updateDoc);
const unsubscribe = jest.fn();
let receive: (snapshot: { exists: () => boolean; data: () => object }) => void;
let reject: (error: object) => void;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  authMock.mockReturnValue({ user: { uid: "recruiter" } as NonNullable<ReturnType<typeof useAuthContext>["user"]>, loading: false });
  listen.mockImplementation((...args: unknown[]) => {
    receive = args[1] as typeof receive;
    reject = args[2] as typeof reject;
    return unsubscribe;
  });
  write.mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());
function connected() {
  act(() => receive({ exists: () => true, data: () => ({ code_workspace: { code: "hello" } }) }));
}

test.each(["demo-personal", "demo-reviewer-lease", "reviewer-scheduled", ""])("%s never accesses Firestore", (id) => {
  const { result } = renderHook(() => usePanelSync(id, "code_workspace", true, 2000));
  act(() => { result.current.save({ code: "private" }); jest.runAllTimers(); });
  expect(result.current.status).toBe("local");
  expect(listen).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

test.each([true, false])("no authenticated user (loading=%s) keeps the panel local", (loading) => {
  authMock.mockReturnValue({ user: null, loading });
  const { result } = renderHook(() => usePanelSync("scheduled", "code_workspace", true, 2000));
  expect(result.current.status).toBe("local");
  expect(listen).not.toHaveBeenCalled();
});

test.each(["code_workspace", "whiteboard_workspace"] as const)("%s sync updates only its field in the existing session", async (field) => {
  const { result } = renderHook(() => usePanelSync("scheduled", field, true, 2000));
  expect(doc).toHaveBeenCalledWith({}, "interview_sessions", "scheduled");
  connected();
  act(() => { result.current.save({ value: "old" }); result.current.save({ value: "latest" }); });
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(result.current.status).toBe("live");
  expect(write).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledWith({}, { [field]: { value: "latest" } });
});

test("permission denial is handled and cancels pending and subsequent writes", async () => {
  const { result } = renderHook(() => usePanelSync("scheduled", "code_workspace", true, 2000));
  connected();
  act(() => {
    result.current.save({ code: "draft" });
    reject({ code: "permission-denied" });
    result.current.save({ code: "still local" });
  });
  await act(async () => { jest.runAllTimers(); });
  expect(result.current.status).toBe("unavailable");
  expect(write).not.toHaveBeenCalled();
});

test("a rejected write marks sync unavailable without an unhandled rejection", async () => {
  write.mockRejectedValueOnce({ code: "permission-denied" });
  const { result } = renderHook(() => usePanelSync("scheduled", "whiteboard_workspace", true, 1500));
  connected();
  act(() => result.current.save({ snapshot: "drawing" }));
  await act(async () => { jest.runAllTimers(); });
  expect(result.current.status).toBe("unavailable");
});

test("sign-out cancels pending writes and removes the listener", async () => {
  const { result, rerender } = renderHook(() => usePanelSync("scheduled", "code_workspace", true, 2000));
  connected();
  act(() => result.current.save({ code: "draft" }));
  authMock.mockReturnValue({ user: null, loading: false });
  rerender();
  await act(async () => { jest.runAllTimers(); });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("local");
  expect(write).not.toHaveBeenCalled();
});

test("switching sessions cancels the old draft and ignores late callbacks", async () => {
  const { result, rerender } = renderHook(({ id }) => usePanelSync(id, "code_workspace", true, 2000), { initialProps: { id: "first" } });
  connected();
  const oldReceive = receive;
  act(() => result.current.save({ code: "old draft" }));
  rerender({ id: "second" });
  act(() => oldReceive({ exists: () => true, data: () => ({ code_workspace: { code: "stale" } }) }));
  await act(async () => { jest.runAllTimers(); });
  expect(result.current.data).toBeUndefined();
  expect(result.current.status).toBe("connecting");
  expect(write).not.toHaveBeenCalled();
});

test("missing sessions and read-only viewers cannot write", () => {
  const missing = renderHook(() => usePanelSync("missing", "code_workspace", true, 2000));
  act(() => receive({ exists: () => false, data: () => ({}) }));
  act(() => missing.result.current.save({ code: "draft" }));
  expect(missing.result.current.status).toBe("unavailable");
  missing.unmount();
  const viewer = renderHook(() => usePanelSync("scheduled", "code_workspace", false, 2000));
  connected();
  act(() => { viewer.result.current.save({ code: "unauthorized" }); jest.runAllTimers(); });
  expect(viewer.result.current.data).toEqual({ code: "hello" });
  expect(write).not.toHaveBeenCalled();
});
