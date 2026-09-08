import { notFound } from "next/navigation";
import { getBootstrap } from "@/lib/review-brief/server";
import ReviewBrief from "@/components/review-brief/ReviewBrief";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Review brief · InterviewMate",
  robots: { index: false, follow: false },
};
export default function ReviewBriefPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { provenance, configured } = getBootstrap();
  return <ReviewBrief provenance={provenance} configured={configured} />;
}
