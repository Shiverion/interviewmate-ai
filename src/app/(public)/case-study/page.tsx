import type { Metadata } from "next";
import CaseStudyExplorer from "@/components/case-study/CaseStudyExplorer";

export const metadata: Metadata = {
  title: "Case study | InterviewMate",
  description:
    "An interactive case study of InterviewMate's CV-to-interview evidence workflow.",
};

export default function CaseStudyPage() {
  return <CaseStudyExplorer />;
}
