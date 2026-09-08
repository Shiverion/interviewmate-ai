import { z } from "zod";

export const POLICY = Object.freeze({
  version: "session-integrity-v1" as const,
  startupGraceMs: 10_000,
  hiddenMinimumMs: 3_000,
  focusContextMinimumMs: 10_000,
  warningAt: 3,
  reviewAt: 5,
  maxEvents: 200,
  autoTerminate: false as const,
});
export const reasonSchema = z.enum([
  "not_provided",
  "technical_issue",
  "accessibility_need",
  "interruption",
  "permitted_resource",
  "other",
]);
const timestamp = z.number().nonnegative().max(8_640_000_000_000_000);
export const eventSchema = z.strictObject({
  id: z.number().int().positive(),
  startedAt: timestamp,
  endedAt: timestamp,
  hiddenMs: z.number().nonnegative(),
  awayMs: z.number().nonnegative(),
  kind: z.enum(["page_hidden", "focus_context"]),
  reason: reasonSchema,
});
export type IntegrityEvent = z.infer<typeof eventSchema>;
export const stateSchema = z.strictObject({
  version: z.literal(POLICY.version),
  sessionKey: z.string().min(1).max(200),
  acknowledgedAt: timestamp.nullable(),
  active: z.boolean(),
  completed: z.boolean(),
  graceUntil: timestamp,
  startedAt: timestamp.nullable(),
  endedAt: timestamp.nullable(),
  count: z.number().int().nonnegative(),
  focusCount: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative(),
  coverageGaps: z.number().int().nonnegative(),
  droppedEvents: z.number().int().nonnegative(),
  events: z.array(eventSchema).max(POLICY.maxEvents),
  episode: z
    .strictObject({
      startedAt: timestamp,
      hiddenSince: timestamp.nullable(),
      hiddenMs: z.number().nonnegative(),
    })
    .nullable(),
});
export type IntegrityState = z.infer<typeof stateSchema>;
export function initialState(sessionKey: string): IntegrityState {
  return {
    version: POLICY.version,
    sessionKey,
    acknowledgedAt: null,
    active: false,
    completed: false,
    graceUntil: 0,
    startedAt: null,
    endedAt: null,
    count: 0,
    focusCount: 0,
    sequence: 0,
    coverageGaps: 0,
    droppedEvents: 0,
    events: [],
    episode: null,
  };
}
export function start(state: IntegrityState, now: number): IntegrityState {
  if (state.active || state.acknowledgedAt === null) return state;
  return {
    ...state,
    active: true,
    completed: false,
    coverageGaps:
      state.coverageGaps +
      (state.endedAt !== null && now - state.endedAt > 1000 ? 1 : 0),
    startedAt: state.startedAt ?? now,
    endedAt: null,
    graceUntil: now + POLICY.startupGraceMs,
    episode: null,
  };
}
function closeEpisode(state: IntegrityState, now: number): IntegrityState {
  const e = state.episode;
  if (!e) return state;
  const end = Math.max(now, e.startedAt);
  const hiddenMs =
    e.hiddenMs +
    (e.hiddenSince === null ? 0 : Math.max(0, end - e.hiddenSince));
  const awayMs = Math.max(0, end - e.startedAt);
  const kind =
    hiddenMs >= POLICY.hiddenMinimumMs
      ? "page_hidden"
      : awayMs >= POLICY.focusContextMinimumMs
        ? "focus_context"
        : null;
  if (!kind) return { ...state, episode: null };
  const event: IntegrityEvent = {
    id: state.sequence + 1,
    startedAt: e.startedAt,
    endedAt: end,
    hiddenMs,
    awayMs,
    kind,
    reason: "not_provided",
  };
  const events = [...state.events, event];
  return {
    ...state,
    episode: null,
    count: state.count + (kind === "page_hidden" ? 1 : 0),
    focusCount: state.focusCount + (kind === "focus_context" ? 1 : 0),
    sequence: event.id,
    droppedEvents:
      state.droppedEvents + (events.length > POLICY.maxEvents ? 1 : 0),
    events: events.slice(-POLICY.maxEvents),
  };
}
export function observe(
  state: IntegrityState,
  hidden: boolean,
  focused: boolean,
  now: number
): IntegrityState {
  if (!state.active) return state;
  // Event-based duration measurement avoids relying on background timer scheduling.
  if (!hidden && focused) return closeEpisode(state, now);
  if (!hidden && state.episode?.hiddenSince != null) {
    // A selected tab can be visible while keyboard focus stays in browser chrome.
    // Finish its hidden interval now; subsequent focus-only time is separate context.
    const returned = closeEpisode(state, now);
    return {
      ...returned,
      episode: {
        startedAt: Math.max(now, state.graceUntil),
        hiddenSince: null,
        hiddenMs: 0,
      },
    };
  }
  const e = state.episode ?? {
    startedAt: Math.max(now, state.graceUntil),
    hiddenSince: null,
    hiddenMs: 0,
  };
  const at = Math.max(now, e.startedAt);
  const next = { ...e };
  if (hidden && e.hiddenSince === null) next.hiddenSince = at;
  if (!hidden && e.hiddenSince !== null) {
    next.hiddenMs += Math.max(0, at - e.hiddenSince);
    next.hiddenSince = null;
  }
  return { ...state, episode: next };
}
export function finish(state: IntegrityState, now: number): IntegrityState {
  if (!state.active) return state;
  return {
    ...closeEpisode(state, now),
    active: false,
    completed: true,
    endedAt: now,
    episode: null,
  };
}
export const reportSchema = z.strictObject({
  version: z.literal(POLICY.version),
  source: z.literal("client_reported"),
  sessionKey: z.string().max(200),
  acknowledgedAt: timestamp.nullable(),
  startedAt: timestamp.nullable(),
  endedAt: timestamp.nullable(),
  hiddenCount: z.number().int().nonnegative(),
  focusContextCount: z.number().int().nonnegative(),
  coverageGaps: z.number().int().nonnegative(),
  droppedEvents: z.number().int().nonnegative(),
  events: z.array(eventSchema).max(POLICY.maxEvents),
  policy: z.object({
    startupGraceMs: z.literal(POLICY.startupGraceMs),
    hiddenMinimumMs: z.literal(POLICY.hiddenMinimumMs),
    focusContextMinimumMs: z.literal(POLICY.focusContextMinimumMs),
    warningAt: z.literal(POLICY.warningAt),
    reviewAt: z.literal(POLICY.reviewAt),
    autoTerminate: z.literal(false),
  }),
});
export type IntegrityReport = z.infer<typeof reportSchema>;
export function report(state: IntegrityState): IntegrityReport {
  return {
    version: POLICY.version,
    source: "client_reported",
    sessionKey: state.sessionKey,
    acknowledgedAt: state.acknowledgedAt,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    hiddenCount: state.count,
    focusContextCount: state.focusCount,
    coverageGaps: state.coverageGaps,
    droppedEvents: state.droppedEvents,
    events: state.events,
    policy: {
      startupGraceMs: POLICY.startupGraceMs,
      hiddenMinimumMs: POLICY.hiddenMinimumMs,
      focusContextMinimumMs: POLICY.focusContextMinimumMs,
      warningAt: POLICY.warningAt,
      reviewAt: POLICY.reviewAt,
      autoTerminate: false,
    },
  };
}
export function reportText(value: unknown) {
  const parsed = reportSchema.safeParse(value);
  if (!parsed.success)
    return "Session integrity: no valid record available. This does not establish compliance.\n";
  const r = parsed.data;
  return (
    "SESSION INTEGRITY (client-reported; not proof of cheating)\n" +
    "Hidden-page events: " +
    r.hiddenCount +
    "; focus-only context: " +
    r.focusContextCount +
    "\n" +
    "Human review suggested: " +
    (r.hiddenCount >= POLICY.reviewAt ? "yes" : "threshold not reached") +
    "; automatic termination: disabled\n" +
    "Coverage gaps: " +
    r.coverageGaps +
    "; older events omitted: " +
    r.droppedEvents +
    "\n" +
    r.events
      .map(
        (e) =>
          new Date(e.startedAt).toISOString() +
          " | " +
          e.kind +
          " | hidden " +
          (e.hiddenMs / 1000).toFixed(1) +
          "s | candidate context: " +
          e.reason
      )
      .join("\n") +
    "\n"
  );
}
