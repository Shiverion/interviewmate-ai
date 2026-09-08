import { notFound } from "next/navigation";
import { loadCases } from "@/lib/benchmark/dataset";
import { profiles } from "@/lib/benchmark/providers";
import EvaluationWorkspace from "@/components/benchmark/EvaluationWorkspace";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Model evaluation · InterviewMate",
  robots: { index: false, follow: false },
};
export default function EvaluationPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <EvaluationWorkspace {...loadCases()} providers={profiles()} />;
}
