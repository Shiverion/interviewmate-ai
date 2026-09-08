"use client";
import {
  POLICY,
  reportSchema,
  report,
  type IntegrityEvent,
  type IntegrityReport,
} from "@/lib/integrity/policy";
import { useIntegrityStore } from "@/lib/integrity/store";

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
          ? "Saat sesi aktif, halaman mencatat waktu dan durasi ketika tersembunyi atau kehilangan fokus. Perpindahan minimal 3 detik dihitung setelah masa awal 10 detik. Gerakan kursor, isi tab lain, penelusuran, dan clipboard tidak direkam."
          : "During the active session, this page records when it is hidden or loses focus and for how long. Hidden periods of at least 3 seconds count after a 10-second startup grace period. Cursor movements, other tabs' contents, searches, and clipboard contents are not recorded."}
      </p>
      <p>
        {id
          ? "Tiga kejadian memunculkan peringatan; lima menyarankan peninjauan manusia. Kehilangan fokus saja tidak menambah hitungan. Sesi tidak otomatis dihentikan dan skor tidak dikurangi. Kejadian bukan bukti kecurangan; Anda bisa memberikan konteks."
          : "Three events trigger a warning; five suggest human review. Focus loss alone does not increase this count. Your session is not automatically ended and scores are not reduced. Events are not proof of cheating; you can provide context."}
      </p>
      <p className="text-[var(--muted)]">
        {id
          ? "Catatan disimpan di tab ini. Saat wawancara selesai, sistem mencoba menyimpan ringkasannya ke sesi untuk dilihat perekrut."
          : "The record is kept in this browser tab. At interview completion, the app attempts to save it with the session for your recruiter to review."}
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
export function IntegrityPanel({ language = "" }: { language?: string }) {
  const { record, storageUnavailable, sync, explain } = useIntegrityStore();
  if (!record || record.startedAt === null) return null;
  const id = /indones|bahasa|^id$/i.test(language);
  const message =
    record.count >= POLICY.reviewAt
      ? id
        ? "Peninjauan manusia disarankan. Wawancara tetap berjalan; jelaskan konteks kejadian kepada perekrut."
        : "Human review suggested. Your interview can continue; explain the interruptions to your recruiter."
      : record.count >= POLICY.warningAt
        ? id
          ? "Beberapa kali meninggalkan halaman. Harap tetap di halaman wawancara; sesi tidak akan otomatis dihentikan."
          : "Repeated page-away events. Please stay on the interview page; this will not automatically end your session."
        : id
          ? "Anda dapat melanjutkan wawancara. Jika ada gangguan, tambahkan konteks di bawah."
          : "You can continue your interview. Add context below if an interruption occurred.";
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
            {parsed.data.hiddenCount >= POLICY.reviewAt
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
