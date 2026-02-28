/**
 * Key validation — test OpenAI API key
 */

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate OpenAI API key by making a lightweight models list request
 */
export async function validateOpenAIKey(
    apiKey: string
): Promise<ValidationResult> {
    if (!apiKey || !apiKey.trim().startsWith("sk-")) {
        return {
            valid: false,
            error: 'OpenAI API key must start with "sk-"',
        };
    }

    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey.trim()}`,
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
