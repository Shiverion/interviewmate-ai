"use client";
import Link from "next/link";
import { useState } from "react";
import { useSessionIntegrity } from "@/lib/integrity/useSessionIntegrity";
import {
  IntegrityNotice,
  IntegrityPanel,
  IntegrityReportPanel,
} from "./SessionIntegrity";
import { report } from "@/lib/integrity/policy";

export default function IntegrityRehearsal() {
  const [status, setStatus] = useState("setup");
  const [language, setLanguage] = useState("English");
  const integrity = useSessionIntegrity("demo-integrity-rehearsal", status);
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
        Rehearsal status: <strong>{status}</strong>
      </p>
      <p>
        After starting, allow 10 seconds for the startup grace period. Switch to
        another tab for at least 3 seconds, then return. Three qualifying events
        warn; five suggest review. Moving the cursor outside the page is
        ignored.
      </p>
      <button
        disabled={
          status === "active" || integrity.record?.acknowledgedAt == null
        }
        onClick={() => setStatus("active")}
        className="px-4 py-2 border rounded disabled:opacity-40"
      >
        Start local rehearsal
      </button>
      <button
        disabled={status !== "active"}
        onClick={() => setStatus("completed")}
        className="ml-3 px-4 py-2 border rounded disabled:opacity-40"
      >
        Finish rehearsal
      </button>
      <IntegrityPanel language={language} />
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
