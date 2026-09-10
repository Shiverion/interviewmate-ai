"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc, type DocumentData } from "firebase/firestore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { db, isFirebaseReady } from "@/lib/firebase/config";

// Panels share the scheduled interview's access policy. Synthetic sessions
// have no Firestore record or Firebase identity and must remain local.
export function usePanelSync(
  sessionId: string,
  field: "code_workspace" | "whiteboard_workspace",
  canEdit: boolean,
  delayMs: number,
) {
  const { user, loading } = useAuthContext();
  const enabled = Boolean(sessionId && user && !loading && isFirebaseReady()
    && !sessionId.startsWith("demo-") && !sessionId.startsWith("reviewer-"));
  const identity = `${sessionId}:${user?.uid}:${field}`;
  const [result, setResult] = useState<{
    identity: string; data?: DocumentData; status: "live" | "unavailable";
  } | null>(null);
  const writer = useRef<((data: DocumentData) => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ref = doc(db, "interview_sessions", sessionId);
    let active = true;
    let writable = false;
    let failed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (!active) return;
      failed = true;
      writable = false;
      clearTimeout(timer);
      setResult({ identity, status: "unavailable" });
    };
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (!active || failed) return;
      if (!snapshot.exists()) { fail(); return; }
      writable = true;
      setResult({ identity, data: snapshot.data()[field], status: "live" });
    }, fail);
    writer.current = (data) => {
      if (!active || !writable || !canEdit) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!active || !writable) return;
        try {
          // updateDoc cannot accidentally create a scheduled interview.
          await updateDoc(ref, { [field]: data });
        } catch { fail(); }
      }, delayMs);
    };
    return () => {
      active = false;
      clearTimeout(timer);
      writer.current = null;
      unsubscribe();
    };
  }, [enabled, identity, sessionId, field, canEdit, delayMs]);

  const save = useCallback((data: DocumentData) => writer.current?.(data), []);
  const current = enabled && result?.identity === identity ? result : null;
  return {
    save,
    data: current?.data,
    status: !enabled ? "local" : current?.status ?? "connecting",
  };
}

export function panelSyncMessage(status: string, canEdit: boolean) {
  if (status === "live") return "Live sync connected";
  if (status === "connecting") return "Connecting to interview storage…";
  return canEdit
    ? "Local only — work is not saved or shared. Keep this panel open."
    : "Live view unavailable — check sign-in and interview access.";
}
