"use server";

/**
 * Server Action to fetch an ephemeral session token from OpenAI Realtime API.
 * This ensures the raw API key never touches the browser's WebRTC connection stream.
 */
export async function getSessionToken(apiKey: string): Promise<string> {
    if (!apiKey || !apiKey.trim().startsWith("sk-")) {
        throw new Error("A valid OpenAI API key is required to start a session.");
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o-realtime-preview-2024-12-17",
            voice: "alloy", // Can be alloy, echo, fable, onyx, nova, shimmer
            instructions: "You are an AI recruiter conducting a screening interview. Be professional, concise, and adaptive to the user's responses. Keep responses brief.",
            turn_detection: {
                type: "server_vad",
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Failed to generate OpenAI session token:", errorData);
        throw new Error(`Failed to generate session token: ${response.status}`);
    }

    const data = await response.json();

    if (!data.client_secret?.value) {
        throw new Error("Invalid response format from OpenAI token endpoint");
    }

    return data.client_secret.value;
}
