"use client";

import Header from "@/components/layout/Header";
import KeyGate from "@/components/layout/KeyGate";
import AuthGate from "@/components/layout/AuthGate";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { isWorkspaceAdmin } from "@/lib/firebase/access";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RecruiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuthContext();
    const pathname = usePathname();
    const router = useRouter();
    const admin = isWorkspaceAdmin(user);
    // Route groups can stay mounted for a moment during a client-side
    // navigation. Treat public pages as public here too, otherwise a
    // signed-in non-admin can be bounced back to /dashboard while opening
    // the case study or demo.
    const isPublicPath =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/case-study" ||
        pathname.startsWith("/case-study/") ||
        pathname === "/demo" ||
        pathname.startsWith("/demo/") ||
        pathname === "/ats-check" ||
        pathname.startsWith("/ats-check/");

    useEffect(() => {
        if (!loading && user && !admin && pathname !== "/dashboard" && !isPublicPath) {
            router.replace("/dashboard");
        }
    }, [admin, isPublicPath, loading, pathname, router, user]);

    return (
        <AuthGate>
            <div className="min-h-screen">
                <Header />
                <main>
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        {admin || pathname === "/dashboard" ? (
                            <KeyGate>{children}</KeyGate>
                        ) : null}
                    </div>
                </main>
            </div>
        </AuthGate>
    );
}
