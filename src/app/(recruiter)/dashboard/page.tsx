"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  PlusIcon,
  SpeakerLoudIcon,
  FileTextIcon,
} from "@radix-ui/react-icons";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useKeys } from "@/components/providers/KeyProvider";
import { interviewScope, isWorkspaceAdmin } from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { collection, doc, getDocs, query, setDoc } from "firebase/firestore";
import CreateInterviewModal from "@/components/dashboard/CreateInterviewModal";
import DemoRoomModal from "@/components/dashboard/DemoRoomModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/providers/ToastProvider";
type Session = {
  id: string;
  candidate_name?: string;
  status?: string;
  created_at?: { toMillis?: () => number };
};
type ReviewerResult = {
  id: string;
  candidateName?: string;
  jobTitle?: string;
  provider?: string;
  model?: string;
  evaluation?: { overallScore?: number | null; status?: string };
};
export default function DashboardPage() {
  const { user } = useAuthContext();
  const { keys } = useKeys();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviewerResults, setReviewerResults] = useState<ReviewerResult[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    label: string;
  }>({ isOpen: false, id: "", label: "" });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [demo, setDemo] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteLabel, setInviteLabel] = useState("Sprint reviewer");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [invitation, setInvitation] = useState<{
    code: string;
    expiresAt: number;
  } | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !isFirebaseReady()) {
        setBusy(false);
        return;
      }
      setBusy(true);
      getDocs(
        query(collection(db, "interview_sessions"), ...interviewScope(user))
      )
        .then((snapshot) => {
          if (active)
            setSessions(
              snapshot.docs
                .filter(
                  (d) => !d.data().synthetic && !/^(demo|reviewer)-/.test(d.id)
                )
                .map((d) => ({ id: d.id, ...d.data() }))
                .sort(
                  (a: Session, b: Session) =>
                    (b.created_at?.toMillis?.() || 0) -
                    (a.created_at?.toMillis?.() || 0)
                )
            );
        })
        .catch(() => {
          if (active)
            setError("We couldn't load your interviews. Refresh to try again.");
        })
        .finally(() => {
          if (active) setBusy(false);
        });
      if (isWorkspaceAdmin(user)) {
        void setDoc(
          doc(db, "app_config", "admin"),
          { uid: user.uid },
          { merge: true }
        ).catch(() => undefined);
        user
          .getIdToken()
          .then((token) =>
            fetch("/api/reviewer/sessions?admin=1", {
              headers: { Authorization: `Bearer ${token}` },
            })
          )
          .then((response) => (response.ok ? response.json() : { results: [] }))
          .then((data) => {
            if (active) setReviewerResults(data.results || []);
          })
          .catch(() => {
            if (active) setReviewerResults([]);
          });
      } else {
        setReviewerResults([]);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user, link]);
  const count = (states: string[]) =>
    sessions.filter((s) => states.includes(s.status || "")).length;
  async function deleteReviewerResult(id: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/reviewer/sessions", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw Error((await response.json()).error);
      setReviewerResults((prev) => prev.filter((r) => r.id !== id));
      showToast("Deleted", "Legacy reviewer record removed.", "info");
    } catch {
      showToast("Error", "Could not delete this record.", "error");
    }
    setDeleteConfirm({ isOpen: false, id: "", label: "" });
  }
  async function createInvitation() {
    if (!user) return;
    setInviteBusy(true);
    setInviteError("");
    setInvitation(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/reviewer/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: inviteLabel, expiresInDays: 7 }),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Could not create invitation.");
      setInvitation(data.invitation);
    } catch (e) {
      setInviteError(
        e instanceof Error ? e.message : "Could not create invitation."
      );
    } finally {
      setInviteBusy(false);
    }
  }
  return (
    <div>
      <div className="wm-section-heading pt-0">
        <div>
          <p className="wm-eyebrow">
            {isWorkspaceAdmin(user)
              ? "Admin workspace · All recruiters"
              : "Your hiring workspace"}
          </p>
          <h1 className="wm-heading">Make the next conversation count.</h1>
          <p className="wm-subtitle">
            Prepare an interview, explore the demo, or return to the evidence.
          </p>
        </div>
        <button className="wm-button" onClick={() => setSchedule(true)}>
          <PlusIcon />
          Schedule Interview
        </button>
      </div>
      <section className="wm-demo-banner mt-7">
        <div>
          <span className="wm-tag">
            <span className="wm-dot" />
            Reviewer access
          </span>
          <h2>Take a seat on the other side.</h2>
          <p className="wm-subtitle">
            Try a live voice interview with a fictional profile. Five demos a
            day, up to eight minutes each. No personal key or CV upload needed.
          </p>
        </div>
        <div className="space-y-3">
          <Link className="wm-button w-full" href="/demo">
            <SpeakerLoudIcon />
            Try free voice demo
          </Link>
          <button
            className="wm-button secondary w-full"
            onClick={() => setDemo(true)}
          >
            Demo with my own key <ArrowRightIcon />
          </button>
        </div>
      </section>
      {!keys.openai && (
        <p className="wm-note mt-5">
          You can explore this workspace without a key. Personal voice sessions
          require an OpenAI key in <Link href="/settings">Models & access</Link>
          , or use the hosted reviewer demo.
        </p>
      )}
      <div className="wm-stats">
        {[
          ["Scheduled", count(["active"])],
          ["Completed", count(["completed"])],
          ["Evaluated", count(["evaluated"])],
          ["All interviews", sessions.length],
        ].map(([label, value]) => (
          <div className="wm-stat" key={label}>
            <span>{label}</span>
            <strong>{busy ? "—" : value}</strong>
          </div>
        ))}
      </div>
      {link && (
        <div className="wm-note mt-6">
          <p className="font-medium">Your candidate link is ready</p>
          <div className="flex flex-wrap gap-3 mt-2 items-center">
            <a className="break-all" href={link}>
              {link}
            </a>
            <button
              className="wm-button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setError(
                    "Copy isn't available here. Select and copy the link above."
                  );
                }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
      <div className="wm-section-heading">
        <h2>Recent conversations</h2>
          <Link className="text-sm flex items-center gap-2" href="/pipeline">
          View all interviews <ArrowRightIcon />
        </Link>
      </div>
      {error ? (
        <p role="alert" className="wm-note">
          {error}
        </p>
      ) : busy ? (
        <div aria-label="Loading interviews">
          <div className="wm-skeleton" />
          <div className="wm-skeleton" />
        </div>
      ) : (
        <div className="wm-panel p-0 overflow-x-auto">
          {!sessions.length ? (
            <div className="wm-empty">
              <FileTextIcon className="mx-auto w-7 h-7" />
              <h3>Your first conversation starts here.</h3>
              <p>
                Scheduled interviews and their review status will appear in this
                space.
              </p>
              <button
                className="wm-button secondary"
                onClick={() => setSchedule(true)}
              >
                Schedule an interview
              </button>
            </div>
          ) : (
            <table className="wm-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">
                      {s.candidate_name || "Unnamed candidate"}
                    </td>
                    <td>
                      <span className="wm-tag">{s.status || "Scheduled"}</span>
                    </td>
                    <td>
                      <Link
                        className="inline-flex items-center gap-2"
                        href={`/pipeline/${s.id}`}
                      >
                        Open record <ArrowRightIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <p className="mt-8 text-sm">
        <Link href="/reviewer">Open an invitation link →</Link>
      </p>
      {isWorkspaceAdmin(user) && (
        <section className="wm-panel mt-8" aria-labelledby="invite-heading">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="wm-eyebrow">Admin action</p>
              <h2 id="invite-heading" className="text-xl">
                Create an interview invitation
              </h2>
            </div>
            <Link href="/invitations" className="wm-tag">
              Manage all invitations <ArrowRightIcon />
            </Link>
          </div>
          <p className="wm-subtitle mb-4">
            Generate a private, shareable link. The recipient signs in with
            Google, then can set up, complete and review one hosted
            interview; their result appears in Pipeline like any other
            candidate. Use{" "}
            <Link href="/invitations">Manage all invitations</Link> to set an
            expiration, a participant cap, or to revoke or delete a link.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="wm-field flex-1">
              Invitation label
              <input
                value={inviteLabel}
                maxLength={100}
                onChange={(e) => setInviteLabel(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="wm-button self-end"
              disabled={inviteBusy || !inviteLabel.trim()}
              onClick={() => void createInvitation()}
            >
              {inviteBusy ? "Generating…" : "Generate invitation"}
            </button>
          </div>
          {invitation && (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-sm font-medium">
                Share this link — it is shown only once
              </p>
              <a
                className="block mt-2 break-all text-sm"
                href={`${window.location.origin}/reviewer?code=${encodeURIComponent(invitation.code)}`}
              >
                {`${window.location.origin}/reviewer?code=${invitation.code}`}
              </a>
              <div className="flex flex-wrap gap-3 mt-3 items-center">
                <button
                  type="button"
                  className="wm-button secondary"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(
                        `${window.location.origin}/reviewer?code=${invitation.code}`
                      )
                      .catch(() => undefined);
                  }}
                >
                  Copy link
                </button>
                <span className="text-xs text-[var(--muted)]">
                  Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          {inviteError && (
            <p role="alert" className="wm-note mt-4">
              {inviteError}
            </p>
          )}
        </section>
      )}
      {isWorkspaceAdmin(user) && reviewerResults.length > 0 && (
        <section
          className="wm-panel mt-8"
          aria-labelledby="reviewer-results-heading"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="wm-eyebrow">Invitation results · Legacy</p>
              <h2 id="reviewer-results-heading" className="text-xl">
                Admin-only reviewer scores
              </h2>
            </div>
            <span className="wm-tag">Server-hosted</span>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            From the earlier ledger-based reviewer flow. New invitation
            interviews now appear in Pipeline instead — delete these once
            you&apos;ve reviewed them.
          </p>
          <div className="divide-y divide-[var(--border)]">
            {reviewerResults.map((result) => (
              <div
                className="flex items-center justify-between gap-4 py-3"
                key={result.id}
              >
                <div>
                  <p className="font-medium">
                    {result.candidateName || "Invitation interview"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {result.jobTitle || "Invited candidate"} ·{" "}
                    {result.provider || "provider"} · {result.model || "model"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="font-mono text-lg">
                    {typeof result.evaluation?.overallScore === "number"
                      ? `${Math.round(result.evaluation.overallScore)}%`
                      : result.evaluation?.status || "Evaluation complete"}
                  </strong>
                  <button
                    className="wm-button quiet text-xs"
                    onClick={() =>
                      setDeleteConfirm({
                        isOpen: true,
                        id: result.id,
                        label: result.candidateName || "this record",
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <CreateInterviewModal
        isOpen={schedule}
        onClose={() => setSchedule(false)}
        onSuccess={(id) => {
          setSchedule(false);
          setCopied(false);
          setLink(`${window.location.origin}/apply/${id}`);
        }}
      />
      <DemoRoomModal isOpen={demo} onClose={() => setDemo(false)} />
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete this record?"
        message={`Permanently delete "${deleteConfirm.label}"'s legacy reviewer result? This cannot be undone.`}
        isDestructive
        confirmLabel="Delete"
        onConfirm={() => void deleteReviewerResult(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: "", label: "" })}
      />
    </div>
  );
}
