/**
 * BYOK Key Storage — localStorage-based key management
 * Keys are base64 encoded (obfuscation, not encryption — demo-grade)
 */

const STORAGE_PREFIX = "interviewmate_";

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

export interface StoredKeys {
    firebase: FirebaseConfig | null;
    openai: string | null;
}

function encode(value: string): string {
    if (typeof window === "undefined") return "";
    return btoa(encodeURIComponent(value));
}

function decode(value: string): string {
    if (typeof window === "undefined") return "";
    try {
        return decodeURIComponent(atob(value));
    } catch {
        return "";
    }
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
    localStorage.setItem(
        `${STORAGE_PREFIX}firebase`,
        encode(JSON.stringify(config))
    );
}

export function getFirebaseConfig(): FirebaseConfig | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(`${STORAGE_PREFIX}firebase`);
    if (!stored) return null;
    try {
        return JSON.parse(decode(stored)) as FirebaseConfig;
    } catch {
        return null;
    }
}

export function saveOpenAIKey(key: string): void {
    localStorage.setItem(`${STORAGE_PREFIX}openai`, encode(key));
}

export function getOpenAIKey(): string | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(`${STORAGE_PREFIX}openai`);
    if (!stored) return null;
    const decoded = decode(stored);
    return decoded || null;
}

export function getStoredKeys(): StoredKeys {
    return {
        firebase: getFirebaseConfig(),
        openai: getOpenAIKey(),
    };
}

export function hasAllKeys(): boolean {
    const keys = getStoredKeys();
    return keys.firebase !== null && keys.openai !== null;
}

export function clearAllKeys(): void {
    localStorage.removeItem(`${STORAGE_PREFIX}firebase`);
    localStorage.removeItem(`${STORAGE_PREFIX}openai`);
}

export function maskKey(key: string, visibleChars: number = 4): string {
    if (key.length <= visibleChars * 2) return "••••••••";
    return (
        key.slice(0, visibleChars) +
        "••••••••" +
        key.slice(-visibleChars)
    );
}
