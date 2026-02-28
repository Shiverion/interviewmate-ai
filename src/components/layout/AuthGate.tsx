"use client";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * AuthGate - A wrapper that ensures a user is logged in
 * before rendering children. Redirects to /login if not.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuthContext();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            // Store the current path to redirect back after login
            router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
