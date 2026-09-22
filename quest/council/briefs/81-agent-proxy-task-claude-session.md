# Agent-proxy handoff probe — prompt for a fresh Claude session (identical for BEFORE and AFTER)

Paste verbatim into a new Claude session whose working folder is the worktree. Same model and effort for both runs. Record start/end wall time from your own clock.

---

You are running an independent repository evaluation. Inspect the repository in your current working directory and complete the task below autonomously. Treat the working directory as the whole world: do not read or modify anything outside it, do not run git commands that write (no add, commit, checkout, stash, reset), do not install packages. Run tools via the binaries under node_modules (for example `node node_modules/jest/bin/jest.js <path>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <file>`); `npx` may not resolve here.

Task
The API route POST /api/demo/evaluate evaluates an interview transcript with an AI provider. A request names a provider (openai, gemini or deepseek) and may set allowFallback. Server-side provider keys come from environment variables. A request made without a reviewer grant is the "no-grant" path.

Change the no-grant behaviour so that when the requested provider has no configured server key:
- if allowFallback is true, use the first configured provider as the primary provider (the grant path already behaves this way);
- if allowFallback is false, behaviour is unchanged: the requested provider stays the primary provider.
When the requested provider is configured, nothing changes.

Implement the change across the relevant code paths and update anything derived from the implementation that must stay consistent with it. Do not ask for hints; determine the relevant files and the expected scope yourself from the repository.

Done means you can show both of these hold, and can say how you showed them:
(a) no grant, allowFallback true, only OPENAI_API_KEY set (non-empty), requested gemini: the call to assessEvidence receives provider "openai" with the OpenAI key, and claimEvaluation is called with "openai".
(b) with allowFallback false, or with requested openai, the values passed to assessEvidence and claimEvaluation are unchanged from before your edit.

Requirements
- Inspect the repository before making changes.
- Modify only files required to complete the task.
- Preserve existing behaviour outside this requirement.
- Run the appropriate tests and checks: the whole test suite, the type-check, and lint on the files you changed.
- Clean up any temporary files or test artefacts you create.
- Do not create a separate evaluation or report file in the repository.
- Do not commit; leave your edits in the working tree.

Final report
When finished, report:
1. Files inspected
2. Files changed
3. What you changed and why
4. How you showed (a) and (b), exactly, and your confidence
5. Tests and checks run, with results (if tests cover this route, how many cases changed expectation and the final tally)
6. Any unexpected findings or uncertainty, and anything in the repository that made this easier or harder
7. Your estimate of time taken and number of tool calls
8. Final `git diff --stat`
9. Whether you consider the task complete
