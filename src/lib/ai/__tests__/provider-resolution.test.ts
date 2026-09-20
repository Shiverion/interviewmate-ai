/** @jest-environment node */
import { type AIProvider } from "../catalog";
import {
  resolveProvider,
  type Resolution,
  type ResolutionInput,
  type ResolutionPolicy,
} from "../provider-resolution";

type Keys = Partial<Record<AIProvider, string>>;
type Fixture = {
  name: string;
  env: ResolutionInput["env"];
  keys: Keys;
  substitutedProviders: [AIProvider, AIProvider, AIProvider];
};
const providers: AIProvider[] = ["openai", "gemini", "deepseek"];
const allKeys = {
  openai: "server-o",
  gemini: "server-g",
  deepseek: "server-d",
};
const fixtures: Fixture[] = [
  {
    name: "none",
    env: {},
    keys: {},
    substitutedProviders: ["openai", "gemini", "deepseek"],
  },
  {
    name: "openai only",
    env: { OPENAI_API_KEY: "server-o" },
    keys: { openai: "server-o" },
    substitutedProviders: ["openai", "openai", "openai"],
  },
  {
    name: "gemini only",
    env: { GOOGLE_GENERATIVE_AI_API_KEY: "server-g" },
    keys: { gemini: "server-g" },
    substitutedProviders: ["gemini", "gemini", "gemini"],
  },
  {
    name: "all",
    env: {
      OPENAI_API_KEY: "server-o",
      GOOGLE_GENERATIVE_AI_API_KEY: "server-g",
      DEEPSEEK_API_KEY: "server-d",
    },
    keys: allKeys,
    substitutedProviders: ["openai", "gemini", "deepseek"],
  },
  {
    name: "all padded",
    env: {
      OPENAI_API_KEY: "  server-o \t",
      GOOGLE_GENERATIVE_AI_API_KEY: "\tserver-g  ",
      DEEPSEEK_API_KEY: " server-d\n",
    },
    keys: allKeys,
    substitutedProviders: ["openai", "gemini", "deepseek"],
  },
  {
    name: "one whitespace-only",
    env: {
      OPENAI_API_KEY: "server-o",
      GOOGLE_GENERATIVE_AI_API_KEY: " \t\n",
      DEEPSEEK_API_KEY: "server-d",
    },
    keys: { openai: "server-o", deepseek: "server-d" },
    substitutedProviders: ["openai", "openai", "deepseek"],
  },
  {
    name: "one empty-string",
    env: {
      OPENAI_API_KEY: "server-o",
      GOOGLE_GENERATIVE_AI_API_KEY: "",
      DEEPSEEK_API_KEY: "server-d",
    },
    keys: { openai: "server-o", deepseek: "server-d" },
    substitutedProviders: ["openai", "openai", "deepseek"],
  },
];
const callerFallbackKeys = { openai: "", gemini: " browser-g " };
type Row = { name: string; input: ResolutionInput; expected: Resolution };
const rows: Row[] = [];

for (const fixture of fixtures) {
  for (const [index, requested] of providers.entries()) {
    const chosen = fixture.substitutedProviders[index];
    const success = (
      provider: AIProvider,
      allowFallback: boolean
    ): Resolution => ({
      ok: true,
      provider,
      key: fixture.keys[provider],
      fallbackKeys: allowFallback ? fixture.keys : undefined,
      substituted: provider !== requested,
    });
    const add = (
      path: string,
      policy: ResolutionPolicy,
      expected: Resolution
    ) => {
      rows.push({
        name: `${path} | requested=${requested} | env=${fixture.name} | fallback=${policy.allowFallback}`,
        input: { requested, policy, env: fixture.env },
        expected,
      });
    };
    for (const allowFallback of [false, true]) {
      for (const callerKey of ["k", undefined]) {
        add(
          `evaluate caller key=${String(callerKey)}`,
          {
            credentialSource: "caller",
            callerKey,
            allowFallback,
            callerFallbackKeys,
          },
          {
            ok: true,
            provider: requested,
            key: callerKey,
            fallbackKeys: allowFallback ? callerFallbackKeys : undefined,
            substituted: false,
          }
        );
      }
      add(
        "scheduled",
        {
          credentialSource: "server",
          allowFallback,
          onUnconfigured: allowFallback ? "substitute" : "refuse",
          onNoneConfigured: "refuse",
        },
        fixture.name === "none"
          ? { ok: false, reason: "no_provider_configured" }
          : !allowFallback && !fixture.keys[requested]
            ? { ok: false, reason: "provider_not_configured" }
            : success(chosen, allowFallback)
      );
      add(
        "demo no grant",
        {
          credentialSource: "server",
          allowFallback,
          onUnconfigured: "proceed",
          onNoneConfigured: "proceed",
        },
        success(requested, allowFallback)
      );
    }
    for (const path of ["evaluate hostedAdmin", "demo grant"]) {
      add(
        path,
        {
          credentialSource: "server",
          allowFallback: true,
          onUnconfigured: "substitute",
          onNoneConfigured: "proceed",
        },
        success(chosen, true)
      );
    }
  }
}

test.each(rows)("$name", ({ input, expected }) => {
  expect(resolveProvider(input)).toStrictEqual(expected);
});

test.each([false, true])(
  "caller preserves raw keys and never reads env, fallback=%s",
  (allowFallback) => {
    const env = new Proxy(
      {},
      {
        get() {
          throw Error("Caller policy consulted env");
        },
      }
    );
    expect(
      resolveProvider({
        requested: "deepseek",
        env,
        policy: {
          credentialSource: "caller",
          callerKey: "  caller \t",
          allowFallback,
        },
      })
    ).toStrictEqual({
      ok: true,
      provider: "deepseek",
      key: "  caller \t",
      fallbackKeys: undefined,
      substituted: false,
    });
  }
);

test.each([false, true])(
  "none-configured precedence permits proceed despite onUnconfigured=refuse, fallback=%s",
  (allowFallback) => {
    expect(
      resolveProvider({
        requested: "gemini",
        env: { OPENAI_API_KEY: " \t", GOOGLE_GENERATIVE_AI_API_KEY: "" },
        policy: {
          credentialSource: "server",
          allowFallback,
          onUnconfigured: "refuse",
          onNoneConfigured: "proceed",
        },
      })
    ).toStrictEqual({
      ok: true,
      provider: "gemini",
      key: undefined,
      fallbackKeys: allowFallback ? {} : undefined,
      substituted: false,
    });
  }
);
