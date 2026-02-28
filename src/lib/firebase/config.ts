/**
 * Firebase client — dynamically initialized from BYOK stored keys
 */

import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";
import { getFirebaseConfig, type FirebaseConfig } from "@/lib/keys/store";

const APP_NAME = "interviewmate";

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let cachedStorage: FirebaseStorage | null = null;

/**
 * Initialize or reinitialize Firebase from stored config
 */
export function initializeFirebase(config?: FirebaseConfig): FirebaseApp | null {
    const firebaseConfig = config || getFirebaseConfig();
    if (!firebaseConfig) return null;

    // If already initialized with same config, return cached
    if (cachedApp) {
        try {
            return cachedApp;
        } catch {
            cachedApp = null;
        }
    }

    // Clean up existing app
    const existingApps = getApps();
    const existing = existingApps.find((a) => a.name === APP_NAME);
    if (existing) {
        deleteApp(existing);
    }

    try {
        cachedApp = initializeApp(firebaseConfig, APP_NAME);
        cachedDb = getFirestore(cachedApp);
        cachedAuth = getAuth(cachedApp);
        cachedStorage = getStorage(cachedApp);
        return cachedApp;
    } catch {
        cachedApp = null;
        cachedDb = null;
        cachedAuth = null;
        cachedStorage = null;
        return null;
    }
}

export function getFirebaseApp(): FirebaseApp | null {
    if (!cachedApp) {
        return initializeFirebase();
    }
    return cachedApp;
}

export function getDb(): Firestore | null {
    if (!cachedDb) initializeFirebase();
    return cachedDb;
}

export function getFirebaseAuth(): Auth | null {
    if (!cachedAuth) initializeFirebase();
    return cachedAuth;
}

export function getFirebaseStorage(): FirebaseStorage | null {
    if (!cachedStorage) initializeFirebase();
    return cachedStorage;
}

/**
 * Clear all cached Firebase instances (used when keys are reset)
 */
export function resetFirebase(): void {
    if (cachedApp) {
        try {
            deleteApp(cachedApp);
        } catch {
            // ignore
        }
    }
    cachedApp = null;
    cachedDb = null;
    cachedAuth = null;
    cachedStorage = null;
}
