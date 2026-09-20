# Code-review example — AI output corrected or rejected

**Change:** provider-resolution extraction, `quest/trust-and-change` · **Date:** 2026-09-21 · **Draft:** v3 (change log at end)
**Author:** Muhammad Iqbal Hilmy Izzulhaq. Drafted with Claude (Opus 5) from the implementation record; under council review.

The Quest asks for one example of AI output that was corrected or rejected during implementation, with the risk explained. Two occurred. Both are recorded with a durable source for every quoted line. The first is the primary example (it is *code*, and the smell is the one this change exists to remove). Document-level corrections during the intent/directive rounds are catalogued in `quest/council/README.md`.

## Who decided what

- **Iqbal (human):** chose the problem; authored and approved the directive including its Part 7 review checklist and rejection rule (`3acb9fe`); approved the contract table before any route edit (`e25d63e`); set the model allocation (implementation on cheaper models at high effort, review on stronger models — an instruction given in the working session, recorded here and in `agents.md`); and accepts or rejects this record and the branch. He did not read every diff line himself.
- **Claude (Opus 5):** ran the Part 7 checklist on each agent output and made the two corrections below under those rules. Each was reported to Iqbal in the working session in which it was made; the durable record of each is this file, `quest/agent-notes.md`, and the commit messages. These are review decisions taken under delegated, written rules — not a substitute for human accountability.
- **Acceptance.** Iqbal's acceptance of these two review decisions is recorded by the sign-off line at the end of this document; until it is signed, they stand as Claude's decisions under Iqbal's rules.
- **Codex `gpt-6-astra`** wrote the resolver and the test harness; **Codex `gpt-5.6-luna`** wrote the three route changes (`provider-resolution.ts` and the tests: commit `d09182e`; routes: commit messages `0d88121`, `a800008`, `1a1a920`; model id also recorded in the Codex session rollout named below).

---

## Example 1 (primary) — duplicated schema in `evaluate/route.ts`: sent back

**Produced by:** Codex `gpt-5.6-luna` (effort xhigh), wiring the third route after `scheduled` (`0d88121`) and `demo` (`a800008`) were already wired — which is why its harness run could be 735/735.
**Durable source:** `quest/council/rejected-evaluate-route-v1.patch` — the unified diff extracted verbatim from the Codex session rollout (`~/.codex/sessions/2026/09/21/rollout-2026-09-21T03-47-12-01a0c092-ab84-7012-8b68-61a4750a5e60.jsonl`, FileChange record, 2026-09-20T20:55:42Z). Reproduce: `git show a800008:src/app/api/evaluate/route.ts > before.ts`, apply the patch, then `git diff -w --stat --no-index before.ts after.ts` → **42 insertions, 21 deletions (63 changed lines)**; `grep -c "z.string().max(500).optional()"` → **6** (two copies of the three-field schema).
**What it did right:** by its own report — archived verbatim in `quest/council/luna-job-reports.md` (job `task-muaaoq1y-mof9dy`) — the route harness passed 735/735 and `tsc` exited 0; scope was respected; both policy literals matched the directive exactly. Those two results were not independently re-run on the rejected version (it was replaced before commit); the committed second version was re-run by Claude (735/735, `tsc` 0, lint 0) before `1a1a920`.
**What was wrong:** to keep the caller and hosted-admin paths separate it wrote the `x-ai-fallback-keys` zod schema **twice** and split the lazy header parse into two copies. Excerpt from the patch (the `+` side, unedited):

```ts
    if (hostedAdmin) {
      const result = resolveProvider({
        requested: requestedProvider,
        policy: {
          credentialSource: "server",
          allowFallback: true,
          onUnconfigured: "substitute",
          onNoneConfigured: "proceed",
        },
        env: process.env,
      });
      if (!result.ok) throw new Error("Evaluation unavailable.");
      provider = result.provider;
      key = result.key;
      const browserKeys = z
        .object({
          openai: z.string().max(500).optional(),
          gemini: z.string().max(500).optional(),
          deepseek: z.string().max(500).optional(),
        })
        .parse(JSON.parse(req.headers.get("x-ai-fallback-keys") || "{}"));
      fallbackKeys = { ...result.fallbackKeys, ...browserKeys } as Partial<
        Record<AIProvider, string>
      >;
    } else {
      let callerFallbackKeys: Partial<Record<AIProvider, string>> | undefined;
      if (req.headers.get("x-ai-allow-fallback") === "true") {
        callerFallbackKeys = z
          .object({
            openai: z.string().max(500).optional(),
            gemini: z.string().max(500).optional(),
            deepseek: z.string().max(500).optional(),
          })
          .parse(JSON.parse(req.headers.get("x-ai-fallback-keys") || "{}"));
      }
      const result = resolveProvider({
        requested: requestedProvider,
        policy: {
          credentialSource: "caller",
          callerKey: key,
          allowFallback: req.headers.get("x-ai-allow-fallback") === "true",
          callerFallbackKeys,
        },
        env: process.env,
      });
      if (!result.ok) throw new Error("Evaluation unavailable.");
      provider = result.provider;
      key = result.key;
      fallbackKeys = result.fallbackKeys;
    }
```

63 changed lines, against the directive's yardstick Y3 limit of 50.

**The risk had it shipped.** No functional regression was detected within the harness's scope. The risk is the one this change exists to remove: a maintainability change that *reintroduces duplicated logic* undermines its own reason to exist. The next person to change the header schema (add a provider, change the length cap) has two places to edit again — the failure mode `intent.md` documents with `a63fab4`, where a fix landed in one copy and missed another. Tests would not catch that drift; both copies would still parse. A reviewer scoring "reduces complexity or risk" would, reasonably, dock it.

**Why the agent did it — an inference, not a fact.** The directive said "keep the lazy parse of `x-ai-fallback-keys`" and "browser-over-server merge for hostedAdmin". Read narrowly, giving each branch its own copy is the safest way to *guarantee* both. The agent appears to have optimised for provable preservation over structural preservation — a predictable bias of a tightly-scoped directive, and the reason a review step sits after the tests.

**The correction.** Sent back with a concrete target shape rather than "make it shorter": compute the effective-fallback condition once (it is the old line 55 verbatim), parse the header once under it, one `resolveProvider` call with a ternary on `hostedAdmin` for the policy literal, then the merge. Luna's second version reported 45 changed lines (22+/23−), one schema, one call, 735/735 (`luna-job-reports.md`, job `task-muaarm7s-d1myxb`) — accepted with a reviewer touch-up (result renamed `resolution`, a bare `{}` block removed, `const` per lint), which is what was committed: `git diff -w --stat a800008..1a1a920 -- src/app/api/evaluate/route.ts` → **21 insertions, 25 deletions (46)**. Final code, `evaluate/route.ts` at `e5bd47b` lines 43–70 (schema body abridged to one line; otherwise verbatim):

```ts
    const hostedAdmin = !key && (await isVerifiedAdminRequest(req));
    const allowFallback = req.headers.get("x-ai-allow-fallback") === "true" || hostedAdmin;
    let browserKeys: Partial<Record<AIProvider, string>> | undefined;
    if (allowFallback) {
      browserKeys = z
        .object({ openai: ..., gemini: ..., deepseek: ... })
        .parse(JSON.parse(req.headers.get("x-ai-fallback-keys") || "{}"));
    }
    const resolution = resolveProvider({
      requested: requestedProvider,
      policy: hostedAdmin
        ? { credentialSource: "server", allowFallback: true, onUnconfigured: "substitute", onNoneConfigured: "proceed" }
        : { credentialSource: "caller", callerKey: key, allowFallback, callerFallbackKeys: browserKeys },
      env: process.env,
    });
    if (!resolution.ok) throw new Error("Evaluation unavailable.");
    provider = resolution.provider;
    key = resolution.key;
    const fallbackKeys = hostedAdmin
      ? ({ ...resolution.fallbackKeys, ...browserKeys } as Partial<Record<AIProvider, string>>)
      : resolution.fallbackKeys;
```

**Record:** commit `1a1a920` message; `quest/agent-notes.md` → "Route wiring (Part 4.2)" → "Review interventions".

---

## Example 2 — cross-realm `toStrictEqual` in the route harness: corrected

**Produced by:** Codex `gpt-6-astra`, writing the baseline harness for commit H.
**Durable source:** `quest/agent-notes.md` — "Attempt 1 — Codex gpt-6-astra, stopped before commit (verbatim)" and "Correction to AI output"; commit `d09182e`.
**What it did right:** it stopped. The directive said "if any `preserved` case fails at H, stop — the policy table is wrong". 701 `preserved` cases failed; the agent reported them, suspected a strict-comparison/prototype issue, and — correctly — did not patch expectations to make them pass.
**What was wrong:** one line.

```ts
// astra, harness observe() — original (agent-notes, attempt 1)
    const body = await response.json();
```

Under Jest, `NextRequest`/`Response` bodies are parsed by Node's `undici` in the Node realm, so the parsed objects carry a different `Object.prototype` than object literals in the test file. `toStrictEqual` checks constructors and fails with `Received: serializes to the same string`. Every one of the 701 failures was at a response-*body* assertion; the `observable` assertion that encodes policy had already passed in each.

**The risk had it shipped.** None to production — test-only. A real one to *verification integrity*: a harness that fails everything cannot distinguish a wrong policy table from a wrong assertion, so the baseline number would have been meaningless and the stop rule would have blocked the change indefinitely — or tempted someone to loosen the assertions.

**The correction** (Claude, under the Part 7 rules; reported to Iqbal with the corrected baseline):

```ts
    const body = JSON.parse(await response.text()); // parse in the test realm: undici-parsed objects fail toStrictEqual (cross-realm prototypes)
```

Re-run: 703 `preserved` pass, 0 fail; 7 `fix-1` + 25 `fix-2` fail — exactly the intended baseline. No expectation, tag, or policy row changed.

---

## What these two say about the workflow

- Tests are necessary and not sufficient: example 1 passed every test and was still the wrong change.
- A stop rule is only useful if the agent obeys it and the reviewer then *diagnoses* rather than overrides: example 2.

## Sign-off

- [ ] Accepted by Muhammad Iqbal Hilmy Izzulhaq on ____-__-__ — the two review decisions above are mine to own; I have read this record and the linked artefacts.

## Review history of this document

- v1 (2026-09-21): drafted from the implementation record.
- v1 → v2 (round 1, Codex `gpt-5.6-sol` CHANGE · Kimi K3 CHANGE): rejected code now has a durable source — the patch extracted from the Codex session rollout into `quest/council/rejected-evaluate-route-v1.patch`, with reproduction commands for the 63-line and two-copies measurements; model attributions cite commit messages and the rollout; the 45/46 distinction between luna's second version and the committed touch-up made explicit; "the harness proved it" softened to "no regression detected within the harness's scope"; the motive paragraph labelled an inference; a "who decided what" section replaces "Claude as the human's proxy"; the 735/735 claim anchored to commit order; workflow bullet 3 cut.
- v2 → v3 (round 2, Codex `gpt-5.6-sol` CHANGE · Kimi K3 pending): the rejected version's 735/735, `tsc` and 45-line figures now cite luna's verbatim job reports archived in `quest/council/luna-job-reports.md`, with the caveat that they were not independently re-run on the rejected version; the human-decision account is narrowed to what is evidenced (commits `3acb9fe`, `e25d63e`; session-recorded instructions labelled as such) and an explicit sign-off line is added for Iqbal's acceptance.
