> Historical design before the September 10 evidence revision. Retained for baseline provenance; follow [current progress](../../../../README.md).

# Role and evidence rubric

[Design package](README.md) · [Canonical role profile](../../../../hr-product-sprint/design/role-profile.json)

Version: `frontend-review-v1`. Date: 2026-09-07. Provisional design specification; no recruiter or hiring manager has calibrated these anchors.

## Role and question set

The fictional role is a mid-level frontend engineer working on a React/TypeScript operations dashboard. The [role profile](../../../../hr-product-sprint/design/role-profile.json) contains the complete context, four criteria, anchors, five shared questions and two clarifications. It extends Phase 1's `frontend-discovery-v1` with explicit evidence-status anchors; original practice records remain versioned as before.

| Criterion | Evidence to inspect | Main question |
|---|---|---|
| R1 — Implementation and data flow | Personal implementation action and input/request/state behavior | Q1: feature, data flow and personal contribution |
| R2 — Debugging and diagnosis | Investigation or reproduction linked to concrete observations | Q2: defect, observations and possible cause |
| R3 — Verification and testing | Check actually performed and its expected behavior or assertion | Q3: verification and release decision |
| R4 — Accessible interfaces | Concrete accessible behavior or relevant checks performed | Q4: accessibility work and checks |

Q5 asks about ownership/evidence limits and next investigations across all criteria. Use these same core questions when authoring evaluation inputs. Follow-ups clarify an answer; they must not assert that a candidate lacks a skill.

## Evidence statuses

Statuses describe the record, not a competence level or hiring outcome.

| Machine value | UI label | Anchor |
|---|---|---|
| `specific_evidence` | Specific evidence | A relevant personal action with a concrete mechanism, observation or check is described |
| `limited_evidence` | Limited evidence | Some relevant activity is described, but the account is vague, indirect or insufficiently explained |
| `not_established` | Not established | No relevant completed action is established: absent topic, missing answer, future-only plan or explicit nonperformance |
| `conflicting_evidence` | Conflicting evidence | Different candidate turns give incompatible accounts of the same material contribution/event |

Apply conflict first when the same matter has incompatible accounts. Otherwise inspect whether a completed relevant action is established and whether it meets the criterion-specific anchor. A concrete account can still have important limits: mocked testing can be specific evidence while leaving real integration behavior unknown. Do not downgrade candid uncertainty as generic lack of confidence.

No applicable evidence means an empty claims array is allowed. Explicitly saying a check was not done can be a cited claim under “Not established”; it describes this work, never global inability.

## Provisional example mapping

These are authored interpretations, not model results or recruiter consensus.

| Input | R1 | R2 | R3 | R4 | Material nuance |
|---|---|---|---|---|---|
| P1-A | Specific | Specific | Specific | Specific | Testing and screen-reader limitations remain visible despite concrete actions |
| P1-B | Conflicting | Limited | Limited | Not established | Cite both ownership accounts; do not infer deception |
| P2-SPARSE | Specific | Limited | Not established | Not established | Uncovered criteria stay unknown rather than becoming negative scores |

The original [practice reference notes](../../../../hr-product-sprint/evaluation/practice/reference-notes.md) still own Phase 1's unknown checkpoints: two criterion checkpoints for P1-A, four for P1-B. A material unknown checkpoint and an evidence status are different measurements. Status alone does not determine whether all important limitations were retained.

No automatic rejection, candidate ranking, protected-trait inference, accent/personality assessment or “confidence” scoring belongs in this rubric.
