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
import { db, isFirebaseReady } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import CreateInterviewModal from "@/components/dashboard/CreateInterviewModal";
import DemoRoomModal from "@/components/dashboard/DemoRoomModal";
type Session = {
  id: string;
  candidate_name?: string;
  status?: string;
  created_at?: { toMillis?: () => number };
};
export default function DashboardPage() {
  const { user } = useAuthContext();
  const { keys } = useKeys();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [demo, setDemo] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !isFirebaseReady()) {
        setBusy(false);
        return;
      }
      setBusy(true);
      getDocs(
        query(
          collection(db, "interview_sessions"),
          where("recruiter_id", "==", user.uid)
        )
      )
        .then((snapshot) => {
          if (active)
            setSessions(
              snapshot.docs
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
    }
    void load();
    return () => {
      active = false;
    };
  }, [user, link]);
  const count = (states: string[]) =>
    sessions.filter((s) => states.includes(s.status || "")).length;
  return (
    <div>
      <div className="wm-section-heading pt-0">
        <div>
          <p className="wm-eyebrow">Your hiring workspace</p>
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
      {process.env.NODE_ENV === "development" && (
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Link className="wm-panel" href="/review-brief">
            <p className="wm-eyebrow">Evidence workspace</p>
            <h3 className="text-xl mt-3 mb-2">
              Read beyond the score <span aria-hidden="true">↗</span>
            </h3>
            <p className="wm-subtitle">
              Connect claims to transcript evidence and leave a reviewed brief.
            </p>
          </Link>
          <Link className="wm-panel" href="/review-brief/evaluation">
            <p className="wm-eyebrow">Model evaluation</p>
            <h3 className="text-xl mt-3 mb-2">
              Compare before you choose <span aria-hidden="true">↗</span>
            </h3>
            <p className="wm-subtitle">
              English-first tests with a separate Indonesian language extension.
            </p>
          </Link>
        </div>
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
    </div>
  );
}
