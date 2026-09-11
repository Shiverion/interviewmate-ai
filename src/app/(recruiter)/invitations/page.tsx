"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { isWorkspaceAdmin } from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/providers/ToastProvider";

type Invitation = {
  id: string;
  label: string;
  code: string | null;
  expiresAt: number | null;
  revoked: boolean;
  maxRedemptions: number | null;
  redeemedCount: number;
  createdAt: number;
};

type Participant = {
  id: string;
  candidate_name?: string;
  candidate_email?: string;
  status?: string;
  created_at?: { toMillis?: () => number };
  evaluation?: { overallScore?: number | null; status?: string };
};

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "none", label: "No expiration" },
];

export default function InvitationsPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const { showToast } = useToast();
  const admin = isWorkspaceAdmin(user);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("Sprint reviewer");
  const [expiresIn, setExpiresIn] = useState("7");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<
    Record<string, Participant[] | "loading" | "error">
  >({});
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    if (user && !admin) router.replace("/dashboard");
  }, [user, admin, router]);

  const load = async () => {
    if (!user || !admin) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const r = await fetch("/api/reviewer/invitations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setInvitations(data.invitations || []);
    } catch {
      showToast("Could not load invitations", "Refresh to try again.", "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, admin]);

  async function createInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setCreateError("");
    setShareLink(null);
    setCopied(false);
    try {
      const token = await user.getIdToken();
      const r = await fetch("/api/reviewer/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label,
          expiresInDays: expiresIn === "none" ? null : Number(expiresIn),
          maxRedemptions: maxRedemptions.trim()
            ? Number(maxRedemptions)
            : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Could not create invitation.");
      const origin = window.location.origin;
      setShareLink(
        `${origin}${data.redeemPath}?code=${encodeURIComponent(data.invitation.code)}`
      );
      await load();
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Could not create invitation."
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleRevoked(id: string, revoked: boolean) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const r = await fetch("/api/reviewer/invitations", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, revoked }),
      });
      if (!r.ok) throw Error((await r.json()).error);
      await load();
      showToast(
        revoked ? "Invitation revoked" : "Invitation restored",
        "",
        "info"
      );
    } catch {
      showToast("Could not update invitation", "", "error");
    }
  }

  function copyRowLink(invitation: Invitation) {
    if (!invitation.code) {
      showToast(
        "Link unavailable",
        "This invitation was created before saved links were supported — revoke it and create a new one to get a copyable link.",
        "error"
      );
      return;
    }
    const link = `${window.location.origin}/reviewer?code=${encodeURIComponent(invitation.code)}`;
    void navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopiedRowId(invitation.id);
        setTimeout(
          () => setCopiedRowId((cur) => (cur === invitation.id ? null : cur)),
          2000
        );
      })
      .catch(() =>
        showToast("Could not copy", "Select and copy the link manually.", "error")
      );
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (participants[id] && participants[id] !== "error") return;
    setParticipants((p) => ({ ...p, [id]: "loading" }));
    try {
      if (!isFirebaseReady()) throw Error("Firebase unavailable.");
      const snapshot = await getDocs(
        query(
          collection(db, "interview_sessions"),
          where("invitation_id", "==", id)
        )
      );
      setParticipants((p) => ({
        ...p,
        [id]: snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Participant, "id">) }))
          .sort(
            (a, b) =>
              (b.created_at?.toMillis?.() || 0) -
              (a.created_at?.toMillis?.() || 0)
          ),
      }));
    } catch {
      setParticipants((p) => ({ ...p, [id]: "error" }));
    }
  }

  function requestDelete(invitation: Invitation) {
    setConfirm({
      isOpen: true,
      title: "Delete invitation?",
      message: `Permanently delete "${invitation.label}"? Anyone still holding this link will no longer be able to redeem it. This does not delete interviews already completed through it.`,
      isDestructive: true,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, isOpen: false }));
        if (!user) return;
        try {
          const token = await user.getIdToken();
          const r = await fetch("/api/reviewer/invitations", {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: invitation.id }),
          });
          if (!r.ok) throw Error((await r.json()).error);
          await load();
          showToast("Invitation deleted", "", "info");
        } catch {
          showToast("Could not delete invitation", "", "error");
        }
      },
    });
  }

  if (!admin) return null;

  return (
    <div>
      <p className="wm-eyebrow">Admin action</p>
      <h1 className="wm-heading">Reviewer invitations</h1>
      <p className="wm-subtitle">
        Create a private link, set who can use it and for how long, and revoke
        or delete it whenever you like. Redeeming a link requires the
        recipient to sign in with Google.
      </p>

      <section className="wm-panel mt-6">
        <h2 className="text-xl mb-4">Create an invitation</h2>
        <form onSubmit={createInvitation} className="grid sm:grid-cols-3 gap-4">
          <label className="wm-field sm:col-span-1">
            Label
            <input
              value={label}
              maxLength={100}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="wm-field">
            Expires in
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="wm-field">
            Max participants
            <input
              type="number"
              min={1}
              max={1000}
              placeholder="Unlimited"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              className="wm-button"
              disabled={creating || !label.trim()}
            >
              {creating ? "Generating…" : "Generate invitation link"}
            </button>
          </div>
        </form>
        {shareLink && (
          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-sm font-medium">
              Share this link — it is shown only once
            </p>
            <a className="block mt-2 break-all text-sm" href={shareLink}>
              {shareLink}
            </a>
            <button
              type="button"
              className="wm-button secondary mt-3"
              onClick={() => {
                void navigator.clipboard
                  .writeText(shareLink)
                  .then(() => setCopied(true))
                  .catch(() => undefined);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
        {createError && (
          <p role="alert" className="wm-note mt-4">
            {createError}
          </p>
        )}
      </section>

      <div className="wm-section-heading">
        <h2>All invitations</h2>
      </div>
      {loading ? (
        <div aria-label="Loading invitations">
          <div className="wm-skeleton" />
        </div>
      ) : !invitations.length ? (
        <div className="wm-empty">
          <h3>No invitations yet.</h3>
          <p>Create one above to get a shareable link.</p>
        </div>
      ) : (
        <div className="wm-panel p-0 overflow-x-auto">
          <table className="wm-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((i) => {
                const expired = i.expiresAt !== null && i.expiresAt < Date.now();
                const status = i.revoked
                  ? "Revoked"
                  : expired
                    ? "Expired"
                    : "Active";
                const isExpanded = expandedId === i.id;
                const rows = participants[i.id];
                return (
                  <Fragment key={i.id}>
                    <tr>
                      <td className="font-medium">
                        <button
                          type="button"
                          className="text-left underline decoration-dotted underline-offset-4"
                          onClick={() => void toggleExpand(i.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "▾ " : "▸ "}
                          {i.label}
                        </button>
                      </td>
                      <td>
                        <span className="wm-tag">{status}</span>
                      </td>
                      <td>
                        {i.expiresAt === null
                          ? "No expiration"
                          : new Date(i.expiresAt).toLocaleDateString()}
                      </td>
                      <td>
                        {i.redeemedCount} / {i.maxRedemptions ?? "∞"}
                      </td>
                      <td className="flex gap-3">
                        <button
                          className="wm-button secondary text-xs"
                          onClick={() => copyRowLink(i)}
                        >
                          {copiedRowId === i.id ? "Copied" : "Copy link"}
                        </button>
                        <button
                          className="wm-button secondary text-xs"
                          onClick={() => void toggleRevoked(i.id, !i.revoked)}
                        >
                          {i.revoked ? "Restore" : "Revoke"}
                        </button>
                        <button
                          className="wm-button quiet text-xs"
                          onClick={() => requestDelete(i)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-[var(--surface)] p-4">
                          {rows === "loading" || rows === undefined ? (
                            <p className="text-sm text-[var(--muted)]">
                              Loading participants…
                            </p>
                          ) : rows === "error" ? (
                            <p className="text-sm text-[var(--muted)]">
                              Could not load participants.{" "}
                              <button
                                type="button"
                                className="underline"
                                onClick={() => void toggleExpand(i.id)}
                              >
                                Retry
                              </button>
                            </p>
                          ) : rows.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">
                              No one has started an interview through this
                              invitation yet.
                            </p>
                          ) : (
                            <div className="divide-y divide-[var(--border)]">
                              {rows.map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between gap-4 py-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {r.candidate_name || "Unnamed"}
                                    </p>
                                    <p className="text-xs text-[var(--muted)]">
                                      {r.candidate_email || "no email"} ·{" "}
                                      {r.status || "active"}
                                    </p>
                                  </div>
                                  {r.status === "evaluated" ? (
                                    <Link
                                      className="text-xs underline"
                                      href={`/interviews/${r.id}`}
                                    >
                                      View report
                                      {typeof r.evaluation?.overallScore ===
                                      "number"
                                        ? ` · ${Math.round(r.evaluation.overallScore)}%`
                                        : ""}
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-[var(--muted)]">
                                      Not yet evaluated
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        isDestructive={confirm.isDestructive}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, isOpen: false }))}
      />
    </div>
  );
}
