"use server";
/** Retired compatibility action. Every interview now uses /api/realtime. */
export async function getSessionToken(): Promise<string> {
  throw Error("Use the shared realtime connection service.");
}
