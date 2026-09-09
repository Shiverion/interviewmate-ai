"use client";
import {
  POLICY,
  reportSchema,
  report,
  type IntegrityEvent,
  type IntegrityReport,
} from "@/lib/integrity/policy";
import { useIntegrityStore } from "@/lib/integrity/store";
import IntegrityAlert from "./IntegrityAlert";

export function IntegrityNotice({ language = "" }: { language?: string }) {
  const { record, acknowledge } = useIntegrityStore();
  const id = /indones|bahasa|^id$/i.test(language);
  return (
    <section
      className="text-left rounded-xl border border-[var(--border)] p-4 space-y-3 text-sm"
      aria-label={id ? "Aturan sesi" : "Session policy"}
    >
      <h2 className="font-semibold">
        {id ? "Sebelum mulai" : "Before you start"}
      </h2>
      <p>
        {id
          ? "Tetap di halaman wawancara dan ikuti aturan penggunaan sumber atau AI yang diberikan perekrut. Jika memerlukan alat bantu atau sumber yang diizinkan, sepakati terlebih dahulu dengan perekrut."
          : "Stay on the interview page and follow the recruiter's rules for resources and AI assistance. Arrange permitted resources or accessibility tools with your recruiter before starting."}
      </p>
      <p>
        {id
          ? "Saat sesi aktif, halaman mencatat waktu dan durasi ketika tersembunyi atau kehilangan fokus. Perpindahan minimal 1 detik dihitung setelah masa awal 10 detik. Gerakan kursor, isi tab lain, penelusuran, dan clipboard tidak direkam."
          : "During the active session, this page records when it is hidden or loses focus and for how long. Either signal lasting at least 1 second counts after a 10-second startup grace period. Cursor movements, other tabs' contents, searches, and clipboard contents are not recorded."}
      </p>
      <p>
        {id
          ? "Sesi dijeda setelah halaman tersembunyi atau kehilangan fokus selama 1 detik, termasuk saat memakai jendela lain di samping wawancara. Gangguan kedua atau 6 detik berturut-turut memicu peringatan terakhir. Gangguan ketiga atau 15 detik berturut-turut mengakhiri sesi. Tidak ada pengurangan skor otomatis."
          : "The session pauses after 1 second hidden or unfocused, including when using another window alongside the interview. A second interruption or 6 continuous seconds away triggers a final warning. A third interruption or 15 continuous seconds away ends the session. No automatic score deduction applies."}
      </p>
      <p className="text-[var(--muted)]">
        {id
          ? "Saat dijeda, latar layar diburamkan, mikrofon dan respons AI dihentikan, serta waktu dibekukan. Suara aktif secara bawaan, dapat dimatikan, dan makin cepat saat peringatan terakhir. Browser mungkin memblokir suara. Setelah masalah teknis, sambungkan kembali dengan pertanyaan pengganti. Jawaban sebelumnya disimpan; pertanyaan yang dibatalkan tidak dinilai."
          : "During a pause, the screen is blurred, microphone capture and AI responses stop, and the timer freezes. Sound starts enabled, can be muted, and becomes more urgent at the final warning. Your browser may block audio. After a technical interruption, reconnect with a replacement question. Earlier answers are retained; retired questions are excluded from evaluation."}
      </p>
      <p className="text-[var(--muted)]">
        {id
          ? "Catatan pemulihan berisi jawaban disimpan di browser ini, termasuk setelah tab ditutup. Saat selesai, sistem mencoba menyimpannya untuk perekrut. Gunakan perangkat pribadi. Gangguan bukan bukti kecurangan; konteks dapat dijelaskan kepada perekrut."
          : "A recovery checkpoint containing your answers is kept in this browser, including after tab closure. At completion, the app attempts to save it for your recruiter. Use a private device. Interruptions are not proof of cheating; you can explain context to your recruiter."}
      </p>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={record?.acknowledgedAt != null}
          disabled={!record || record.acknowledgedAt != null}
          onChange={() => acknowledge()}
          className="mt-1"
        />
        <span>
          {id
            ? "Saya telah membaca aturan dan pencatatan sesi ini."
            : "I have read the session rules and recording notice."}
        </span>
      </label>
    </section>
  );
}
export function IntegrityPanel({
  language = "",
  onResume,
  onNewAttempt,
  showAlert = true,
}: {
  language?: string;
  onResume?: () => void | Promise<void>;
  onNewAttempt?: () => void;
  showAlert?: boolean;
}) {
  const { record, storageUnavailable, sync, explain } = useIntegrityStore();
  if (!record || record.startedAt === null)
    return showAlert ? (
      <IntegrityAlert
        language={language}
        onResume={onResume}
        onNewAttempt={onNewAttempt}
      />
    ) : null;
  const id = /indones|bahasa|^id$/i.test(language);
  const message =
    record.count >= POLICY.reviewAt
      ? id
        ? "Jelaskan konteks gangguan kepada perekrut."
        : "Explain interruption context to your recruiter."
      : record.count >= POLICY.warningAt
        ? id
          ? "Beberapa kali meninggalkan halaman. Ikuti petunjuk status sesi."
          : "Repeated page-away events. Follow the session status instructions."
        : id
          ? "Jika ada gangguan, tambahkan konteks di bawah."
          : "Add context below if an interruption occurred.";
  return (
    <section
      className="relative z-10 mx-4 my-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-sm shrink-0"
      aria-label={id ? "Catatan sesi" : "Session integrity"}
    >
      <div role="status" aria-live="polite">
        <strong>
          {id ? "Kejadian halaman tersembunyi" : "Hidden-page events"}:{" "}
          {record.count}
        </strong>
        <span className="ml-2 text-[var(--muted)]">
          {id ? "Konteks kehilangan fokus" : "Focus-only context"}:{" "}
          {record.focusCount}
        </span>
        <p>
          {record.completed
            ? id
              ? "Pencatatan sesi selesai. Kejadian dapat ditinjau bersama perekrut."
              : "Session monitoring has finished. The events can be reviewed with your recruiter."
            : message}
        </p>
      </div>
      {showAlert && (
        <IntegrityAlert
          language={language}
          onResume={onResume}
          onNewAttempt={onNewAttempt}
        />
      )}
      {storageUnavailable && (
        <p role="status">
          {id
            ? "Penyimpanan lokal tidak tersedia; ekspor catatan sebelum menutup halaman."
            : "Local storage is unavailable; export the record before closing the page."}
        </p>
      )}
      {record.coverageGaps > 0 && (
        <p>
          {id
            ? "Ada bagian pencatatan yang tidak tersedia."
            : "Some monitoring coverage is unavailable."}
        </p>
      )}
      {sync === "saving" && (
        <p>{id ? "Menyimpan catatan…" : "Saving session record…"}</p>
      )}
      {sync === "saved" && (
        <p>
          {id
            ? "Catatan sesi tersimpan untuk ditinjau perekrut."
            : "Session record saved for recruiter review."}
        </p>
      )}
      {sync === "failed" && (
        <p role="status">
          {id
            ? "Catatan belum tersimpan ke server. Ekspor catatan dan hubungi perekrut."
            : "The record was not saved to the server. Export it and contact your recruiter."}
        </p>
      )}
      <details>
        <summary className="cursor-pointer font-medium mt-2">
          {id
            ? "Tinjau kejadian dan beri konteks"
            : "Review events and add context"}
        </summary>
        <p className="my-2 text-[var(--muted)]">
          {id
            ? "Ini sinyal dari browser, bukan bukti kecurangan. Tidak ada penalti skor otomatis."
            : "These are browser signals, not proof of cheating. There is no automatic score penalty."}
        </p>
        <div className="max-h-48 overflow-auto space-y-3">
          {record.events.length === 0 && (
            <p>
              {id
                ? "Belum ada kejadian yang memenuhi batas."
                : "No qualifying events recorded."}
            </p>
          )}
          {record.events.map((event) => (
            <div
              key={event.id}
              className="border-t border-[var(--border)] pt-2"
            >
              <p>
                #{event.id} ·{" "}
                {event.kind === "page_hidden"
                  ? id
                    ? "Halaman tersembunyi"
                    : "Page hidden"
                  : id
                    ? "Konteks fokus saja"
                    : "Focus context only"}{" "}
                · {Math.round(event.awayMs / 1000)}s
              </p>
              <label className="block">
                {id ? "Konteks Anda" : "Your context"}
                <select
                  value={event.reason}
                  disabled={!record.active}
                  aria-label={
                    (id ? "Konteks kejadian " : "Context for event ") + event.id
                  }
                  onChange={(e) =>
                    explain(
                      event.id,
                      e.target.value as IntegrityEvent["reason"]
                    )
                  }
                  className="block w-full p-2 border rounded bg-[var(--background)] border-[var(--border)]"
                >
                  <option value="not_provided">
                    {id ? "Belum diberikan" : "Not provided"}
                  </option>
                  <option value="technical_issue">
                    {id
                      ? "Masalah teknis atau izin perangkat"
                      : "Technical issue or device permission"}
                  </option>
                  <option value="accessibility_need">
                    {id ? "Kebutuhan aksesibilitas" : "Accessibility need"}
                  </option>
                  <option value="interruption">
                    {id ? "Gangguan di sekitar" : "Interruption"}
                  </option>
                  <option value="permitted_resource">
                    {id ? "Sumber yang diizinkan" : "Permitted resource"}
                  </option>
                  <option value="other">
                    {id
                      ? "Lainnya — diskusikan dengan perekrut"
                      : "Other — discuss with recruiter"}
                  </option>
                </select>
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => downloadReport(report(record))}
          className="mt-3 px-3 py-2 rounded border border-[var(--border)]"
        >
          {id ? "Ekspor catatan sesi" : "Export session record"}
        </button>
      </details>
    </section>
  );
}
function downloadReport(value: IntegrityReport) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], {
      type: "application/json",
    })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "session-integrity.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function IntegrityReportPanel({ value }: { value: unknown }) {
  const parsed = reportSchema.safeParse(value);
  return (
    <section
      className="glass-card p-5 mb-6 space-y-3"
      aria-label="Session integrity review"
    >
      <h2 className="text-xl font-semibold">
        Session integrity · human review
      </h2>
      {!parsed.success ? (
        <p>
          No valid record is available. This does not establish compliance or
          misconduct.
        </p>
      ) : (
        <>
          <p>
            <strong>{parsed.data.hiddenCount} hidden-page events</strong> ·{" "}
            {parsed.data.focusContextCount} focus-only context events
          </p>
          <p>
            {parsed.data.hiddenCount >= parsed.data.policy.reviewAt
              ? "Review threshold reached. Discuss context with the candidate before drawing conclusions."
              : "Review threshold not reached. This does not establish compliance."}
          </p>
          <p className="text-sm text-[var(--muted)]">
            Client-reported signals can be incomplete or modified. They do not
            identify AI use, browsing destinations, or intent. Do not use this
            record as an automatic hiring decision or score penalty.
          </p>
          <p>
            Coverage gaps: {parsed.data.coverageGaps}. Older events omitted:{" "}
            {parsed.data.droppedEvents}.
          </p>
          <p className="text-sm">
            Recorded policy: {parsed.data.version}; hidden-page threshold:{" "}
            {parsed.data.policy.hiddenMinimumMs / 1000}s.
          </p>
          <details>
            <summary className="cursor-pointer">
              Event timeline and candidate context
            </summary>
            <ul className="space-y-2 mt-3">
              {parsed.data.events.map((e) => (
                <li key={e.id}>
                  {new Date(e.startedAt).toISOString()} ·{" "}
                  {e.kind.replaceAll("_", " ")} · hidden{" "}
                  {(e.hiddenMs / 1000).toFixed(1)}s · candidate context:{" "}
                  {e.reason.replaceAll("_", " ")}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
