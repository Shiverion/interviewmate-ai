import {
  advance,
  newCheckpoint,
  recover,
  replaceQuestion,
  run,
} from "../session-control";
import { useControlStore, checkpointKey } from "../control-store";
const running = () => run(newCheckpoint("session"), 100000);
function away(ms = 1000) {
  return advance(
    advance(running(), 111000, true, true),
    111000 + ms,
    true,
    true
  );
}
test("grace and subsecond interruptions do not pause", () => {
  expect(
    advance(advance(running(), 100000, true, true), 105000, false, true).phase
  ).toBe("running");
  expect(away(999).phase).toBe("running");
  expect(away().phase).toBe("paused");
});
test("continuous absence pauses, warns, and ends, with frozen time", () => {
  let s = away();
  const time = s.remainingMs;
  s = advance(s, 117000, true, true);
  expect(s.phase).toBe("final_warning");
  expect(s.remainingMs).toBe(time);
  s = advance(s, 126000, true, true);
  expect(s.phase).toBe("ended");
  expect(s.events.map((e) => e.type)).toEqual(
    expect.arrayContaining(["final_warning_issued", "automatically_ended"])
  );
  expect(run(s, 200000).phase).toBe("ended");
  expect(recover(s, 200000, "offline").phase).toBe("ended");
});
test("delayed background delivery still freezes time at the pause boundary", () => {
  expect(away(15000).remainingMs).toBe(away(1000).remainingMs);
});
test("second interruption warns, third ends, and duplicate events do not count twice", () => {
  let s = running();
  for (let n = 1; n <= 3; n++) {
    const at = 111000 + n * 10000;
    s = advance(s, at, true, true);
    s = advance(s, at + 1000, true, true);
    s = advance(s, at + 1100, true, true);
    expect(s.interruptions).toBe(n);
    s = advance(s, at + 1200, false, true);
    expect(s.phase).toBe(
      n === 1 ? "paused" : n === 2 ? "final_warning" : "ended"
    );
    if (n < 3) s = run(s, at + 2000);
  }
});
test("offline recovery freezes time without treating downtime as misconduct", () => {
  let s = advance(running(), 115000, false, false);
  const remaining = s.remainingMs;
  expect(s.phase).toBe("recovery");
  s = advance(s, 300000, true, true);
  expect(s.remainingMs).toBe(remaining);
  expect(s.interruptions).toBe(0);
  expect(s.recoveries).toBe(1);
});
test("the AI is warned to wrap up before the hard time cutoff, not cut off mid-sentence", () => {
  let s = running();
  // 20s (CONTROL.wrapUpMs) before the 30-minute (CONTROL.durationMs) limit.
  s = advance(s, 100000 + 1780000, false, true);
  expect(s.phase).toBe("running");
  expect(s.wrapUpIssued).toBe(true);
  expect(s.remainingMs).toBe(20000);
  expect(s.events.map((e) => e.type)).toContain("wrap_up_warning");
  // A later tick within the same warning window must not re-issue it.
  const again = advance(s, s.lastTick + 5000, false, true);
  expect(
    again.events.filter((e) => e.type === "wrap_up_warning")
  ).toHaveLength(1);
  // The hard cutoff still fires once time actually runs out.
  const ended = advance(s, s.lastTick + 20000, false, true);
  expect(ended.phase).toBe("completed");
  expect(ended.reason).toBe("time_limit");
});
test("question replacement preserves earlier answers and archives the interrupted exchange", () => {
  const s = {
    ...running(),
    transcript: [
      { role: "assistant" as const, text: "Earlier question" },
      { role: "user" as const, text: "Completed answer" },
      { role: "assistant" as const, text: "Interrupted question" },
      { role: "user" as const, text: "Partial answer" },
    ],
  };
  const result = replaceQuestion(s, 120000, "English");
  expect(result.state.transcript).toEqual(s.transcript.slice(0, 2));
  expect(result.state.retired[0].lines).toEqual(s.transcript.slice(2));
  expect(result.question).not.toBe("Interrupted question");
  const retry = replaceQuestion(result.state, 121000, "English");
  expect(retry.state).toBe(result.state);
  const next = replaceQuestion(
    {
      ...result.state,
      replacementQuestion: null,
      pendingAssistant: result.question!,
    },
    130000,
    "English"
  );
  expect(next.question).not.toBe(result.question);
  expect(next.state.transcript).toEqual(result.state.transcript);
});
test("replacement bank exhaustion requires human help instead of recycling questions", () => {
  expect(
    replaceQuestion({ ...running(), replacementIndex: 8 }, 120000, "English")
  ).toMatchObject({
    question: null,
    state: { phase: "recovery", reason: "replacement_bank_exhausted" },
  });
});
test("replacement skips a question already asked before the interruption", () => {
  const first = replaceQuestion(running(), 120000, "English").question!;
  const result = replaceQuestion(
    { ...running(), transcript: [{ role: "assistant", text: first }] },
    121000,
    "English"
  );
  expect(result.question).not.toBe(first);
  expect(result.state.replacementIndex).toBe(2);
});
test("reload retains answers, time and warnings; ended sessions stay ended", () => {
  localStorage.clear();
  const old = {
    ...away(6000),
    transcript: [{ role: "user" as const, text: "Saved answer" }],
  };
  localStorage.setItem(checkpointKey("session"), JSON.stringify(old));
  useControlStore.setState({ record: null, storageFailed: false });
  useControlStore.getState().prepare("session");
  expect(useControlStore.getState().record).toMatchObject({
    phase: "recovery",
    remainingMs: old.remainingMs,
    finalWarningIssued: true,
    transcript: old.transcript,
    interruptions: 1,
  });
  useControlStore.getState().save({ ...old, phase: "ended" });
  useControlStore.setState({ record: null });
  useControlStore.getState().prepare("session");
  expect(useControlStore.getState().record?.phase).toBe("ended");
});
test("invalid checkpoints are held for recovery instead of starting a fresh interview", () => {
  localStorage.setItem(checkpointKey("broken"), "invalid");
  useControlStore.setState({ record: null });
  useControlStore.getState().prepare("broken");
  expect(useControlStore.getState().record).toMatchObject({
    phase: "recovery",
    reason: "checkpoint_unavailable",
  });
});
