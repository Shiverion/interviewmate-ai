# Local development

[Documentation home](../README.md) · [Product overview](overview.md) · [Phase 3 tracker](../hr-product-sprint/phases/03-prototype-build.md)

Updated: 2026-09-08. The [review-brief runbook](../hr-product-sprint/implementation/review-brief-runbook.md) owns the verified local synthetic workflow. The inherited live interview/Firebase flow is still unverified.

## Prerequisites and environment

Use Node.js **20.9.0 or newer** and npm, following [package.json](../../package.json). Run commands from the repository root. Use an isolated Firebase project and fictional data for the sprint.

Create `.env.local` locally with the configuration names below. It is ignored by Git; never commit populated credentials.

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
OPENAI_API_KEY=
GITHUB_TOKEN=
```

The Firebase values configure the browser client. `OPENAI_API_KEY` supports server-side AI calls; the existing browser interview/BYOK path also expects key configuration in the app. A server variable alone has not been verified to enable a fresh candidate browser. `GITHUB_TOKEN` is optional for GitHub enrichment. The deterministic ATS checker does not require an OpenAI key.

For the inherited Firebase flow, enable Email/Password and Google authentication in the isolated project. Existing collections include `interview_sessions`, `interview_templates`, `interview_code` and `interview_whiteboard`; resume PDFs use Firebase Storage. Inspect the repository's rules and configuration before using that flow. The sprint review has not verified deployed rules or a complete Firebase round trip.

## Install and start

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [the review workspace](http://127.0.0.1:3000/review-brief) for the sprint prototype. Firebase is optional for this route. `npm ci` uses the committed lockfile; implementation checks used the existing installed dependencies.

Phase 3 pins Turbopack and output tracing to this repository. Default startup now passes. If another environment encounters a bundler problem, this alternative remains available for investigation:

```powershell
npm run dev -- --webpack
```

The Phase 3 verified path uses default Turbopack. This Webpack alternative was not reverified.

## Known verification state

Current Phase 3 checks: 36 Jest tests pass; application/Cypress TypeScript and scoped new-feature lint pass; the production build passes with inherited optional canvas/PDF warnings. The local review page works with Firebase API key blank. Production page/API return 404. Seven browser tests pass with authored/mocked data. The actual provider attempt failed with AI_UNAVAILABLE; successful live generation remains pending. See the [Phase 3 verification record](../hr-product-sprint/phases/03-prototype-build.md#verification-record) for boundaries and the [runbook](../hr-product-sprint/implementation/review-brief-runbook.md) for commands.

Historical observations below were recorded on 2026-09-07 and are retained for context. Phase 3 resolves the startup root, duplicate test discovery and matcher-type issues. Full legacy lint and the inherited interview flow remain outside the completed checks.

| Check | Observed state | Follow-up |
|---|---|---|
| Isolated scoring unit tests | Four tests passed | Confirms those arithmetic examples only |
| Default Jest discovery | Also scanned a nested `.claude/` worktree | Isolate discovery when reporting test counts |
| TypeScript | Failed with Jest/Cypress matcher typing conflict | Resolve test typing in Phase 3 |
| Lint | Failed, including hooks/typing findings and nested-worktree files | Separate actual product findings from duplicate discovery |
| Default dev startup | Inferred a parent root and encountered Tailwind resolution errors | Verify root/configuration and startup in Phase 3 |
| Live voice, fresh candidate entry and Firebase persistence | Complete flow not verified | Keep saved synthetic transcript input as the core sprint path |
| Production deployment | Not verified in this sprint | Produce a verified runbook before claiming readiness |

To reproduce the isolated arithmetic check:

```powershell
npx jest --runInBand --runTestsByPath __tests__/scoring.test.ts --modulePathIgnorePatterns '<rootDir>/.claude/'
```

The manifest also provides `npm run build`, `npm start`, `npm run lint`, `npm test` and `npm run e2e`. These command names do not imply the checks pass. Record fixes, commands, actual results and demo prerequisites in the [Phase 3 report](../hr-product-sprint/phases/03-prototype-build.md).

## Documentation and source checks

```powershell
node docs/scripts/check-docs.cjs
node docs/hr-product-sprint/scripts/audit-current-product.cjs
```

The first checks local documentation links. The second inventories three source files without executing the app; it needs installed TypeScript and writes ignored scratch output. Read the [baseline report](../hr-product-sprint/evaluation/current-product-baseline.md) before interpreting its counts.
