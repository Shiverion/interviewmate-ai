"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  SpeakerLoudIcon,
  FileTextIcon,
} from "@radix-ui/react-icons";
import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  interviewScope,
  isPrimaryWorkspaceAdmin,
  isWorkspaceAdmin,
} from "@/lib/firebase/access";
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { collection, doc, getDocs, query, setDoc } from "firebase/firestore";
import DemoRoomModal from "@/components/dashboard/DemoRoomModal";
import { isReviewerTestSession } from "@/lib/firebase/interviews";
type Session = {
  id: string;
  candidate_name?: string;
  status?: string;
  created_at?: { toMillis?: () => number };
};
export default function DashboardPage() {
  const { user } = useAuthContext();
  const admin = isWorkspaceAdmin(user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !admin || !isFirebaseReady()) {
        setSessions([]);
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
                  (d) =>
                    !d.data().synthetic &&
                    !/^(demo|reviewer)-/.test(d.id) &&
                    !isReviewerTestSession(d.data())
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
      if (isPrimaryWorkspaceAdmin(user)) {
        void setDoc(
          doc(db, "app_config", "admin"),
          { uid: user.uid },
          { merge: true }
        ).catch(() => undefined);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [admin, user]);
  const count = (states: string[]) =>
    sessions.filter((s) => states.includes(s.status || "")).length;

  if (!admin) {
    return (
      <div className="wm-page max-w-4xl">
        <p className="wm-eyebrow">Personal demo access</p>
        <h1 className="wm-heading">Try the interview experience.</h1>
        <p className="wm-subtitle max-w-2xl">
          Choose a hosted voice demo or bring your own model key. You can set
          the role, add an optional CV, complete the interview and review the
          evaluation. Personal demo data stays in this browser and is never
          added to the recruiter workspace.
        </p>
        <section className="wm-demo-banner mt-8">
          <div>
            <span className="wm-tag">
              <span className="wm-dot" />
              Browser-only session
            </span>
            <h2>Choose how to start.</h2>
            <p className="wm-subtitle">
              No candidate records, CV files or transcripts are written to
              Firestore from this personal path.
            </p>
          </div>
          <div className="space-y-3 min-w-64">
            <Link className="wm-button w-full" href="/demo">
              <SpeakerLoudIcon />
              Try free voice demo
            </Link>
            <button
              type="button"
              className="wm-button secondary w-full"
              onClick={() => setDemo(true)}
            >
              Demo with my own key <ArrowRightIcon />
            </button>
          </div>
        </section>
        <p className="wm-note mt-6">
          Your own key is saved only in this browser. Clear browser storage to
          remove it.
        </p>
        <DemoRoomModal isOpen={demo} onClose={() => setDemo(false)} />
      </div>
    );
  }

  return (
    <div>
      <div className="wm-section-heading pt-0">
        <div>
          <p className="wm-eyebrow">
            Production workspace · All recruiters
          </p>
          <h1 className="wm-heading">Make the next conversation count.</h1>
          <p className="wm-subtitle">
            Manage production interviews, candidates and evidence from one workspace.
          </p>
        </div>
      </div>
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
      <div className="wm-section-heading">
        <h2>Recent conversations</h2>
          <Link className="text-sm flex items-center gap-2" href="/interviews">
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
                        href={`/interviews/${s.id}`}
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
    </div>
  );
}
