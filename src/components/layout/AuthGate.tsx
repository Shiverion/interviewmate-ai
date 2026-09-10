"use client";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * AuthGate - A wrapper that ensures a user is logged in
 * before rendering children. Redirects to /login if not.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [reviewer, setReviewer] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/access/reviewer")
      .then((r) => r.json())
      .then((d) => setReviewer(d.mode === "reviewer"))
      .catch(() => setReviewer(false));
  }, []);

  useEffect(() => {
    if (!loading && reviewer === false && !user) {
      // Store the current path to redirect back after login
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname, reviewer]);

  if (loading || (!user && reviewer === null)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
      </div>
    );
  }

  if (!user && !reviewer) {
    return null;
  }

  return <>{children}</>;
}
