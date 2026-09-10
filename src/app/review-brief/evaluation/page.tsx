import { notFound } from "next/navigation";
import { loadCases } from "@/lib/benchmark/dataset";
import { profiles } from "@/lib/benchmark/providers";
import EvaluationWorkspace from "@/components/benchmark/EvaluationWorkspace";
import { cookies } from "next/headers";
import { reviewerGrant } from "@/lib/access/reviewer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Model evaluation · InterviewMate",
  robots: { index: false, follow: false },
};
export default async function EvaluationPage() {
  if (
    !(await reviewerGrant(
      (await cookies()).get("interviewmate-reviewer")?.value
    ))
  )
    notFound();
  return <EvaluationWorkspace {...loadCases()} providers={profiles()} />;
}
