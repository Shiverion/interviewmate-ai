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

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "mock_key") {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
    } else {
        console.warn("[Firebase] Skipped initialization. Mock key or undefined apiKey detected. This is expected during CI builds.");
    }
} catch (e) {
    console.error("[Firebase] Initialization error:", e);
}

// Export with non-null assertions since the app assumes they are initialized at runtime,
// except during Vercel's static worker build where they are safely skipped.
const exportedDb = db as Firestore;
const exportedAuth = auth as Auth;
const exportedStorage = storage as FirebaseStorage;

export { exportedDb as db, exportedAuth as auth, exportedStorage as storage };

export function getFirebaseApp() {
    return app;
}

export function getDb() {
    return exportedDb;
}

export function getFirebaseAuth() {
    return exportedAuth;
}

export function getFirebaseStorage() {
    return exportedStorage;
}

export default app;
