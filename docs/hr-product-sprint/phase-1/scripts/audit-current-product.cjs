#!/usr/bin/env node
"use strict";

// Offline inventory of three known source files, not a safety or quality validator.
// Product modules are parsed, never imported or executed. No network or env reads.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../../..");
const output = path.resolve(__dirname, "../baseline/current-product-audit.json");
const paths = {
  evaluator: "src/app/api/evaluate/route.ts",
  scoringHelper: "src/lib/utils/scoring.ts",
  reportPage: "src/app/(recruiter)/interviews/[sessionId]/page.tsx",
};
const files = Object.fromEntries(Object.entries(paths).map(([key, relativePath]) => {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  const source = ts.createSourceFile(relativePath, bytes.toString("utf8"), ts.ScriptTarget.Latest, true);
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${relativePath}`);
  return [key, { source, path: relativePath, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }];
}));

function nodes(source, predicate) {
  const found = [];
  function visit(node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}
function line(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}
function only(items, description) {
  if (items.length !== 1) throw new Error(`Expected one ${description}, found ${items.length}; inspect source before extending audit.`);
  return items[0];
}
function variable(source, name) {
  return only(nodes(source, n => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name), name);
}
function numericArgument(step) {
  if (!step) return null;
  if (step.args.length !== 1 || !ts.isNumericLiteral(step.args[0])) throw new Error("Expected literal numeric schema bound");
  return Number(step.args[0].text);
}

// Supports the inline Zod calls in this snapshot. Unrecognized syntax fails loudly;
// this intentionally does not follow aliases, spreads, refinements, or imported schemas.
function schema(source, expression) {
  const chain = [];
  let current = expression;
  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    chain.unshift({ name: current.expression.name.text, args: [...current.arguments] });
    current = current.expression.expression;
  }
  if (!ts.isIdentifier(current) || current.text !== "z" || !chain.length) throw new Error("Unsupported schema expression");
  const [base, ...modifiers] = chain;
  const supported = new Set(["min", "max", "describe", "optional", "nullable", "nullish", "default"]);
  for (const modifier of modifiers) if (!supported.has(modifier.name)) throw new Error(`Unsupported schema modifier: ${modifier.name}`);
  const names = modifiers.map(m => m.name);
  const result = {
    type: base.name,
    required: !names.some(n => ["optional", "nullish", "default"].includes(n)),
    nullable: names.some(n => ["nullable", "nullish"].includes(n)),
    line: line(source, expression),
  };
  if (base.name === "object") {
    if (base.args.length !== 1 || !ts.isObjectLiteralExpression(base.args[0])) throw new Error("Expected inline schema object");
    result.fields = Object.fromEntries(base.args[0].properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) throw new Error("Expected named schema property");
      return [property.name.text, schema(source, property.initializer)];
    }));
  } else if (base.name === "array") {
    if (base.args.length !== 1) throw new Error("Expected one array item schema");
    result.item = schema(source, base.args[0]);
  } else if (!["number", "string", "boolean", "enum"].includes(base.name)) {
    throw new Error(`Unsupported schema type: ${base.name}`);
  }
  if (["number", "array"].includes(base.name)) {
    result.min = numericArgument(modifiers.find(m => m.name === "min"));
    result.max = numericArgument(modifiers.find(m => m.name === "max"));
  }
  return result;
}

const evaluator = files.evaluator.source;
const fullSchema = schema(evaluator, variable(evaluator, "evaluationSchema").initializer);
const scoreFields = fullSchema.fields.scores.fields;
const evidenceFields = fullSchema.fields.evidence.fields;
if (!scoreFields || !evidenceFields) throw new Error("Expected score and evidence objects");
const dimensions = Object.entries(scoreFields).map(([name, value]) => ({ name, ...value }));
const evidenceCollections = Object.entries(evidenceFields).map(([name, value]) => ({ name, ...value }));
if (evidenceCollections.some(field => field.type !== "array")) throw new Error("Evidence shape changed; revisit collection interpretation");
const helperName = "calculateOverallScore";
const helperDefinition = only(nodes(files.scoringHelper.source, n => ts.isFunctionDeclaration(n) && n.name?.text === helperName), helperName);
const helperReferences = nodes(evaluator, n => ts.isIdentifier(n) && n.text === helperName);
const scoringImports = nodes(evaluator, n => ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text === "@/lib/utils/scoring");
const modelOutput = variable(evaluator, "evaluationData");

const report = files.reportPage.source;
const stateBindings = nodes(report, n => ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer)
  && ts.isIdentifier(n.initializer.expression) && n.initializer.expression.text === "useState")
  .map(n => ({ binding: n.name.getText(report), line: line(report, n) }));
const elements = nodes(report, n => ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n));
function attributes(node) {
  return node.attributes.properties.filter(ts.isJsxAttribute).map(a => ({
    name: a.name.getText(report),
    value: a.initializer?.getText(report) ?? null,
  }));
}
function elementRecord(node) {
  return { tag: node.tagName.getText(report), line: line(report, node), attributes: attributes(node).filter(a => a.name !== "className") };
}
const editingTags = new Set(["input", "textarea", "select", "form"]);
const editingControls = elements.filter(n => editingTags.has(n.tagName.getText(report))
  || attributes(n).some(a => a.name === "contentEditable")).map(elementRecord);
const buttons = elements.filter(n => n.tagName.getText(report) === "button").map(n => ({
  ...elementRecord(n),
  literalText: nodes(n.parent, ts.isJsxText).map(t => t.text.trim()).filter(Boolean).join(" "),
}));
const handlers = elements.flatMap(n => attributes(n).filter(a => /^on[A-Z]/.test(a.name)).map(a => ({
  tag: n.tagName.getText(report), line: line(report, n), ...a,
})));
const customComponents = [...new Set(elements.map(n => n.tagName.getText(report)).filter(tag => /^[A-Z]/.test(tag)))];
const statusComparisons = nodes(report, n => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
  && ts.isIdentifier(n.left) && n.left.text === "status" && ts.isStringLiteral(n.right))
  .map(n => ({ value: n.right.text, line: line(report, n) }));

const audit = {
  auditKind: "offline_source_inventory",
  auditVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  parser: { name: "typescript", version: ts.version },
  inspectedFiles: Object.values(files).map(({ path, sha256 }) => ({ path, sha256 })),
  evaluationSchema: {
    requiredNumericDimensionCount: dimensions.filter(d => d.type === "number" && d.required).length,
    dimensions,
    evidenceCollectionCount: evidenceCollections.length,
    freeTextEvidenceCollectionCount: evidenceCollections.filter(e => e.item.type === "string").length,
    structuredEvidenceItemCollectionCount: evidenceCollections.filter(e => e.item.type === "object").length,
    evidenceCollections,
    minimumStrengthItems: evidenceFields.strengths?.min ?? null,
    minimumWeaknessItems: evidenceFields.weaknesses?.min ?? null,
    structuredCitationFieldsWithinEvidenceItems: evidenceCollections.flatMap(e => Object.keys(e.item.fields ?? {})),
    topLevelFields: Object.keys(fullSchema.fields),
  },
  deterministicTotalHelper: {
    name: helperName,
    definition: { path: paths.scoringHelper, line: line(files.scoringHelper.source, helperDefinition) },
    identifierReferenceCountInEvaluator: helperReferences.length,
    canonicalScoringModuleImportsInEvaluator: scoringImports.length,
    evaluationDataInitializer: { expression: modelOutput.initializer.getText(evaluator), line: line(evaluator, modelOutput) },
  },
  reportPageAffordances: {
    nativeEditingControlCount: editingControls.length,
    nativeEditingControls: editingControls,
    nativeButtons: buttons,
    jsxEventHandlers: handlers,
    customJsxComponentTags: customComponents,
    localUseStateBindings: stateBindings,
    comparedSessionStatuses: statusComparisons,
    semanticReviewerStateConclusion: "Requires manual source interpretation; see current-product-baseline.md. This inventory does not infer review semantics from variable names.",
  },
  limitations: [
    "Only the three listed source files were inspected; hashes identify their exact bytes.",
    "Schema extraction understands this inline syntax only; it is not a general Zod or application validator.",
    "Identifier/import counts do not follow aliases, re-exports, indirect calls, runtime-generated UI, or other routes.",
    "JSX inventories describe source affordances, not a browser-tested accessible user journey.",
    "No product module, model request, Firebase operation, or candidate dataset was executed.",
    "No human timing, hallucination frequency, scoring consistency, hiring outcome, or fairness result was measured.",
  ],
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, output).split(path.sep).join("/")}`);
console.log(`${audit.evaluationSchema.requiredNumericDimensionCount} required numeric dimensions; ${audit.evaluationSchema.freeTextEvidenceCollectionCount} free-text evidence collections; ${editingControls.length} native report editing controls.`);
