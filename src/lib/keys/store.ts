/**
 * BYOK Key Storage — localStorage-based key management
 * Keys are base64 encoded (obfuscation, not encryption — demo-grade)
 */

const STORAGE_PREFIX = "interviewmate_";

export interface StoredKeys {
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
        openai: getOpenAIKey(),
    };
}

export function hasAllKeys(): boolean {
    const keys = getStoredKeys();
    return keys.openai !== null;
}

export function clearAllKeys(): void {
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
