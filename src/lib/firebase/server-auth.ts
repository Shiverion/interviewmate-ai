import { ADMIN_EMAIL } from "./access";

type FirebaseIdentity = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
};

/** Verify a Firebase ID token through the project's Auth REST endpoint.
 * This keeps the admin-only reviewer result endpoint server-authorized without
 * adding a service-account secret to the prototype.
 */
export async function isVerifiedAdminRequest(req: Request) {
  const token = req.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!token || !apiKey) return false;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) return false;
    const data = (await response.json()) as { users?: FirebaseIdentity[] };
    const identity = data.users?.[0];
    return (
      identity?.emailVerified === true &&
      identity.email?.toLowerCase() === ADMIN_EMAIL
    );
  } catch {
    return false;
  }
}
