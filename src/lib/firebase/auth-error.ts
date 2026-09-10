export function authErrorMessage(error: unknown, hostname: string, projectId?: string): string {
  const details = error && typeof error === "object" ? error as { code?: string; message?: string } : {};
  if (details.code === "auth/unauthorized-domain") {
    const local = hostname === "127.0.0.1"
      ? " For this local preview, try http://localhost:3000/login. localhost and 127.0.0.1 need separate authorization."
      : "";
    return `This address (${hostname}) is not authorized for sign-in. In Firebase project ${projectId || "configured for this app"}, open Authentication → Settings → Authorized domains and add ${hostname} (without a protocol or port).${local}`;
  }
  if (details.code === "auth/operation-not-allowed") {
    return "Email/password sign-in is disabled for this Firebase project. Enable Authentication → Sign-in method → Email/Password, then refresh this page.";
  }
  if (
    details.code === "auth/invalid-credential" ||
    details.code === "auth/invalid-login-credentials" ||
    details.code === "auth/wrong-password" ||
    details.code === "auth/user-not-found"
  ) {
    return "The email or password is incorrect. Check both fields and try again.";
  }
  if (details.code === "auth/email-already-in-use") {
    return "An account already exists for this email. Switch to Sign in or use another email.";
  }
  if (details.code === "auth/weak-password") {
    return "Choose a stronger password with at least six characters.";
  }
  if (details.code === "auth/too-many-requests") {
    return "Too many attempts were made. Wait a moment, then try again.";
  }
  if (details.code === "auth/network-request-failed") {
    return "Authentication could not reach Firebase. Check your connection and try again.";
  }
  if (details.code === "auth/user-disabled") {
    return "This account is inactive. Contact the administrator to reactivate access.";
  }
  return details.message || "Unable to sign in. Please try again.";
}
