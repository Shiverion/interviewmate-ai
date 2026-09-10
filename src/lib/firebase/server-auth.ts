import {
  ADMIN_EMAIL,
  DEMO_ADMIN_EMAIL,
  isDemoAdminActive,
} from "./access";

type FirebaseIdentity = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
};

export type VerifiedIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
};

/** Verify a Firebase ID token through the project's Auth REST endpoint.
 * This keeps admin- and reviewer-authorized endpoints server-verified without
 * adding a service-account secret to the prototype.
 */
export async function verifiedIdentity(
  req: Request
): Promise<VerifiedIdentity | null> {
  const token = req.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!token || !apiKey) return null;
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
    if (!response.ok) return null;
    const data = (await response.json()) as { users?: FirebaseIdentity[] };
    const identity = data.users?.[0];
    if (!identity?.localId || !identity.email) return null;
    return {
      uid: identity.localId,
      email: identity.email.toLowerCase(),
      emailVerified: identity.emailVerified === true,
    };
  } catch {
    return null;
  }
}

export async function isVerifiedAdminRequest(req: Request) {
  const identity = await verifiedIdentity(req);
  return !!identity &&
    ((identity.email === DEMO_ADMIN_EMAIL && isDemoAdminActive()) ||
      (identity.emailVerified === true && identity.email === ADMIN_EMAIL));
}
