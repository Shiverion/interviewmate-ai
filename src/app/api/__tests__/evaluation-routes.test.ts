/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST as evaluate } from "@/app/api/evaluate/route";
import { POST as scheduled } from "@/app/api/evaluate/scheduled/route";
import { POST as demo } from "@/app/api/demo/evaluate/route";
import { assessEvidence } from "@/lib/ai/assess";
import { evaluateWithProvider } from "@/lib/ai/evaluation";
import { PROVIDERS, type AIProvider } from "@/lib/ai/catalog";
import {
  eligibleEvidence,
  finalizeEvidence,
  type EvidenceLine,
} from "@/lib/ai/evidence";
import { configurationSchema } from "@/lib/interview/config";
import { isVerifiedAdminRequest } from "@/lib/firebase/server-auth";
import { requireScheduledSession } from "@/lib/firebase/scheduled-session";
import {
  requestReviewer,
  consumeReviewer,
  type ReviewerGrant,
} from "@/lib/access/reviewer";
import {
  demoAvailability,
  ownedLease,
  claimEvaluation,
  saveEvaluation,
} from "@/lib/demo/ledger";
import { visitor } from "@/lib/demo/http";

jest.mock("@/lib/ai/assess", () => ({
  ...jest.requireActual("@/lib/ai/assess"),
  assessEvidence: jest.fn(),
}));
jest.mock("@/lib/ai/evaluation", () => ({
  ...jest.requireActual("@/lib/ai/evaluation"),
  evaluateWithProvider: jest.fn(),
}));
jest.mock("@/lib/firebase/server-auth", () => ({
  ...jest.requireActual("@/lib/firebase/server-auth"),
  isVerifiedAdminRequest: jest.fn(),
}));
jest.mock("@/lib/firebase/scheduled-session", () => ({
  ...jest.requireActual("@/lib/firebase/scheduled-session"),
  requireScheduledSession: jest.fn(),
}));
jest.mock("@/lib/access/reviewer", () => ({
  ...jest.requireActual("@/lib/access/reviewer"),
  requestReviewer: jest.fn(),
  consumeReviewer: jest.fn(),
}));
jest.mock("@/lib/demo/ledger", () => ({
  ...jest.requireActual("@/lib/demo/ledger"),
  demoAvailability: jest.fn(),
  ownedLease: jest.fn(),
  claimEvaluation: jest.fn(),
  saveEvaluation: jest.fn(),
}));
jest.mock("@/lib/demo/http", () => ({
  ...jest.requireActual("@/lib/demo/http"),
  visitor: jest.fn(),
}));

type Keys = Partial<Record<AIProvider, string>>;
type Route = "evaluate" | "scheduled" | "demo";
type KeyHeader = "x-ai-key" | "x-openai-key" | "absent";
type BrowserKeys = "present" | "absent" | "malformed";
type Fixture = {
  name: string;
  env: Record<string, string>;
  keys: Keys;
  selected: Record<AIProvider, AIProvider>;
  demoAvailable: boolean;
};
const allKeys = {
  openai: "server-o",
  gemini: "server-g",
  deepseek: "server-d",
};
const unchanged = {
  openai: "openai",
  gemini: "gemini",
  deepseek: "deepseek",
} as const;
const fixtures: Fixture[] = [
  {
    name: "none",
    env: {},
    keys: {},
    selected: unchanged,
    demoAvailable: false,
  },
  {
    name: "openai only",
    env: { OPENAI_API_KEY: "server-o" },
    keys: { openai: "server-o" },
    selected: { openai: "openai", gemini: "openai", deepseek: "openai" },
    demoAvailable: true,
  },
  {
    name: "gemini only",
    env: { GOOGLE_GENERATIVE_AI_API_KEY: "server-g" },
    keys: { gemini: "server-g" },
    selected: { openai: "gemini", gemini: "gemini", deepseek: "gemini" },
    demoAvailable: false,
  },
  {
    name: "all",
    env: {
      OPENAI_API_KEY: "server-o",
      GOOGLE_GENERATIVE_AI_API_KEY: "server-g",
      DEEPSEEK_API_KEY: "server-d",
    },
    keys: allKeys,
    selected: unchanged,
    demoAvailable: true,
  },
  {
    name: "all padded",
    env: {
      OPENAI_API_KEY: "  server-o \t",
      GOOGLE_GENERATIVE_AI_API_KEY: "\tserver-g  ",
      DEEPSEEK_API_KEY: " server-d\n",
    },
    keys: allKeys,
    selected: unchanged,
    demoAvailable: true,
  },
  {
    name: "one whitespace-only",
    env: {
      OPENAI_API_KEY: "server-o",
      GOOGLE_GENERATIVE_AI_API_KEY: " \t\n",
      DEEPSEEK_API_KEY: "server-d",
    },
    keys: { openai: "server-o", deepseek: "server-d" },
    selected: { openai: "openai", gemini: "openai", deepseek: "deepseek" },
    demoAvailable: true,
  },
  {
    name: "one empty-string",
    env: {
      OPENAI_API_KEY: "server-o",
      GOOGLE_GENERATIVE_AI_API_KEY: "",
      DEEPSEEK_API_KEY: "server-d",
    },
    keys: { openai: "server-o", deepseek: "server-d" },
    selected: { openai: "openai", gemini: "openai", deepseek: "deepseek" },
    demoAvailable: true,
  },
];
const browserKeys = {
  openai: "",
  gemini: " browser-g ",
  deepseek: "browser-d",
};
const malformed = "{";
const malformedError = (() => {
  try {
    JSON.parse(malformed);
  } catch (error) {
    return (error as Error).message;
  }
  throw Error("Malformed fixture must fail JSON.parse");
})();
const noHostedProvider = "No hosted evaluation provider is configured.";
const disabledFallback =
  "Requested evaluation provider is not configured and fallback is disabled.";
const unavailableDemo = "The host has not configured voice access yet.";
const exhausted =
  "Evaluation failed validation or provider access. No score was saved.";
const transcript: EvidenceLine[] = [
  {
    role: "user",
    text: "I measured the slow database queries, added an index, and verified that response time fell from two seconds to one hundred milliseconds.",
  },
];
const noEvidence: EvidenceLine[] = [
  { role: "assistant", text: "Describe a project you delivered." },
];
const configuration = configurationSchema.parse({});
const fixedResult = {
  object: finalizeEvidence({ competencies: [] }, transcript, configuration),
  provider: "openai",
  model: "fixture-model",
  diagnostic: null,
};
const grant: ReviewerGrant = {
  id: "fixture-reviewer",
  label: "Fixture",
  codeHash: "a".repeat(64),
  expiresAt: null,
  revoked: false,
  dailyStarts: 30,
  budgetUnits: 500,
  maxRedemptions: null,
  redeemedBy: [],
  createdAt: 0,
};
const sessionId = "fixture-session-123";
const origin = "http://localhost:3000";
const originalEnv = { ...process.env };
const sessionUpdate = jest.fn();
const mockAssess = jest.mocked(assessEvidence);
const mockEvaluate = jest.mocked(evaluateWithProvider);
const realAssess =
  jest.requireActual<typeof import("@/lib/ai/assess")>(
    "@/lib/ai/assess"
  ).assessEvidence;
const routes = { evaluate, scheduled, demo };
const paths = {
  evaluate: "/api/evaluate",
  scheduled: "/api/evaluate/scheduled",
  demo: "/api/demo/evaluate",
};

type Scenario = {
  route: Route;
  fixture: Fixture;
  requested: AIProvider;
  allowFallback?: boolean;
  admin?: boolean;
  grant?: boolean;
  keyHeader?: KeyHeader;
  browser?: BrowserKeys;
};
type Observable = {
  status: number;
  provider: AIProvider | null;
  key: string | undefined | null;
  fallbackKeys: Keys | undefined | null;
};
type Expected = { observable: Observable; error?: string };
type Row = { name: string; scenario: Scenario; expected: Expected };
const rows: Row[] = [];
const success = (
  provider: AIProvider,
  key: string | undefined,
  fallbackKeys: Keys | undefined
): Expected => ({
  observable: { status: 200, provider, key, fallbackKeys },
});
const failure = (status: number, error: string): Expected => ({
  observable: { status, provider: null, key: null, fallbackKeys: null },
  error,
});

for (const fixture of fixtures) {
  for (const requested of ["openai", "gemini", "deepseek"] as const) {
    for (const allowFallback of [false, true]) {
      const keyHeaders: KeyHeader[] =
        requested === "openai"
          ? ["x-ai-key", "x-openai-key", "absent"]
          : ["x-ai-key", "absent"];
      for (const keyHeader of keyHeaders) {
        for (const admin of [false, true]) {
          for (const browser of ["present", "absent", "malformed"] as const) {
            const hostedAdmin = keyHeader === "absent" && admin;
            const effectiveFallback = allowFallback || hostedAdmin;
            const provider = hostedAdmin
              ? fixture.selected[requested]
              : requested;
            const expected =
              effectiveFallback && browser === "malformed"
                ? failure(422, malformedError)
                : success(
                    provider,
                    hostedAdmin
                      ? fixture.keys[provider]
                      : keyHeader === "absent"
                        ? undefined
                        : "caller-k",
                    effectiveFallback
                      ? {
                          ...(hostedAdmin ? fixture.keys : {}),
                          ...(browser === "present" ? browserKeys : {}),
                        }
                      : undefined
                  );
            rows.push({
              name: `preserved: evaluate | requested=${requested} | env=${fixture.name} | key=${keyHeader} | admin=${admin} | fallback=${allowFallback} | browser=${browser}`,
              scenario: {
                route: "evaluate",
                fixture,
                requested,
                allowFallback,
                keyHeader,
                admin,
                browser,
              },
              expected,
            });
          }
        }
      }

      const refuses =
        fixture.name !== "none" && !allowFallback && !fixture.keys[requested];
      rows.push({
        name: `${refuses ? "fix-1" : "preserved"}: scheduled | requested=${requested} | env=${fixture.name} | fallback=${allowFallback}`,
        scenario: { route: "scheduled", fixture, requested, allowFallback },
        expected:
          fixture.name === "none"
            ? failure(503, noHostedProvider)
            : refuses
              ? failure(503, disabledFallback)
              : success(
                  fixture.selected[requested],
                  fixture.keys[fixture.selected[requested]],
                  allowFallback ? fixture.keys : undefined
                ),
      });

      for (const reviewer of [false, true]) {
        const provider = reviewer ? fixture.selected[requested] : requested;
        const effectiveFallback = allowFallback || reviewer;
        const trims =
          fixture.demoAvailable &&
          (fixture.name === "all padded" ||
            (fixture.name === "one whitespace-only" &&
              (effectiveFallback || provider === "gemini")) ||
            (fixture.name === "one empty-string" && provider === "gemini"));
        rows.push({
          name: `${trims ? "fix-2" : "preserved"}: demo | requested=${requested} | env=${fixture.name} | grant=${reviewer} | fallback=${allowFallback}`,
          scenario: {
            route: "demo",
            fixture,
            requested,
            allowFallback,
            grant: reviewer,
          },
          expected: fixture.demoAvailable
            ? success(
                provider,
                fixture.keys[provider],
                effectiveFallback ? fixture.keys : {}
              )
            : failure(503, unavailableDemo),
        });
      }
    }
  }
}

beforeEach(() => {
  jest.resetAllMocks();
  sessionUpdate.mockResolvedValue(undefined);
  mockAssess.mockResolvedValue(fixedResult);
  mockEvaluate.mockRejectedValue(Error("Unexpected provider call"));
  jest.mocked(isVerifiedAdminRequest).mockResolvedValue(false);
  jest.mocked(requireScheduledSession).mockResolvedValue({
    identity: {
      uid: "fixture-user",
      email: "fixture@example.test",
      emailVerified: true,
    },
    admin: false,
    data: { configuration },
    ref: { update: sessionUpdate },
  } as unknown as Awaited<ReturnType<typeof requireScheduledSession>>);
  jest.mocked(requestReviewer).mockResolvedValue(null);
  jest.mocked(consumeReviewer).mockResolvedValue({ used: 3, limit: 500 });
  jest
    .mocked(demoAvailability)
    .mockImplementation(() =>
      process.env.OPENAI_API_KEY?.trim() ? null : unavailableDemo
    );
  jest.mocked(ownedLease).mockResolvedValue({
    owner: "fixture-visitor",
    expiresAt: 0,
    connections: 0,
    callIds: [],
    pendingUntil: 0,
    evaluations: [],
    configuration,
  });
  jest.mocked(claimEvaluation).mockResolvedValue(undefined);
  jest.mocked(saveEvaluation).mockResolvedValue(undefined);
  jest
    .mocked(visitor)
    .mockReturnValue({ id: "fixture-visitor", cookie: "fixture-cookie" });
  jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(Error("Network is disabled in the route harness"));
});
afterEach(() => {
  process.env = { ...originalEnv };
  expect(globalThis.fetch).not.toHaveBeenCalled();
  jest.restoreAllMocks();
});

function prepare(scenario: Scenario, lines = transcript) {
  for (const { env } of PROVIDERS) delete process.env[env];
  Object.assign(process.env, scenario.fixture.env);
  jest.mocked(isVerifiedAdminRequest).mockResolvedValue(!!scenario.admin);
  jest.mocked(requestReviewer).mockResolvedValue(scenario.grant ? grant : null);
  const headers: Record<string, string> = {
    origin,
    "Content-Type": "application/json",
  };
  if (scenario.route === "evaluate") {
    headers["x-ai-provider"] = scenario.requested;
    if (scenario.keyHeader && scenario.keyHeader !== "absent")
      headers[scenario.keyHeader] = "caller-k";
    if (scenario.allowFallback !== undefined)
      headers["x-ai-allow-fallback"] = String(scenario.allowFallback);
    if (scenario.browser === "present")
      headers["x-ai-fallback-keys"] = JSON.stringify(browserKeys);
    if (scenario.browser === "malformed")
      headers["x-ai-fallback-keys"] = malformed;
  }
  return new NextRequest(origin + paths[scenario.route], {
    method: "POST",
    headers,
    body: JSON.stringify({
      sessionId,
      provider: scenario.requested,
      allowFallback: scenario.allowFallback,
      transcript: lines,
    }),
  });
}

async function observe(route: Route, request: NextRequest) {
  const response = await routes[route](request);
  const body = JSON.parse(await response.text()); // objects from response.json() fail toStrictEqual against test literals ("serializes to the same string"); parsing here avoids it
  const call = mockAssess.mock.calls[0];
  const observable: Observable =
    response.ok && call
      ? {
          status: response.status,
          provider: call[0],
          key: call[1],
          fallbackKeys: call[4]?.fallbackKeys,
        }
      : {
          status: response.status,
          provider: null,
          key: null,
          fallbackKeys: null,
        };
  return { response, body, observable };
}

function accountingOrder() {
  const operations = {
    ownedLease,
    claimEvaluation,
    consumeReviewer,
    assessEvidence,
    saveEvaluation,
  };
  return Object.entries(operations)
    .flatMap(([name, fn]) =>
      jest.mocked(fn).mock.invocationCallOrder.map((order) => ({ name, order }))
    )
    .sort((a, b) => a.order - b.order)
    .map(({ name }) => name);
}

async function check(scenario: Scenario, expected: Expected) {
  expect(eligibleEvidence(transcript)).toBe(true);
  const { observable, body, response } = await observe(
    scenario.route,
    prepare(scenario)
  );
  expect(observable).toStrictEqual(expected.observable);
  if (expected.error !== undefined) {
    expect(body).toStrictEqual({ error: expected.error });
    expect(mockAssess).not.toHaveBeenCalled();
    expect(sessionUpdate).not.toHaveBeenCalled();
    if (scenario.route === "demo") expect(accountingOrder()).toEqual([]);
    return;
  }
  expect(mockAssess).toHaveBeenCalledTimes(1);
  const hostedAdmin =
    scenario.route === "evaluate" &&
    (!scenario.keyHeader || scenario.keyHeader === "absent") &&
    !!scenario.admin;
  expect(mockAssess).toHaveBeenCalledWith(
    expected.observable.provider,
    expected.observable.key,
    transcript,
    configuration,
    {
      host: scenario.route === "evaluate" ? hostedAdmin : true,
      fallbackKeys: expected.observable.fallbackKeys,
      jobContext: {
        role: scenario.route === "evaluate" ? undefined : "",
        cvText: undefined,
      },
    }
  );
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const common = {
    evaluation: fixedResult.object,
    provider: fixedResult.provider,
    model: fixedResult.model,
  };
  if (scenario.route === "evaluate") {
    expect(body).toStrictEqual({
      ...common,
      diagnostic: null,
      success: true,
      persisted: false,
      source: {
        sessionId,
        rubricVersion: fixedResult.object.schemaVersion,
        evaluatedAt: expect.any(String),
      },
    });
  } else if (scenario.route === "scheduled") {
    expect(body).toStrictEqual({
      ...common,
      diagnostic: null,
      persisted: true,
    });
    expect(sessionUpdate).toHaveBeenCalledTimes(1);
    expect(sessionUpdate).toHaveBeenCalledWith({
      evaluation: fixedResult.object,
      evaluation_model: fixedResult.model,
      evaluation_provider: fixedResult.provider,
      status: "evaluated",
      evaluated_at: expect.anything(),
    });
  } else {
    expect(body).toStrictEqual({
      ...common,
      ...(scenario.grant ? { diagnostic: null } : {}),
      persisted: true,
    });
    const owner = scenario.grant ? `reviewer:${grant.id}` : "fixture-visitor";
    expect(ownedLease).toHaveBeenCalledWith(owner, sessionId);
    expect(claimEvaluation).toHaveBeenCalledWith(
      owner,
      sessionId,
      expected.observable.provider
    );
    if (scenario.grant) expect(consumeReviewer).toHaveBeenCalledWith(grant, 3);
    else expect(consumeReviewer).not.toHaveBeenCalled();
    expect(accountingOrder()).toEqual([
      "ownedLease",
      "claimEvaluation",
      ...(scenario.grant ? ["consumeReviewer"] : []),
      "assessEvidence",
      "saveEvaluation",
    ]);
    expect(saveEvaluation).toHaveBeenCalledWith(owner, sessionId, {
      transcript,
      evaluation: fixedResult.object,
      model: fixedResult.model,
      provider: fixedResult.provider,
    });
  }
  expect(mockEvaluate).not.toHaveBeenCalled();
}

test.each(rows)("$name", async ({ scenario, expected }) => {
  await check(scenario, expected);
});

test("fix-1: scheduled refuses when fallback disabled and provider unconfigured", async () => {
  await check(
    {
      route: "scheduled",
      fixture: fixtures[1],
      requested: "gemini",
      allowFallback: false,
    },
    failure(503, disabledFallback)
  );
});
test("fix-2: demo trims server keys", async () => {
  await check(
    {
      route: "demo",
      fixture: fixtures[4],
      requested: "gemini",
      allowFallback: true,
    },
    success("gemini", "server-g", allKeys)
  );
});

const defaults: Row[] = [
  {
    name: "preserved: evaluate defaults fallback off and ignores malformed browser JSON",
    scenario: {
      route: "evaluate",
      fixture: fixtures[3],
      requested: "gemini",
      keyHeader: "x-ai-key",
      browser: "malformed",
    },
    expected: success("gemini", "caller-k", undefined),
  },
  {
    name: "preserved: evaluate hostedAdmin parses malformed browser JSON without a fallback header",
    scenario: {
      route: "evaluate",
      fixture: fixtures[3],
      requested: "gemini",
      admin: true,
      browser: "malformed",
    },
    expected: failure(422, malformedError),
  },
  {
    name: "preserved: scheduled defaults fallback on",
    scenario: { route: "scheduled", fixture: fixtures[1], requested: "gemini" },
    expected: success("openai", "server-o", { openai: "server-o" }),
  },
  {
    name: "preserved: demo defaults fallback off and proceeds with an absent primary",
    scenario: { route: "demo", fixture: fixtures[1], requested: "gemini" },
    expected: success("gemini", undefined, {}),
  },
];
test.each(defaults)("$name", async ({ scenario, expected }) => {
  await check(scenario, expected);
});

test("preserved: evaluate ignores non-true fallback header and gives x-ai-key precedence", async () => {
  const request = prepare({
    route: "evaluate",
    fixture: fixtures[3],
    requested: "openai",
    admin: true,
    keyHeader: "x-ai-key",
    browser: "malformed",
  });
  request.headers.set("x-ai-allow-fallback", "TRUE");
  request.headers.set("x-openai-key", "legacy-k");
  const { observable } = await observe("evaluate", request);
  expect(observable).toStrictEqual(
    success("openai", "caller-k", undefined).observable
  );
  expect(isVerifiedAdminRequest).not.toHaveBeenCalled();
});

test("preserved: evaluate ignores x-openai-key for non-openai providers", async () => {
  const request = prepare({
    route: "evaluate",
    fixture: fixtures[3],
    requested: "gemini",
  });
  request.headers.set("x-openai-key", "legacy-k");
  const { observable } = await observe("evaluate", request);
  expect(observable).toStrictEqual(
    success("gemini", undefined, undefined).observable
  );
});

const shortCircuits: Scenario[] = [
  { route: "evaluate", fixture: fixtures[0], requested: "gemini" },
  {
    route: "scheduled",
    fixture: fixtures[1],
    requested: "openai",
    allowFallback: false,
  },
  {
    route: "demo",
    fixture: fixtures[1],
    requested: "gemini",
    allowFallback: false,
  },
];
test.each(shortCircuits)(
  "preserved: $route no-evidence short-circuit uses real assessEvidence",
  async (scenario) => {
    mockAssess.mockImplementation(realAssess);
    expect(eligibleEvidence(noEvidence)).toBe(false);
    const { response, body } = await observe(
      scenario.route,
      prepare(scenario, noEvidence)
    );
    expect(response.status).toBe(200);
    expect(mockAssess).toHaveBeenCalledTimes(1);
    expect(body.provider).toBe("none");
    expect(body.model).toBe("deterministic-no-evidence");
    expect(body.evaluation).toStrictEqual(
      finalizeEvidence({ competencies: [] }, noEvidence, configuration)
    );
    expect(mockEvaluate).not.toHaveBeenCalled();
  }
);

type AttemptRow = {
  name: string;
  scenario: Scenario;
  expected: Expected;
  attempts: AIProvider[];
  credentials: string[];
};
const attemptRows: AttemptRow[] = [
  {
    name: "evaluate caller",
    scenario: {
      route: "evaluate",
      fixture: fixtures[3],
      requested: "gemini",
      keyHeader: "x-ai-key",
      allowFallback: true,
      browser: "present",
    },
    expected: success("gemini", "caller-k", browserKeys),
    attempts: ["gemini", "deepseek"],
    credentials: ["caller-k", "browser-d"],
  },
  {
    name: "evaluate hostedAdmin",
    scenario: {
      route: "evaluate",
      fixture: fixtures[3],
      requested: "gemini",
      admin: true,
      allowFallback: false,
      browser: "present",
    },
    expected: success("gemini", "server-g", browserKeys),
    attempts: ["gemini", "deepseek"],
    credentials: ["server-g", "browser-d"],
  },
  {
    name: "evaluate no caller key, not admin",
    scenario: {
      route: "evaluate",
      fixture: fixtures[3],
      requested: "gemini",
      allowFallback: true,
      browser: "present",
    },
    expected: success("gemini", undefined, browserKeys),
    attempts: ["deepseek"],
    credentials: ["browser-d"],
  },
  {
    name: "scheduled",
    scenario: {
      route: "scheduled",
      fixture: fixtures[3],
      requested: "deepseek",
      allowFallback: true,
    },
    expected: success("deepseek", "server-d", allKeys),
    attempts: ["deepseek", "openai", "gemini"],
    credentials: ["server-d", "server-o", "server-g"],
  },
  {
    name: "demo grant",
    scenario: {
      route: "demo",
      fixture: fixtures[1],
      requested: "gemini",
      grant: true,
      allowFallback: false,
    },
    expected: success("openai", "server-o", { openai: "server-o" }),
    attempts: ["openai"],
    credentials: ["server-o"],
  },
  {
    name: "demo no grant",
    scenario: {
      route: "demo",
      fixture: fixtures[1],
      requested: "gemini",
      allowFallback: true,
    },
    expected: success("gemini", undefined, { openai: "server-o" }),
    attempts: ["openai"],
    credentials: ["server-o"],
  },
];
test.each(attemptRows)(
  "preserved: $name provider attempts with every call rejected",
  async ({ scenario, expected, attempts, credentials }) => {
    mockAssess.mockImplementation(realAssess);
    mockEvaluate.mockRejectedValue(Error("Scripted provider rejection"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const health = globalThis as typeof globalThis & {
      interviewHealth?: Record<string, unknown>;
    };
    const previousHealth = health.interviewHealth;
    health.interviewHealth = {};
    try {
      expect(eligibleEvidence(transcript)).toBe(true);
      const { response, body, observable } = await observe(
        scenario.route,
        prepare(scenario)
      );
      const status = scenario.route === "evaluate" ? 422 : 502;
      expect(response.status).toBe(status);
      expect(body).toStrictEqual({ error: exhausted });
      expect(observable).toStrictEqual(failure(status, exhausted).observable);
      expect(mockAssess).toHaveBeenCalledTimes(1);
      const [provider, key, , , options] = mockAssess.mock.calls[0];
      expect({
        status: 200,
        provider,
        key,
        fallbackKeys: options?.fallbackKeys,
      }).toStrictEqual(expected.observable);
      const choices = [
        provider,
        ...PROVIDERS.map((p) => p.id).filter(
          (id) => id !== provider && options?.fallbackKeys?.[id]
        ),
      ];
      const oracle = choices.filter((id, index) =>
        index === 0 ? key : options?.fallbackKeys?.[id]
      );
      expect(oracle).toEqual(attempts);
      expect(mockEvaluate.mock.calls.map(([id]) => id)).toEqual(oracle);
      expect(
        mockEvaluate.mock.calls.map(([, credential]) => credential)
      ).toEqual(credentials);
      expect(sessionUpdate).not.toHaveBeenCalled();
      expect(saveEvaluation).not.toHaveBeenCalled();
      if (scenario.route === "demo") {
        expect(accountingOrder()).toEqual([
          "ownedLease",
          "claimEvaluation",
          ...(scenario.grant ? ["consumeReviewer"] : []),
          "assessEvidence",
        ]);
      }
    } finally {
      if (previousHealth === undefined) delete health.interviewHealth;
      else health.interviewHealth = previousHealth;
    }
  }
);

test.each([
  { grant: false, allowFallback: false },
  { grant: false, allowFallback: true },
  { grant: true, allowFallback: false },
  { grant: true, allowFallback: true },
])(
  "preserved: demo accounting order grant=$grant fallback=$allowFallback",
  async ({ grant: reviewer, allowFallback }) => {
    await check(
      {
        route: "demo",
        fixture: fixtures[3],
        requested: "gemini",
        grant: reviewer,
        allowFallback,
      },
      success("gemini", "server-g", reviewer || allowFallback ? allKeys : {})
    );
  }
);
