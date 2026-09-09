import { z } from "zod";

export const CONTROL = {
  version: "session-control-v1",
  graceMs: 10000,
  pauseMs: 1000,
  finalMs: 6000,
  endMs: 15000,
  finalCount: 2,
  endCount: 3,
  durationMs: 1800000,
} as const;
const line = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(50000),
});
export const checkpointSchema = z.object({
  version: z.literal(CONTROL.version),
  controlPolicy: z.enum(["visibility-v1", "visibility-and-focus-v2"]).optional(),
  key: z.string().max(200),
  phase: z.enum([
    "setup",
    "running",
    "paused",
    "final_warning",
    "recovery",
    "ended",
    "completed",
  ]),
  reason: z.string().max(120),
  remainingMs: z.number().min(0).max(CONTROL.durationMs),
  lastTick: z.number(),
  graceUntil: z.number(),
  awaySince: z.number().nullable(),
  episodeCounted: z.boolean(),
  interruptions: z.number().int().nonnegative(),
  recoveries: z.number().int().nonnegative(),
  finalWarningIssued: z.boolean(),
  replacementIndex: z.number().int().min(0).max(8),
  replacementQuestion: z.string().max(5000).nullable(),
  transcript: z.array(line).max(1000),
  pendingAssistant: z.string().max(50000),
  retired: z
    .array(z.object({ at: z.number(), lines: z.array(line).max(1000) }))
    .max(100),
  events: z
    .array(z.object({ at: z.number(), type: z.string().max(80) }))
    .max(200),
});
export type Checkpoint = z.infer<typeof checkpointSchema>;
export function newCheckpoint(key: string): Checkpoint {
  return {
    version: CONTROL.version,
    controlPolicy: "visibility-and-focus-v2",
    key,
    phase: "setup",
    reason: "",
    remainingMs: CONTROL.durationMs,
    lastTick: 0,
    graceUntil: 0,
    awaySince: null,
    episodeCounted: false,
    interruptions: 0,
    recoveries: 0,
    finalWarningIssued: false,
    replacementIndex: 0,
    replacementQuestion: null,
    transcript: [],
    pendingAssistant: "",
    retired: [],
    events: [],
  };
}
export function log(s: Checkpoint, type: string, now: number): Checkpoint {
  return { ...s, events: [...s.events, { at: now, type }].slice(-200) };
}
export function advance(
  s: Checkpoint,
  now: number,
  hidden: boolean,
  online: boolean,
  absenceReason: "page_hidden" | "window_unfocused" = "page_hidden"
): Checkpoint {
  if (["setup", "ended", "completed", "recovery"].includes(s.phase)) return s;
  const elapsed = Math.max(
    0,
    (s.awaySince === null
      ? now
      : Math.min(now, s.awaySince + CONTROL.pauseMs)) - s.lastTick
  );
  let n = {
    ...s,
    lastTick: now,
    remainingMs: Math.max(
      0,
      s.remainingMs - (s.phase === "running" ? elapsed : 0)
    ),
  };
  if (!online) return recover(n, now, "connection_lost");
  if (!n.remainingMs)
    return log(
      { ...n, phase: "completed", reason: "time_limit" },
      "time_limit",
      now
    );
  if (hidden && n.awaySince === null) n.awaySince = Math.max(now, n.graceUntil);
  const away = n.awaySince === null ? 0 : Math.max(0, now - n.awaySince);
  if (away >= CONTROL.pauseMs && !n.episodeCounted) {
    n = log(
      {
        ...n,
        phase: "paused",
        reason: absenceReason,
        episodeCounted: true,
        interruptions: n.interruptions + 1,
      },
      "paused_" + absenceReason,
      now
    );
  }
  if (
    n.episodeCounted &&
    (away >= CONTROL.finalMs || n.interruptions >= CONTROL.finalCount)
  ) {
    if (!n.finalWarningIssued)
      n = log({ ...n, finalWarningIssued: true }, "final_warning_issued", now);
    n.phase = "final_warning";
  }
  if (
    n.episodeCounted &&
    n.finalWarningIssued &&
    (away >= CONTROL.endMs || n.interruptions >= CONTROL.endCount)
  ) {
    n = log(
      {
        ...n,
        phase: "ended",
        reason:
          away >= CONTROL.endMs
            ? "continuous_absence"
            : "repeated_interruptions",
      },
      "automatically_ended",
      now
    );
  }
  if (!hidden) n = { ...n, awaySince: null, episodeCounted: false };
  return n;
}
export function recover(
  s: Checkpoint,
  now: number,
  reason: string
): Checkpoint {
  if (["setup", "ended", "completed", "recovery"].includes(s.phase)) return s;
  return log(
    {
      ...s,
      phase: "recovery",
      reason,
      awaySince: null,
      episodeCounted: false,
      lastTick: now,
      recoveries: s.recoveries + 1,
    },
    "technical_recovery",
    now
  );
}
export function run(s: Checkpoint, now: number): Checkpoint {
  if (["ended", "completed"].includes(s.phase)) return s;
  return log(
    {
      ...s,
      phase: "running",
      reason: "",
      lastTick: now,
      graceUntil: s.phase === "setup" ? now + CONTROL.graceMs : now,
      awaySince: null,
      episodeCounted: false,
    },
    "resumed",
    now
  );
}

const questions = [
  [
    "A project deadline is suddenly cut in half. How would you decide what to deliver, and how would you explain the tradeoffs?",
    "Tenggat proyek tiba-tiba dipangkas setengah. Bagaimana Anda menentukan apa yang akan diselesaikan dan menjelaskan konsekuensinya?",
  ],
  [
    "Two stakeholders give you conflicting requirements. How would you resolve the conflict before starting work?",
    "Dua pemangku kepentingan memberikan kebutuhan yang bertentangan. Bagaimana Anda menyelesaikannya sebelum mulai bekerja?",
  ],
  [
    "A change you shipped causes an unexpected customer problem. Walk through your first actions and how you would prevent a repeat.",
    "Perubahan yang Anda rilis menimbulkan masalah pelanggan. Jelaskan tindakan awal Anda dan cara mencegah kejadian serupa.",
  ],
  [
    "You must hand over an unfinished task to someone new. What would you document and how would you check they can continue safely?",
    "Anda harus menyerahkan tugas yang belum selesai kepada orang baru. Apa yang Anda dokumentasikan dan bagaimana memastikan ia dapat melanjutkan dengan aman?",
  ],
  [
    "You discover the data supporting a team decision may be unreliable. How would you verify it and communicate your findings?",
    "Anda menemukan data dasar keputusan tim mungkin tidak andal. Bagaimana Anda memeriksanya dan menyampaikan temuan Anda?",
  ],
  [
    "A teammate proposes a solution you disagree with. How would you test both approaches and reach a decision together?",
    "Rekan tim mengusulkan solusi yang tidak Anda setujui. Bagaimana Anda menguji kedua pendekatan dan mengambil keputusan bersama?",
  ],
  [
    "You receive a task in an unfamiliar area with limited guidance. How would you plan your learning and demonstrate progress?",
    "Anda menerima tugas di bidang yang belum dikenal dengan sedikit panduan. Bagaimana Anda merencanakan pembelajaran dan menunjukkan kemajuan?",
  ],
  [
    "A repeated manual task is slowing your team down. How would you measure the problem and decide whether to automate it?",
    "Tugas manual berulang memperlambat tim. Bagaimana Anda mengukur masalah dan memutuskan apakah perlu otomatisasi?",
  ],
] as const;
export function replaceQuestion(
  s: Checkpoint,
  now: number,
  language: string
): { state: Checkpoint; question: string | null } {
  if (s.replacementQuestion)
    return { state: s, question: s.replacementQuestion };
  if (s.replacementIndex >= questions.length)
    return {
      state: { ...s, phase: "recovery", reason: "replacement_bank_exhausted" },
      question: null,
    };
  const index = s.transcript.map((l) => l.role).lastIndexOf("assistant");
  const cut = s.pendingAssistant
    ? s.transcript.length
    : index < 0
      ? s.transcript.length
      : index;
  const retired = s.pendingAssistant
    ? [{ role: "assistant" as const, text: s.pendingAssistant }]
    : s.transcript.slice(cut);
  const languageIndex = /indones|bahasa|^id$/i.test(language) ? 1 : 0;
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const seen = [
    ...s.transcript.filter((l) => l.role === "assistant").map((l) => l.text),
    s.pendingAssistant,
    ...s.retired.flatMap((r) =>
      r.lines.filter((l) => l.role === "assistant").map((l) => l.text)
    ),
  ]
    .map(normalize)
    .filter((t) => t.length > 25);
  let nextIndex = s.replacementIndex;
  while (
    nextIndex < questions.length &&
    seen.some(
      (text) =>
        text.includes(normalize(questions[nextIndex][languageIndex])) ||
        normalize(questions[nextIndex][languageIndex]).includes(text)
    )
  )
    nextIndex++;
  if (nextIndex >= questions.length)
    return {
      question: null,
      state: { ...s, phase: "recovery", reason: "replacement_bank_exhausted" },
    };
  const question = questions[nextIndex][languageIndex];
  return {
    question,
    state: log(
      {
        ...s,
        transcript: s.transcript.slice(0, cut),
        pendingAssistant: "",
        retired: [...s.retired, { at: now, lines: retired }].slice(-100),
        replacementIndex: nextIndex + 1,
        replacementQuestion: question,
      },
      "question_replaced",
      now
    ),
  };
}
