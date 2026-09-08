# Evaluation data governance

[Pilot guide](english-first-pilot.md) · [Phase 5](../phases/05-case-study-and-handoff.md)

Updated: 2026-09-08. Prototype policy and future requirements; no regulatory compliance claim.

## Implemented

The benchmark accepts bundled fictional text only. It has no arbitrary transcript upload, audio collection, training job, automatic feedback collection, or automatic provider fallback. Do not substitute real candidate information into these fixtures.

The browser holds a reviewer alias, approvals, original drafts and structured judgments in memory. Export/import is explicit. The server sends only the selected synthetic transcript, rubric and instructions to selected hosted providers. It does not send reference answers or human judgments.

Ignored local `.benchmark-runs` files contain allowlisted synthetic inputs/outputs, settings/hashes, timestamps, usage metadata and failures. Credentials and complete SDK request/response objects are not serialized. Missing keys produce no provider record. There is no automatic retention/deletion job: the owner manages scratch files and keeps selected fictional evidence for the case study.

Review state is lost on refresh unless exported. Exports/reference packets are user-managed files containing fictional text and, for studies, a reviewer alias. They are not automatically uploaded, anonymous analytics, or signed audit evidence. Public examples should remain fictional and use a non-identifying alias.

## Future learning loop: not implemented

Aggregate issue categories, create synthetic examples demonstrating recurring problems, review them, and evaluate prompt/model changes on a separate set. Reviewer corrections require calibration and are not automatically correct training labels. Past hiring outcomes are not unquestioned ground truth.

Fine-tuning, real candidate reuse, and provider fallback are separate future decisions. Before real-data deployment, specify purpose/lawful basis, candidate notice, access controls, retention/deletion, processing regions, provider policies, relevant cross-border transfers, and handling of data-subject requests for stored data and derived models. Interview processing does not automatically authorize training reuse.

Removing names alone does not establish anonymisation: free text, career details, voice and linkable identifiers can remain identifying. The [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/) informs this design; applicable law depends on deployment.

For Indonesia, include [Law No. 27/2022](https://peraturan.go.id/id/uu-no-27-tahun-2022) in the jurisdiction-specific assessment. No exhaustive legal mapping or compliance sign-off has been performed.

An open model served by a remote API is cloud processing. A provider's no-training policy differs from data staying on the user's machine. Do not silently switch restricted data to a new provider.
