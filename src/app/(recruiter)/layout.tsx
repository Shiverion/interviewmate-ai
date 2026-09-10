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

    useEffect(() => {
        if (!loading && user && !admin && pathname !== "/dashboard") {
            router.replace("/dashboard");
        }
    }, [admin, loading, pathname, router, user]);

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
