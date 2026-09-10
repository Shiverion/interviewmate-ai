"use client";
import InterviewSetupForm from "@/components/interview/InterviewSetupForm";
export default function DemoRoomModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personal interview setup"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <section className="wm-panel w-full max-w-3xl max-h-[90vh] overflow-auto">
        <h2 className="text-2xl mb-6">Interview with your own key</h2>
        <InterviewSetupForm mode="byok" onClose={onClose} />
      </section>
    </div>
  );
}
