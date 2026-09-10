import { notFound } from "next/navigation";
import { getBootstrap } from "@/lib/review-brief/server";
import ReviewBrief from "@/components/review-brief/ReviewBrief";
import { cookies } from "next/headers";
import { reviewerGrant } from "@/lib/access/reviewer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review brief · InterviewMate",
  robots: { index: false, follow: false },
};
export default async function ReviewBriefPage() {
  if (
    !(await reviewerGrant(
      (await cookies()).get("interviewmate-reviewer")?.value
    ))
  )
    notFound();
  const { provenance, configured } = getBootstrap();
  return <ReviewBrief provenance={provenance} configured={configured} />;
}
