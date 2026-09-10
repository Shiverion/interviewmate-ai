"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, onIdTokenChanged } from "firebase/auth";
import { useInterviewStore } from "@/lib/store/useInterviewStore";
import { useControlStore } from "@/lib/integrity/control-store";
import { useIntegrityStore } from "@/lib/integrity/store";
import { auth, isFirebaseReady } from "@/lib/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const observedIdentity = useRef<string | null>(null);
  const [identityKey, setIdentityKey] = useState("guest");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => isFirebaseReady());

  useEffect(() => {
    if (!isFirebaseReady()) {
      console.warn(
        "[AuthProvider] Firebase initialization skipped. Authentication is unavailable until NEXT_PUBLIC_FIREBASE_API_KEY is configured."
      );
      return;
    }

    // Subscribe to Firebase Auth state changes
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      const identity = currentUser?.uid || "guest";
      let previous: string | null = null;
      try {
        previous =
          observedIdentity.current ?? localStorage.getItem("interview-account");
      } catch {
        /* Private browsing may disable storage. */
      }
      if (previous !== identity && (previous || currentUser)) {
        useInterviewStore.getState().reset();
        useInterviewStore.setState({ _sessionContext: undefined });
        useControlStore.setState({ record: null });
        useIntegrityStore.setState({ record: null });
        try {
          for (const storage of [localStorage, sessionStorage]) {
            for (const key of Object.keys(storage)) {
              if (
                /^(interview-store$|interview-recovery-v1:|interview-integrity:|interviewmate[-_]|human-review)/.test(
                  key
                )
              )
                storage.removeItem(key);
            }
          }
        } catch {
          /* Runtime state was cleared even when browser storage is unavailable. */
        }
      }
      try {
        localStorage.setItem("interview-account", identity);
      } catch {
        /* No persistent account data. */
      }
      observedIdentity.current = identity;
      setIdentityKey(
        `${identity}:${currentUser?.email}:${currentUser?.emailVerified}`
      );
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider key={identityKey} value={{ user, loading }}>
      {loading ? (
        <div role="status" className="p-6">
          Loading your workspace…
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
