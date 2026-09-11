import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const DEMO_LIMITS = {
  starts: 5,
  globalStarts: 20,
  durationMs: 8 * 60000,
  connections: 8,
} as const;
export type DemoLease = {
  reviewerId?: string;
  candidateName?: string;
  jobTitle?: string;
  jobDescription?: string;
  resumeText?: string;
  configuration?: import("@/lib/interview/config").InterviewConfiguration;
  owner: string;
  expiresAt: number;
  connections: number;
  callIds: string[];
  pendingUntil: number;
  evaluations: string[];
  transcript?: unknown;
  evaluationResult?: unknown;
  evaluationModel?: string;
  evaluationProvider?: string;
};
type Ledger = {
  reviewerSessions?: Record<
    string,
    {
      owner: string;
      id: string;
      candidateName: string;
      jobTitle: string;
      jobDescription: string;
      configuration: import("@/lib/interview/config").InterviewConfiguration;
      resumeText?: string;
      cvParsing?: import("@/lib/pdf/result").ParsingResult;
      startsAt: number;
      endsAt: number;
      status: string;
      createdAt: number;
      transcript?: unknown;
      evaluation?: unknown;
      feedback?: {
        overall_experience: number;
        interviewer_clarity: number;
        transcription_accuracy: number;
        question_relevance: number;
        technical_reliability: number;
        comments: string;
        submitted_at?: unknown;
      };
      model?: string;
      provider?: string;
    }
  >;
  reviewers?: Record<
    string,
    { units: number; minute: number; requests: number }
  >;
  redemptions?: Record<string, number>;
  daily: Record<string, number>;
  leases: Record<string, DemoLease>;
};
export function demoAvailability() {
  if (!process.env.OPENAI_API_KEY?.trim())
    return "The host has not configured voice access yet.";
  if (
    process.env.NODE_ENV === "production" &&
    (process.env.VERCEL ||
      process.env.DEMO_RUNTIME !== "persistent-node" ||
      !process.env.DEMO_STATE_DIR ||
      (process.env.DEMO_COOKIE_SECRET?.length || 0) < 32)
  )
    return "Hosted voice is awaiting its persistent runtime and usage storage.";
  return null;
}
const directory = () =>
  path.resolve(process.env.DEMO_STATE_DIR || ".demo-state");
export async function withLedger<T>(fn: (data: Ledger) => T): Promise<T> {
  const dir = directory();
  await mkdir(dir, { recursive: true });
  const lockPath = path.join(dir, "ledger.lock");
  let lock;
  for (let i = 0; i < 30; i++) {
    try {
      lock = await open(lockPath, "wx");
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      const age = await stat(lockPath).catch(() => null);
      if (age && Date.now() - age.mtimeMs > 30000)
        await unlink(lockPath).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
  if (!lock) throw Error("Usage storage is busy. Please retry.");
  try {
    let data: Ledger;
    try {
      data = JSON.parse(await readFile(path.join(dir, "ledger.json"), "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      data = { daily: {}, leases: {} };
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const key of Object.keys(data.daily))
      if (!key.startsWith(today)) delete data.daily[key];
    // Preserve outstanding provider calls until a successful hangup; retain other lease metadata for a day.
    for (const [id, lease] of Object.entries(data.leases))
      if (!lease.callIds.length && lease.expiresAt < Date.now() - 86400000)
        delete data.leases[id];
    const result = fn(data);
    const tmp = path.join(dir, `ledger-${randomUUID()}.tmp`);
    await writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
    await rename(tmp, path.join(dir, "ledger.json"));
    return result;
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}
const dailyKey = (owner: string) =>
  new Date().toISOString().slice(0, 10) + ":" + owner;
export async function quota(
  owner: string,
  limit: number = DEMO_LIMITS.starts,
  globalLimit: number = DEMO_LIMITS.globalStarts
) {
  return withLedger((data) => ({
    remaining: Math.max(0, limit - (data.daily[dailyKey(owner)] || 0)),
    sharedRemaining: Math.max(
      0,
      globalLimit - (data.daily[dailyKey("global")] || 0)
    ),
  }));
}
export async function reserve(
  owner: string,
  requested?: string,
  connecting = true,
  options?: {
    reviewerId: string;
    dailyStarts: number;
    expiresAt: number;
    durationMs: number;
    configuration?: import("@/lib/interview/config").InterviewConfiguration;
    candidateName?: string;
    jobTitle?: string;
    jobDescription?: string;
    resumeText?: string;
  },
  publicConfiguration?: import("@/lib/interview/config").InterviewConfiguration
) {
  return withLedger((data) => {
    const now = Date.now();
    let id = requested;
    if (!id) {
      if (
        (data.daily[dailyKey(owner)] || 0) >=
          (options?.dailyStarts || DEMO_LIMITS.starts) ||
        (data.daily[dailyKey("global")] || 0) >=
          (options ? 100 : DEMO_LIMITS.globalStarts)
      )
        throw Error(
          "Today's free voice allowance is used. Come back tomorrow or connect your own key."
        );
      if (
        Object.values(data.leases).some(
          (s) =>
            s.owner === owner &&
            (s.callIds.length || s.pendingUntil > now) &&
            s.expiresAt > now
        )
      )
        throw Error("Finish your current voice demo before starting another.");
      id = "demo-reviewer-" + randomUUID();
      data.daily[dailyKey(owner)] = (data.daily[dailyKey(owner)] || 0) + 1;
      data.daily[dailyKey("global")] =
        (data.daily[dailyKey("global")] || 0) + 1;
      data.leases[id] = {
        configuration: options?.configuration || publicConfiguration,
        ...(options
          ? {
              reviewerId: options.reviewerId,
              candidateName: options.candidateName,
              jobTitle: options.jobTitle,
              jobDescription: options.jobDescription,
              resumeText: options.resumeText,
              configuration: options.configuration,
            }
          : {}),
        owner,
        expiresAt: options
          ? Math.min(options.expiresAt, now + options.durationMs)
          : now + DEMO_LIMITS.durationMs,
        connections: 0,
        callIds: [],
        pendingUntil: 0,
        evaluations: [],
      };
    }
    const lease = data.leases[id];
    if (!lease || lease.owner !== owner)
      throw Error("This demo belongs to another browser or is unavailable.");
    if (
      connecting &&
      Object.entries(data.leases).some(
        ([key, value]) =>
          key !== id &&
          value.owner === owner &&
          (value.callIds.length || value.pendingUntil > now) &&
          value.expiresAt > now
      )
    )
      throw Error("Finish your other active demo before connecting.");
    if (lease.expiresAt <= now)
      throw Error("This free demo's eight-minute window has ended.");
    if (
      lease.pendingUntil > now ||
      lease.connections >= DEMO_LIMITS.connections
    )
      throw Error(
        "A connection is pending or the reconnection allowance is used."
      );
    if (connecting) {
      lease.connections++;
      lease.pendingUntil = now + 60000;
    }
    return { id, ...lease };
  });
}
export async function ownedLease(owner: string, id: string) {
  return withLedger((data) => {
    const lease = data.leases[id];
    if (!lease || lease.owner !== owner)
      throw Error("Demo unavailable in this browser.");
    return lease;
  });
}
export async function attachCall(id: string, callId: string) {
  return withLedger((data) => {
    data.leases[id].callIds.push(callId);
    data.leases[id].pendingUntil = 0;
  });
}
export async function releasePending(id: string) {
  return withLedger((data) => {
    if (data.leases[id]) data.leases[id].pendingUntil = 0;
  });
}
export async function claimEvaluation(
  owner: string,
  id: string,
  _provider: string
) {
  void _provider;
  return withLedger((data) => {
    const lease = data.leases[id];
    if (
      !lease ||
      lease.owner !== owner ||
      lease.expiresAt + 3600000 < Date.now()
    )
      throw Error("This demo's evaluation window has ended.");
    // Evaluation can be retried or compared repeatedly. Reviewer abuse
    // protection is handled by the invitation budget and request rate limit.
  });
}

export async function saveEvaluation(
  owner: string,
  id: string,
  value: {
    transcript: unknown;
    evaluation: unknown;
    model?: string;
    provider?: string;
  }
) {
  return withLedger((data) => {
    const lease = data.leases[id];
    if (!lease || lease.owner !== owner) throw Error("Demo unavailable.");
    lease.transcript = value.transcript;
    lease.evaluationResult = value.evaluation;
    lease.evaluationModel = value.model;
    lease.evaluationProvider = value.provider;
  });
}
export async function hangupCalls(id?: string) {
  const { invitations } = await import("@/lib/access/reviewer");
  const activeInvites = new Set(
    (await invitations())
      .filter((i) => !i.revoked && (i.expiresAt === null || i.expiresAt > Date.now()))
      .map((i) => i.id)
  );
  const pending = await withLedger((data) =>
    Object.entries(data.leases)
      .filter(([key, value]) =>
        id
          ? key === id
          : value.expiresAt <= Date.now() ||
            (!!value.reviewerId && !activeInvites.has(value.reviewerId))
      )
      .flatMap(([key, value]) =>
        value.callIds.map((callId) => ({ key, callId }))
      )
  );
  for (const { key, callId } of pending) {
    if (callId.startsWith("gemini-")) {
      const { closeGeminiSession } =
        await import("@/lib/realtime/gemini-sessions");
      closeGeminiSession(callId);
      await withLedger((data) => {
        data.leases[key].callIds = data.leases[key].callIds.filter(
          (c) => c !== callId
        );
      });
      continue;
    }
    const res = await fetch(
      `https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/hangup`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(10000),
      }
    ).catch(() => null);
    if (res && (res.ok || res.status === 404 || res.status === 410))
      await withLedger((data) => {
        data.leases[key].callIds = data.leases[key].callIds.filter(
          (c) => c !== callId
        );
      });
  }
}
const workerState = globalThis as typeof globalThis & {
  demoReaper?: ReturnType<typeof setInterval>;
  demoReaping?: boolean;
};
export function startDemoReaper() {
  if (workerState.demoReaper || demoAvailability()) return;
  const sweep = async () => {
    if (workerState.demoReaping) return;
    workerState.demoReaping = true;
    try {
      await hangupCalls();
    } catch {
      /* Fail closed on new requests when storage fails; retry hangups next sweep. */
    } finally {
      workerState.demoReaping = false;
    }
  };
  workerState.demoReaper = setInterval(() => void sweep(), 5000);
  workerState.demoReaper.unref();
  void sweep();
}
