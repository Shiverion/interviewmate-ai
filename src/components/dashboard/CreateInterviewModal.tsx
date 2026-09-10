"use client";
import InterviewSetupForm from "@/components/interview/InterviewSetupForm";
export default function CreateInterviewModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Schedule interview"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <section className="wm-panel w-full max-w-3xl max-h-[90vh] overflow-auto">
        <h2 className="text-2xl mb-6">Schedule interview</h2>
        <InterviewSetupForm
          mode="scheduled"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </section>
    </div>
  );
}
