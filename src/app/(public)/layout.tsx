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

    return (
        <div className="min-h-screen">
            {isCandidatePage ? <CandidateHeader /> : <Header />}
            <main>{children}</main>
        </div>
    );
}
