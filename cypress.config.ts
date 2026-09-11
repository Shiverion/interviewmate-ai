import { defineConfig } from "cypress";
import { readFileSync } from "node:fs";
let reviewerCookie: string | null = null;
let cachedIdToken: string | null = null;

/** Reviewer redemption now requires a verified Google sign-in (product
 * requirement, 2026-09-10). For local/CI e2e runs, sign in a real test
 * Firebase account via the Auth REST API using CYPRESS_REVIEWER_TEST_EMAIL /
 * CYPRESS_REVIEWER_TEST_PASSWORD, so the redeem call below can attach a real
 * ID token the way the browser would after /login. */
async function reviewerTestIdToken(): Promise<string> {
  if (cachedIdToken) return cachedIdToken;
  const email = process.env.CYPRESS_REVIEWER_TEST_EMAIL;
  const password = process.env.CYPRESS_REVIEWER_TEST_PASSWORD;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!email || !password || !apiKey)
    throw Error(
      "Reviewer redemption now requires sign-in. Set CYPRESS_REVIEWER_TEST_EMAIL, " +
        "CYPRESS_REVIEWER_TEST_PASSWORD (a real, email-verified Firebase test account) " +
        "and NEXT_PUBLIC_FIREBASE_API_KEY before running these specs."
    );
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await response.json();
  if (!response.ok || !data.idToken)
    throw Error(
      "Could not sign in the reviewer test account: " +
        (data.error?.message || response.statusText)
    );
  cachedIdToken = data.idToken;
  return data.idToken;
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on) {
      on("task", {
        async reviewerCookie() {
          if (reviewerCookie) return reviewerCookie;
          const code = readFileSync(
            ".demo-state/reviewer-invitation.txt",
            "utf8"
          )
            .match(/^Code: (.+)$/m)?.[1]
            ?.trim();
          if (!code)
            throw Error("Create a local reviewer invitation before this test.");
          const idToken = await reviewerTestIdToken();
          const response = await fetch(
            "http://localhost:3000/api/access/reviewer",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Origin: "http://localhost:3000",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ code }),
            }
          );
          if (!response.ok)
            throw Error("Local reviewer invitation could not be redeemed.");
          reviewerCookie =
            response.headers
              .getSetCookie()
              .find((c) => c.startsWith("interviewmate-reviewer="))
              ?.split(";")[0]
              .split("=")
              .slice(1)
              .join("=") || null;
          return reviewerCookie;
        },
      });
    },
    supportFile: false,
  },
});
