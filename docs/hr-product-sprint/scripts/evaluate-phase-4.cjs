#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  root,
  loadDataset,
  freezeDataset,
  verifyFreeze,
  runBatch,
  summarizeBatch,
} = require("./evaluation/core.cjs");

function report(summary) {
  const agreement = summary.criterionAgreement;
  const quote = summary.quotes;
  return (
    `# Phase 4 batch results\n\nExecution: **${summary.executionType}**. Status: **${summary.batchStatus}**. Stop reason: **${summary.stopReason ?? "None"}**.\n\n[Phase 4 report](../../../phases/04-evaluation-and-iteration.md) · [Evaluation guide](../../phase-4-guide.md)\n\n` +
    `This report is generated from preserved attempt records. Status agreement is against provisional assistant-authored references, not hiring accuracy or practitioner consensus.\n\n` +
    `| Measure | Observed | Planned / limit |\n|---|---|---|\n` +
    `| Base attempts | ${summary.attempted.base} | 24 planned |\n| Variant attempts | ${summary.attempted.variants} | 6 planned |\n| Valid base drafts | ${summary.completion.baseValid}/${summary.completion.baseAttempted} attempted | 24 planned drafts |\n` +
    `| Criterion status agreement | ${agreement.availableCells ? `${agreement.matches}/${agreement.availableCells} available cells` : "Not available: no valid base drafts"} | 96 planned cells; missing outputs are not disagreements |\n` +
    `| Exact candidate quotes | ${quote.proposed ? `${quote.valid}/${quote.proposed} inspectable proposed quotes` : "Not available: no inspectable proposed quotes"} | ${quote.attemptsWithoutInspectableOutput} attempt(s) without inspectable output |\n` +
    `| Human claim support / unknown preservation / conflict meaning | Not reviewed | Requires explicit semantic judgments |\n| Human time / time saved | Not measured | No human timing session |\n| Population fairness / production readiness | Not established | Narrow synthetic scenarios cannot establish either |\n\n` +
    `## Failures\n\n${summary.failures.length ? summary.failures.map((failure) => `- ${failure.slotId}: ${failure.code}; HTTP ${failure.httpStatus ?? "unavailable"}.`).join("\n") : "No failed attempts in this batch."}\n\n` +
    `## Coverage and consistency\n\n${summary.notAttempted.length} planned slots were not attempted. They are listed in summary.json and must not be counted as provider failures. ${summary.stability.filter((item) => item.complete).length}/8 base cases have all three valid repeats. ${summary.sensitivity.filter((item) => item.available).length}/6 matched variant pairs are available. Identical statuses would still require a check for changes in meaning.\n\n` +
    `Read batch.json for the frozen configuration and plan, *.attempt.json for HTTP and raw server evidence, and summary.json for per-case status disagreements and repeat coverage. Successful attempts create separate blank semantic-review templates. Never fill them from quote matching alone.\n`
  );
}

async function main() {
  const [command = "--check", ...args] = process.argv.slice(2);
  const bundle = loadDataset();
  if (command === "--freeze") {
    const snapshot = freezeDataset(bundle);
    console.log(
      `Frozen ${bundle.cases.length} cases before model runs. Dataset SHA-256: ${snapshot.datasetHash}`
    );
    return;
  }
  const snapshot = verifyFreeze(bundle);
  if (command === "--check") {
    console.log(
      `Frozen dataset verified: 8 base cases + 2 variants; 30 planned runs; 96 planned base criterion cells. No model calls.`
    );
    return;
  }
  let directory;
  if (command === "--run") {
    if (args.length && (args.length !== 2 || args[0] !== "--max-attempts"))
      throw new Error("Use --run [--max-attempts 1..30]");
    const outputRoot = path.join(
      root,
      "docs/hr-product-sprint/evaluation/results"
    );
    fs.mkdirSync(outputRoot, { recursive: true });
    directory = path.join(
      outputRoot,
      `phase4-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`
    );
    await runBatch({
      bundle,
      snapshot,
      directory,
      maxAttempts: args.length ? Number(args[1]) : 30,
    });
  } else if (command === "--summarize" && args.length === 1) {
    directory = path.resolve(args[0]);
  } else
    throw new Error(
      "Use --check, --freeze, --run [--max-attempts 1..30], or --summarize <batch-directory>"
    );
  const summary = summarizeBatch(bundle, directory);
  fs.writeFileSync(
    path.join(directory, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n"
  );
  fs.writeFileSync(path.join(directory, "report.md"), report(summary));
  console.log(
    JSON.stringify(
      {
        directory: path.relative(root, directory),
        executionType: summary.executionType,
        status: summary.batchStatus,
        stopReason: summary.stopReason,
        attempted: summary.attempted,
        validDrafts: summary.completion.allValid,
        notAttempted: summary.notAttempted.length,
      },
      null,
      2
    )
  );
  if (
    command === "--run" &&
    (summary.failures.length ||
      (summary.stopReason && summary.stopReason !== "ATTEMPT_LIMIT"))
  )
    process.exitCode = 2;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
