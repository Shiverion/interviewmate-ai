import InterviewSetupForm from "@/components/interview/InterviewSetupForm";
export default function InterviewSetup() {
  return (
    <div className="wm-page max-w-4xl">
      <p className="wm-eyebrow">Personal interview</p>
      <h1 className="wm-heading">Review your setup</h1>
      <p className="wm-subtitle mb-6">
        Your previous configuration is preserved. A new room gets a new attempt;
        completed recovery evidence remains saved.
      </p>
      <InterviewSetupForm mode="byok" />
    </div>
  );
}
