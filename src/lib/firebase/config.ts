/**
 * Firebase client — statically initialized via environment variables
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton pattern + build bypass)
// During Vercel's static build, the API key might be missing or mocked. We must not crash the build worker.
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;

const isConfigured = firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "mock_key" &&
    firebaseConfig.apiKey !== "undefined" &&
    firebaseConfig.apiKey !== "";

if (isConfigured) {
    try {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
    } catch (e) {
        console.error("[Firebase] Initialization error:", e);
    }
} else {
    console.warn("[Firebase] Skipped initialization. Mock key or undefined apiKey detected. This is expected during CI builds.");
}

/**
 * Proxy factory to provide descriptive errors instead of 'Cannot read properties of undefined'
 * This prevents mysterious client-side crashes on Vercel when env vars are missing.
 */
function createSafeProxy<T extends object>(name: string, target: T | undefined): T {
    // If target exists, return it directly for zero overhead in production
    if (target) return target;

    return new Proxy({} as T, {
        get(_, prop) {
            // Handle symbols and common standard properties gracefully
            if (typeof prop === 'symbol' || prop === 'then' || prop === 'asPromise') {
                return undefined;
            }

            const propName = String(prop);
            const errorMsg = `[Firebase Error] Attempted to access '${propName}' on '${name}', but Firebase is NOT initialized. Ensure your NEXT_PUBLIC_FIREBASE_API_KEY is set on Vercel.`;

            console.error(errorMsg);

            // Return a function that throws if the code expects a method (common for SDK calls)
            return () => {
                throw new Error(errorMsg);
            };
        }
    });
}

// Export proxied versions to ensure property access (like auth.onAuthStateChanged) doesn't crash on undefined.
const safeDb = createSafeProxy<Firestore>("db", db);
const safeAuth = createSafeProxy<Auth>("auth", auth);
const safeStorage = createSafeProxy<FirebaseStorage>("storage", storage);

export { safeDb as db, safeAuth as auth, safeStorage as storage };

export function getFirebaseApp() {
    return app;
}

export function isFirebaseReady(): boolean {
    return !!app;
}

export default app;
