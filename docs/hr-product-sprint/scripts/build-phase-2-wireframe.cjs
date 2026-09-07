#!/usr/bin/env node
"use strict";

// Refresh embedded authored fixture data without rewriting the wireframe layout/logic.
const fs = require("node:fs");
const path = require("node:path");
const design = path.resolve(__dirname, "../design");
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(design, name), "utf8"));
const data = {
  profile: read("role-profile.json"),
  requests: {
    a: read("examples/practice-a.request.json"),
    b: read("examples/practice-b.request.json"),
    sparse: read("examples/sparse.request.json"),
  },
  drafts: {
    specific: read("examples/practice-a.draft.json"),
    conflicting: read("examples/practice-b.draft.json"),
    sparse: read("examples/sparse.draft.json"),
    unsupported: read("examples/unsupported-claim.draft.json"),
  },
};
const file = path.join(design, "wireframe.html");
const html = fs.readFileSync(file, "utf8");
const marker =
  /(<script type="application\/json" id="example-data">)[\s\S]*?(<\/script>)/;
if (!marker.test(html)) throw new Error("Wireframe data marker is missing");
const encoded = JSON.stringify(data).replace(/</g, "\\u003c");
fs.writeFileSync(
  file,
  html.replace(marker, (_, start, end) => start + encoded + end)
);
console.log(
  "Refreshed wireframe data from versioned authored examples; no model calls."
);
