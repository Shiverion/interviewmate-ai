#!/usr/bin/env node
"use strict";
// Software checks only: every generated-looking response below is an authored replay through mocked transport.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const core = require("./evaluation/core.cjs");
const bundle = core.loadDataset();
const snapshot = {
  datasetHash: bundle.datasetHash,
  configuration: core.configuration(),
};
const scratchRoot = path.join(core.root, "tmp", `phase4-check-${randomUUID()}`);
fs.mkdirSync(scratchRoot, { recursive: true });
let checks = 0;
async function check(name, run) {
  try {
    await run();
    checks++;
  } catch (error) {
    throw new Error(`${name}: ${error.message}`);
  }
}
function replay(item) {
  return {
    schemaVersion: "review-brief-v1",
    criteria: Object.fromEntries(
      Object.entries(item.reference.criteria).map(([key, entry]) => [
        key,
        {
          status: entry.expectedStatus,
          claims: entry.permissibleClaims.map((claim) => ({
            text: claim.summary,
            citations: structuredClone(claim.support),
          })),
          limitation: entry.unknownCheckpoints
            .map((point) => point.description)
            .join(" "),
          followUp:
            "What source evidence or further checks would clarify this limitation?",
        },
      ])
    ),
  };
}
function success(item, draft = replay(item)) {
  return {
    ok: true,
    generation: {
      ...snapshot.configuration,
      generationId: randomUUID(),
      generatedAtUtc: new Date().toISOString(),
      sourceType: "live_model",
      inputHash: item.inputHash,
      modelReturned: snapshot.configuration.modelRequested,
      latencyMs: 1,
      usage: null,
    },
    draft,
    warnings: [],
  };
}
const directory = (name) => path.join(scratchRoot, name);
function copyDataset(name) {
  const target = directory(name);
  fs.cpSync(bundle.directory, target, { recursive: true });
  return target;
}
function mutate(file, change) {
  const value = core.read(file);
  change(value);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
async function mockedBatch(name, responder, maxAttempts = 3) {
  const records = new Map();
  let calls = 0;
  const batch = await core.runBatch({
    bundle,
    snapshot,
    directory: directory(name),
    executionType: "mock_transport",
    maxAttempts,
    fetchImpl: async (_url, options) => {
      calls++;
      const input = JSON.parse(options.body);
      assert.equal(Object.hasOwn(input, "reference"), false);
      const item = bundle.cases.find((item) => item.id === input.transcriptId);
      const {
        status = 200,
        body = success(item),
        raw = body.draft,
      } = responder(item, calls);
      const id = body.generation?.generationId ?? body.attemptId;
      if (id)
        records.set(id, {
          attemptId: id,
          inputHash: item.inputHash,
          result: raw
            ? { output: raw, rawOutput: JSON.stringify(raw) }
            : undefined,
        });
      return new Response(JSON.stringify(body), { status });
    },
    getServerRecord: async (id) => records.get(id) ?? null,
  });
  return {
    batch,
    calls,
    summary: core.summarizeBatch(bundle, directory(name)),
  };
}

(async () => {
  await check("dataset has frozen-plan coverage", () => {
    assert.equal(bundle.cases.length, 10);
    assert.equal(core.plan(bundle).length, 30);
    assert.equal(
      bundle.cases.filter(
        (item) => item.split === "withheld_from_tuning_after_authorship"
      ).length,
      3
    );
  });
  for (const item of bundle.cases)
    await check(
      `${item.id} authored reference replay is mechanically valid`,
      () => {
        assert.equal(
          core.classifyResponse(
            item,
            200,
            success(item),
            snapshot.configuration
          ).accepted,
          true
        );
      }
    );
  await check("variant cannot alter undeclared substantive text", () => {
    const target = copyDataset("bad-variant");
    mutate(path.join(target, "C01-NAME.request.json"), (value) => {
      value.turns[0].text += " Undeclared question change.";
    });
    assert.throws(() => core.loadDataset(target), /declared transformation/);
  });
  await check("unknown-speaker reference evidence is rejected", () => {
    const target = copyDataset("bad-reference");
    mutate(path.join(target, "C05.reference.json"), (value) => {
      value.criteria.R1.permissibleClaims[0].support = [
        {
          turnId: "C05-T03",
          quote: bundle.cases.find((item) => item.id === "C05").input.turns[2]
            .text,
        },
      ];
    });
    assert.throws(() => core.loadDataset(target), /Invalid reference quote/);
  });
  await check(
    "frozen snapshots cannot be overwritten or silently changed",
    () => {
      const target = copyDataset("freeze-check");
      const copied = core.loadDataset(target);
      if (!fs.existsSync(path.join(target, "freeze.json")))
        core.freezeDataset(copied);
      assert.throws(() => core.freezeDataset(copied));
      mutate(path.join(target, "C02.reference.json"), (value) => {
        value.criteria.R1.rationale += " Revised after freeze.";
      });
      assert.throws(
        () => core.verifyFreeze(core.loadDataset(target)),
        /Dataset drift/
      );
    }
  );
  await check(
    "authored provenance cannot masquerade as live API output",
    () => {
      const body = success(bundle.cases[0]);
      body.generation.sourceType = "authored_example";
      assert.equal(
        core.classifyResponse(
          bundle.cases[0],
          200,
          body,
          snapshot.configuration
        ).accepted,
        false
      );
    }
  );
  await check("a response for a different input is rejected", () => {
    const body = success(bundle.cases[0]);
    body.generation.inputHash = "0".repeat(64);
    assert.equal(
      core.classifyResponse(bundle.cases[0], 200, body, snapshot.configuration)
        .code,
      "PROVENANCE_MISMATCH"
    );
  });
  await check("exact quotes cannot establish semantic support", () => {
    const body = success(bundle.cases[0]);
    body.draft.criteria.R1.claims[0].text =
      "Independently proved a production improvement across the entire system.";
    assert.equal(
      core.classifyResponse(bundle.cases[0], 200, body, snapshot.configuration)
        .accepted,
      true
    );
  });
  await check("bad raw quotes remain in the proposed-quote denominator", () => {
    const draft = replay(bundle.cases[0]);
    draft.criteria.R1.claims[0].citations.push({
      turnId: "missing",
      quote: "invented",
    });
    const quotes = core.inspectQuotes(bundle.cases[0].input, draft);
    assert.equal(quotes.total, 5);
    assert.equal(quotes.valid, 4);
  });
  await check(
    "provider access failure stops after one attempt with 29 unattempted slots",
    async () => {
      const result = await mockedBatch(
        "unavailable",
        () => ({
          status: 503,
          body: {
            ok: false,
            attemptId: randomUUID(),
            error: {
              code: "AI_UNAVAILABLE",
              message: "Mock unavailable",
              retryable: true,
              issues: [],
            },
          },
        }),
        30
      );
      assert.equal(result.calls, 1);
      assert.equal(result.summary.notAttempted.length, 29);
      assert.equal(result.summary.failures.length, 1);
      assert.equal(result.summary.criterionAgreement.availableCells, 0);
      assert.equal(result.summary.criterionAgreement.agreement, null);
    }
  );
  await check(
    "partial successful batches use available cells, not all 96 planned cells",
    async () => {
      const result = await mockedBatch("three-valid", () => ({}));
      assert.equal(result.summary.executionType, "mock_transport");
      assert.equal(result.summary.criterionAgreement.availableCells, 12);
      assert.equal(result.summary.criterionAgreement.matches, 12);
      assert.equal(result.summary.planned.baseCriterionCells, 96);
      assert.equal(result.summary.notAttempted.length, 27);
      assert.equal(result.batch.stopReason, "ATTEMPT_LIMIT");
      assert.equal(
        core.read(
          path.join(directory("three-valid"), "C01-r1.semantic-review.json")
        ).status,
        "not_reviewed"
      );
      assert.equal(
        result.summary.sensitivity.every(
          (pair) => !pair.available && pair.statusChanges === null
        ),
        true
      );
    }
  );
  await check(
    "invalid model citations are preserved and excluded from valid-draft agreement",
    async () => {
      const result = await mockedBatch("bad-citation", (item, call) => {
        if (call > 1) return {};
        const raw = replay(item);
        raw.criteria.R1.claims[0].citations[0].quote = "invented quote";
        return {
          status: 502,
          body: {
            ok: false,
            attemptId: randomUUID(),
            error: { code: "INVALID_CITATION" },
          },
          raw,
        };
      });
      assert.equal(result.summary.completion.allValid, 2);
      assert.equal(result.summary.criterionAgreement.availableCells, 8);
      assert.equal(result.summary.quotes.proposed, 12);
      assert.equal(result.summary.quotes.valid, 11);
    }
  );
  await check(
    "status disagreement is visible without claiming unsupported evidence",
    async () => {
      const result = await mockedBatch(
        "disagreement",
        (item) => {
          const body = success(item);
          body.draft.criteria.R1.status = "limited_evidence";
          return { body };
        },
        1
      );
      assert.equal(result.summary.criterionAgreement.matches, 3);
      assert.equal(result.summary.criterionAgreement.availableCells, 4);
      assert.equal(result.summary.criterionAgreement.disagreements.length, 1);
    }
  );
  await check("tampered attempt provenance cannot enter summaries", () => {
    mutate(
      path.join(directory("three-valid"), "C01-r1.attempt.json"),
      (value) => {
        value.inputHash = "tampered";
      }
    );
    assert.throws(
      () => core.summarizeBatch(bundle, directory("three-valid")),
      /provenance mismatch/
    );
  });
  await check(
    "network errors do not persist secret-bearing exception text",
    async () => {
      await core.runBatch({
        bundle,
        snapshot,
        directory: directory("network-error"),
        executionType: "mock_transport",
        fetchImpl: async () => {
          throw new Error("Bearer secret-should-not-appear");
        },
      });
      const record = fs.readFileSync(
        path.join(directory("network-error"), "C01-r1.attempt.json"),
        "utf8"
      );
      assert.equal(record.includes("secret-should-not-appear"), false);
      assert.equal(
        core.summarizeBatch(bundle, directory("network-error")).stopReason,
        "NETWORK_ERROR"
      );
    }
  );
  await check("remote evaluation endpoints are refused", async () => {
    await assert.rejects(
      core.runBatch({
        bundle,
        snapshot,
        directory: directory("remote"),
        endpoint: "https://example.com/api/review-brief",
      }),
      /loopback/
    );
  });
  await check(
    "complete mocked batches expose repeat and variant status changes",
    async () => {
      const result = await mockedBatch(
        "complete-mock",
        (item, call) => {
          const body = success(item);
          if (call === 2) body.draft.criteria.R3.status = "limited_evidence";
          if (item.id === "C07-FILLER")
            body.draft.criteria.R1.status = "limited_evidence";
          return { body };
        },
        30
      );
      assert.equal(result.summary.completion.baseValid, 24);
      assert.equal(result.summary.completion.variantValid, 6);
      assert.equal(result.summary.criterionAgreement.matches, 95);
      assert.equal(result.summary.criterionAgreement.availableCells, 96);
      assert.deepEqual(
        result.summary.stability.find((item) => item.caseId === "C01")
          .statusChanges,
        ["R3"]
      );
      assert.equal(
        result.summary.sensitivity.filter((pair) => pair.available).length,
        6
      );
      assert.equal(
        result.summary.sensitivity
          .filter((pair) => pair.variant === "C07-FILLER")
          .every((pair) => pair.statusChanges.includes("R1")),
        true
      );
    }
  );
  await check(
    "missing or unreadable raw server records stop collection without discarding a valid draft",
    async () => {
      for (const kind of ["missing-record", "unreadable-record"]) {
        let calls = 0;
        await core.runBatch({
          bundle,
          snapshot,
          directory: directory(kind),
          executionType: "mock_transport",
          fetchImpl: async (_url, options) => {
            assert.equal(options.redirect, "error");
            calls++;
            return new Response(JSON.stringify(success(bundle.cases[0])), {
              status: 200,
            });
          },
          getServerRecord: async () => {
            if (kind === "unreadable-record")
              throw new Error("Local record could not be parsed");
            return null;
          },
        });
        assert.equal(calls, 1);
        assert.equal(
          core.summarizeBatch(bundle, directory(kind)).stopReason,
          "RUN_RECORD_UNAVAILABLE"
        );
        assert.equal(
          core.summarizeBatch(bundle, directory(kind)).completion.allValid,
          1
        );
      }
    }
  );
  console.log(
    `${checks} Phase 4 software checks passed. Mock transport and authored reference replays only; no model-quality or human-timing result.`
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
