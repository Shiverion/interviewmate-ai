"use client";

import { useEffect, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, isFirebaseReady } from "@/lib/firebase/config";

export type InterviewFeedback = {
  overall_experience: number;
  interviewer_clarity: number;
  transcription_accuracy: number;
  question_relevance: number;
  technical_reliability: number;
  comments: string;
};

const metrics: Array<{
  key: keyof Omit<InterviewFeedback, "comments">;
  label: string;
  indonesian: string;
}> = [
  {
    key: "overall_experience",
    label: "Overall experience",
    indonesian: "Pengalaman keseluruhan",
  },
  {
    key: "interviewer_clarity",
    label: "Interviewer clarity",
    indonesian: "Kejelasan interviewer",
  },
  {
    key: "transcription_accuracy",
    label: "Transcript accuracy",
    indonesian: "Akurasi transkrip",
  },
  {
    key: "question_relevance",
    label: "Question relevance",
    indonesian: "Relevansi pertanyaan",
  },
  {
    key: "technical_reliability",
    label: "Technical reliability",
    indonesian: "Keandalan teknis",
  },
];

function defaultFeedback(): InterviewFeedback {
  return {
    overall_experience: 0,
    interviewer_clarity: 0,
    transcription_accuracy: 0,
    question_relevance: 0,
    technical_reliability: 0,
    comments: "",
  };
}

export default function InterviewFeedbackForm({
  sessionId,
  reviewerSessionId,
  sponsored = false,
  language,
}: {
  sessionId?: string;
  reviewerSessionId?: string;
  sponsored?: boolean;
  language?: string;
}) {
  const indonesian = /indones|bahasa|^id$/i.test(language || "");
  const storageKey = sessionId
    ? `interviewmate-feedback-${sessionId}`
    : "interviewmate-feedback-standalone";
  const [values, setValues] = useState<InterviewFeedback>(defaultFeedback);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncWarning, setSyncWarning] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.submitted && saved.feedback) {
        setValues({ ...defaultFeedback(), ...saved.feedback });
        setSubmitted(true);
      }
    } catch {
      // A malformed local draft should not prevent a new feedback submission.
    }
  }, [storageKey]);

  async function submit() {
    setError("");
    setSyncWarning("");
    if (metrics.some(({ key }) => values[key] < 1 || values[key] > 5)) {
      setError(
        indonesian
          ? "Pilih nilai 1–5 untuk setiap metrik terlebih dahulu."
          : "Choose a 1–5 rating for every metric first."
      );
      return;
    }
    setBusy(true);
    try {
      const feedback = { ...values, comments: values.comments.trim() };

      const isBrowserOnly = !sessionId || sessionId.startsWith("demo-");
      const reviewerId = reviewerSessionId;
      let remoteSaveFailed = false;

      // Reviewer sessions are backed by the hosted reviewer ledger. Save there
      // first and avoid a Firestore write that the candidate's Firebase rules
      // may correctly reject when the session belongs to a different identity.
      if (sponsored && reviewerId) {
        try {
          const response = await fetch("/api/reviewer/sessions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: reviewerId, feedback }),
          });
          if (!response.ok) remoteSaveFailed = true;
        } catch {
          remoteSaveFailed = true;
        }
      } else if (!isBrowserOnly && isFirebaseReady()) {
        try {
          await updateDoc(doc(db, "interview_sessions", sessionId), {
            candidate_feedback: {
              ...feedback,
              submitted_at: serverTimestamp(),
            },
          });
        } catch {
          remoteSaveFailed = true;
        }
      }
      localStorage.setItem(storageKey, JSON.stringify({ submitted: true, feedback }));
      if (remoteSaveFailed) {
        setSyncWarning(
          indonesian
            ? "Feedback tersimpan di browser ini, tetapi sinkronisasi ke workspace gagal."
            : "Feedback was saved in this browser, but workspace sync was unavailable."
        );
      }
      setSubmitted(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : indonesian
            ? "Feedback belum tersimpan. Coba lagi."
            : "Feedback was not saved. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <section className="wm-panel text-left" aria-live="polite">
        <p className="wm-eyebrow">Interview feedback</p>
        <h2 className="mt-1 text-xl font-semibold">
          {indonesian ? "Terima kasih atas feedback Anda." : "Thanks for your feedback."}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {indonesian
            ? "Rating ini membantu kami memperbaiki interviewer, transkrip, dan keandalan sesi."
            : "These ratings help us improve the interviewer, transcript and session reliability."}
        </p>
        {syncWarning && (
          <p role="status" className="wm-note mt-4 text-left">
            {syncWarning}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="wm-panel text-left" aria-labelledby="interview-feedback-heading">
      <p className="wm-eyebrow">Interview feedback</p>
      <h2 id="interview-feedback-heading" className="mt-1 text-xl font-semibold">
        {indonesian ? "Bagaimana pengalaman Anda?" : "How was your experience?"}
      </h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {indonesian
          ? "Nilai setiap bagian dari 1 (buruk) sampai 5 (sangat baik). Feedback ini digunakan untuk peningkatan produk, bukan penilaian kandidat."
          : "Rate each part from 1 (poor) to 5 (excellent). This feedback improves the product and does not change your candidate assessment."}
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {metrics.map(({ key, label, indonesian: idLabel }) => (
          <fieldset key={key} className="rounded-xl border border-[var(--border)] p-3">
            <legend className="px-1 text-sm font-medium">
              {indonesian ? idLabel : label}
            </legend>
            <div className="mt-2 flex items-center justify-between gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating} className="flex flex-1 cursor-pointer flex-col items-center gap-1 text-xs text-[var(--muted)]">
                  <input
                    type="radio"
                    name={key}
                    value={rating}
                    checked={values[key] === rating}
                    onChange={() => setValues((current) => ({ ...current, [key]: rating }))}
                    className="accent-[var(--primary)]"
                  />
                  {rating}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <label className="wm-field mt-5 block">
        {indonesian ? "Catatan tambahan (opsional)" : "Additional comments (optional)"}
        <textarea
          rows={3}
          maxLength={1000}
          value={values.comments}
          onChange={(event) => setValues((current) => ({ ...current, comments: event.target.value }))}
          placeholder={indonesian ? "Apa yang perlu kami perbaiki?" : "What should we improve?"}
        />
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
      <button type="button" className="wm-button mt-4" onClick={() => void submit()} disabled={busy}>
        {busy ? (indonesian ? "Menyimpan…" : "Saving…") : indonesian ? "Kirim feedback" : "Send feedback"}
      </button>
    </section>
  );
}
