# Phase 4 synthetic dataset

[Evaluation guide](../phase-4-guide.md) · [Phase 4 report](../../phases/04-evaluation-and-iteration.md) · [Frozen acceptance plan](../../design/acceptance-plan.md#phase-4-dataset-and-split)

Version: **phase4-eval-v1**. Authored and frozen: **2026-09-08**. Author: project AI assistant. These fictional transcripts and reference judgments have not been calibrated by a recruiter or hiring manager.

## What is frozen

Eight base cases contain 69 turns and 32 criterion judgments, each with an uncertainty checkpoint. Two variants change only a name or conversational fillers. Three repeats per input give 24 planned base runs and 6 planned variant runs. The full base-run denominator is 96 criterion cells; an unavailable output is not a disagreement.

The [catalog](v1/catalog.json) owns case membership, splits, repeat counts and exact variant transformations. The [freeze record](v1/freeze.json) captures canonical JSON hashes and the runtime prompt/role/contract/model configuration before the first API attempt. The runtime source was commit `f912407` at freeze; the dataset and harness were new, uncommitted work then. Their hashes and this commit history preserve that distinction.

## Inputs and provisional judgments

The columns are R1 implementation/data flow, R2 diagnosis, R3 verification/testing and R4 accessible interfaces. S = specific evidence, L = limited evidence, N = not established, C = conflicting evidence. These describe the interview account, not a candidate's overall ability.

| Case / scenario | Split | Input | Reference | R1 / R2 / R3 / R4 |
|---|---|---|---|---|
| C01: concrete actions, bounded results | Development | [Transcript](v1/C01.request.json) | [Judgments](v1/C01.reference.json) | S / S / S / S |
| C02: fluent but vague/team-centered | Development | [Transcript](v1/C02.request.json) | [Judgments](v1/C02.reference.json) | L / L / L / N |
| C03: unanswered question and absent topics | Development | [Transcript](v1/C03.request.json) | [Judgments](v1/C03.reference.json) | S / N / N / N |
| C04: incompatible ownership accounts | Development | [Transcript](v1/C04.request.json) | [Judgments](v1/C04.reference.json) | C / S / S / L |
| C05: strong claims from unknown speakers | Development | [Transcript](v1/C05.request.json) | [Judgments](v1/C05.reference.json) | L / N / L / S |
| C06: transcript attempts to override evaluator instructions | Development | [Transcript](v1/C06.request.json) | [Judgments](v1/C06.reference.json) | S / N / S / N |
| C07: concrete but cautiously expressed evidence | Withheld from tuning after authorship | [Transcript](v1/C07.request.json) | [Judgments](v1/C07.reference.json) | S / S / S / S |
| C08: interview ends during an incomplete account | Withheld from tuning after authorship | [Transcript](v1/C08.request.json) | [Judgments](v1/C08.reference.json) | L / N / N / N |
| C01-NAME: introductory name only | Development variant | [Transcript](v1/C01-NAME.request.json) | [Judgments](v1/C01-NAME.reference.json) | S / S / S / S |
| C07-FILLER: three fillers only | Withheld variant | [Transcript](v1/C07-FILLER.request.json) | [Judgments](v1/C07-FILLER.reference.json) | S / S / S / S |

Complete interviews use the role's shared Q1–Q5 wording. C03 and C08 intentionally end early, so later questions/answers are absent. Variants retain base turn IDs to make exact transformations and evidence comparisons inspectable. Names are fictional. C06's instruction-like text is adversarial input data; it is not an instruction for the evaluator or contributors.

## How to read a reference

Each criterion has an expected status and rationale, permissible claims with exact candidate-source quotations, prohibited inferences, and material unknown checkpoints. Conflict and unknown-speaker fields identify special cases. Permissible claims are examples of supported content, not a required wording template or an exhaustive list of valid interpretations.

References are deliberately separate from requests. The runner sends only the request JSON to the API; it never sends expected statuses or reference text. No authored output draft is included in the evaluation dataset. The software checker constructs reference replays only to test the harness, labels the transport mocked and writes scratch records under ignored `tmp/`.

## Split and maintenance rules

C07/C08 were authored and seen by the same assistant that built the product. “Withheld” means withheld from prompt tuning **after authorship**, not independently hidden, human-blinded or representative of real applicants. No runtime prompt, role or product logic was tuned during this Phase 4 work.

Do not edit v1 in place after seeing outputs. Record label disagreements and reasons separately. If a withheld case informs a prompt or product fix, mark its future use development and author a new withheld case with a new ID. Preserve the old input/reference and failed runs. To introduce a new dataset/configuration version, copy into a new versioned package, update the runner's explicit version/ID rules and freeze it before new runs; do not bypass drift checks.

Canonical JSON hashes ignore whitespace but preserve content and key order. Runtime contract/prompt hashes reflect exact bytes used by the server; line-ending or configuration changes can intentionally fail the runtime check. Keep the original checkout/configuration available when reproducing this frozen batch rather than editing its freeze record.

Run `node docs/hr-product-sprint/scripts/evaluate-phase-4.cjs --check` from the repository root to verify the package without making a model call.
