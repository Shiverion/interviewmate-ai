/**
 * Key validation — test Firebase connection and OpenAI API key
 */

import type { FirebaseConfig } from "./store";

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate Firebase config by attempting to initialize and access Firestore
 */
export async function validateFirebaseConfig(
    config: FirebaseConfig
): Promise<ValidationResult> {
    try {
        // Check required fields
        const requiredFields: (keyof FirebaseConfig)[] = [
            "apiKey",
            "authDomain",
            "projectId",
            "storageBucket",
            "messagingSenderId",
            "appId",
        ];

        for (const field of requiredFields) {
            if (!config[field] || config[field].trim() === "") {
                return { valid: false, error: `Missing required field: ${field}` };
            }
        }

        // Try to initialize Firebase with the config
        const { initializeApp, deleteApp } = await import("firebase/app");
        const testApp = initializeApp(config, "validation-test");

        // Try accessing Firestore to verify the project exists
        const { getFirestore, collection, getDocs, limit, query } = await import(
            "firebase/firestore"
        );
        const testDb = getFirestore(testApp);

        // Attempt a minimal Firestore query (will fail if project doesn't exist)
        try {
            await getDocs(query(collection(testDb, "__test__"), limit(1)));
        } catch (e: unknown) {
            // Permission denied is fine — it means Firebase connected but collection doesn't exist or is restricted
            const error = e as { code?: string };
            if (
                error.code !== "permission-denied" &&
                error.code !== "unavailable"
            ) {
                await deleteApp(testApp);
                return {
                    valid: false,
                    error: "Could not connect to Firebase. Check your project ID and API key.",
                };
            }
        }

        await deleteApp(testApp);
        return { valid: true };
    } catch (e: unknown) {
        const error = e as { message?: string };
        return {
            valid: false,
            error: error.message || "Invalid Firebase configuration",
        };
    }
}

/**
 * Validate OpenAI API key by making a lightweight models list request
 */
export async function validateOpenAIKey(
    apiKey: string
): Promise<ValidationResult> {
    if (!apiKey || !apiKey.startsWith("sk-")) {
        return {
            valid: false,
            error: 'OpenAI API key must start with "sk-"',
        };
    }

    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (response.ok) {
            return { valid: true };
        }

        if (response.status === 401) {
            return { valid: false, error: "Invalid API key. Check and try again." };
        }

        if (response.status === 429) {
            // Rate limited but key is valid
            return { valid: true };
        }

        return {
            valid: false,
            error: `OpenAI API returned status ${response.status}`,
        };
    } catch {
        return {
            valid: false,
            error: "Could not reach OpenAI API. Check your network connection.",
        };
    }
}
