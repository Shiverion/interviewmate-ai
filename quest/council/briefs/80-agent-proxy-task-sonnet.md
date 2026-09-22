# Task for a fresh engineer

You are an engineer who has never seen this repository. It is a Next.js app. Work ONLY inside the working directory you are given; do not read or modify anything outside it; do not run git commands that write (no add/commit/checkout/stash); do not install anything. You may read any file in the directory, run tests, type-check and lint with the binaries under `node_modules` (e.g. `node node_modules/jest/bin/jest.js <path>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <file>`). `npx` may not work; call the binaries directly.

## The change to make

The API route `POST /api/demo/evaluate` (file `src/app/api/demo/evaluate/route.ts`) evaluates an interview transcript with an AI provider. A request names a provider (`openai`, `gemini` or `deepseek`) and may set `allowFallback: true`. Server-side provider keys come from environment variables. A request made **without a reviewer grant** is the "no-grant" path.

**Change:** on the no-grant path, when `allowFallback` is `true` and the requested provider has **no configured server key**, the route must use the **first configured provider** as the primary provider (the way the grant path already does) instead of proceeding with the requested provider and an undefined key. When `allowFallback` is `false`, or when the requested provider is configured, behaviour must not change.

## Done means

You can show both of these hold, and you can say how you showed them:

(a) no grant, `allowFallback: true`, only `OPENAI_API_KEY` set (non-empty), requested `gemini` → the call to `assessEvidence` receives provider `"openai"` with the OpenAI key, and `claimEvaluation` is called with `"openai"`.

(b) with `allowFallback: false`, or with requested `openai`, the values passed to `assessEvidence` and `claimEvaluation` are unchanged from before your edit.

Also: the whole test suite still passes (`node node_modules/jest/bin/jest.js --ci`), `tsc --noEmit` is clean, and eslint is clean on the files you changed. If the repository has tests that cover this route, they must pass with your change; update only the expectations that your change legitimately alters, and say which.

## Report (this is what you hand back)

1. Files you changed, with a one-line summary of each edit.
2. How you showed (a) and (b), exactly (test run output, a script, reading — whatever you actually did), and how confident you are.
3. If tests exist for this route: how many cases changed expectation and the final pass/fail tally.
4. What you had to look up or figure out that was not obvious, and anything in the repository that made this easier or harder.
5. Your own estimate of how long the task took you, and the number of tool calls you made.

Do not commit. Leave your edits in the working tree.
