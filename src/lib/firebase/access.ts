import { where } from "firebase/firestore";

export const ADMIN_EMAIL = "miqbal.izzulhaq@gmail.com";
type Identity = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
} | null;

// UI convenience only. Firestore and Storage rules enforce the same policy.
export function isWorkspaceAdmin(user: Identity): boolean {
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
