"use client";
import { useRouter } from "next/navigation";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { useControlStore } from "@/lib/integrity/control-store";
import { resumeControlled } from "@/lib/integrity/useInterviewControl";
import { useIntegrityStore } from "@/lib/integrity/store";
export default function RecoveryActions({ retry = true }: { retry?: boolean }) {
  const router = useRouter(),
    { _sessionContext: context, status } = useInterviewStore();
  const phase = useControlStore((s) => s.record?.phase);
  const acknowledged = useIntegrityStore((s) => !!s.record?.acknowledgedAt);
  const terminal = phase === "ended" || phase === "completed";
  function back() {
    useInterviewStore.getState().interrupt();
    const target =
      context?.returnTo ||
      (!context?.sessionId.startsWith("demo-") && context?.sessionId
        ? `/apply/${context.sessionId}`
        : "/interview/setup");
    router.push(
      target.startsWith("/") && !target.startsWith("//")
        ? target
        : "/interview/setup"
    );
  }
  function exit() {
    useInterviewStore.getState().disconnect();
    useControlStore.getState().complete();
    router.push(
      context?.accessMode === "reviewer"
        ? "/reviewer"
        : context?.sponsored
          ? "/demo"
          : "/dashboard"
    );
  }
  return (
    <div
      className="flex flex-wrap justify-center gap-3 mt-4"
      aria-label="Interview recovery actions"
    >
      {retry && !terminal && (
        <button
          type="button"
          className="wm-button"
          disabled={status === "connecting" || !context || !acknowledged}
          onClick={() =>
            void resumeControlled(true, context?.preferredLanguage).catch((e) =>
              useInterviewStore.setState({ error: e.message })
            )
          }
        >
          Retry Connection
        </button>
      )}
      <button type="button" className="wm-button secondary" onClick={back}>
        Return to Setup
      </button>
      <button type="button" className="wm-button secondary" onClick={exit}>
        Exit Interview
      </button>
    </div>
  );
}
