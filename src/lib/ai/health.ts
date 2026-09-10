export type ProviderHealthState =
  | "Ready"
  | "Degraded"
  | "Rate Limited"
  | "Unavailable"
  | "Misconfigured";
export type ProviderDiagnostic = {
  provider: string;
  model: string;
  state: ProviderHealthState;
  checkedAt: string;
  reason: string;
  primary: string;
  active: string | null;
  fallback: boolean;
};
const shared = globalThis as typeof globalThis & {
  interviewHealth?: Record<string, ProviderDiagnostic>;
};
export function classifyProvider(status: number): ProviderHealthState {
  return status >= 200 && status < 300
    ? "Ready"
    : status === 401 || status === 403
      ? "Misconfigured"
      : status === 429
        ? "Rate Limited"
        : status === 408 || status >= 500
          ? "Unavailable"
          : "Degraded";
}
export function providerDiagnostic(
  provider: string,
  model: string,
  status: number,
  primary = provider,
  fallback = false
): ProviderDiagnostic {
  return {
    provider,
    model,
    state: classifyProvider(status),
    checkedAt: new Date().toISOString(),
    reason:
      status >= 200 && status < 300
        ? fallback
          ? "Primary request failed; configured alternative succeeded."
          : "Recent request succeeded."
        : `Provider request returned ${status || "a connection failure"}.`,
    primary,
    active: status >= 200 && status < 300 ? provider : null,
    fallback,
  };
}
export function recordProvider(d: ProviderDiagnostic, host = true) {
  if (host) (shared.interviewHealth ??= {})[d.provider + ":" + d.model] = d;
  return d;
}
export function healthSnapshot() {
  return Object.values(shared.interviewHealth || {}).map((d) =>
    Date.now() - Date.parse(d.checkedAt) > 15 * 60000
      ? {
          ...d,
          state: "Degraded" as const,
          reason:
            "Last observation is older than 15 minutes; no probe was sent.",
        }
      : d
  );
}
