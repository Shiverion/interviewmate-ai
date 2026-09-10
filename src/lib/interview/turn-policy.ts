export const TURN_POLICY = {
  version: "turn-policy-v2",
  endBufferMs: 2500,
  thinkingMs: 7000,
  offerMs: 17000,
} as const;
const fillers = new Set([
  "uh",
  "um",
  "hmm",
  "hm",
  "uhm",
  "erm",
  "er",
  "ah",
  "eh",
  "emm",
  "anu",
  "eee",
  "em",
  "mm",
  "hmmm",
]);
export function speechKind(text: string): "filler" | "meaningful" | "empty" {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "empty";
  return words.every((w) => fillers.has(w) || /^(u+h+|h+m+|e+m+|e+)$/.test(w))
    ? "filler"
    : "meaningful";
}
export function silenceAction(
  elapsed: number,
  healthy: boolean,
  speaking: boolean
) {
  if (!healthy) return "microphone_issue";
  if (speaking) return "listening";
  if (elapsed >= TURN_POLICY.offerMs) return "offer_repeat_skip";
  if (elapsed >= TURN_POLICY.thinkingMs) return "take_your_time";
  return "thinking";
}
