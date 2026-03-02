"use server";

/**
 * Server Action to fetch an ephemeral session token from OpenAI Realtime API.
 * This ensures the raw API key never touches the browser's WebRTC connection stream.
 */
export async function getSessionToken(apiKey: string, systemInstructions?: string): Promise<string> {
    const userKey = apiKey?.trim();
    const serverKey = process.env.OPENAI_API_KEY?.trim();

    if (!userKey || !userKey.startsWith("sk-")) {
        throw new Error("A valid OpenAI API key is required to start a session.");
    }

    const candidateKeys = [userKey];
    if (serverKey && serverKey !== userKey) {
        candidateKeys.push(serverKey);
    }

    const candidateModels = ["gpt-4o-realtime-preview-2024-12-17", "gpt-realtime"];

    let lastStatus = 500;
    let lastError = "Unknown error";

    for (const key of candidateKeys) {
        for (const model of candidateModels) {
            const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    voice: "sage",
                    instructions: systemInstructions || "You are a charismatic senior AI recruiter. Speak at a moderate, natural human pace. Use conversational fillers but keep them short. Limit the interview to 30 mins. When concluding, provide a professional summary of EXACTLY 2-3 sentences. DO NOT ask the candidate if they have any questions. IMPORTANT: Finish your speech before calling end_interview.",
                    turn_detection: {
                        type: "server_vad",
                        silence_duration_ms: 1000,
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

            if (response.ok) {
                const data = await response.json();
                if (data.client_secret?.value) {
                    return data.client_secret.value;
                }
                throw new Error("Invalid response format from OpenAI token endpoint");
            }

            const errorData = await response.text();
            lastStatus = response.status;
            lastError = errorData;
            console.error(`[Realtime Session] model=${model} status=${response.status} body=${errorData}`);

            // Try next model only for bad-request style model/payload mismatch.
            if (response.status !== 400) {
                break;
            }
        }

        // If key is unauthorized, try next key if available.
        if (lastStatus !== 401) {
            break;
        }
    }

    throw new Error(`Failed to generate session token: ${lastStatus}. ${lastError}`);
}
