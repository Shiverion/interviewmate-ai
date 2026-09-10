"use client";
import { useState } from "react";
import InterviewSetupForm from "@/components/interview/InterviewSetupForm";
import { useKeys } from "@/components/providers/KeyProvider";
import {
  getEvaluationProvider,
  maskKey,
  saveEvaluationProvider,
  saveProviderKey,
} from "@/lib/keys/store";
import { PROVIDERS, type AIProvider } from "@/lib/ai/catalog";
export default function DemoRoomModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { keys, refreshStatus } = useKeys();
  const [drafts, setDrafts] = useState<Partial<Record<AIProvider, string>>>({});
  const [evaluationProvider, setEvaluationProvider] = useState<AIProvider>(() =>
    getEvaluationProvider()
  );

  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personal interview setup"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <section className="wm-panel w-full max-w-3xl max-h-[90vh] overflow-auto">
        <h2 className="text-2xl mb-6">Interview with your own key</h2>
        <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="wm-eyebrow">Private model access</p>
              <h3 className="text-lg mt-1">Connect your keys in this browser</h3>
              <p className="text-sm text-[var(--muted)] mt-2">
                OpenAI is required for the default voice and transcription. Gemini
                is optional for Gemini voice; DeepSeek is optional for evaluation.
                Keys are stored locally and are never sent to Firestore.
              </p>
            </div>
            <span className="wm-tag">Browser only</span>
          </div>
          <div className="grid gap-4 mt-4 sm:grid-cols-2">
            {PROVIDERS.map((provider) => (
              <label className="wm-field" key={provider.id}>
                {provider.name} API key
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={drafts[provider.id] || ""}
                  placeholder={
                    keys[provider.id]
                      ? maskKey(keys[provider.id] as string)
                      : "Paste a key"
                  }
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [provider.id]: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="wm-button secondary mt-2"
                  disabled={!drafts[provider.id]?.trim()}
                  onClick={() => {
                    const value = drafts[provider.id]?.trim();
                    if (!value) return;
                    saveProviderKey(provider.id, value);
                    refreshStatus();
                    setDrafts((current) => ({ ...current, [provider.id]: "" }));
                  }}
                >
                  {keys[provider.id] ? "Replace key" : "Save key"}
                </button>
              </label>
            ))}
          </div>
          <label className="wm-field mt-4 max-w-sm">
            Evaluation provider
            <select
              value={evaluationProvider}
              onChange={(event) => {
                const value = event.target.value as AIProvider;
                setEvaluationProvider(value);
                saveEvaluationProvider(value);
              }}
            >
              {PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>
        </section>
        <InterviewSetupForm mode="byok" onClose={onClose} />
      </section>
    </div>
  );
}
