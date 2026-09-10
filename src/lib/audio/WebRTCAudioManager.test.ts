import { WebRTCAudioManager } from "./WebRTCAudioManager";
let channel: {
  readyState: string;
  send: jest.Mock;
  close: jest.Mock;
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
};
beforeEach(() => {
  channel = { readyState: "open", send: jest.fn(), close: jest.fn() };
  Object.defineProperty(globalThis, "RTCPeerConnection", {
    configurable: true,
    value: jest.fn(() => ({
      createDataChannel: () => channel,
      addTrack: jest.fn(),
      createOffer: async () => ({ type: "offer", sdp: "test" }),
      setLocalDescription: jest.fn(),
      setRemoteDescription: jest.fn(),
      close: jest.fn(),
      getSenders: () => [],
    })),
  });
});
async function setup() {
  const onMessage = jest.fn();
  const manager = new WebRTCAudioManager({
    exchangeSdp: async () => "answer",
    onMessage,
    languagePolicy: "Speak only in English.",
  });
  await manager.connect({ getTracks: () => [] } as unknown as MediaStream);
  return { manager, onMessage };
}
function emit(event: Record<string, unknown>) {
  channel.onmessage?.({ data: JSON.stringify(event) });
}
test("streaming drafts are separate from committed text and duplicate completions cannot count two answers", async () => {
  const { manager, onMessage } = await setup();
  emit({
    type: "conversation.item.input_audio_transcription.delta",
    item_id: "a",
    delta: "I built ",
  });
  emit({
    type: "conversation.item.input_audio_transcription.delta",
    item_id: "a",
    delta: "a queue.",
  });
  expect(onMessage).toHaveBeenLastCalledWith(
    "user_transcript_partial",
    "I built a queue."
  );
  emit({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "a",
    transcript: "I built a queue.",
  });
  emit({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "a",
    transcript: "I built a queue.",
  });
  emit({
    type: "conversation.item.input_audio_transcription.delta",
    item_id: "a",
    delta: "late duplicate",
  });
  expect(
    onMessage.mock.calls.filter(([type]) => type === "user_transcript_done")
  ).toEqual([["user_transcript_done", "I built a queue."]]);
  expect(
    onMessage.mock.calls.filter(([type]) => type === "user_transcript_partial")
  ).toEqual([
    ["user_transcript_partial", "I built "],
    ["user_transcript_partial", "I built a queue."],
  ]);
  manager.disconnect();
});
test("repeat and recovery response instructions preserve the configured spoken language", async () => {
  const { manager } = await setup();
  manager.sendEvent({
    type: "response.create",
    response: { instructions: "Repeat this question." },
  });
  expect(JSON.parse(channel.send.mock.calls[0][0]).response.instructions).toBe(
    "Repeat this question.\nSpeak only in English."
  );
  manager.disconnect();
});
test("explicit send replaces the pending audio item with the edited answer", async () => {
  const { manager } = await setup();
  emit({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "pending-audio",
    transcript: "I built a que.",
  });
  channel.send.mockClear();
  manager.sendTextMessage("I built a queue.");
  const sent = channel.send.mock.calls.map(([value]) => JSON.parse(value));
  expect(sent[0]).toEqual({
    type: "conversation.item.delete",
    item_id: "pending-audio",
  });
  expect(sent[1].type).toBe("conversation.item.create");
  expect(sent[1].item.content[0].text).toBe("I built a queue.");
  manager.disconnect();
});
