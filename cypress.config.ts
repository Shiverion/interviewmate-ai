import { defineConfig } from "cypress";
import { readFileSync } from "node:fs";
let reviewerCookie: string | null = null;

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
          const response = await fetch(
            "http://localhost:3000/api/access/reviewer",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Origin: "http://localhost:3000",
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
