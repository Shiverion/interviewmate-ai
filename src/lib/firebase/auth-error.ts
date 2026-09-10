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
  return details.message || "Unable to sign in. Please try again.";
}
