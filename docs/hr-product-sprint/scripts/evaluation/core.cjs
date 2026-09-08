"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "CommonJS", moduleResolution: "Node" },
});
const root = path.resolve(__dirname, "../../../..");
const runtime = path.join(root, "src/lib/review-brief");
const { validateRequest, validateDraft, CRITERIA } = require(
  path.join(runtime, "contract.ts")
);
const { successSchema, MODEL } = require(path.join(runtime, "types.ts"));
const datasetDirectory = path.join(
  root,
  "docs/hr-product-sprint/evaluation/dataset/v1"
);
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const jsonHash = (value) => sha(JSON.stringify(value));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const statuses = new Set([
  "specific_evidence",
  "limited_evidence",
  "not_established",
  "conflicting_evidence",
]);

function configuration() {
  const role = JSON.stringify(read(path.join(runtime, "role-profile.json")));
  const system =
    fs.readFileSync(path.join(runtime, "prompt.md"), "utf8") +
    "\n\nTRUSTED_ROLE_PROFILE_JSON:\n" +
    role;
  return {
    contractVersion: "review-brief-v1",
    contractHash: sha(fs.readFileSync(path.join(runtime, "contract.ts"))),
    roleVersion: "frontend-review-v1",
    roleHash: sha(role),
    promptVersion: "review-brief-v1",
    promptHash: sha(system),
    modelRequested: MODEL,
  };
}

function loadDataset(directory = datasetDirectory) {
  const catalog = read(path.join(directory, "catalog.json"));
  assert(
    catalog.datasetVersion === "phase4-eval-v1",
    "Unexpected dataset version"
  );
  const expected = [
    "C01",
    "C02",
    "C03",
    "C04",
    "C05",
    "C06",
    "C07",
    "C08",
    "C01-NAME",
    "C07-FILLER",
  ];
  assert(
    JSON.stringify(catalog.cases.map((item) => item.id)) ===
      JSON.stringify(expected),
    "Dataset IDs/order must match the frozen plan"
  );
  const cases = catalog.cases.map((item) => {
    assert(
      item.requestFile === `${item.id}.request.json` &&
        item.referenceFile === `${item.id}.reference.json`,
      "Unexpected dataset path"
    );
    const parsed = validateRequest(
      read(path.join(directory, item.requestFile))
    );
    assert(
      parsed.ok,
      `Invalid input ${item.id}: ${JSON.stringify(parsed.issues ?? [])}`
    );
    const input = parsed.data;
    const reference = read(path.join(directory, item.referenceFile));
    assert(
      input.transcriptId === item.id && reference.caseId === item.id,
      `Mismatched case ID: ${item.id}`
    );
    assert(
      reference.referenceVersion === catalog.referenceVersion &&
        reference.transcriptVersion === input.transcriptVersion,
      `Mismatched reference version: ${item.id}`
    );
    assert(
      item.plannedRepeats === 3,
      "Each case requires three planned repeats"
    );
    const withheld = ["C07", "C08", "C07-FILLER"].includes(item.id);
    assert(
      item.split ===
        (withheld ? "withheld_from_tuning_after_authorship" : "development") &&
        reference.split === item.split,
      `Incorrect split: ${item.id}`
    );
    assert(
      Object.keys(reference.criteria).join(",") === CRITERIA.join(","),
      `Expected four reference criteria: ${item.id}`
    );
    const turns = new Map(input.turns.map((turn) => [turn.id, turn]));
    const checkpointIds = new Set();
    for (const key of CRITERIA) {
      const entry = reference.criteria[key];
      assert(
        statuses.has(entry.expectedStatus) && entry.rationale?.trim(),
        `Missing reference judgment ${item.id}/${key}`
      );
      assert(
        Array.isArray(entry.permissibleClaims) &&
          entry.unknownCheckpoints?.length &&
          entry.prohibitedInferences?.length,
        `Incomplete reference ${item.id}/${key}`
      );
      const citedTurns = new Set();
      for (const claim of entry.permissibleClaims) {
        assert(
          claim.summary?.trim() && claim.support?.length,
          `Uncited reference claim ${item.id}/${key}`
        );
        for (const citation of claim.support) {
          const turn = turns.get(citation.turnId);
          assert(
            turn?.speaker === "candidate" &&
              citation.quote?.trim() &&
              turn.text.includes(citation.quote),
            `Invalid reference quote ${item.id}/${key}/${citation.turnId}`
          );
          citedTurns.add(citation.turnId);
        }
      }
      if (entry.expectedStatus !== "not_established")
        assert(
          citedTurns.size > 0,
          `Positive reference lacks evidence ${item.id}/${key}`
        );
      if (entry.expectedStatus === "conflicting_evidence")
        assert(
          citedTurns.size >= 2,
          `Conflict lacks two sources ${item.id}/${key}`
        );
      for (const checkpoint of entry.unknownCheckpoints) {
        assert(
          checkpoint.id?.trim() &&
            checkpoint.description?.trim() &&
            !checkpointIds.has(checkpoint.id),
          `Invalid/duplicate checkpoint ${item.id}`
        );
        checkpointIds.add(checkpoint.id);
      }
    }
    assert(
      JSON.stringify(reference.unknownSpeakerTurnIds) ===
        JSON.stringify(
          input.turns
            .filter((turn) => turn.speaker === "unknown")
            .map((turn) => turn.id)
        ),
      `Untracked unknown speaker ${item.id}`
    );
    for (const conflict of reference.expectedConflicts) {
      assert(
        reference.criteria[conflict.criterion]?.expectedStatus ===
          "conflicting_evidence" && new Set(conflict.turnIds).size >= 2,
        `Invalid conflict checkpoint ${item.id}`
      );
      assert(
        conflict.turnIds.every((id) => turns.get(id)?.speaker === "candidate"),
        `Invalid conflict source ${item.id}`
      );
    }
    return {
      ...item,
      input,
      reference,
      inputHash: jsonHash(input),
      referenceHash: jsonHash(reference),
    };
  });
  for (const variant of cases.filter((item) => item.kind === "variant")) {
    const base = cases.find((item) => item.id === variant.variantOf);
    assert(base, `Missing variant base ${variant.id}`);
    const transformed = structuredClone(base.input);
    transformed.transcriptId = variant.id;
    transformed.transcriptVersion = variant.input.transcriptVersion;
    for (const op of variant.transformation.operations) {
      const turn = transformed.turns.find((turn) => turn.id === op.turnId);
      assert(
        turn && turn.text.split(op.from).length === 2,
        `Variant operation must replace exactly once: ${variant.id}`
      );
      turn.text = turn.text.replace(op.from, op.to);
    }
    assert(
      jsonHash(transformed) === variant.inputHash,
      `Variant changes more than its declared transformation: ${variant.id}`
    );
    assert(
      CRITERIA.every(
        (key) =>
          base.reference.criteria[key].expectedStatus ===
          variant.reference.criteria[key].expectedStatus
      ),
      `Variant reference status drift: ${variant.id}`
    );
  }
  const hashes = Object.fromEntries(
    cases.flatMap((item) => [
      [item.requestFile, item.inputHash],
      [item.referenceFile, item.referenceHash],
    ])
  );
  hashes["catalog.json"] = jsonHash(catalog);
  return { directory, catalog, cases, hashes, datasetHash: jsonHash(hashes) };
}

function freezeDataset(bundle) {
  const snapshot = {
    freezeVersion: "phase4-freeze-v1",
    frozenAtUtc: new Date().toISOString(),
    gitHeadAtFreeze: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    datasetVersion: bundle.catalog.datasetVersion,
    datasetHash: bundle.datasetHash,
    files: bundle.hashes,
    configuration: configuration(),
    note: "Inputs and provisional references frozen before model runs; no practitioner calibration. C07/C08 withheld from tuning after authorship, not author-blinded.",
  };
  fs.writeFileSync(
    path.join(bundle.directory, "freeze.json"),
    JSON.stringify(snapshot, null, 2) + "\n",
    { flag: "wx" }
  );
  return snapshot;
}
function verifyFreeze(bundle) {
  const snapshot = read(path.join(bundle.directory, "freeze.json"));
  assert(
    snapshot.datasetHash === bundle.datasetHash &&
      jsonHash(snapshot.files) === jsonHash(bundle.hashes),
    "Dataset drift: preserve the frozen version and author a new version before changing it"
  );
  assert(
    jsonHash(snapshot.configuration) === jsonHash(configuration()),
    "Runtime configuration drift: do not tune against withheld cases or mix configurations in a frozen batch"
  );
  return snapshot;
}
function plan(bundle) {
  return bundle.cases.flatMap((item) =>
    Array.from({ length: item.plannedRepeats }, (_, index) => ({
      slotId: `${item.id}-r${index + 1}`,
      caseId: item.id,
      kind: item.kind,
      split: item.split,
      repeat: index + 1,
    }))
  );
}

function classifyResponse(item, status, body, frozenConfiguration) {
  if (status < 200 || status >= 300)
    return {
      accepted: false,
      code:
        typeof body?.error?.code === "string" ? body.error.code : "HTTP_ERROR",
    };
  const parsed = successSchema.safeParse(body);
  if (!parsed.success) return { accepted: false, code: "INVALID_RESPONSE" };
  if (
    parsed.data.generation.inputHash !== item.inputHash ||
    Object.entries(frozenConfiguration).some(
      ([key, value]) => parsed.data.generation[key] !== value
    )
  )
    return { accepted: false, code: "PROVENANCE_MISMATCH" };
  const checked = validateDraft(item.input, parsed.data.draft);
  if (!checked.ok)
    return { accepted: false, code: "INVALID_DRAFT", issues: checked.issues };
  return { accepted: true, code: "VALID_DRAFT", draft: checked.data };
}

function inspectQuotes(input, output) {
  if (
    !output ||
    typeof output !== "object" ||
    !output.criteria ||
    typeof output.criteria !== "object"
  )
    return { inspectable: false, total: 0, valid: 0 };
  let total = 0;
  let valid = 0;
  const turns = new Map(input.turns.map((turn) => [turn.id, turn]));
  for (const entry of Object.values(output.criteria))
    for (const claim of Array.isArray(entry?.claims) ? entry.claims : [])
      for (const citation of Array.isArray(claim?.citations)
        ? claim.citations
        : []) {
        total++;
        const turn = turns.get(citation?.turnId);
        if (
          turn?.speaker === "candidate" &&
          typeof citation.quote === "string" &&
          citation.quote.trim() &&
          turn.text.includes(citation.quote)
        )
          valid++;
      }
  return { inspectable: true, total, valid };
}

function reviewTemplate(item, record) {
  return {
    reviewVersion: "phase4-semantic-review-v1",
    slotId: record.slot.slotId,
    generationId: record.responseBody.generation.generationId,
    draftHash: jsonHash(record.responseBody.draft),
    status: "not_reviewed",
    reviewer: { id: "", type: null, background: "", priorCaseExposure: "" },
    reviewedAtUtc: null,
    instruction:
      "Read the full transcript and draft. Split each claim into atomic factual propositions, judge support and record exact source reasoning. An assistant review is not human review. Status agreement and quote matching cannot fill these judgments.",
    claims: CRITERIA.flatMap((key) =>
      record.responseBody.draft.criteria[key].claims.map((claim, index) => ({
        criterion: key,
        claimId: `${key}-C${index + 1}`,
        text: claim.text,
        atomicJudgments: [],
        notes: "",
      }))
    ),
    unknownCheckpoints: CRITERIA.flatMap((key) =>
      item.reference.criteria[key].unknownCheckpoints.map((checkpoint) => ({
        ...checkpoint,
        criterion: key,
        retained: null,
        notes: "",
      }))
    ),
    conflicts: item.reference.expectedConflicts.map((conflict) => ({
      ...conflict,
      retainedWithBothSources: null,
      notes: "",
    })),
    referenceDisagreements: [],
    correctionCount: null,
    reviewedExportFile: null,
    notes: "",
  };
}

const stopCodes = new Set([
  "AI_UNAVAILABLE",
  "RATE_LIMITED",
  "NOT_ENABLED",
  "NETWORK_ERROR",
  "PROVIDER_ERROR",
  "GENERATION_TIMEOUT",
  "INVALID_INPUT",
  "NO_CANDIDATE_TURNS",
  "INPUT_TOO_LARGE",
  "INVALID_JSON",
  "INVALID_RESPONSE",
  "PROVENANCE_MISMATCH",
  "RUN_RECORD_UNAVAILABLE",
]);
async function runBatch({
  bundle,
  snapshot,
  directory,
  endpoint = "http://127.0.0.1:3000/api/review-brief",
  maxAttempts = 30,
  fetchImpl = fetch,
  executionType = "live_api",
  getServerRecord,
}) {
  const url = new URL(endpoint);
  assert(
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
      url.protocol === "http:" &&
      url.pathname === "/api/review-brief" &&
      !url.username &&
      !url.password &&
      !url.search,
    "Use the loopback development API only"
  );
  assert(
    Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 30,
    "maxAttempts must be 1–30"
  );
  assert(
    ["live_api", "mock_transport"].includes(executionType),
    "Unknown execution type"
  );
  fs.mkdirSync(directory, { recursive: false });
  const batch = {
    batchVersion: "phase4-batch-v1",
    executionType,
    startedAtUtc: new Date().toISOString(),
    datasetHash: bundle.datasetHash,
    frozenSnapshot: snapshot,
    endpoint,
    plan: plan(bundle),
    status: "running",
    stopReason: null,
  };
  fs.writeFileSync(
    path.join(directory, "batch.json"),
    JSON.stringify(batch, null, 2) + "\n",
    { flag: "wx" }
  );
  for (const slot of batch.plan.slice(0, maxAttempts)) {
    const item = bundle.cases.find((item) => item.id === slot.caseId);
    const started = Date.now();
    const record = {
      attemptVersion: "phase4-attempt-v1",
      executionType,
      slot,
      datasetHash: bundle.datasetHash,
      inputHash: item.inputHash,
      referenceHash: item.referenceHash,
      startedAtUtc: new Date(started).toISOString(),
    };
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.input),
        signal: AbortSignal.timeout(40_000),
        redirect: "error",
      });
      record.httpStatus = response.status;
      record.responseText = await response.text();
      try {
        record.responseBody = JSON.parse(record.responseText);
      } catch {
        record.responseBody = null;
      }
      record.outcome = classifyResponse(
        item,
        response.status,
        record.responseBody,
        snapshot.configuration
      );
      const attemptId =
        record.responseBody?.generation?.generationId ??
        record.responseBody?.attemptId;
      if (typeof attemptId === "string" && /^[a-f0-9-]{36}$/i.test(attemptId)) {
        let serverRecord = null;
        try {
          serverRecord = getServerRecord
            ? await getServerRecord(attemptId)
            : (() => {
                const file = path.join(
                  root,
                  ".review-brief-runs",
                  `${attemptId}.json`
                );
                return fs.existsSync(file) ? read(file) : null;
              })();
        } catch {
          /* A local collection error must not relabel a received draft as a network failure. */
        }
        if (
          serverRecord &&
          serverRecord.attemptId === attemptId &&
          serverRecord.inputHash === item.inputHash
        )
          record.serverRecord = serverRecord;
      }
      record.serverRecordAvailable = !!record.serverRecord;
      if (record.outcome.accepted && !record.serverRecordAvailable)
        record.collectionWarning = "RUN_RECORD_UNAVAILABLE";
    } catch {
      // Never persist exception messages, URLs from exceptions, SDK objects or credentials.
      record.outcome = { accepted: false, code: "NETWORK_ERROR" };
    }
    record.clientElapsedMs = Date.now() - started;
    fs.writeFileSync(
      path.join(directory, `${slot.slotId}.attempt.json`),
      JSON.stringify(record, null, 2) + "\n",
      { flag: "wx" }
    );
    if (record.outcome.accepted)
      fs.writeFileSync(
        path.join(directory, `${slot.slotId}.semantic-review.json`),
        JSON.stringify(reviewTemplate(item, record), null, 2) + "\n",
        { flag: "wx" }
      );
    if (stopCodes.has(record.outcome.code) || record.collectionWarning) {
      batch.stopReason = record.collectionWarning ?? record.outcome.code;
      break;
    }
  }
  const attempted = batch.plan.filter((slot) =>
    fs.existsSync(path.join(directory, `${slot.slotId}.attempt.json`))
  ).length;
  batch.finishedAtUtc = new Date().toISOString();
  batch.status = attempted === batch.plan.length ? "completed" : "stopped";
  if (!batch.stopReason && attempted < batch.plan.length)
    batch.stopReason = "ATTEMPT_LIMIT";
  fs.writeFileSync(
    path.join(directory, "batch.json"),
    JSON.stringify(batch, null, 2) + "\n"
  );
  return batch;
}

function summarizeBatch(bundle, directory) {
  const batch = read(path.join(directory, "batch.json"));
  assert(
    batch.datasetHash === bundle.datasetHash,
    "Results belong to a different dataset"
  );
  assert(
    jsonHash(batch.plan) === jsonHash(plan(bundle)),
    "Batch plan differs from the frozen 30-slot plan"
  );
  const records = batch.plan.flatMap((slot) => {
    const file = path.join(directory, `${slot.slotId}.attempt.json`);
    if (!fs.existsSync(file)) return [];
    const record = read(file);
    const item = bundle.cases.find((item) => item.id === slot.caseId);
    assert(
      record.datasetHash === bundle.datasetHash &&
        record.inputHash === item.inputHash &&
        record.referenceHash === item.referenceHash &&
        jsonHash(record.slot) === jsonHash(slot),
      `Result provenance mismatch: ${slot.slotId}`
    );
    assert(
      record.executionType === batch.executionType,
      "Mixed live and mock evidence"
    );
    const classified = classifyResponse(
      item,
      record.httpStatus ?? 0,
      record.responseBody,
      batch.frozenSnapshot.configuration
    );
    assert(
      !record.outcome.accepted || classified.accepted,
      `Stored acceptance is invalid: ${slot.slotId}`
    );
    return [
      {
        ...record,
        outcome: record.outcome.accepted ? classified : record.outcome,
      },
    ];
  });
  const accepted = records.filter((record) => record.outcome.accepted);
  const base = records.filter((record) => record.slot.kind === "base");
  const baseAccepted = accepted.filter((record) => record.slot.kind === "base");
  let matches = 0;
  const disagreements = [];
  for (const record of baseAccepted) {
    const item = bundle.cases.find((item) => item.id === record.slot.caseId);
    for (const key of CRITERIA) {
      const actual = record.outcome.draft.criteria[key].status;
      const expected = item.reference.criteria[key].expectedStatus;
      if (actual === expected) matches++;
      else
        disagreements.push({
          slotId: record.slot.slotId,
          criterion: key,
          expected,
          actual,
        });
    }
  }
  const quotes = {
    valid: 0,
    proposed: 0,
    inspectableOutputs: 0,
    attemptsWithoutInspectableOutput: 0,
  };
  for (const record of records) {
    let raw = record.serverRecord?.result?.output ?? record.responseBody?.draft;
    if (!raw && record.serverRecord?.rawOutput) {
      try {
        raw = JSON.parse(record.serverRecord.rawOutput);
      } catch {}
    }
    const result = inspectQuotes(
      bundle.cases.find((item) => item.id === record.slot.caseId).input,
      raw
    );
    quotes.valid += result.valid;
    quotes.proposed += result.total;
    if (result.inspectable) quotes.inspectableOutputs++;
    else quotes.attemptsWithoutInspectableOutput++;
  }
  const stability = bundle.cases
    .filter((item) => item.kind === "base")
    .map((item) => {
      const completed = baseAccepted.filter(
        (record) => record.slot.caseId === item.id
      );
      return {
        caseId: item.id,
        availableRepeats: completed.length,
        plannedRepeats: 3,
        statusChanges: CRITERIA.filter(
          (key) =>
            new Set(
              completed.map(
                (record) => record.outcome.draft.criteria[key].status
              )
            ).size > 1
        ),
        complete: completed.length === 3,
        semanticMeaning: "Not reviewed",
      };
    });
  const sensitivity = bundle.cases
    .filter((item) => item.kind === "variant")
    .flatMap((item) =>
      [1, 2, 3].map((repeat) => {
        const baseRecord = accepted.find(
          (record) =>
            record.slot.caseId === item.variantOf &&
            record.slot.repeat === repeat
        );
        const variant = accepted.find(
          (record) =>
            record.slot.caseId === item.id && record.slot.repeat === repeat
        );
        return {
          variant: item.id,
          base: item.variantOf,
          repeat,
          available: !!baseRecord && !!variant,
          statusChanges:
            baseRecord && variant
              ? CRITERIA.filter(
                  (key) =>
                    baseRecord.outcome.draft.criteria[key].status !==
                    variant.outcome.draft.criteria[key].status
                )
              : null,
          semanticMeaning: "Not reviewed",
        };
      })
    );
  return {
    summaryVersion: "phase4-summary-v1",
    executionType: batch.executionType,
    datasetHash: bundle.datasetHash,
    batchStatus: batch.status,
    stopReason: batch.stopReason,
    planned: { base: 24, variants: 6, total: 30, baseCriterionCells: 96 },
    attempted: {
      base: base.length,
      variants: records.length - base.length,
      total: records.length,
    },
    notAttempted: batch.plan
      .filter(
        (slot) => !records.some((record) => record.slot.slotId === slot.slotId)
      )
      .map((slot) => slot.slotId),
    completion: {
      baseValid: baseAccepted.length,
      baseAttempted: base.length,
      variantValid: accepted.length - baseAccepted.length,
      allValid: accepted.length,
      allAttempted: records.length,
    },
    criterionAgreement: {
      matches,
      availableCells: baseAccepted.length * 4,
      plannedCells: 96,
      agreement: baseAccepted.length
        ? matches / (baseAccepted.length * 4)
        : null,
      disagreements,
    },
    quotes,
    failures: records
      .filter((record) => !record.outcome.accepted)
      .map((record) => ({
        slotId: record.slot.slotId,
        code: record.outcome.code,
        httpStatus: record.httpStatus ?? null,
      })),
    stability,
    sensitivity,
    semanticReview:
      "Not aggregated automatically. Review the per-output templates; report human and assistant judgments separately.",
    humanTiming: "Not measured",
    fairness: "Not established",
    productionReadiness: "Not established",
  };
}

module.exports = {
  root,
  datasetDirectory,
  read,
  sha,
  jsonHash,
  assert,
  configuration,
  loadDataset,
  freezeDataset,
  verifyFreeze,
  plan,
  classifyResponse,
  inspectQuotes,
  runBatch,
  summarizeBatch,
};
