#!/usr/bin/env node
"use strict";

// Dependency-free checks for this repository's Markdown conventions.
// Checks local inline links, reference definitions, heading anchors and reachability.
// External URLs, HTML links and links inside code blocks/spans are not checked.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const scratch = path.join(root, "docs/hr-product-sprint/evaluation/runs");
const relative = (file) => path.relative(root, file).split(path.sep).join("/");

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (file === scratch || entry.isSymbolicLink()) return [];
    if (entry.isDirectory()) return markdownFiles(file);
    return entry.isFile() && file.endsWith(".md") ? [file] : [];
  });
}

const files = [
  ...fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(root, entry.name)),
  ...markdownFiles(path.join(root, "docs")),
].sort();

function withoutFences(body) {
  let fence = null;
  return body.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (match && match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim()) fence = null;
      return "";
    }
    if (match) { fence = match[1]; return ""; }
    return line;
  }).join("\n");
}

function headingAnchors(body) {
  const used = new Set();
  for (const match of body.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const text = match[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, "");
    const base = text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, "").replace(/\s/g, "-");
    let slug = base;
    for (let index = 1; used.has(slug); index++) slug = base + "-" + index;
    used.add(slug);
  }
  return used;
}

const documents = new Map(files.map((file) => {
  const body = withoutFences(fs.readFileSync(file, "utf8"));
  return [file, { body, anchors: headingAnchors(body), targets: new Set() }];
}));
const errors = [];
let checked = 0;

function checkLink(file, lineNumber, destination) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(destination)) return;
  checked++;
  try {
    const hashIndex = destination.indexOf("#");
    const pathname = (hashIndex < 0 ? destination : destination.slice(0, hashIndex)).split("?")[0];
    const fragment = hashIndex < 0 ? "" : decodeURIComponent(destination.slice(hashIndex + 1));
    const target = pathname ? path.resolve(path.dirname(file), decodeURIComponent(pathname)) : file;
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error("target leaves repository");
    if (!fs.existsSync(target)) throw new Error("missing target");
    if (documents.has(target)) {
      documents.get(file).targets.add(target);
      if (fragment && !documents.get(target).anchors.has(fragment)) throw new Error("missing heading anchor");
    }
  } catch (error) {
    errors.push(`${relative(file)}:${lineNumber}: ${error.message}: ${destination}`);
  }
}

// Balanced parentheses allow App Router paths such as (recruiter)/[sessionId].
for (const [file, document] of documents) {
  for (const [index, sourceLine] of document.body.split("\n").entries()) {
    const line = sourceLine.replace(/(`+)[\s\S]*?\1/g, "");
    for (let cursor = 0; cursor < line.length; cursor++) {
      if (line.slice(cursor, cursor + 2) !== "](") continue;
      const start = cursor + 2;
      let end = start;
      let destination;
      if (line[start] === "<") {
        end = line.indexOf(">", start + 1);
        if (end < 0) { errors.push(`${relative(file)}:${index + 1}: unclosed angle destination`); continue; }
        destination = line.slice(start + 1, end);
      } else {
        let depth = 1;
        for (; end < line.length; end++) {
          if (line[end] === "\\") { end++; continue; }
          if (line[end] === "(") depth++;
          if (line[end] === ")" && --depth === 0) break;
        }
        if (end === line.length) { errors.push(`${relative(file)}:${index + 1}: unclosed link destination`); continue; }
        destination = line.slice(start, end).replace(/\s+["'][\s\S]*["']\s*$/, "");
      }
      checkLink(file, index + 1, destination.replace(/\\([()])/g, "$1"));
      cursor = end;
    }
    const reference = line.match(/^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/);
    if (reference) checkLink(file, index + 1, reference[1] || reference[2]);
  }
}

const reached = new Set();
function visit(file) {
  if (reached.has(file) || !documents.has(file)) return;
  reached.add(file);
  for (const target of documents.get(file).targets) visit(target);
}
visit(path.join(root, "README.md"));
for (const file of files) {
  if (!reached.has(file)) errors.push(`${relative(file)}: no reading path from the root README`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`${errors.length} documentation issue(s); checked ${checked} local links across ${files.length} Markdown files.`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${checked} local links across ${files.length} Markdown files: all targets/anchors resolve and every document is reachable from README.md.`);
}
