"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useControlStore } from "@/lib/integrity/control-store";
import {
  ALERT_PATTERN,
  InterviewAlertAudio,
  type AlertLevel,
} from "@/lib/integrity/alert-audio";

export default function IntegrityAlert({
  language = "",
  onResume,
  onNewAttempt,
  floatingControls = false,
  recoveryActions,
}: {
  language?: string;
  onResume?: () => void | Promise<void>;
  onNewAttempt?: () => void;
  floatingControls?: boolean;
  recoveryActions?: React.ReactNode;
}) {
  const { record, storageFailed } = useControlStore();
  const [sound, setSound] = useState(true),
    [soundUnavailable, setSoundUnavailable] = useState(false),
    [busy, setBusy] = useState(false),
    [resumeError, setResumeError] = useState(false);
  const audio = useRef(new InterviewAlertAudio()),
    dialog = useRef<HTMLDialogElement | null>(null);
  const id = /indones|bahasa|^id$/i.test(language);
  const phase = record?.phase;
  const isOpen =
    !!phase && ["paused", "final_warning", "recovery", "ended"].includes(phase);
  useEffect(() => {
    if (!isOpen || !dialog.current) return;
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, [isOpen]);
  useEffect(() => {
    if (!sound) return;
    let active = true;
    const arm = () => {
      if (!useControlStore.getState().record) return;
      void audio.current
        .arm()
        .then(() => {
          if (active) setSoundUnavailable(false);
        })
        .catch(() => {
          if (active) setSoundUnavailable(true);
        });
    };
    document.addEventListener("click", arm, true);
    document.addEventListener("keydown", arm, true);
    return () => {
      active = false;
      document.removeEventListener("click", arm, true);
      document.removeEventListener("keydown", arm, true);
    };
  }, [sound]);
  useEffect(() => {
    const player = audio.current;
    let timer: ReturnType<typeof setInterval> | undefined;
    const clear = () => {
      clearInterval(timer);
      timer = undefined;
      player.silence();
    };
    const schedule = (next: string | undefined, playImmediately: boolean) => {
      clear();
      if (!sound || !next || !(next in ALERT_PATTERN)) return;
      const level = next as AlertLevel;
      const play = () => {
        try {
          player.play(level);
        } catch {
          setSoundUnavailable(true);
        }
      };
      if (playImmediately) play();
      const delay = ALERT_PATTERN[level].repeatMs;
      if (delay) timer = setInterval(play, delay);
    };
    // Restored pauses repeat after a gesture; terminal alerts never loop.
    schedule(useControlStore.getState().record?.phase, false);
    const unsubscribe = useControlStore.subscribe((n, p) => {
      if (n.record?.phase !== p.record?.phase) schedule(n.record?.phase, true);
    });
    return () => {
      unsubscribe();
      clear();
    };
  }, [sound]);
  useEffect(() => {
    const player = audio.current;
    return () => player.close();
  }, []);
  function toggleSound() {
    setSoundUnavailable(false);
    if (sound) {
      setSound(false);
      audio.current.close();
      return;
    }
    setSound(true);
    void audio.current
      .arm()
      .then(() => audio.current.play("paused"))
      .catch(() => setSoundUnavailable(true));
  }
  if (!record || phase === "completed") return null;
  const title =
    phase === "ended"
      ? id
        ? "Wawancara dihentikan"
        : "Interview ended"
      : phase === "recovery"
        ? id
          ? "Sesi perlu disambungkan kembali"
          : "Reconnect your interview"
        : phase === "final_warning"
          ? id
            ? "Peringatan terakhir — wawancara dijeda"
            : "Final warning — interview paused"
          : id
            ? "Wawancara dijeda"
            : "Interview paused";
  const soundButton = (
    <button
      type="button"
      onClick={toggleSound}
      aria-pressed={sound}
      className={
        (floatingControls && !isOpen
          ? "fixed bottom-4 right-4 z-50 bg-slate-950 text-white "
          : "") + "mt-3 rounded border px-3 py-2"
      }
    >
      {sound
        ? id
          ? "Matikan suara peringatan"
          : "Mute alert sound"
        : id
          ? "Aktifkan & coba suara peringatan"
          : "Enable & test alert sound"}
    </button>
  );
  return (
    <>
      {!isOpen && soundButton}
      {!isOpen && soundUnavailable && (
        <p role="status">Sound is unavailable. Visual alerts remain active.</p>
      )}
      {isOpen &&
        createPortal(
          <dialog
            ref={dialog}
            onCancel={(e) => e.preventDefault()}
            aria-modal="true"
            aria-label={
              id ? "Pengingat halaman wawancara" : "Interview page reminder"
            }
            className="fixed inset-0 m-0 h-dvh w-screen max-h-none max-w-none overflow-y-auto border-0 bg-slate-950/70 p-4 text-white backdrop-blur-xl backdrop:bg-transparent"
          >
            <div className="flex min-h-full items-center justify-center py-6">
              <div className="w-full max-w-3xl rounded-3xl border border-amber-400/70 bg-slate-950/95 p-6 shadow-2xl sm:p-12">
                <div role="alert" aria-atomic="true">
                  <h2 className="text-3xl sm:text-5xl font-semibold leading-tight">
                    {title}
                  </h2>
                  <p className="mt-6 text-base sm:text-xl">
                    {id
                      ? "Sisa waktu disimpan. Mikrofon, respons AI, dan pengiriman jawaban dihentikan selama jeda."
                      : "Your remaining time is saved. Microphone capture, AI responses, and answer submission stop during the pause."}
                  </p>
                  <p className="mt-5 text-xl text-amber-300">
                    {id ? "Gangguan halaman" : "Page interruptions"}:{" "}
                    {record.interruptions} / 3 ·{" "}
                    {id ? "Pemulihan teknis" : "Technical recoveries"}:{" "}
                    {record.recoveries}
                  </p>
                  {phase === "final_warning" && (
                    <p className="mt-4 text-lg font-semibold">
                      {id
                        ? "Gangguan ketiga atau meninggalkan halaman selama 15 detik berturut-turut akan mengakhiri wawancara secara otomatis."
                        : "A third interruption or 15 continuous seconds away will automatically end the interview."}
                    </p>
                  )}
                  {phase === "paused" && (
                    <p className="mt-4">
                      {id
                        ? "Halaman wawancara tersembunyi atau kehilangan fokus. Gangguan kedua atau 6 detik berturut-turut memicu peringatan terakhir."
                        : "Your interview page was hidden or lost focus. A second interruption or six continuous seconds away triggers the final warning."}
                    </p>
                  )}
                  <p className="mt-4">
                    {phase === "ended"
                      ? id
                        ? "Jawaban disimpan untuk peninjauan manusia. Hubungi perekrut; tidak ada pengurangan skor atau keputusan perekrutan otomatis."
                        : "Answers are retained for human review. Contact your recruiter; no score deduction or hiring decision is applied automatically."
                      : id
                        ? "Saat melanjutkan, pertanyaan yang terputus akan diganti. Jawaban sebelumnya tetap disimpan; pertanyaan yang dibatalkan tidak dinilai."
                        : "On resuming, the interrupted question will be replaced. Earlier answers are retained; the retired question is excluded from evaluation."}
                  </p>
                </div>
                {storageFailed && (
                  <p role="status" className="mt-4 text-amber-300">
                    {id
                      ? "Penyimpanan tidak tersedia. Unduh catatan sebelum menutup halaman."
                      : "Saving is unavailable. Download your record before closing this page."}
                  </p>
                )}
                {phase !== "ended" && (
                  <button
                    type="button"
                    disabled={
                      busy ||
                      [
                        "checkpoint_unavailable",
                        "replacement_bank_exhausted",
                      ].includes(record.reason)
                    }
                    onClick={async () => {
                      setBusy(true);
                      setResumeError(false);
                      try {
                        await onResume?.();
                      } catch {
                        setResumeError(true);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="mt-8 w-full rounded-xl bg-amber-400 px-6 py-4 text-lg font-semibold text-black disabled:opacity-40"
                  >
                    {busy
                      ? id
                        ? "Menyambungkan…"
                        : "Reconnecting…"
                      : id
                        ? "Saya mengerti — lanjut dengan pertanyaan baru"
                        : "I understand — resume with a new question"}
                  </button>
                )}
                {[
                  "checkpoint_unavailable",
                  "replacement_bank_exhausted",
                ].includes(record.reason) && (
                  <p className="mt-3">
                    {id
                      ? "Hubungi perekrut untuk melanjutkan sesi ini."
                      : "Contact your recruiter to continue this session."}
                  </p>
                )}
                {resumeError && (
                  <p role="status">
                    {id
                      ? "Belum tersambung. Periksa koneksi lalu coba lagi."
                      : "Reconnection failed. Check your connection and try again."}
                  </p>
                )}
                {soundButton}
                {soundUnavailable && (
                  <p role="status">
                    {id
                      ? "Suara tidak tersedia. Peringatan visual tetap aktif."
                      : "Sound is unavailable. Visual alerts remain active."}
                  </p>
                )}
                <button
                  className="ml-3 mt-3 rounded border px-3 py-2"
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(record, null, 2)], {
                        type: "application/json",
                      })
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "interview-recovery.json";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  {id ? "Unduh catatan" : "Download saved record"}
                </button>
                {onNewAttempt && (
                  <button
                    className="ml-3 mt-3 rounded border px-3 py-2"
                    onClick={onNewAttempt}
                  >
                    New rehearsal
                  </button>
                )}
                {recoveryActions}
              </div>
            </div>
          </dialog>,
          document.body
        )}
    </>
  );
}
