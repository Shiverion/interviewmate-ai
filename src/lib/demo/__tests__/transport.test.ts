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
    expect.objectContaining({ video: { facingMode: "user" } })
  );
  useInterviewStore.getState().reset();
});
test("duplicate ready events trigger only one opening response", async () => {
  const sendEvent = jest.fn();
  jest.mocked(WebRTCAudioManager).mockImplementation(
    (config: WebRTCManagerConfig) =>
      ({
        connect: async () => {
          config.onMessage?.("ready", null);
          config.onMessage?.("ready", null);
        },
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
      sessionId: "demo-duplicate-ready",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Reviewer",
      jobTitle: "Frontend Engineer",
      jobDescription: "Fictional test",
      startedAt: Date.now(),
    },
    status: "setup",
    transcript: [],
  });
  await useInterviewStore.getState().connect();
  expect(sendEvent).toHaveBeenCalledTimes(1);
  expect(sendEvent).toHaveBeenCalledWith({ type: "response.create" });
  useInterviewStore.getState().reset();
});
test("duplicate assistant opening items are collapsed before the first answer", async () => {
  let events: WebRTCManagerConfig["onMessage"];
  jest.mocked(WebRTCAudioManager).mockImplementation((config) => {
    events = config.onMessage;
    return {
      connect: async () => config.onMessage?.("ready", null),
      sendEvent: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as WebRTCAudioManager;
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [],
        getAudioTracks: () => [],
      }),
    },
  });
  useInterviewStore.setState({
    _sessionContext: {
      sessionId: "demo-duplicate-opening",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Reviewer",
      jobTitle: "Frontend Engineer",
      startedAt: Date.now(),
    },
    status: "setup",
    transcript: [],
  });
  await useInterviewStore.getState().connect();
  events?.("transcript_done", "Welcome to the interview.");
  events?.("transcript_done", "Here is the first question.");
  expect(useInterviewStore.getState().transcript).toEqual([
    { role: "assistant", text: "Welcome to the interview." },
  ]);
  useInterviewStore.getState().reset();
});
test("a denied or missing camera falls back to audio-only instead of blocking the interview", async () => {
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
  const getUserMedia = jest
    .fn()
    .mockRejectedValueOnce(new Error("Permission denied"))
    .mockResolvedValueOnce(stream);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
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
  expect(getUserMedia).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ video: { facingMode: "user" } })
  );
  expect(getUserMedia).toHaveBeenNthCalledWith(
    2,
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
  // The opening greeting is exempt from the turn budget. A provider must keep
  // the welcome and first question in one assistant item before the candidate
  // has submitted an answer.
  events?.(
    "transcript_done",
    "Hi! Thanks for joining, let's get started. What did you decide?"
  );
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

test("speech pauses append to the editable draft until the candidate sends it", async () => {
  let events: WebRTCManagerConfig["onMessage"];
  jest.mocked(WebRTCAudioManager).mockImplementation((config) => {
    events = config.onMessage;
    return {
      connect: async () => {},
      sendEvent: jest.fn(),
      sendTextMessage: jest.fn(),
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
    candidateDeltaMessage: "",
    _sessionContext: {
      sessionId: "demo-draft-append",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Synthetic",
      jobTitle: "Engineer",
      startedAt: Date.now(),
    },
  });
  await useInterviewStore.getState().connect();
  events?.("audio_playback_done", null);
  events?.("user_started_speaking", null);
  events?.("user_transcript_partial", "I built");
  events?.("user_stopped_speaking", null);
  events?.("user_transcript_done", "I built a queue.");
  events?.("user_started_speaking", null);
  events?.("user_transcript_partial", "and measured");
  events?.("user_stopped_speaking", null);
  events?.("user_transcript_done", "and measured retries.");
  expect(useInterviewStore.getState().candidateDeltaMessage).toBe(
    "I built a queue. and measured retries."
  );
  useInterviewStore.getState().reset();
});

test("the final configured answer requests closing instead of an extra question", async () => {
  let events: WebRTCManagerConfig["onMessage"];
  const sendTextMessage = jest.fn();
  jest.mocked(WebRTCAudioManager).mockImplementation((config) => {
    events = config.onMessage;
    return {
      connect: async () => {},
      sendEvent: jest.fn(),
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
      sessionId: "demo-final-turn",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Synthetic",
      jobTitle: "Engineer",
      startedAt: Date.now(),
      questionCount: 2,
    },
  });
  await useInterviewStore.getState().connect();
  events?.("transcript_done", "Welcome. Tell me about your first project.");
  events?.("audio_playback_done", null);
  events?.("user_transcript_done", "I built a queue.");
  useInterviewStore.getState().sendTextMessage("I built a queue.");
  expect(sendTextMessage).toHaveBeenLastCalledWith("I built a queue.", undefined);
  events?.("transcript_done", "How did you validate it?");
  events?.("audio_playback_done", null);
  events?.("user_transcript_done", "I measured retries.");
  useInterviewStore.getState().sendTextMessage("I measured retries.");
  expect(sendTextMessage).toHaveBeenLastCalledWith(
    "I measured retries.",
    expect.stringContaining("Do not ask another question")
  );
  useInterviewStore.getState().reset();
});

test("end of interview waits for closing audio playback", async () => {
  let events: WebRTCManagerConfig["onMessage"];
  const disconnect = jest.fn();
  jest.mocked(WebRTCAudioManager).mockImplementation((config) => {
    events = config.onMessage;
    return {
      connect: async () => {},
      sendEvent: jest.fn(),
      sendTextMessage: jest.fn(),
      disconnect,
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
      sessionId: "demo-closing-playback",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Synthetic",
      jobTitle: "Engineer",
      startedAt: Date.now(),
    },
  });
  await useInterviewStore.getState().connect();
  events?.("ai_speaking", null);
  events?.("end_interview", null);
  expect(useInterviewStore.getState().status).toBe("active");
  expect(disconnect).not.toHaveBeenCalled();
  events?.("audio_playback_done", null);
  expect(useInterviewStore.getState().status).toBe("active");
  expect(useInterviewStore.getState().completionCountdown).toBe(30);
  expect(disconnect).not.toHaveBeenCalled();
  useInterviewStore.getState().endInterview();
  expect(useInterviewStore.getState().status).toBe("completed");
  expect(disconnect).toHaveBeenCalledTimes(1);
  useInterviewStore.getState().reset();
});

test("microphone capture is disabled while the interviewer is thinking or speaking", async () => {
  let events: WebRTCManagerConfig["onMessage"];
  const track = { readyState: "live", enabled: true, stop: jest.fn() };
  const sendTextMessage = jest.fn();
  jest.mocked(WebRTCAudioManager).mockImplementation((config) => {
    events = config.onMessage;
    return {
      connect: async () => {},
      sendEvent: jest.fn(),
      sendTextMessage,
      disconnect: jest.fn(),
    } as unknown as WebRTCAudioManager;
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [track],
        getAudioTracks: () => [track],
      }),
    },
  });
  useInterviewStore.setState({
    status: "setup",
    transcript: [],
    _sessionContext: {
      sessionId: "demo-capture-lock",
      sponsored: true,
      interviewMode: "voice",
      allowedModes: "audio_and_text",
      candidateName: "Synthetic",
      jobTitle: "Engineer",
      startedAt: Date.now(),
    },
  });
  await useInterviewStore.getState().connect();
  events?.("audio_playback_done", null);
  expect(track.enabled).toBe(true);
  events?.("ai_thinking", null);
  expect(track.enabled).toBe(false);
  useInterviewStore.getState().sendTextMessage("A candidate answer");
  expect(sendTextMessage).not.toHaveBeenCalled();
  events?.("ai_speaking", null);
  expect(track.enabled).toBe(false);
  events?.("audio_playback_done", null);
  expect(track.enabled).toBe(true);
  useInterviewStore.getState().reset();
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
