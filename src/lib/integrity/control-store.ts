import { create } from "zustand";
import {
  advance,
  checkpointSchema,
  log,
  newCheckpoint,
  recover,
  run,
  type Checkpoint,
} from "./session-control";
type Store = {
  record: Checkpoint | null;
  storageFailed: boolean;
  prepare: (key: string) => void;
  save: (record: Checkpoint) => void;
  tick: (away: boolean, online: boolean, reason?: "page_hidden" | "window_unfocused") => void;
  start: () => void;
  recover: (reason: string) => void;
  complete: () => void;
};
export const checkpointKey = (key: string) => "interview-recovery-v1:" + key;
export const useControlStore = create<Store>((set, get) => ({
  record: null,
  storageFailed: false,
  save(record) {
    let storageFailed = get().storageFailed;
    try {
      localStorage.setItem(checkpointKey(record.key), JSON.stringify(record));
    } catch {
      storageFailed = true;
    }
    set({ record, storageFailed });
  },
  prepare(key) {
    if (get().record?.key === key) return;
    let record = newCheckpoint(key),
      storageFailed = false;
    try {
      const raw = localStorage.getItem(checkpointKey(key));
      if (raw) {
        if (raw.length > 2000000) throw Error("Checkpoint too large");
        record = checkpointSchema.parse(JSON.parse(raw));
        if (record.key !== key) throw Error("Wrong session");
        record = recover(record, Date.now(), "browser_reopened");
        if (record.controlPolicy !== "visibility-and-focus-v2" && !["ended", "completed"].includes(record.phase)) {
          record = log({ ...record, controlPolicy: "visibility-and-focus-v2" }, "focus_policy_updated", Date.now());
        }
      }
    } catch {
      record = {
        ...record,
        phase: "recovery",
        reason: "checkpoint_unavailable",
      };
      storageFailed = true;
    }
    set({ record, storageFailed });
    get().save(record);
  },
  tick(hidden, online, reason) {
    const s = get().record;
    if (s) {
      const n = advance(s, Date.now(), hidden, online, reason);
      if (n !== s) get().save(n);
    }
  },
  start() {
    const s = get().record;
    if (s) get().save(run(s, Date.now()));
  },
  recover(reason) {
    const s = get().record;
    if (s) get().save(recover(s, Date.now(), reason));
  },
  complete() {
    const s = get().record;
    if (s && s.phase !== "ended")
      get().save(log({ ...s, phase: "completed" }, "completed", Date.now()));
  },
}));
