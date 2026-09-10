"use client";

import Header from "@/components/layout/Header";
import CandidateHeader from "@/components/layout/CandidateHeader";
import { usePathname } from "next/navigation";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isCandidatePage = pathname.includes("/apply") || pathname.includes("/interview");
    // The live interview room can be taller than the viewport on smaller
    // screens. Let the page scroll naturally while the transcript keeps its
    // own scroll area.
    const isInterviewRoom = pathname.includes("/interview");

    return (
        <div className={isInterviewRoom ? "flex min-h-screen flex-col" : "min-h-screen"}>
            {isCandidatePage ? <CandidateHeader /> : <Header />}
            <main className={isInterviewRoom ? "flex-1" : ""}>
                {children}
            </main>
        </div>
    );
}
