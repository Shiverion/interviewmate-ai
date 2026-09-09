"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  ArrowRightIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import { PROVIDERS, type AIProvider } from "@/lib/ai/catalog";
import {
  getEvaluationProvider,
  maskKey,
  saveEvaluationProvider,
  saveProviderKey,
} from "@/lib/keys/store";
import { useKeys } from "@/components/providers/KeyProvider";
type Profile = { id: AIProvider; configured: boolean; model: string };
export default function SettingsPage() {
  const { keys, refreshStatus, resetKeys } = useKeys();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<AIProvider>("openai");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    // Browser-only preference is read after hydration to match the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(getEvaluationProvider());
    fetch("/api/ai/config")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setProfiles(d.providers))
      .catch(() =>
        setNotice(
          "Hosted model status couldn't be loaded. Your saved keys are still available."
        )
      )
      .finally(() => setLoading(false));
  }, []);
  function save(provider: AIProvider) {
    const key = drafts[provider]?.trim();
    if (!key) {
      setNotice("Enter a key before saving.");
      return;
    }
    try {
      saveProviderKey(provider, key);
      refreshStatus();
      setDrafts((d) => ({ ...d, [provider]: "" }));
      setNotice(
        "Key saved in this browser. A successful model request is still needed to verify access."
      );
    } catch {
      setNotice(
        "This browser couldn't save the key. Check its storage settings."
      );
    }
  }
  return (
    <div>
      <p className="wm-eyebrow">Workspace preferences</p>
      <h1 className="wm-heading">Models & access</h1>
      <p className="wm-subtitle">
        Choose how your interviews run. Browse freely; connect a personal key
        only when you need it.
      </p>
      <div className="wm-settings">
        <aside className="wm-settings-nav">
          <a href="#providers">Model connections</a>
          <a href="#evaluation">Evaluation preference</a>
          <a href="#reviewer-access">Reviewer allowance</a>
          <a href="#privacy">Browser privacy</a>
        </aside>
        <div>
          <section id="providers">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl">Your model connections</h2>
              <span className="wm-tag">
                <LockClosedIcon />
                Stored on this browser
              </span>
            </div>
            <p className="wm-subtitle mt-3">
              A saved key is sent only when you use its provider. It is not
              encrypted by this prototype. Use a private browser profile.
            </p>
            {PROVIDERS.map((p) => (
              <div className="wm-provider" key={p.id}>
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <p className="font-mono">
                    {profiles.find((v) => v.id === p.id)?.model || p.model}
                  </p>
                  <span className="wm-tag mt-3">
                    {keys[p.id] ? (
                      <>
                        <CheckIcon />
                        Personal key saved
                      </>
                    ) : (
                      "No personal key"
                    )}
                  </span>
                  <p>
                    {loading
                      ? "Checking hosted access…"
                      : profiles.find((v) => v.id === p.id)?.configured
                        ? "Host key configured · access not yet verified"
                        : "Host key not configured"}
                  </p>
                </div>
                <div className="wm-field">
                  <label htmlFor={`key-${p.id}`}>{p.name} API key</label>
                  <input
                    id={`key-${p.id}`}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={drafts[p.id] || ""}
                    placeholder={
                      keys[p.id]
                        ? maskKey(keys[p.id]!)
                        : "Paste a key to connect"
                    }
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      className="wm-button secondary"
                      onClick={() => save(p.id)}
                    >
                      Save key
                    </button>
                    {keys[p.id] && (
                      <button
                        className="wm-button quiet"
                        onClick={() => {
                          saveProviderKey(p.id, "");
                          refreshStatus();
                          setNotice(`${p.name} key removed from this browser.`);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
          {notice && (
            <p className="wm-note mt-5" role="status">
              {notice}
            </p>
          )}
          <section
            id="evaluation"
            className="py-8 border-b border-[var(--border)]"
          >
            <h2 className="text-xl mb-3">Evaluation preference</h2>
            <div className="wm-field max-w-lg">
              <label htmlFor="evaluation-provider">
                Model provider for completed interviews
              </label>
              <select
                id="evaluation-provider"
                value={selected}
                onChange={(e) => {
                  const value = e.target.value as AIProvider;
                  setSelected(value);
                  saveEvaluationProvider(value);
                  setNotice(
                    "Evaluation preference saved. Personal sessions need a key for this provider."
                  );
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <small>
                This selection drives automatic and manual evaluation. The
                benchmark lets you compare providers separately. Live speech
                currently uses OpenAI Realtime and Whisper; Gemini and DeepSeek
                are evaluation options.
              </small>
            </div>
          </section>
          <section
            id="reviewer-access"
            className="py-8 border-b border-[var(--border)]"
          >
            <p className="wm-eyebrow">Provided by the project host</p>
            <h2 className="text-xl mt-3 mb-3">A little room to explore.</h2>
            <p className="wm-subtitle">
              Five voice demos per browser each UTC day. Eight minutes per demo,
              including pauses, with a shared daily allowance. No personal key
              needed. Provider access must be configured by the host.
            </p>
            <Link href="/demo" className="wm-button secondary mt-5">
              Open reviewer demo <ArrowRightIcon />
            </Link>
          </section>
          <section id="privacy" className="py-8">
            <h2 className="text-xl mb-3">Your browser, your keys</h2>
            <p className="wm-subtitle">
              Removing keys leaves your account and interview records intact.
              Recovery records and answers remain in this browser until
              separately cleared. Review sessions are not used for model
              training by this app.
            </p>
            {!confirmClear ? (
              <button
                className="wm-button quiet mt-5"
                onClick={() => setConfirmClear(true)}
              >
                Remove all personal keys
              </button>
            ) : (
              <div className="wm-note mt-5">
                <p>Remove all three providers’ keys from this browser?</p>
                <div className="flex gap-2 mt-3">
                  <button
                    className="wm-button secondary"
                    onClick={() => {
                      resetKeys();
                      setConfirmClear(false);
                      setNotice(
                        "Personal keys removed. You can keep browsing."
                      );
                    }}
                  >
                    Remove keys
                  </button>
                  <button
                    className="wm-button quiet"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
