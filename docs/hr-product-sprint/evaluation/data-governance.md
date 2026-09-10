# Evaluation data governance

[Pilot guide](english-first-pilot.md) · [Phase 5](../phases/05-case-study-and-handoff.md)

Updated: 2026-09-10. Prototype policy and future requirements; no regulatory compliance claim. [Current access and storage](../implementation/current-runbook.md).

## Implemented

The benchmark accepts bundled fictional text only. It has no arbitrary transcript upload, audio collection, training job, automatic feedback collection, or automatic provider fallback. Do not substitute real candidate information into these fixtures.

The benchmark workspace holds its study in memory with explicit export/import. Review Brief and competency-v2 human-review forms also save drafts/completed records in browser localStorage; competency-v2 submissions with a valid invitation are saved in private reviewer storage. The model receives the selected transcript, rubric and instructions, not the human reference answers or judgments.

Ignored local `.benchmark-runs` files contain allowlisted synthetic inputs/outputs, settings/hashes, timestamps, usage metadata and failures. Credentials and complete SDK request/response objects are not serialized. Missing keys produce no provider record. There is no automatic retention/deletion job: the owner manages scratch files and keeps selected fictional evidence for the case study.

Review form selections survive reload. Completed human records include source IDs/hashes, transcript/model/rubric versions, judgments, alias, notes and timestamp. Browser storage and private host records have no automatic retention/deletion schedule. They are not anonymous analytics, model-training consent or tamper-proof audit evidence. Public examples should remain fictional and use a non-identifying alias. Export a reviewed record intentionally before reusing it in an evaluation dataset.

## Future learning loop: not implemented

The separate candidate interview room records [session-integrity metadata and recovery checkpoints](../implementation/session-integrity.md) after a candidate notice. Recovery checkpoints contain answers, partial questions, retired exchanges, remaining time and interruption/recovery counts in browser localStorage, including after tab closure. Terminal sessions attempt a hosted save. These are personal/session-linked records, not anonymous analytics or training data. There is no automatic deletion schedule or cross-device recovery. Use synthetic content for testing; the guide documents access, retention, client tampering and production authorization gaps.

Aggregate issue categories, create synthetic examples demonstrating recurring problems, review them, and evaluate prompt/model changes on a separate set. Reviewer corrections require calibration and are not automatically correct training labels. Past hiring outcomes are not unquestioned ground truth.

Fine-tuning, real candidate reuse, and provider fallback are separate future decisions. Before real-data deployment, specify purpose/lawful basis, candidate notice, access controls, retention/deletion, processing regions, provider policies, relevant cross-border transfers, and handling of data-subject requests for stored data and derived models. Interview processing does not automatically authorize training reuse.

Removing names alone does not establish anonymisation: free text, career details, voice and linkable identifiers can remain identifying. The [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/) informs this design; applicable law depends on deployment.

For Indonesia, include [Law No. 27/2022](https://peraturan.go.id/id/uu-no-27-tahun-2022) in the jurisdiction-specific assessment. No exhaustive legal mapping or compliance sign-off has been performed.

An open model served by a remote API is cloud processing. A provider's no-training policy differs from data staying on the user's machine. Do not silently switch restricted data to a new provider.
