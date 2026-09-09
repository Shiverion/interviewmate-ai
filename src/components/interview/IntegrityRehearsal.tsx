"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionIntegrity } from "@/lib/integrity/useSessionIntegrity";
import {
  IntegrityNotice,
  IntegrityPanel,
  IntegrityReportPanel,
} from "./SessionIntegrity";
import { report } from "@/lib/integrity/policy";
import { useSearchParams } from "next/navigation";
import {
  useInterviewControl,
  resumeControlled,
} from "@/lib/integrity/useInterviewControl";
import { useControlStore } from "@/lib/integrity/control-store";
import IntegrityAlert from "./IntegrityAlert";

export default function IntegrityRehearsal() {
  const [status, setStatus] = useState("setup");
  const [language, setLanguage] = useState("English");
  const [startError, setStartError] = useState(false);
  const query = useSearchParams();
  const key = "demo-integrity-rehearsal:" + (query.get("attempt") || "default");
  const control = useInterviewControl(key, status);
  const monitorStatus =
    control.record &&
    ["running", "paused", "final_warning"].includes(control.record.phase)
      ? "active"
      : ["ended", "completed"].includes(control.record?.phase || "")
        ? "completed"
        : "setup";
  const integrity = useSessionIntegrity(key, monitorStatus);
  const resume = async () => {
    await resumeControlled(false, language);
    setStatus("active");
  };
  const newAttempt = () => {
    window.location.href = "/review-brief/integrity-demo?attempt=" + Date.now();
  };
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (status !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [status]);
  const graceSeconds = Math.max(
    0,
    Math.ceil(((integrity.record?.graceUntil ?? 0) - now) / 1000)
  );
  return (
    <main className="max-w-3xl mx-auto p-5 space-y-5">
      <Link href="/review-brief" className="underline">
        Back to review workspace
      </Link>
      <h1 className="text-3xl font-bold">Session-integrity rehearsal</h1>
      <p>
        Local demonstration only. No microphone, AI call, or database write.
        These browser events do not establish cheating.
      </p>
      <label>
        Notice language
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="ml-3 p-2 border rounded bg-[var(--background)]"
        >
          <option>English</option>
          <option>Bahasa Indonesia</option>
        </select>
      </label>
      <IntegrityNotice language={language} />
      <p role="status">
        Rehearsal status: <strong>{control.record?.phase || status}</strong> ·
        Time remaining:{" "}
        {Math.ceil((control.record?.remainingMs ?? 1800000) / 1000)}s
      </p>
      <p
        role="status"
        className="rounded-xl border border-[var(--border)] p-3 font-medium"
      >
        {status !== "active"
          ? "Monitoring is off. Start the rehearsal to test tab switching."
          : now === 0 || graceSeconds > 0
            ? `Getting ready — ${now === 0 ? 10 : graceSeconds} seconds of startup grace remaining.`
            : "Monitoring ready. Hiding this tab or focusing another window for at least 1 second pauses the session."}
      </p>
      <p>
        After starting, allow 10 seconds for the startup grace period. Switch to
        another tab or focus another window for at least 1 second, then return. The session pauses. A
        second interruption or 6 seconds away triggers a final warning; a third
        interruption or 15 seconds away ends it. Moving the cursor outside the
        page is ignored.
      </p>
      <button
        disabled={
          control.record?.phase !== "setup" ||
          integrity.record?.acknowledgedAt == null
        }
        onClick={() => {
          const c = useControlStore.getState();
          if (c.record)
            c.save({
              ...c.record,
              transcript: [
                {
                  role: "assistant",
                  text: "Describe how you handled a difficult project and what you learned.",
                },
              ],
            });
          setStartError(false);
          void resume().catch(() => setStartError(true));
        }}
        className="px-4 py-2 border rounded disabled:opacity-40"
      >
        Start local rehearsal
      </button>
      {startError && (
        <p role="status">
          Cannot start yet. Check your connection and try again.
        </p>
      )}
      <button
        disabled={control.record?.phase !== "running"}
        onClick={() => {
          control.complete();
          setStatus("completed");
        }}
        className="ml-3 px-4 py-2 border rounded disabled:opacity-40"
      >
        Finish rehearsal
      </button>
      <button
        className="px-3 py-2 border rounded"
        disabled={control.record?.phase !== "running"}
        onClick={() => control.recover("simulated_connection_loss")}
      >
        Simulate connection loss
      </button>
      <button className="px-3 py-2 border rounded" onClick={newAttempt}>
        New rehearsal
      </button>
      {control.record?.transcript.length ? (
        <p className="rounded-xl border p-4" aria-label="Current question">
          {control.record.transcript.at(-1)?.text}
        </p>
      ) : null}
      <IntegrityPanel
        language={language}
        showAlert={false}
      />
      <IntegrityAlert
        language={language}
        onResume={resume}
        onNewAttempt={newAttempt}
      />
      {status === "completed" && integrity.record && (
        <IntegrityReportPanel value={report(integrity.record)} />
      )}
      <p className="text-sm text-[var(--muted)]">
        Counts are retained for this rehearsal in this browser tab, including on
        reload. This prototype is not tamper-resistant and cannot see other apps
        or devices.
      </p>
    </main>
  );
}
