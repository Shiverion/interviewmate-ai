"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            console.error("[AuthProvider] Firebase auth is undefined. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your environment variables.");
            setLoading(false);
            return;
        }

        // Subscribe to Firebase Auth state changes
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // For testing/mocking during development, if no user is signed in but we are on dashboard,
    // we could inject a mock user. But currently we will just return the real state.
    // If you need to test the dashboard without login, you can uncomment this:
    /*
    if (!user && process.env.NODE_ENV === 'development') {
        return (
            <AuthContext.Provider value={{ user: { uid: 'dev-user-123', email: 'dev@example.com' } as any, loading: false }}>
                {children}
            </AuthContext.Provider>
        );
    }
    */

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}
