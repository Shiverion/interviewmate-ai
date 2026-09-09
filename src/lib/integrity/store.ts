import { create } from "zustand";
import {
  finish,
  initialState,
  observe,
  report,
  start,
  stateSchema,
  type IntegrityState,
  type IntegrityEvent,
  POLICY,
} from "./policy";

type Store = {
  record: IntegrityState | null;
  storageUnavailable: boolean;
  sync: "local" | "saving" | "saved" | "failed";
  prepare: (key: string) => void;
  acknowledge: () => void;
  begin: () => void;
  observe: (hidden: boolean, focused: boolean) => void;
  finish: () => void;
  explain: (id: number, reason: IntegrityEvent["reason"]) => void;
  syncStatus: (key: string, status: Store["sync"]) => void;
};
const storageKey = (key: string) =>
  "interview-integrity:" + key + ":" + POLICY.version;
export const useIntegrityStore = create<Store>((set, get) => {
  const save = (record: IntegrityState) => {
    let storageUnavailable = get().storageUnavailable;
    try {
      sessionStorage.setItem(
        storageKey(record.sessionKey),
        JSON.stringify(record)
      );
    } catch {
      storageUnavailable = true;
    }
    set({ record, storageUnavailable });
  };
  return {
    record: null,
    storageUnavailable: false,
    sync: "local",
    prepare(key) {
      if (get().record?.sessionKey === key) return;
      let record = initialState(key),
        storageUnavailable = false;
      try {
        const raw = sessionStorage.getItem(storageKey(key));
        if (raw) {
          if (raw.length > 100_000) throw Error();
          const parsed = stateSchema.parse(JSON.parse(raw));
          if (parsed.sessionKey !== key) throw Error();
          record = {
            ...parsed,
            active: false,
            episode: null,
            coverageGaps: parsed.coverageGaps + (parsed.active ? 1 : 0),
          };
        }
      } catch {
        record.coverageGaps++;
        storageUnavailable = true;
      }
      set({ record, storageUnavailable, sync: "local" });
      save(record);
    },
    acknowledge() {
      const r = get().record;
      if (r && !r.active)
        save({ ...r, acknowledgedAt: r.acknowledgedAt ?? Date.now() });
    },
    begin() {
      const r = get().record;
      if (r) save(start(r, Date.now()));
    },
    observe(hidden, focused) {
      const r = get().record;
      if (r) {
        const next = observe(r, hidden, focused, Date.now());
        if (next !== r) save(next);
      }
    },
    finish() {
      const r = get().record;
      if (r) save(finish(r, Date.now()));
    },
    explain(id, reason) {
      const r = get().record;
      if (!r?.active) return;
      save({
        ...r,
        events: r.events.map((e) => (e.id === id ? { ...e, reason } : e)),
      });
    },
    syncStatus(key, sync) {
      if (get().record?.sessionKey === key) set({ sync });
    },
  };
});
export function currentIntegrityReport() {
  const state = useIntegrityStore.getState().record;
  return state?.startedAt === null || !state ? null : report(state);
}
