"use client";
import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { currentIntegrityReport, useIntegrityStore } from "./store";

export function useSessionIntegrity(
  key: string,
  status: string,
  sessionId?: string
) {
  const state = useIntegrityStore();
  useEffect(() => {
    const store = useIntegrityStore.getState();
    store.prepare(key);
    if (status !== "active") {
      store.finish();
      if (status === "completed") {
        const value = currentIntegrityReport();
        if (value && sessionId && !sessionId.startsWith("demo-")) {
          if (!isFirebaseReady()) {
            store.syncStatus(key, "failed");
            return;
          }
          store.syncStatus(key, "saving");
          // This advisory field is never passed to an LLM or a score calculation.
          void updateDoc(doc(db, "interview_sessions", sessionId), {
            session_integrity: value,
          })
            .then(() => useIntegrityStore.getState().syncStatus(key, "saved"))
            .catch(() =>
              useIntegrityStore.getState().syncStatus(key, "failed")
            );
        }
      }
      return;
    }
    store.begin();
    const capture = () =>
      useIntegrityStore
        .getState()
        .observe(document.hidden, document.hasFocus());
    const blur = () =>
      useIntegrityStore.getState().observe(document.hidden, false);
    const focus = () =>
      useIntegrityStore.getState().observe(document.hidden, true);
    capture();
    document.addEventListener("visibilitychange", capture);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    return () => {
      document.removeEventListener("visibilitychange", capture);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      useIntegrityStore.getState().finish();
    };
  }, [key, status, sessionId]);
  return {
    ...state,
    record: state.record?.sessionKey === key ? state.record : null,
  };
}
