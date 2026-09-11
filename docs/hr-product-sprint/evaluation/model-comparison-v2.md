# Controlled model comparison (deferred follow-up)

Updated: 2026-09-11. This is an optional controlled study, not a release blocker or a claim that one model is best. The shipped defaults and smoke evidence are in the [production release record](results/2026-09-11-production-release.md). [Frozen baseline](model-baseline-29e40ba.json) · [Dataset](dataset/README.md) · [Current setup](../implementation/current-runbook.md).

## Preserve two experiments

**Model-only experiment:** retain the original Review Brief prompt, contract, role and eight English cases plus authored variants. The freeze file and baseline manifest record hashes. Use three repeats of every base input (24 runs/model), plus the frozen counterfactual variants. Compare the same exact input/prompt/configuration; change only the model/provider adapter and record that unavoidable adapter difference. Do not compare a new competency-v2 score to an old percentage and attribute the change to a model.

**Product-logic experiment:** evaluate `competency-evidence-v2` separately using no-answer, filler, skipped, partial-coverage, contradiction, unsupported-quote and prompt-injection cases. Add identical-evidence pairs with different employer/university/title labels inside transcripts, not only outside the model input. The automated aggregation test removes irrelevant profile metadata and verifies deterministic equivalence; it does not establish that a live model ignores prestige mentioned in speech. Freeze the new cases and independently authored expected levels before model tuning.

## Model matrix and execution

Keep the shipped product defaults for the baseline: realtime `gpt-realtime-2.1-mini`, transcription `gpt-transcribe`, and evaluator `gpt-5.6-luna`. Optional comparison adapters are `gemini-3.5-flash-lite`, `deepseek-flash`, `gemini-3.1-flash-live-preview`, and `gpt-live-transcribe`. The older Review Brief experiment may use a different OpenAI model; use its recorded `MODEL` and frozen configuration, not this product list.

Candidate fast/cost experiments include Gemini 3.1 Flash-Lite alongside the current Gemini baseline, and an account-available small OpenAI realtime model. Model names are experiment candidates, not recommendations or measured winners. Validate current availability in the provider account before each run. [Gemini 3.1 Flash-Lite documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [OpenAI Realtime reference](https://platform.openai.com/docs/api-reference/realtime).

Use separate server runs with `BENCHMARK_OPENAI_MODEL`, `BENCHMARK_GEMINI_MODEL` or `BENCHMARK_DEEPSEEK_MODEL` to select each historical benchmark candidate. Restart between configurations, then verify the sandbox displays the intended model and configuration hash. Use the same frozen reference hashes and export each run. Product evaluator overrides use the separate `EVALUATION_OPENAI_MODEL`, `EVALUATION_GEMINI_MODEL`, `EVALUATION_DEEPSEEK_MODEL` variables; never silently change them during the model-only study. Do not use fallback in a scored model comparison: fallback outputs belong to the model that actually produced them.

## Measures and proposed gates

| Track | Record per case/session | Proposed acceptance gate, not a measured result |
|---|---|---|
| Realtime | First-audio latency, end-of-answer to audio p50/p95, filler false-advances, interruption success, disconnects, retries, cost | No filler-only advancement or budget overrun in the scripted cases; reviewer rates turn-taking acceptable. |
| Transcription | Identical consented/synthetic recordings, human reference, WER/CER, key technical-term errors, latency, cost, language | Report EN and ID separately; inspect meaning-changing errors rather than promoting on aggregate WER alone. |
| Evaluation | Schema-valid/attempted, grounded quotes/quotes, repeat level agreement, human level agreement, citation errors, abstention, latency, token usage/cost | No ungrounded accepted quotes, exact no-answer abstention, no unexplained counterfactual differences; independent review before production. |
| Manual vs assisted | Correct completed brief, active review minutes, corrections, uncertainty capture | Measure within comparable tasks; report a small pilot as a pilot with sample size and learning effects. |

Repeat failures count in availability denominators; unavailable results are not zero competency or human disagreement. Preserve requested/actual models, prompt/rubric/data hashes, provider errors, time, token usage if returned and price date. Existing benchmark exports do not provide complete billing telemetry; provider usage records and a manual cost ledger are still required.

No model is promoted until quality gates pass and latency/cost tradeoffs are measured. If only one reviewer is available, label every judgment self-review. A second person can review a subset of English cases later; do not manufacture inter-rater reliability. Bahasa Indonesia remains a multilingual extension. Public data, if later used, requires a license and provenance check; public availability does not imply permission to train on personal information.
