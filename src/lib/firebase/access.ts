import { where } from "firebase/firestore";

export const ADMIN_EMAIL = "miqbal.izzulhaq@gmail.com";
/**
 * Shared email/password account for portfolio reviewers. This account is
 * intentionally separate from the owner's Google identity so a reviewer can
 * open the full workspace without needing Google access.
 */
export const DEMO_ADMIN_EMAIL = "reviewer@interviewmate.demo";
// Seven-day portfolio review window, starting with this demo run. Keep the
// same cutoff in firestore.rules and storage.rules when issuing a new window.
export const DEMO_ADMIN_EXPIRES_AT = "2026-09-18T00:00:00.000Z";
type Identity = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
} | null;

// UI convenience only. Firestore and Storage rules enforce the same policy.
export function isWorkspaceAdmin(user: Identity): boolean {
  const email = user?.email?.toLowerCase();
  return !!email &&
    ((email === DEMO_ADMIN_EMAIL && isDemoAdminActive()) ||
      (!!user?.emailVerified && email === ADMIN_EMAIL));
}
export function isDemoAdminActive(now = Date.now()): boolean {
  return now < Date.parse(DEMO_ADMIN_EXPIRES_AT);
}
/** The owner's identity is the only one that publishes the recruiter UID
 * used by candidate invitations. The shared reviewer account must not replace
 * that pointer when it opens the workspace. */
export function isPrimaryWorkspaceAdmin(user: Identity): boolean {
  return !!user?.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL;
}
export function canManageInterview(
  user: Identity,
  data: { recruiter_id?: string }
): boolean {
  return !!user && (data.recruiter_id === user.uid || isWorkspaceAdmin(user));
}
export function interviewScope(user: NonNullable<Identity>) {
  return isWorkspaceAdmin(user) ? [] : [where("recruiter_id", "==", user.uid)];
}
