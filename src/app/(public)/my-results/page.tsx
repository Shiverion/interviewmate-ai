"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { isWorkspaceAdmin } from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { deleteInterviewSession } from "@/lib/firebase/interviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/providers/ToastProvider";
import EvidenceAssessment from "@/components/interview/EvidenceAssessment";
import type { EvidenceAssessment as Assessment } from "@/lib/ai/evidence";

type ResultRecord = {
  id: string;
  candidate_name?: string;
  role_snapshot?: { job_title?: string };
  status?: string;
  created_at?: { toMillis?: () => number };
  resume_storage_path?: string;
  evaluation?: Assessment;
};

export default function MyResultsPage() {
  const { user, loading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const admin = isWorkspaceAdmin(user);
  const { showToast } = useToast();
  const [records, setRecords] = useState<ResultRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !admin || !isFirebaseReady()) {
        if (active) setBusy(false);
        return;
      }
      if (active) setBusy(true);
      try {
        // The status filter isn't just cosmetic: Firestore's list-rule safety
        // check needs every constraint ownRecord() relies on declared in the
        // query itself (candidate_email is matched against the signed-in
        // email; revoked records are intentionally excluded, matching what
        // "revoke" is meant to do).
        const snapshot = await getDocs(
          query(
            collection(db, "interview_sessions"),
            where("candidate_email", "==", user.email?.toLowerCase() || ""),
            where("status", "in", ["active", "completed", "evaluated"])
          )
        );
        if (active)
          setRecords(
            snapshot.docs
              .map((d) => ({
                id: d.id,
                ...(d.data() as Omit<ResultRecord, "id">),
              }))
              .sort(
                (a, b) =>
                  (b.created_at?.toMillis?.() || 0) -
                  (a.created_at?.toMillis?.() || 0)
              )
          );
      } catch {
        if (active)
          showToast(
            "Couldn't load your results",
            "Refresh to try again.",
            "error"
          );
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [admin, user, showToast]);

  useEffect(() => {
    if (!loading && user && !admin) router.replace("/dashboard");
  }, [admin, loading, router, user]);

  function requestDelete(record: ResultRecord) {
    setConfirm({
      isOpen: true,
      message:
        "Permanently delete this interview — your CV, transcript and evaluation? This cannot be undone.",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, isOpen: false }));
        try {
          await deleteInterviewSession(record.id, record.resume_storage_path);
          setRecords((prev) => prev.filter((r) => r.id !== record.id));
          showToast("Deleted", "Your data was removed.", "info");
        } catch {
          showToast("Could not delete", "Try again in a moment.", "error");
        }
      },
    });
  }

  if (!user)
    return (
      <div className="wm-page max-w-lg">
        <p className="wm-eyebrow">Your data</p>
        <h1 className="wm-heading">Sign in to see your results</h1>
        {!loading && (
          <Link
            className="wm-button mt-4"
            href={`/login?returnUrl=${encodeURIComponent(pathname)}`}
          >
            Sign in to continue
          </Link>
        )}
      </div>
    );

  if (!admin) return null;

  return (
    <div className="wm-page max-w-4xl">
      <p className="wm-eyebrow">Your data</p>
      <h1 className="wm-heading">My results</h1>
      <p className="wm-subtitle">
        Only you and the administrator can see these. Delete a record any
        time — that also removes your uploaded CV.
      </p>
      {busy ? (
        <div aria-label="Loading your results">
          <div className="wm-skeleton" />
        </div>
      ) : !records.length ? (
        <div className="wm-empty mt-6">
          <h3>Nothing here yet.</h3>
          <p>Interviews you complete via an invitation will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {records.map((r) => (
            <div key={r.id} className="wm-panel">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {r.role_snapshot?.job_title || "Interview"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {r.status || "active"}
                    {r.evaluation ? " · Evaluated" : " · Awaiting review"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.evaluation && (
                    <button
                      className="wm-button secondary text-xs"
                      onClick={() =>
                        setOpenId(openId === r.id ? null : r.id)
                      }
                    >
                      {openId === r.id ? "Hide evidence" : "View evidence"}
                    </button>
                  )}
                  <button
                    className="wm-button quiet text-xs"
                    onClick={() => requestDelete(r)}
                  >
                    Delete my data
                  </button>
                </div>
              </div>
              {openId === r.id && r.evaluation && (
                <div className="mt-5">
                  <EvidenceAssessment assessment={r.evaluation} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title="Delete this record?"
        message={confirm.message}
        isDestructive
        confirmLabel="Delete"
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, isOpen: false }))}
      />
    </div>
  );
}
