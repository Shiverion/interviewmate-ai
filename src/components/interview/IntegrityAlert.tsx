"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { POLICY } from "@/lib/integrity/policy";
import { useIntegrityStore } from "@/lib/integrity/store";

// A short locally generated tone; no audio file, microphone, or network request.
function chime(context: AudioContext) {
  if (context.state !== "running") return false;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.02);
  gain.gain.linearRampToValueAtTime(0, now + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(now);
  oscillator.stop(now + 0.24);
  return true;
}

export default function IntegrityAlert({
  language = "",
}: {
  language?: string;
}) {
  const record = useIntegrityStore((s) => s.record);
  const [alert, setAlert] = useState<{ key: string; count: number } | null>(
    null
  );
  const [sound, setSound] = useState(false);
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const id = /indones|bahasa|^id$/i.test(language);

  useEffect(
    () =>
      useIntegrityStore.subscribe((next, previous) => {
        const n = next.record,
          p = previous.record;
        // React only to new counted events, never to restored history or context edits.
        if (
          !n?.active ||
          !p ||
          n.sessionKey !== p.sessionKey ||
          n.count <= p.count
        )
          return;
        setAlert({ key: n.sessionKey, count: n.count });
        if (sound) {
          try {
            if (!context.current || !chime(context.current))
              setSoundUnavailable(true);
          } catch {
            setSoundUnavailable(true);
          }
        }
      }),
    [sound]
  );

  useEffect(() => {
    if (!alert) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAlert(null);
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [alert]);

  useEffect(
    () => () => {
      const current = context.current;
      context.current = null;
      if (current) void current.close().catch(() => {});
    },
    []
  );

  function toggleSound() {
    setSoundUnavailable(false);
    if (sound) {
      setSound(false);
      const current = context.current;
      context.current = null;
      if (current) void current.close().catch(() => {});
      return;
    }
    try {
      const current = context.current ?? new AudioContext();
      context.current = current;
      setSound(true);
      // Resume directly from the button gesture to respect browser autoplay rules.
      void current
        .resume()
        .then(() => {
          if (context.current === current && !chime(current))
            setSoundUnavailable(true);
        })
        .catch(() => {
          if (context.current === current) setSoundUnavailable(true);
        });
    } catch {
      setSoundUnavailable(true);
    }
  }

  if (!record?.active) return null;
  const visible = alert?.key === record.sessionKey ? alert : null;
  return (
    <>
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={sound}
        className="mt-2 rounded border border-[var(--border)] px-3 py-2"
      >
        {sound
          ? id
            ? "Matikan suara peringatan"
            : "Mute alert sound"
          : id
            ? "Aktifkan & coba suara peringatan"
            : "Enable & test alert sound"}
      </button>
      {soundUnavailable && (
        <p role="status">
          {id
            ? "Suara tidak tersedia. Peringatan visual tetap aktif."
            : "Sound is unavailable. Visual alerts remain active."}
        </p>
      )}
      {visible &&
        createPortal(
          <aside
            aria-label={
              id ? "Pengingat halaman wawancara" : "Interview page reminder"
            }
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[26rem] z-[100] max-h-[75vh] overflow-y-auto rounded-2xl border-2 border-amber-500 bg-[var(--background)]/95 backdrop-blur-md p-5 shadow-2xl text-[var(--foreground)]"
          >
            <div role="alert" aria-atomic="true">
              <h2 className="text-lg font-semibold">
                {id
                  ? "Halaman wawancara sempat tersembunyi"
                  : "Your interview page was hidden"}
              </h2>
              <p className="mt-2 text-sm">
                {id
                  ? "Harap tetap di halaman wawancara. Perpindahan tab, meminimalkan jendela, atau mengunci layar dapat memicu pengingat ini."
                  : "Please stay on the interview page. Switching tabs, minimizing the window, or locking the screen can trigger this reminder."}
              </p>
              <p className="mt-2 text-sm font-medium">
                {id ? "Kejadian tercatat" : "Recorded events"}: {visible.count}.{" "}
                {visible.count >= POLICY.reviewAt
                  ? id
                    ? "Peninjauan manusia disarankan."
                    : "Human review suggested."
                  : visible.count >= POLICY.warningAt
                    ? id
                      ? "Batas peringatan tercapai."
                      : "Warning threshold reached."
                    : id
                      ? "Ini pengingat awal."
                      : "This is an early reminder."}
              </p>
              <p className="mt-2 text-sm">
                {id
                  ? "Wawancara dan waktunya tetap berjalan. Ini bukan bukti kecurangan; Anda dapat menambahkan konteks di catatan sesi."
                  : "Your interview and its timer are still running. This is not proof of cheating; you can add context in the session record."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black"
            >
              {id ? "Mengerti, lanjutkan" : "Got it, continue"}
            </button>
          </aside>,
          document.body
        )}
    </>
  );
}
