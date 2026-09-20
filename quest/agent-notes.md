# Agent notes — Commit H

Starting revision: `3acb9fe` (branch `quest/trust-and-change`, base `50fa2dc`). Commit H contains the resolver module, the resolver contract tests, the route harness and this file. **Zero edits to the three routes or any other existing file.**

## Who did what

- **Codex gpt-6-astra** wrote `src/lib/ai/provider-resolution.ts`, `src/lib/ai/__tests__/provider-resolution.test.ts`, `src/app/api/__tests__/evaluation-routes.test.ts` and the attempt-1 report below, then stopped under the directive's rule ("if any `preserved` case fails at H, stop") after 701 `preserved` failures.
- **Claude Opus 5** diagnosed the failures (one line: `evaluation-routes.test.ts:425`), applied the correction described next, re-ran every check, and wrote this section. No expectation, tag, or policy row was changed.
- **Human (Iqbal)** has not yet approved the contract table (directive Part 7 gate); route wiring (Part 4.2) is not started.

## Correction to AI output (candidate for directive Appendix B.5)

- **What was wrong:** the harness compared response bodies with `toStrictEqual` on the result of `response.json()`. Under Jest, `NextRequest`/`Response` bodies are parsed by Node's `undici` in the Node realm, so the resulting objects carry a different `Object.prototype` than objects literal in the test file. `toStrictEqual` checks constructors and fails with `Received: serializes to the same string`. Every one of the 701 `preserved` failures was this; the `observable` check (`:466`) — the one that actually encodes policy — had already passed in each of them.
- **Fix:** `const body = JSON.parse(await response.text());` (parse in the test realm). One line, with a comment.
- **Risk had it shipped:** none to production (test-only), but a real one to verification integrity — a harness that fails everything cannot distinguish a wrong policy table from a wrong assertion, so the baseline number would have been meaningless and the stop rule would have blocked the change indefinitely. Codex's own report suspected exactly this cause and, correctly, did not patch it.

## Baseline at H (measured)

| Command | Result |
|---|---|
| `node node_modules/jest/bin/jest.js src/lib/ai/__tests__/provider-resolution.test.ts` | PASS — 214 tests |
| `node node_modules/jest/bin/jest.js src/app/api/__tests__/evaluation-routes.test.ts --json --outputFile=harness-H.json` | 735 total: **703 `preserved` passed, 0 failed; 7 `fix-1` failed; 25 `fix-2` failed** (3.77 s) |
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0 |
| `node node_modules/eslint/bin/eslint.js <the three new files>` | exit 0 |
| `node node_modules/jest/bin/jest.js --ci` (whole repo) | 27 suites: 26 passed, 1 failed (the harness, by design at H); 1140 tests: 1108 passed, 32 failed — the 25 original suites / 191 tests all pass |

Tally by tag was computed from the `--json` output: `{('preserved','passed'): 703, ('fix-1','failed'): 7, ('fix-2','failed'): 25}`. Reproduction: `git checkout <H> && node node_modules/jest/bin/jest.js src/app/api/__tests__/evaluation-routes.test.ts --json | jq .numFailedTests` → `32`.

(`npx` was not usable from this shell on Windows — `'C:\Program' is not recognized` — so commands invoke the binaries under `node_modules` directly; `npx.cmd` also works from PowerShell.)

## Failing cases at H — exactly the fix-tagged set (32)

- `fix-1: scheduled | requested=gemini | env=openai only | fallback=false`
- `fix-1: scheduled | requested=deepseek | env=openai only | fallback=false`
- `fix-1: scheduled | requested=openai | env=gemini only | fallback=false`
- `fix-1: scheduled | requested=deepseek | env=gemini only | fallback=false`
- `fix-2: demo | requested=openai | env=all padded | grant=false | fallback=false`
- `fix-2: demo | requested=openai | env=all padded | grant=true | fallback=false`
- `fix-2: demo | requested=openai | env=all padded | grant=false | fallback=true`
- `fix-2: demo | requested=openai | env=all padded | grant=true | fallback=true`
- `fix-2: demo | requested=gemini | env=all padded | grant=false | fallback=false`
- `fix-2: demo | requested=gemini | env=all padded | grant=true | fallback=false`
- `fix-2: demo | requested=gemini | env=all padded | grant=false | fallback=true`
- `fix-2: demo | requested=gemini | env=all padded | grant=true | fallback=true`
- `fix-2: demo | requested=deepseek | env=all padded | grant=false | fallback=false`
- `fix-2: demo | requested=deepseek | env=all padded | grant=true | fallback=false`
- `fix-2: demo | requested=deepseek | env=all padded | grant=false | fallback=true`
- `fix-2: demo | requested=deepseek | env=all padded | grant=true | fallback=true`
- `fix-2: demo | requested=openai | env=one whitespace-only | grant=true | fallback=false`
- `fix-2: demo | requested=openai | env=one whitespace-only | grant=false | fallback=true`
- `fix-2: demo | requested=openai | env=one whitespace-only | grant=true | fallback=true`
- `fix-1: scheduled | requested=gemini | env=one whitespace-only | fallback=false`
- `fix-2: demo | requested=gemini | env=one whitespace-only | grant=false | fallback=false`
- `fix-2: demo | requested=gemini | env=one whitespace-only | grant=true | fallback=false`
- `fix-2: demo | requested=gemini | env=one whitespace-only | grant=false | fallback=true`
- `fix-2: demo | requested=gemini | env=one whitespace-only | grant=true | fallback=true`
- `fix-2: demo | requested=deepseek | env=one whitespace-only | grant=true | fallback=false`
- `fix-2: demo | requested=deepseek | env=one whitespace-only | grant=false | fallback=true`
- `fix-2: demo | requested=deepseek | env=one whitespace-only | grant=true | fallback=true`
- `fix-1: scheduled | requested=gemini | env=one empty-string | fallback=false`
- `fix-2: demo | requested=gemini | env=one empty-string | grant=false | fallback=false`
- `fix-2: demo | requested=gemini | env=one empty-string | grant=false | fallback=true`
- `fix-1: scheduled refuses when fallback disabled and provider unconfigured`
- `fix-2: demo trims server keys`

## Attempts (5.4) and accounting order (5.5) at H — verified

The six attempt cases and four accounting-order cases are `preserved`-tagged and pass at H, so the sequences Codex listed in attempt 1 ("Attempts and accounting", below) are now **measured**, not scripted: evaluate caller → `gemini, deepseek` (2); evaluate hostedAdmin → `gemini, deepseek` (2); evaluate no key/not admin → `deepseek` (1); scheduled → `deepseek, openai, gemini` (3); demo grant → `openai` (1); demo no grant → `openai` (1). Demo accounting order on every path: `ownedLease → claimEvaluation → consumeReviewer (grant only) → assessEvidence → saveEvaluation`. The same cases must pass unchanged after wiring.

## Open for human review (Part 7 gate)

The contract table in `src/lib/ai/__tests__/provider-resolution.test.ts` (214 rows over the five policy literals) and the harness case list (735) are the policy. Approve or dispute before any route edit.

---

# Attempt 1 — Codex gpt-6-astra, stopped before commit (verbatim)

Starting revision: `3acb9fefe3b6d26d1d64df20b870a4871c266066`, branch `quest/trust-and-change`.
No commit H was created. The user's explicit stop rule was triggered by preserved-case failures on the first route-harness run. No expectations or code were changed after that run.

## Scope and policy confirmation

- Read `quest/directive.md` v3.1 fully, then `quest/intent.md`, before implementation.
- Compared every Part 2 policy row with the three actual route files, and checked the catalog, assessment implementation, and demo availability gate. No policy-table disagreement was found before writing code. The routes are also unchanged between `50fa2dc` and the starting revision.
- Created only the resolver, its contract tests, the route harness, and this report. No pre-existing file or route was edited; no dependencies were added. Existing untracked `.claude/`, `dev-server.err.log`, and `dev-server.out.log` were left alone.
- Worked as a single agent, with no delegation.
- The latest user instruction explicitly authorized the H harness before the later human approval of route wiring. No Part 4.2 wiring was implemented.

## Assumptions and case list

- The whitespace-only and empty-string fixtures place the exceptional value in Gemini, with OpenAI and DeepSeek configured. This exercises reachable demo paths beyond the OpenAI availability gate. The `none` and `gemini only` fixtures exercise the demo 503 gate itself.
- Missing env variables are deleted rather than assigned `undefined`; env is restored after every harness test.
- The malformed browser-header error uses the local runtime's actual `JSON.parse` error message, since that native message is forwarded by the route and varies between Node versions.
- The mocked availability gate reproduces the requested OpenAI-key check. Production storage availability and actual authentication, Firestore, accounting persistence, provider networking, and cookie internals were not integration-tested.
- All listed module mocks use `jest.requireActual` for other exports. Assessment normally returns a fixed result; the no-evidence and attempt cases call the real assessment through the recording mock, with provider evaluation mocked. Fetch is blocked in the harness.
- Resolver: 210 table rows over the five policy literals, three providers and seven env fixtures, expanded over optional fallback flags and caller keys; four additional caller-purity/raw-key and precedence cases. Total: 214.
- Harness matrix: 588 evaluate rows, 42 scheduled rows, 84 demo rows. Evaluate crosses key source, admin status, fallback flag and present/absent/malformed browser fallback headers. Header aliases are limited to OpenAI as directed. All expected results describe intended post-change behavior.
- Harness extras: two named fixes, four default/header-absence cases, two header precedence/provider restriction cases, three no-evidence cases, six attempts cases (one for each Part 2 path), four demo accounting-order cases. Total: 735.
- Tags are intended to distinguish 703 preserved cases, seven fix-1 cases, and 25 fix-2 cases. The first run did not meet the baseline acceptance condition.

## Validation results

| Command | Result |
|---|---|
| `npx.cmd jest src/lib/ai/__tests__/provider-resolution.test.ts` | PASS: 1 suite, 214 tests; reported Jest time 2.786 s |
| `npx.cmd jest src/app/api/__tests__/evaluation-routes.test.ts --json` (redirection below) | FAIL: 735 total, 733 failed, 2 passed; 1 failed suite |
| `npx.cmd tsc --noEmit --incremental false` | PASS, exit 0 |
| `npx.cmd eslint src/lib/ai/provider-resolution.ts src/lib/ai/__tests__/provider-resolution.test.ts src/app/api/__tests__/evaluation-routes.test.ts` | PASS, exit 0 |

Measured `numFailedTests = 733`: 701 preserved, seven fix-1, 25 fix-2. This is a failed pre-H validation attempt, **not an accepted baseline at H**.

The first failing preserved case is:

`preserved: evaluate | requested=openai | env=none | key=x-ai-key | admin=false | fallback=false | browser=present`

All 701 preserved failures occurred at strict JSON response-body comparisons, after the normalized resolution check where one was present. The failure locations are: line 500 (470 evaluate success bodies), line 468 (150 error bodies), line 512 (31 scheduled success bodies), line 526 (41 demo success bodies), line 681 (three deterministic evaluation bodies), line 794 (six attempt error bodies). The 32 fix-tagged cases failed at line 466, the normalized observable comparison.

For example, the no-evidence and attempt-body comparisons report `Received: serializes to the same string`. The first evaluate body also prints the same content with the expected timestamp matcher. This suggests a strict-comparison/prototype issue across the response JSON and Jest contexts; that explanation was not verified and is not evidence of a Part 2 policy mismatch. Per the explicit stop rule, no repair or expectation change was attempted.

The only passing harness cases were:

- `preserved: evaluate ignores non-true fallback header and gives x-ai-key precedence`
- `preserved: evaluate ignores x-openai-key for non-openai providers`

## Attempts and accounting

Actual attempts per path and actual accounting order are **not verified**: the tests stopped at earlier response-body assertions before reaching their sequence assertions. The report must not present the scripted expectations as measurements.

The written attempt expectations, awaiting verification, are:

| Path | Expected sequence | Expected count |
|---|---|---|
| evaluate caller | gemini, deepseek | 2 |
| evaluate hostedAdmin | gemini, deepseek | 2 |
| evaluate no caller key, not admin | deepseek | 1 |
| scheduled | deepseek, openai, gemini | 3 |
| demo grant | openai | 1 |
| demo no grant | openai | 1 |

The written successful demo accounting expectation, for both fallback flags, is `ownedLease -> claimEvaluation -> consumeReviewer (grant only) -> assessEvidence -> saveEvaluation`. Failed provider-attempt cases expect the same prefix without saving. These remain unverified.

## Exact validation and formatting commands

PowerShell refused the first `npx` invocation because `npx.ps1` is blocked by its execution policy. The `.cmd` launcher was used subsequently; no execution-policy setting was changed.

```powershell
npx prettier --write src/lib/ai/provider-resolution.ts src/lib/ai/__tests__/provider-resolution.test.ts src/app/api/__tests__/evaluation-routes.test.ts
npx.cmd prettier --write src/lib/ai/provider-resolution.ts src/lib/ai/__tests__/provider-resolution.test.ts src/app/api/__tests__/evaluation-routes.test.ts
npx.cmd jest src/lib/ai/__tests__/provider-resolution.test.ts
npx.cmd tsc --noEmit --incremental false
npx.cmd eslint src/lib/ai/provider-resolution.ts src/lib/ai/__tests__/provider-resolution.test.ts src/app/api/__tests__/evaluation-routes.test.ts
```

The exact baseline invocation and result extraction were:

```powershell
$report = Join-Path ([System.IO.Path]::GetTempPath()) 'quest-H-evaluation-routes.json'; $log = Join-Path ([System.IO.Path]::GetTempPath()) 'quest-H-evaluation-routes.log'; npx.cmd jest src/app/api/__tests__/evaluation-routes.test.ts --json 1> $report 2> $log; $runExit = $LASTEXITCODE; if ((Get-Item -LiteralPath $report).Length -gt 0) { $result = Get-Content -LiteralPath $report -Raw | ConvertFrom-Json; $cases = @($result.testResults | ForEach-Object { $_.assertionResults }); [pscustomobject]@{ numFailedTests = $result.numFailedTests; numPassedTests = $result.numPassedTests; numTotalTests = $result.numTotalTests; numFailedTestSuites = $result.numFailedTestSuites; preservedFailed = @($cases | Where-Object { $_.status -eq 'failed' -and $_.fullName -like 'preserved:*' }).Count; failingCaseNames = @($cases | Where-Object status -eq 'failed' | ForEach-Object fullName); suiteMessages = @($result.testResults | Where-Object { $_.assertionResults.Count -eq 0 } | ForEach-Object message) } | ConvertTo-Json -Depth 6 } else { Get-Content -LiteralPath $log -Tail 80 }; exit $runExit
```

Read-only scope/revision checks included `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git diff 50fa2dc HEAD -- src/app/api/evaluate/route.ts src/app/api/evaluate/scheduled/route.ts src/app/api/demo/evaluate/route.ts`, `git diff --stat`, and `git diff --name-only HEAD`. All tracked-file diffs were empty.

Not run after the stop: `npm test`, full repository lint, `--runInBand` reproduction, further baseline runs, or commit. Consequently, the pre-existing 25 suites / 191 tests were not reconfirmed in this session. After-wiring measurements and human approval are outside this H-only attempt.

## Complete failing case names (attempt 1)

Superseded — see the corrected list above. The 733 names from attempt 1 were the 703 `preserved` cases (harness bug) plus the 32 fix cases listed above.
