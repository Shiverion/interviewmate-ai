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
  jest
    .mocked(WebRTCAudioManager)
    .mockImplementation(
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
