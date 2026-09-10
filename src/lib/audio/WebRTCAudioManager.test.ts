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
test("the API's legacy and current event names for the same assistant turn do not duplicate the transcript", async () => {
  const { manager, onMessage } = await setup();
  emit({
    type: "response.audio_transcript.done",
    item_id: "resp-1",
    transcript: "Tell me about a time you led a project.",
  });
  emit({
    type: "response.output_audio_transcript.done",
    item_id: "resp-1",
    transcript: "Tell me about a time you led a project.",
  });
  expect(
    onMessage.mock.calls.filter(([type]) => type === "transcript_done")
  ).toEqual([
    ["transcript_done", "Tell me about a time you led a project."],
  ]);
  emit({
    type: "response.output_audio_transcript.done",
    item_id: "resp-2",
    transcript: "What tradeoffs did you consider?",
  });
  expect(
    onMessage.mock.calls.filter(([type]) => type === "transcript_done")
  ).toEqual([
    ["transcript_done", "Tell me about a time you led a project."],
    ["transcript_done", "What tradeoffs did you consider?"],
  ]);
  manager.disconnect();
});
test("closing tool calls wait for output audio playback to stop", async () => {
  const { manager, onMessage } = await setup();
  emit({ type: "response.created" });
  emit({
    type: "response.function_call_arguments.done",
    name: "end_interview",
  });
  expect(onMessage.mock.calls).not.toContainEqual(["end_interview", null]);
  emit({ type: "response.output_audio.delta", delta: "audio" });
  emit({ type: "output_audio_buffer.stopped" });
  expect(onMessage.mock.calls).toContainEqual(["audio_playback_done", null]);
  expect(onMessage.mock.calls).toContainEqual(["end_interview", null]);
  expect(
    onMessage.mock.invocationCallOrder[
      onMessage.mock.calls.findIndex(([type]) => type === "audio_playback_done")
    ]
  ).toBeLessThan(
    onMessage.mock.invocationCallOrder[
      onMessage.mock.calls.findIndex(([type]) => type === "end_interview")
    ]
  );
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
