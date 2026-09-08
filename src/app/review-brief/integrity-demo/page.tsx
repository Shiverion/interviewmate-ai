import { notFound } from "next/navigation";
import IntegrityRehearsal from "@/components/interview/IntegrityRehearsal";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Session-integrity rehearsal",
  robots: { index: false, follow: false },
};
export default function IntegrityDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <IntegrityRehearsal />;
}
