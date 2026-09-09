import { act, renderHook } from "@testing-library/react";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { useControlStore } from "../control-store";
import { newCheckpoint, run } from "../session-control";
import { resumeControlled, useInterviewControl } from "../useInterviewControl";
import { getOpenAIKey } from "@/lib/keys/store";
jest.mock("@/app/actions/get-session-token", () => ({
  getSessionToken: jest.fn(),
}));
jest.mock("@/lib/keys/store", () => ({ getOpenAIKey: jest.fn(() => "") }));
jest.mock("@/lib/firebase/config", () => ({
  db: {},
  isFirebaseReady: () => false,
}));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(async () => {}),
  serverTimestamp: jest.fn(),
}));
const originalConnect = useInterviewStore.getState().connect;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(100000);
  localStorage.clear();
  useInterviewStore.setState({
    status: "setup",
    transcript: [],
    manager: null,
    localStream: null,
    activeDeltaMessage: "",
    _subtitleBuffer: "",
    connect: originalConnect,
  });
  useControlStore.setState({ record: null, storageFailed: false });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
test("pause stops media transport and blocks text submission without losing completed answers", () => {
  const disconnect = jest.fn(),
    stop = jest.fn(),
    sendTextMessage = jest.fn();
  const transcript = [{ role: "user" as const, text: "Completed answer" }];
  useInterviewStore.setState({
    status: "active",
    transcript,
    manager: { disconnect, sendTextMessage } as never,
    localStream: { getTracks: () => [{ stop }] } as never,
  });
  useInterviewStore.getState().interrupt();
  useInterviewStore.getState().sendTextMessage("Cannot submit while paused");
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(sendTextMessage).not.toHaveBeenCalled();
  expect(useInterviewStore.getState()).toMatchObject({
    status: "paused",
    transcript,
  });
});
test("failed connection stays recoverable instead of marking the interview completed", async () => {
  jest.mocked(getOpenAIKey).mockReturnValue("");
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  await useInterviewStore.getState().connect();
  expect(useInterviewStore.getState().status).toBe("paused");
  error.mockRestore();
});
test("live guard bridge interrupts the transport after one second hidden", () => {
  useControlStore.setState({ record: run(newCheckpoint("session"), 100000) });
  const view = renderHook(() => useInterviewControl("session", "active", true));
  act(() => useControlStore.getState().start());
  const disconnect = jest.fn(),
    stop = jest.fn();
  useInterviewStore.setState({
    status: "active",
    manager: { disconnect } as never,
    localStream: { getTracks: () => [{ stop }] } as never,
  });
  act(() => {
    jest.advanceTimersByTime(11000);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    jest.advanceTimersByTime(1000);
  });
  expect(useControlStore.getState().record?.phase).toBe("paused");
  expect(useInterviewStore.getState().status).toBe("paused");
  expect(stop).toHaveBeenCalled();
  view.unmount();
});
test("resume sends a replacement instruction and excludes retired answers; terminal sessions refuse resume", async () => {
  const old = [
    { role: "assistant" as const, text: "Old question" },
    { role: "user" as const, text: "Interrupted answer" },
  ];
  useControlStore.setState({
    record: {
      ...run(newCheckpoint("session"), 100000),
      phase: "recovery",
      transcript: old,
    },
  });
  useInterviewStore.setState({
    connect: jest.fn(async () => {
      useInterviewStore.setState({ status: "active" });
    }),
  });
  await resumeControlled(true, "English");
  expect(useInterviewStore.getState().transcript).toEqual([]);
  expect(useInterviewStore.getState()._resumeInstructions).toContain(
    "project deadline"
  );
  expect(useControlStore.getState().record?.retired[0].lines).toEqual(old);
  useControlStore.setState({
    record: { ...useControlStore.getState().record!, phase: "ended" },
  });
  await expect(resumeControlled(true)).rejects.toThrow();
});
