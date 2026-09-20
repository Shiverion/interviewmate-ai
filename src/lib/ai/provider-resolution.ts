import { PROVIDERS, type AIProvider } from "./catalog";

export type ResolutionPolicy =
  | {
      credentialSource: "caller";
      callerKey: string | undefined;
      allowFallback: boolean;
      callerFallbackKeys?: Partial<Record<AIProvider, string>>;
    }
  | {
      credentialSource: "server";
      allowFallback: boolean;
      onUnconfigured: "substitute" | "proceed" | "refuse";
      onNoneConfigured: "proceed" | "refuse";
    };

export type ResolutionInput = {
  requested: AIProvider;
  policy: ResolutionPolicy;
  env: Record<string, string | undefined>;
};

export type Resolution =
  | {
      ok: true;
      provider: AIProvider;
      key: string | undefined;
      fallbackKeys: Partial<Record<AIProvider, string>> | undefined;
      substituted: boolean;
    }
  | {
      ok: false;
      reason: "no_provider_configured" | "provider_not_configured";
    };

export function resolveProvider({
  requested,
  policy,
  env,
}: ResolutionInput): Resolution {
  if (policy.credentialSource === "caller") {
    return {
      ok: true,
      provider: requested,
      key: policy.callerKey,
      fallbackKeys: policy.allowFallback
        ? policy.callerFallbackKeys
        : undefined,
      substituted: false,
    };
  }

  const configured = PROVIDERS.flatMap(({ id, env: name }) => {
    const key = env[name]?.trim();
    return key ? [{ id, key }] : [];
  });
  let selected = configured.find(({ id }) => id === requested);
  if (!configured.length) {
    if (policy.onNoneConfigured === "refuse") {
      return { ok: false, reason: "no_provider_configured" };
    }
  } else if (!selected) {
    if (policy.onUnconfigured === "refuse") {
      return { ok: false, reason: "provider_not_configured" };
    }
    if (policy.onUnconfigured === "substitute") selected = configured[0];
  }

  return {
    ok: true,
    provider: selected?.id ?? requested,
    key: selected?.key,
    fallbackKeys: policy.allowFallback
      ? Object.fromEntries(configured.map(({ id, key }) => [id, key]))
      : undefined,
    substituted: selected !== undefined && selected.id !== requested,
  };
}
