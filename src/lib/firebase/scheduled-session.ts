import { ADMIN_EMAIL, DEMO_ADMIN_EMAIL, isDemoAdminActive } from "./access";
import { adminFirestore } from "./admin";
import { verifiedIdentity, type VerifiedIdentity } from "./server-auth";

export class ScheduledSessionAccessError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function millis(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return 0;
}

function isWorkspaceAdmin(identity: VerifiedIdentity) {
  return (
    (identity.emailVerified && identity.email === ADMIN_EMAIL) ||
    (identity.email === DEMO_ADMIN_EMAIL && isDemoAdminActive())
  );
}

export async function requireScheduledSession(
  req: Request,
  sessionId: string,
  options: { allowCompleted?: boolean } = {}
) {
  const identity = await verifiedIdentity(req);
  if (!identity || !identity.emailVerified)
    throw new ScheduledSessionAccessError(
      401,
      "Sign in with the invited, verified email before starting this interview."
    );

  let snapshot;
  try {
    snapshot = await adminFirestore()
      .collection("interview_sessions")
      .doc(sessionId)
      .get();
  } catch {
    throw new ScheduledSessionAccessError(
      503,
      "Hosted interview access is not configured on the server."
    );
  }
  if (!snapshot.exists)
    throw new ScheduledSessionAccessError(404, "This interview link is invalid.");

  const data = snapshot.data() || {};
  const admin = isWorkspaceAdmin(identity);
  const candidateEmail =
    typeof data.candidate_email === "string"
      ? data.candidate_email.toLowerCase()
      : "";
  if (!admin && identity.email !== candidateEmail)
    throw new ScheduledSessionAccessError(
      403,
      "This interview link is assigned to a different email address."
    );
  if (data.status === "revoked")
    throw new ScheduledSessionAccessError(410, "This interview link was revoked.");
  if (
    !options.allowCompleted &&
    (millis(data.valid_from) > Date.now() || millis(data.expires_at) <= Date.now())
  )
    throw new ScheduledSessionAccessError(
      410,
      "This interview link is outside its active window."
    );
  if (
    options.allowCompleted &&
    !["active", "completed", "evaluated"].includes(String(data.status || ""))
  )
    throw new ScheduledSessionAccessError(409, "This interview is not available.");

  return { identity, admin, ref: snapshot.ref, data };
}
