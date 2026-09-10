> Historical design before the September 10 evidence revision. Retained for baseline provenance; follow [current progress](../../../../README.md).

# Reviewer voice demo, model access and redesigned workspace

Updated: 2026-09-09. Implementation complete; real voice/provider acceptance remains blocked by credentials.

[Sprint index](../../../../hr-product-sprint/README.md) · [Phase 3](../../../../hr-product-sprint/phases/03-prototype-build.md) · [Session validation](../../../../hr-product-sprint/evaluation/session-control-validation.md)

## What changed

Signed-in users can open the dashboard without an AI key. `/setup` redirects to `/dashboard`. Personal live interview starts require an OpenAI key, with an explanation and links to Settings or the free demo. Scheduling and browsing are available before key entry.

The landing page, sign-in, dashboard, interview list, settings, candidate header and interviewer presence have a shared green/neutral design, Geist typography, responsive layouts and reduced-motion support. Shared styles also update inherited reports, forms and interview controls. This does not imply that every inherited screen has been independently validated.

Settings → **Models & access** stores separate OpenAI, Gemini and DeepSeek keys and selects the evaluation provider. Automatic and manual interview evaluations use that selection. Voice still uses OpenAI Realtime with Whisper transcription. This is not three interchangeable live voice providers and no automatic fallback is enabled. The development-only benchmark remains a separate controlled comparison workflow.

Browser keys use the existing obfuscated local storage mechanism; it is not encrypted secret storage. Removing personal keys leaves the workspace accessible. The former global database/resume deletion controls are no longer exposed in the general settings screen; no stored data was deleted. Any replacement administration screen needs explicit authorization and scoped deletion.

## Set up locally

1. In the project’s ignored `.env.local`, replace `OPENAI_API_KEY` with a working OpenAI API key that can access Realtime and evaluation. Keep credentials out of commits, chat, screenshots and recordings.
2. Optionally add `GOOGLE_GENERATIVE_AI_API_KEY` and `DEEPSEEK_API_KEY` to enable those providers in the **free demo** selector. Personal keys in Settings support personal evaluations; they do not fund the public demo.
3. Restart the development server with `npm run dev` and open [Reviewer demo](http://localhost:3000/demo). Continue using `localhost` for Firebase sign-in.
4. Confirm the allowance appears, select English and an evaluation provider, and accept the fictional-data notice. Start the free demo, acknowledge the room rules, start the interview and allow your microphone. No reviewer account or personal key is needed for this path.
5. Speak a few fictional answers, complete the interview, then inspect transcript and evaluation. Repeat in Indonesian as the multilingual check. Record errors and missing evidence, not only successful scores.

Inspection on 2026-09-09: the existing OpenAI server key returned **HTTP 401** from the read-only models endpoint. Gemini and DeepSeek server keys were absent. No successful real voice conversation, transcription or new evaluation was established. A configured indicator means key presence, not verified billing or model access. No environment values were modified during this implementation.

Defaults can be changed through `DEMO_VOICE_MODEL`, `EVALUATION_OPENAI_MODEL`, `EVALUATION_GEMINI_MODEL` and `EVALUATION_DEEPSEEK_MODEL`. Current defaults are `gpt-realtime`, `gpt-4o`, `gemini-2.5-flash`, and `deepseek-v4-flash`; these are adapter defaults, not measured rankings. See the [DeepSeek model documentation](https://api-docs.deepseek.com/quick_start/pricing).

## Reviewer allowance and enforcement

| Control | Current behavior |
|---|---|
| Daily allowance | 5 reservations per signed browser cookie per UTC day |
| Shared host allowance | 20 reservations across all visitors per UTC day |
| Duration | 8 wall-clock minutes from reservation, including pauses and reconnects |
| Connections | At most 8 connection attempts within one reservation |
| Questions | Prompt target of up to 8; not a deterministic answer-count cap |
| Evaluations | At most one attempt per provider per reservation, within one hour after expiry |
| Failed connection | Retry in the same room; the reservation is not refunded |
| Personal interviews | Use the user’s key; do not consume the hosted reviewer allowance |

The normal interview’s active-time clock pauses on interruption. The **free funding window** continues and is separately labelled. Integrity termination still prevents an automatic candidate evaluation; reaching the normal free-window end permits review of the collected transcript.

```mermaid
sequenceDiagram
  participant B as Reviewer browser
  participant S as Persistent Node server
  participant L as Disk usage ledger
  participant O as OpenAI Realtime
  B->>S: Read allowance; receive signed HttpOnly cookie
  B->>S: Reserve demo
  S->>L: Atomically count daily allowance and save expiry
  B->>S: Exchange microphone WebRTC offer
  S->>O: Create call with host credential
  O-->>S: SDP answer and call identifier
  S->>L: Save call identifier
  S-->>B: SDP answer, session ID and expiry
  B->>O: Live microphone connection
  S->>O: Hang up on close or expiry
```

The server never returns its key or an ephemeral model token to the browser. Paid POST/DELETE routes check same-origin requests, signed-cookie ownership, size limits and reservations. Legacy personal token/evaluation endpoints no longer fall back to the host OpenAI key, which would bypass the free limits. No automatic fallback sends a transcript to another provider.

## Public hosting requirements

Use one always-running Node deployment with a persistent disk, HTTPS, and:

- `DEMO_RUNTIME=persistent-node`
- `DEMO_STATE_DIR` pointing to a writable persistent directory outside public/static files
- `DEMO_COOKIE_SECRET` containing at least 32 random characters, kept stable across restarts
- Required server provider credentials

Run `npm run build`, then `npm start`. Protect the state directory using the host’s file permissions. Development defaults to the ignored `.demo-state` directory and a process-local cookie secret; configure a stable secret if testing server restarts.

**Vercel/serverless hosted voice is deliberately unavailable with this implementation.** Its temporary filesystem and sleeping processes cannot enforce the current ledger/reaper design. Supporting it requires shared transactional storage and an independent scheduled call-enforcement worker first. Do not bypass the availability check to publish the free demo.

The reaper checks for expired provider calls every five seconds and retains failed hangups for retry. Server downtime or provider hangup failure can delay termination. Consequently eight minutes is an enforced target during healthy operation, not an absolute billing guarantee. Use provider billing limits/alerts and monitor the running host. Cookie clearing can bypass the per-browser count; the shared daily budget still applies. Multiple independent deployments do not share a budget. These are prototype controls, not production abuse protection.

## Data and review limits

The ledger contains anonymous browser IDs, counts, expiry and provider call IDs, not transcripts. Browser recovery storage contains interview answers. Audio goes to OpenAI and transcript evaluation goes to the selected provider. The demo evaluation route does not write results to Firestore. Provider retention is governed by the host account/provider terms; this implementation makes no zero-retention or compliance claim. No training collection is enabled by this feature.

The live room currently uses the inherited numeric evaluation schema, with provisional scores and human-review copy for demos. These are not the stricter evidence-linked review-brief contract or validated hiring recommendations. English is the baseline; Indonesian is an additional multilingual check. Single-reviewer runs cannot establish population accuracy, fairness or inter-rater agreement.

## Verification and next human checks

Automated coverage includes atomic daily quotas, global quota, ownership, reconnection limits, expiry persistence, failed-hangup retries, evaluation attempt limits, production fail-closed behavior, CSRF/origin rejection, SDP/key separation, three-provider evaluation routing and schema bounds. Browser checks cover consent, language/provider choice, missing-key start blocking and mobile width. Test doubles do not establish provider quality.

After replacing credentials:

1. Complete one English voice demo and save a sanitized result: provider/model, transcript accuracy, evaluation evidence and any error.
2. Repeat with Indonesian; keep results separate from the English baseline.
3. Verify pause, final warning, resume with a changed question, and expiry while on another window. Confirm microphone capture stops; separately confirm the provider call ends in host logs/account usage.
4. Try each configured evaluation provider on comparable fictional answers. Check unsupported claims, score justification and missing evidence. Do not order models by a single score.
5. Sign in without personal keys: dashboard opens; personal voice start is blocked. Add an OpenAI key and complete Part B of the [session validation guide](../../../../hr-product-sprint/evaluation/session-control-validation.md). Scheduled report saving requires the separate Firebase checks.
6. Test one published HTTPS demo from a fresh reviewer browser before sharing the portfolio. Record the demo video only after this passes.

The author must provide/replace credentials and grant microphone access. A second reviewer is useful for independent judgment but is not required to run the software; label solo findings as a pilot. Phase 5’s final case study and recording remain pending live evidence.
