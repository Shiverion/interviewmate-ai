"use server";

/**
 * Server Action to fetch an ephemeral session token from OpenAI Realtime API.
 * This ensures the raw API key never touches the browser's WebRTC connection stream.
 */
export async function getSessionToken(apiKey: string, systemInstructions?: string): Promise<string> {
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
            voice: "sage", // 'nova' is not supported by the Realtime API endpoint. 'sage' is a supported, highly natural, professional voice.
            instructions: systemInstructions || "You are a charismatic senior AI recruiter. Speak at a moderate, natural human pace. Use conversational fillers but keep them short. Limit the interview to 30 mins. When concluding, provide a professional summary of EXACTLY 2-3 sentences. DO NOT ask the candidate if they have any questions. IMPORTANT: Finish your speech before calling end_interview.",
            turn_detection: {
                type: "server_vad",
                silence_duration_ms: 1000, // Waits 1 second of silence before responding so users don't get cut off
            },
            tools: [
                {
                    type: "function",
                    name: "end_interview",
                    description: "Terminates the interview session. Call this tool IMMEDIATELY after you have delivered your professional closing speech and thanked the candidate. DO NOT wait for candidate input before calling this.",
                    parameters: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                }
            ],
            tool_choice: "auto"
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
