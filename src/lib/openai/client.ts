/**
 * OpenAI client factory — creates client from BYOK stored key
 */

import { getOpenAIKey } from "@/lib/keys/store";

/**
 * Get the stored OpenAI API key, or null if not configured
 */
export function getOpenAIApiKey(): string | null {
    return getOpenAIKey();
}

/**
 * Create headers for OpenAI API requests
 */
export function getOpenAIHeaders(): Record<string, string> | null {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) return null;

    return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };
}
