# Codex gpt-6-astra — directive.md round 3 review (2026-09-20)

Round-2 findings:
- Demo argument preservation and table qualifications: resolved in Parts 2, 3 and 4.2, including {}, whitespace-only/empty credentials, availability gating and deterministic no-evidence behavior.
- Coverage and harness dependencies: substantially resolved in 5.2 through the added fixtures, visitor mock, session.ref.update stub, availability gate and origin header.
- Provider-attempt oracle: not fully resolved in 5.4; PROVIDERS contains objects, so the written expression needs .map(p => p.id) before filtering.
- Necessary wiring edits: resolved in Part 3.
- Accounting preservation: resolved in design by 4.2 and 5.5.
- Baseline reproducibility: still contradictory between 5.3 and Part 6.

The Part 2 policies and 4.2 adaptations preserve the assessEvidence argument tuples outside fix-1 and fix-2, provided evaluate retains its existing fallback-header parsing and validation, including parsing an absent header as {}. Hosted-admin fallback remains enabled regardless of the header.

The harness dependencies now appear sufficient for the supplied excerpts, with requests explicitly supplying matching origins. However, 5.2's fixed assessEvidence mock cannot verify the deterministic no-evidence short-circuit. Those cases need real assessEvidence and assertions that evaluateWithProvider receives no calls. Also, "malformed JSON with fallback off" must mean effective fallback is off; hostedAdmin still parses it.

H is reproducible under 5.3's definition, but Part 6 instead requires "tests only," followed by a module commit. Following that sequence leaves the resolver tests importing a missing module.

Appendix B's placeholders are clearly marked pending. Its literal baseline measurements, particularly 21.05 seconds, are actual-looking claims rather than placeholders and need the command/SHA provenance required by Y7 before submission.

CHANGE: Align Part 6 with 5.3 so H contains the resolver module and both test files with zero route edits, removing the contradictory later module commit; Correct 5.4's oracle to use provider IDs and specify real-assessEvidence no-evidence tests plus malformed-header expectations based on effective fallback permission.

---
*Claude:* both changes applied as v3.1 (see Appendix A); v3.1 sent back to both reviewers for confirmation.

## Confirmation on v3.1

Both round-3 changes are correctly applied. Part 6 now matches 5.3: H contains the module and tests, with zero route edits, followed by one commit per route.

The attempt oracle uses provider IDs. No-evidence cases run real assessEvidence and assert no provider calls. Malformed-header expectations correctly follow effective fallback permission, including hostedAdmin.

The baseline suite counts and timing now identify the command, revision and run context; timing is explicitly machine-dependent. Implementation results remain marked pending.

I found no new inconsistency introduced by these amendments.

APPROVE
