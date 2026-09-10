"use client";
import { useEffect, useState } from "react";
import { type ProviderDiagnostic } from "@/lib/ai/health";
export default function ProviderDiagnostics() {
  const [state, setState] = useState<{
      health: ProviderDiagnostic[];
      providers: Array<{ id: string; model: string; configured: boolean }>;
    } | null>(null),
    [error, setError] = useState("");
  function refresh() {
    fetch("/api/ai/config")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setError("Provider status unavailable."));
  }
  useEffect(refresh, []);
  return (
    <section className="wm-panel my-6">
      <div className="flex justify-between">
        <h2 className="text-xl">Provider diagnostics</h2>
        <button className="wm-button secondary" onClick={refresh}>
          Refresh observations
        </button>
      </div>
      <p className="wm-subtitle my-3">
        Status comes from recent requests. Refresh does not run an inference.
        Configured credentials are not proof of working access.
      </p>
      {error && <p role="status">{error}</p>}
      {state?.providers.map((p) => {
        const observed = state.health
          ?.filter((h) => h.provider === p.id)
          .at(-1);
        return (
          <div key={p.id} className="py-4 border-t border-[var(--border)]">
            <strong>{p.id}</strong>
            <span className="wm-tag ml-3">
              {observed?.state ||
                (p.configured
                  ? "Unavailable · Not checked"
                  : "Misconfigured · No host key")}
            </span>
            <p className="text-sm mt-2">Evaluation model: {p.model}</p>
            {observed && (
              <p className="text-xs mt-2">
                Primary: {observed.primary} · Active:{" "}
                {observed.active || "None"} · Fallback:{" "}
                {observed.fallback ? "Triggered" : "Not triggered"}
                <br />
                {observed.reason} Last observation:{" "}
                {new Date(observed.checkedAt).toLocaleString()}
              </p>
            )}
          </div>
        );
      })}
      <p className="text-xs text-[var(--muted)]">
        Voice currently supports the OpenAI realtime transport. An explicitly
        configured alternate realtime model may be tried; Gemini/DeepSeek are
        evaluation providers. BYOK failures are returned to that session and do
        not overwrite host health.
      </p>
    </section>
  );
}
