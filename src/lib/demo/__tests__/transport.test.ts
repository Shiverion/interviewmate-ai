import { useInterviewStore } from "@/lib/store/useInterviewStore";
import {
  WebRTCAudioManager,
  type WebRTCManagerConfig,
} from "@/lib/audio/WebRTCAudioManager";
import { getSessionToken } from "@/app/actions/get-session-token";
jest.mock("@/app/actions/get-session-token", () => ({
  getSessionToken: jest.fn(),
}));
jest.mock("@/lib/keys/store", () => ({ getOpenAIKey: () => "" }));
jest.mock("@/lib/firebase/config", () => ({
  db: {},
  isFirebaseReady: () => false,
}));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock("@/lib/audio/WebRTCAudioManager", () => ({
  WebRTCAudioManager: jest.fn(),
}));
test("hosted GA voice initiates a greeting without beta session updates or a personal token", async () => {
  const sendEvent = jest.fn();
  jest.mocked(WebRTCAudioManager).mockImplementation(
    (config: WebRTCManagerConfig) =>
      ({
        connect: async () => config.onMessage?.("ready", null),
        sendEvent,
        disconnect: jest.fn(),
      }) as unknown as WebRTCAudioManager
  );
  const stream = { getTracks: () => [], getAudioTracks: () => [] };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
  });
  useInterviewStore.setState({
    _sessionContext: {
      sessionId: "demo-reviewer-test",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Reviewer",
      jobTitle: "Frontend Engineer",
      jobDescription: "Fictional test",
      startedAt: Date.now(),
    },
    status: "setup",
  });
  await useInterviewStore.getState().connect();
  expect(useInterviewStore.getState().status).toBe("active");
  expect(sendEvent.mock.calls).toEqual([[{ type: "response.create" }]]);
  expect(getSessionToken).not.toHaveBeenCalled();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({ video: false })
  );
  useInterviewStore.getState().reset();
});

test("fillers do not advance; meaningful speech waits for the buffer and honors the turn budget", async () => {
  jest.useFakeTimers();
  let events: WebRTCManagerConfig["onMessage"];
  const sendEvent = jest.fn();
  const sendTextMessage = jest.fn();
  jest.mocked(WebRTCAudioManager).mockImplementation((config) => {
    events = config.onMessage;
    return {
      connect: async () => {},
      sendEvent,
      sendTextMessage,
      disconnect: jest.fn(),
    } as unknown as WebRTCAudioManager;
  });
  const stream = {
    getTracks: () => [],
    getAudioTracks: () => [{ readyState: "live" }],
  };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
  });
  useInterviewStore.setState({
    status: "setup",
    transcript: [],
    _sessionContext: {
      sessionId: "demo-voice-policy",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Synthetic",
      jobTitle: "Engineer",
      startedAt: Date.now(),
      questionCount: 1,
    },
  });
  await useInterviewStore.getState().connect();
  events?.("transcript_done", "What did you decide?");
  events?.("audio_playback_done", null);
  events?.("user_started_speaking", null);
  events?.("user_stopped_speaking", null);
  events?.("user_transcript_done", "uh hmm");
  jest.advanceTimersByTime(3000);
  expect(
    sendEvent.mock.calls.filter(([e]) => e.type === "response.create")
  ).toHaveLength(0);
  expect(useInterviewStore.getState().transcript).toHaveLength(1);
  events?.("user_started_speaking", null);
  events?.("user_stopped_speaking", null);
  events?.(
    "user_transcript_done",
    "I selected a queue after measuring retries."
  );
  expect(useInterviewStore.getState().candidateDeltaMessage).toBe(
    "I selected a queue after measuring retries."
  );
  expect(
    sendEvent.mock.calls.filter(([e]) => e.type === "response.create")
  ).toHaveLength(0);
  useInterviewStore
    .getState()
    .sendTextMessage("I selected a queue after measuring retries.");
  expect(sendTextMessage).toHaveBeenCalledWith(
    "I selected a queue after measuring retries.",
    expect.any(String)
  );
  expect(useInterviewStore.getState().candidateDeltaMessage).toBe("");
  useInterviewStore.getState().reset();
  jest.useRealTimers();
});

test("a late transcription cannot advance while the candidate is speaking again", async () => {
  jest.useFakeTimers();
  let events: WebRTCManagerConfig["onMessage"];
  const sendEvent = jest.fn();
  jest.mocked(WebRTCAudioManager).mockImplementation((config) => {
    events = config.onMessage;
    return {
      connect: async () => {},
      sendEvent,
      disconnect: jest.fn(),
    } as unknown as WebRTCAudioManager;
  });
  useInterviewStore.setState({ status: "setup", transcript: [] });
  await useInterviewStore.getState().connect();
  events?.("user_started_speaking", null);
  events?.("user_stopped_speaking", null);
  events?.("user_started_speaking", null);
  events?.("user_transcript_done", "The first part of my answer.");
  jest.advanceTimersByTime(3000);
  expect(
    sendEvent.mock.calls.filter(([e]) => e.type === "response.create")
  ).toHaveLength(0);
  useInterviewStore.getState().reset();
  jest.useRealTimers();
});
