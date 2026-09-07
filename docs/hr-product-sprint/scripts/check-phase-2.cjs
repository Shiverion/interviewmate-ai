#!/usr/bin/env node
"use strict";

// Offline checks of the Phase 2 executable specification and authored fixtures.
// No provider calls; these checks do not judge semantic support or hiring quality.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { z } = require("zod");
const design = path.resolve(__dirname, "../design");
const { validateRequest, validateDraft, draftSchema } = require(
  path.join(design, "review-brief-contract.cjs")
);
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(design, name), "utf8"));
let checks = 0;
function check(name, run) {
  try {
    run();
    checks++;
  } catch (error) {
    throw new Error(`${name}: ${error.message}`, { cause: error });
  }
}
const a = read("examples/practice-a.request.json");
const good = read("examples/practice-a.draft.json");
const clone = structuredClone;
function rejectInput(name, change, code) {
  check(name, () => {
    const input = clone(a);
    change(input);
    const result = validateRequest(input);
    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some((item) => item.code === code),
      JSON.stringify(result.issues)
    );
  });
}
function rejectDraft(name, change, code) {
  check(name, () => {
    const output = clone(good);
    change(output);
    const result = validateDraft(a, output);
    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some((item) => item.code === code),
      JSON.stringify(result.issues)
    );
  });
}

for (const example of read("examples/catalog.json").examples) {
  check(`Authored fixture ${example.id}`, () => {
    const input = read("examples/" + example.request);
    assert.equal(validateRequest(input).ok, true);
    const result = validateDraft(input, read("examples/" + example.draft));
    assert.equal(result.ok, example.mechanicalValid, JSON.stringify(result));
    if (example.expectedIssue)
      assert.ok(
        result.issues.some((item) => item.code === example.expectedIssue)
      );
  });
}

rejectInput(
  "Empty transcript",
  (value) => {
    value.turns = [];
  },
  "INVALID_INPUT"
);
rejectInput(
  "Duplicate turn ID",
  (value) => {
    value.turns[1].id = value.turns[0].id;
  },
  "DUPLICATE_TURN"
);
rejectInput(
  "Unknown role version",
  (value) => {
    value.roleVersion = "arbitrary-role";
  },
  "INVALID_INPUT"
);
rejectInput(
  "Client-supplied criteria",
  (value) => {
    value.criteria = ["confidence"];
  },
  "INVALID_INPUT"
);
rejectInput(
  "Non-synthetic label",
  (value) => {
    value.synthetic = false;
  },
  "INVALID_INPUT"
);
rejectInput(
  "Whitespace-only answer",
  (value) => {
    value.turns[1].text = " \t\n";
  },
  "INVALID_INPUT"
);
rejectInput(
  "No candidate turns",
  (value) => {
    value.turns.forEach((turn) => {
      turn.speaker = "unknown";
    });
  },
  "NO_CANDIDATE_TURNS"
);
rejectInput(
  "Oversized single turn",
  (value) => {
    value.turns[1].text = "x".repeat(2001);
  },
  "INVALID_INPUT"
);
rejectInput(
  "Oversized total transcript",
  (value) => {
    value.turns = Array.from({ length: 11 }, (_, i) => ({
      id: `T${i}`,
      speaker: "candidate",
      text: "x".repeat(2000),
    }));
  },
  "TEXT_TOO_LONG"
);
rejectDraft(
  "Missing criterion",
  (value) => {
    delete value.criteria.R4;
  },
  "INVALID_OUTPUT"
);
rejectDraft(
  "Additional score field",
  (value) => {
    value.overallScore = 95;
  },
  "INVALID_OUTPUT"
);
rejectDraft(
  "Uncited claim",
  (value) => {
    value.criteria.R1.claims[0].citations = [];
  },
  "INVALID_OUTPUT"
);
rejectDraft(
  "Missing turn",
  (value) => {
    value.criteria.R1.claims[0].citations[0].turnId = "MISSING";
  },
  "UNKNOWN_TURN"
);
rejectDraft(
  "Changed quotation",
  (value) => {
    value.criteria.R1.claims[0].citations[0].quote +=
      " fabricated continuation";
  },
  "QUOTE_MISMATCH"
);
rejectDraft(
  "Whitespace quotation",
  (value) => {
    value.criteria.R1.claims[0].citations[0].quote = " ";
  },
  "QUOTE_MISMATCH"
);
rejectDraft(
  "Whitespace limitation",
  (value) => {
    value.criteria.R1.limitation = " ";
  },
  "BLANK_TEXT"
);
rejectDraft(
  "Specific status without evidence",
  (value) => {
    value.criteria.R1.claims = [];
  },
  "EMPTY_EVIDENCE"
);
rejectDraft(
  "Conflict without two distinct turns",
  (value) => {
    value.criteria.R2.status = "conflicting_evidence";
  },
  "CONFLICT_NEEDS_TWO_TURNS"
);

check(
  "Unknown speaker accepted as context but rejected as claim support",
  () => {
    const input = clone(a);
    input.turns[1].speaker = "unknown";
    assert.equal(validateRequest(input).ok, true);
    const result = validateDraft(input, good);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((item) => item.code === "WRONG_SPEAKER"));
  }
);
check("Request parsing preserves text exactly", () => {
  const input = clone(a);
  input.turns[1].text = '  Café e\u0301 "quoted"\r\nNext line.  ';
  const parsed = validateRequest(input);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.turns[1].text, input.turns[1].text);
});
check("Output schema can be serialized for structured generation", () => {
  const schema = z.toJSONSchema(draftSchema);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.criteria.required, [
    "R1",
    "R2",
    "R3",
    "R4",
  ]);
});

const packet = fs
  .readFileSync(
    path.resolve(design, "../evaluation/practice/reviewer-packet.md"),
    "utf8"
  )
  .replace(/\r\n/g, "\n");
for (const letter of ["a", "b"]) {
  check(`P1-${letter.toUpperCase()} source-copy integrity`, () => {
    const input = read(`examples/practice-${letter}.request.json`);
    assert.equal(input.turns.length, 14);
    for (const turn of input.turns) {
      const escaped = turn.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = packet.match(
        new RegExp(
          `\\*\\*${escaped} — (Candidate|Interviewer)[^*]*\\*\\* ([\\s\\S]*?)(?=\\n\\n\\*\\*P1-|\\n## |$)`
        )
      );
      assert.ok(match, turn.id);
      assert.equal(match[1].toLowerCase(), turn.speaker);
      assert.equal(match[2].trim(), turn.text);
    }
  });
}
check("Role/questions preserve Phase 1 shared question set", () => {
  const profile = read("role-profile.json");
  assert.deepEqual(
    profile.criteria.map((item) => item.id),
    ["R1", "R2", "R3", "R4"]
  );
  assert.equal(profile.questions.length, 5);
  for (const question of profile.questions)
    assert.ok(packet.includes(question.text), question.id);
});
check("Wireframe embeds current canonical authored data", () => {
  const html = fs.readFileSync(path.join(design, "wireframe.html"), "utf8");
  const match = html.match(
    /<script type="application\/json" id="example-data">([\s\S]*?)<\/script>/
  );
  assert.ok(match);
  const embedded = JSON.parse(match[1]);
  assert.deepEqual(embedded.profile, read("role-profile.json"));
  for (const [id, file] of Object.entries({
    a: "practice-a",
    b: "practice-b",
    sparse: "sparse",
  }))
    assert.deepEqual(
      embedded.requests[id],
      read(`examples/${file}.request.json`)
    );
  for (const [id, file] of Object.entries({
    specific: "practice-a",
    conflicting: "practice-b",
    sparse: "sparse",
    unsupported: "unsupported-claim",
  }))
    assert.deepEqual(embedded.drafts[id], read(`examples/${file}.draft.json`));
});
console.log(
  `${checks} offline Phase 2 checks passed: authored fixtures, rejection rules, schema serialization and source-copy integrity.`
);
console.log(
  "The unsupported-claim control passes mechanical checks by design; semantic support, live AI quality and human timing remain unmeasured."
);
