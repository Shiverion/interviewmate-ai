# Production release validation — 2026-09-11

[Progress tracker](../../../README.md) · [Product specification](../../../../Product_Sprint.md) · [Current runbook](../../implementation/current-runbook.md)

Status: **Prototype release accepted for portfolio demonstration.** The working prototype is deployed and the automated release checks pass. This record does not claim hiring validity, statistical model accuracy or independent recruiter validation.

## Release identity

| Item | Recorded value |
|---|---|
| Repository branch | `main` |
| Release commit | `fea1d2e` |
| Production URL | `https://interviewmate-ai.shiverion.com` |
| Vercel production deployment | `virtual-ai-interviewer-assistant-aw2w1hcgx.vercel.app` |
| Firebase project | `interviewmate-9bdd4` |
| Server-side production storage | Firestore Admin SDK ledger for hosted demo/reviewer usage and records |
| Production secrets | `OPENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `DEMO_COOKIE_SECRET`, and `NEXT_PUBLIC_APP_URL` configured in Vercel Production; values are intentionally absent from this repository |

## Automated validation

| Check | Result |
|---|---|
| Jest | **191 tests passed across 25 suites** with `npm test -- --runInBand` |
| TypeScript | `npx tsc --noEmit` passed |
| Production build | `npm run build` passed |
| GitHub CI | [Run 34555169845](https://github.com/Shiverion/interviewmate-ai/actions/runs/34555169845) passed on Node 24 with `actions/checkout@v5` and `actions/setup-node@v5` |
| Firebase rules/indexes/storage deployment | Deployed to `interviewmate-9bdd4`; ownership and candidate-isolation rules remain enforced |

## Production smoke checks

- `GET /api/demo/voice` returned `200`, `available: true`, five browser starts per UTC day and a shared host cap of 20 starts.
- `GET /api/ai/config` returned `200`; the server reported the OpenAI evaluator as configured with `gpt-5.6-luna`. Gemini and DeepSeek remain optional and unconfigured in the hosted environment.
- `/`, `/login`, `/demo` and the API routes returned successfully over HTTPS.
- A hosted demo start completed successfully and persisted usage through the Firestore ledger. No local `/var/task/.demo-state` write was required.
- The reviewer invitation path was updated to use the same Firestore ledger and the configured server cookie secret; the former Vercel `ENOENT: /var/task/.demo-state` failure is fixed in commit `e36010f` and included in this release.

## Product-owner acceptance notes

The owner walkthrough exercised the recruiter workspace, role setup, batch CV parsing and ATS ranking, candidate selection, invitation links, voice + text interview, editable transcript sending, evidence evaluation, reviewer-only access, feedback capture, recovery/guardrail behavior and scoped dashboards. Follow-up fixes from that walkthrough are represented in the current source and are covered by the automated suite above.

These observations are a single-builder acceptance pass. They are useful for a prototype demo, but they are not an independent usability study, model benchmark or proof that browser signals detect cheating.

## Remaining submission work

1. Record and publish the approximately five-minute demo video using the [demo script](../../../../deliverables/demo-script.md).
2. Regenerate the PDF case study if the recording adds new screenshots or measured observations.
3. Keep English as the baseline and report Bahasa Indonesia as a separate multilingual extension.
4. For a production hiring deployment, add server-authoritative interview admission/configuration, retention/deletion controls, accessibility accommodations, independent scoring calibration and a formal privacy/legal review.
