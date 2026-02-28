"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKeys } from "@/components/providers/KeyProvider";

/**
 * Wraps recruiter content — redirects to /setup if keys are not configured.
 */
export default function KeyGate({ children }: { children: React.ReactNode }) {
    const { isConfigured, isLoading } = useKeys();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isConfigured) {
            router.replace("/setup");
        }
    }, [isConfigured, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className="h-10 w-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                    <p className="text-sm text-[var(--muted)]">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isConfigured) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
