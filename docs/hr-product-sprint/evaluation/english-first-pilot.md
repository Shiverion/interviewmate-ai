# English-first model comparison

[Evaluation home](README.md) · [Phase 4](../phases/04-evaluation-and-iteration.md) · [Governance](data-governance.md)

Updated: 2026-09-08. **Implemented in local development; live comparison and human review pending.**

## Open the workspace

Use [the evaluation page](http://127.0.0.1:3000/review-brief/evaluation), or **Compare evaluation models** on the existing review page. English is the baseline, based on the owner's intended use; a company language requirement has not been independently verified. Indonesian is a separate multilingual pilot.

Three hosted evaluation adapters are implemented: OpenAI, Gemini and DeepSeek. Audio recording, transcription provider switching, local inference, training and automatic fallback are not implemented here. The legacy frozen OpenAI experiment remains unchanged.

## Configure one provider first

The owner supplies private API credentials and any required billing/model access. No account, payment, or credential changes were made by the assistant.

1. Open the existing ignored `.env.local` in your editor. Preserve its other settings.
2. Add the relevant key below privately. Never put credentials in chat, the browser form, or a tracked file.
3. Restart `npm run dev` and reload the page.
4. Run the readiness command. A present key does not prove access.
5. Select only that provider, review C01, and make one smoke attempt. On failure, fix configuration before retrying; keep the failed study export.

```dotenv
# Placeholders only. Supply actual values privately.
OPENAI_API_KEY=your_private_openai_key
GOOGLE_GENERATIVE_AI_API_KEY=your_private_gemini_key
DEEPSEEK_API_KEY=your_private_deepseek_key

# Optional exact model IDs available to your account:
BENCHMARK_OPENAI_MODEL=gpt-4o-2024-08-06
BENCHMARK_GEMINI_MODEL=gemini-2.5-flash
BENCHMARK_DEEPSEEK_MODEL=deepseek-v4-flash
```

The Gemini adapter reads `GOOGLE_GENERATIVE_AI_API_KEY`, not `GEMINI_API_KEY`. Model overrides affect only the new benchmark. Defaults are starting configurations, not measured winners.

```powershell
npm install
npm run dev
# In a second terminal:
node docs/hr-product-sprint/scripts/check-benchmark-setup.cjs
```

Provider setup: [OpenAI API keys](https://platform.openai.com/api-keys), [Gemini API keys](https://aistudio.google.com/apikey), [DeepSeek platform](https://platform.deepseek.com/). A chat subscription does not establish API access.

Inspection found an OpenAI key present, with prior access failures in the [Phase 4 report](../phases/04-evaluation-and-iteration.md). Gemini and DeepSeek keys were absent. Readiness checks print presence and model IDs only; they make no network requests.

## Cases and workload

| Track | Cases | Purpose |
|---|---|---|
| English baseline | C01–C08, unchanged [frozen v1](dataset/README.md) | Core recruiting brief |
| English variants | C01-NAME, C07-FILLER | Separately reported sensitivity checks |
| Indonesian extension | ID-C01, ID-C02, ID-C04 | Paired evidence, vague contribution, and contradictory ownership cases |

[Indonesian adaptations](dataset/id-pilot-v1/adaptations.json) are assistant-authored and require human meaning review. The shared reference rationale stays in English; supporting quotes come from the corresponding Indonesian candidate turns.

Start with C01. A reduced comparison of C01/C02/C04 plus their Indonesian pairs, three providers, one attempt each, is **18 requests**. Three repeats gives **54 requests** for this subset. Label this a development pilot, not completion of the frozen English protocol. All 13 cases with three providers and three repeats would require **117 requests**; nothing runs automatically.

Withheld English cases retain their labels. Their author saw them; they are not independently blinded. If they inform tuning, reclassify them and create new withheld cases. Public speech and personal recordings belong to a later transcription benchmark, not these text-quality denominators.

## What you need to review

### Before generation

1. Enter a reviewer alias, avoiding your full name.
2. Read the source and expand **Provisional reference judgments**.
3. Check each expected status, rationale, and material limitation against the transcript. These are provisional author judgments, not independently established ground truth.
4. For Indonesian, open **Paired English original** and check negation, personal/team ownership, timing, future plans, and contradictions. Embedded technical English is intentional.
5. Check the approval box only if you agree. Otherwise report the case and turn/criterion for revision before testing. Do not edit references after seeing output or rewrite frozen English v1.

Approval records alias, time and reference hash in the study export. The API requires an exact hash and explicit review assertion, but cannot independently prove that review occurred.

### After generation

Provider names are hidden in the shuffled output panel, but are accessible in setup, network traffic and exports. This reduces preference cues; it is not a rigorous independent blind.

Review each criterion's claims, evidence status, uncertainty, and follow-up:

| Judgment | Meaning |
|---|---|
| Acceptable as written | No correction needed against the source and rubric |
| Needs correction | Select at least one issue category |
| Uncertain | Another review is needed; do not force a judgment |
| Not reviewed | Work remains |

Issue categories are unsupported claim, missed uncertainty, wrong status, poor follow-up, and language issue. Exact citation validity does not establish that a claim follows from the quote. Missing evidence is not proof of inability.

Review every valid output before revealing model identities. Failed attempts retain their error; no authored draft substitutes for failure. Reveal locks the study's judgments and generation. Your English need not be perfect: ambiguous language can remain uncertain. An AI checker is not another human reviewer.

## Export and resume

- **Export study** saves original drafts, attempts, provenance, approvals, and judgments.
- **Download reference packet** saves inputs and displayed references. Keep this beside the study for a portable evidence bundle.
- **Import study JSON** works in an empty workspace with the exact same dataset. It validates shape, case/reference provenance, and citations.
- **Export comparison** is available after reveal.
- Reviews are in browser memory, not Firebase or localStorage. Refresh can lose unsaved work; an unload warning is provided.
- Exports are editable research records, not signed or independently certified results. Never present mocked/edited data as live evidence.

A separate later study can support a second reviewer or a shuffled repeat review. This version does not merge inter-reviewer agreement. Re-reviewing your own outputs measures personal consistency, not independent agreement.

## Metrics and ordering

Rows separate model/configuration, language and case kind.

- Attempts / valid / failed: unavailable generations remain attempts, not zero-quality drafts.
- Human-acceptable criteria: acceptable / decided judgments. Unreviewed and uncertain criteria stay outside this denominator and uncertainty is reported.
- Status agreement: matches / four criterion cells per valid draft, against provisional references. This is not hiring accuracy.
- Coverage lists every case and repeat count. Latency/usage are recorded where available; monetary cost and human time savings remain unmeasured.
- Observed rank uses the proportion of human-acceptable criteria only when rows in the same track have identical coverage/repeats, all outputs reviewed, no uncertainty, and zero failures. Ties share rank; otherwise rows remain unranked.
- Rank describes this pilot, not statistical superiority, fairness certification or automatic provider selection.
- Compare Indonesian cases only with their matching English subset, not the entire eight-case English aggregate.

## Engineering map

| Component | Source |
|---|---|
| Page and UI | [page.tsx](../../../src/app/review-brief/evaluation/page.tsx), [EvaluationWorkspace.tsx](../../../src/components/benchmark/EvaluationWorkspace.tsx) |
| Inputs and fingerprints | [dataset.ts](../../../src/lib/benchmark/dataset.ts) |
| Hosted adapters and request settings | [providers.ts](../../../src/lib/benchmark/providers.ts) |
| API guards and run records | [server.ts](../../../src/lib/benchmark/server.ts) |
| Review, import, and comparison rules | [state.ts](../../../src/lib/benchmark/state.ts) |

GET `/api/benchmark` exposes the fictional packet and public configuration/readiness metadata. POST accepts only `caseId`, allowlisted `providerId`, `referenceHash`, and `referenceReviewed: true`. No arbitrary transcripts or provider URLs are accepted. Reference answers and judgments never enter model requests. The page and APIs return 404 outside development; Origin headers must match for browser generation requests.

Each provider gets one request, a 30-second deadline, no hidden retry or repair. OpenAI/Gemini use structured output; DeepSeek uses JSON mode followed by the same schema/citation validator. Malformed, incomplete, or invalidly cited output fails the entire attempt. Unknown browser transport/provenance outcomes stop the remaining batch and remain labelled unknown; inspect local records before retrying.

New records go to ignored `.benchmark-runs/<attemptId>.json`, separate from legacy records. They include fictional input/output and exact experiment metadata. Missing keys fail before provider invocation. Write failures are shown as warnings. Dataset, reference, language, model, prompt, adapter and settings changes receive separate identities.

Provider documentation checked 2026-09-08: [Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash), [DeepSeek JSON mode](https://api-docs.deepseek.com/guides/json_mode/), [DeepSeek models](https://api-docs.deepseek.com/quick_start/pricing/). Alias targets and availability can change.

## Verification commands

```powershell
npx jest --runInBand
npx tsc --noEmit
npx tsc --project cypress/tsconfig.json --noEmit
npx cypress run --spec cypress/e2e/benchmark.cy.ts,cypress/e2e/review-brief.cy.ts --browser electron
node docs/hr-product-sprint/scripts/check-benchmark-setup.cjs
node docs/hr-product-sprint/scripts/check-phase-4.cjs
node docs/hr-product-sprint/scripts/evaluate-phase-4.cjs --check
node docs/scripts/check-docs.cjs
```

Tests use authored mock responses. Their passing results verify software, not AI quality. Actual outcomes are recorded in [Phase 4](../phases/04-evaluation-and-iteration.md).
