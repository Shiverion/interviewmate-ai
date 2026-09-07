"use strict";

// Phase 2 executable specification. No provider calls, UI or persistence.
const { z } = require("zod");
const VERSION = "review-brief-v1";
const ROLE_VERSION = "frontend-review-v1";
const CRITERIA = ["R1", "R2", "R3", "R4"];
const text = (max) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(
      (value) => value.trim().length > 0,
      "Whitespace-only text is invalid"
    );
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const requestSchema = z.strictObject({
  schemaVersion: z.literal(VERSION),
  roleVersion: z.literal(ROLE_VERSION),
  transcriptId: id,
  transcriptVersion: text(80),
  synthetic: z.literal(true),
  turns: z
    .array(
      z.strictObject({
        id,
        speaker: z.enum(["candidate", "interviewer", "unknown"]),
        text: text(2000),
      })
    )
    .min(1)
    .max(100),
});

// Keep provider shape structural. Whitespace and cross-field checks run afterward.
const citationSchema = z.strictObject({
  turnId: id,
  quote: z.string().min(1).max(600),
});
const claimSchema = z.strictObject({
  text: z.string().min(1).max(350),
  citations: z.array(citationSchema).min(1).max(2),
});
const criterionSchema = z.strictObject({
  status: z.enum([
    "specific_evidence",
    "limited_evidence",
    "not_established",
    "conflicting_evidence",
  ]),
  claims: z.array(claimSchema).max(3),
  limitation: z.string().min(1).max(500),
  followUp: z.string().min(1).max(350),
});
const draftSchema = z.strictObject({
  schemaVersion: z.literal(VERSION),
  criteria: z.strictObject(
    Object.fromEntries(CRITERIA.map((key) => [key, criterionSchema]))
  ),
});

function issue(code, location, message) {
  return { code, path: location, message };
}
function validateRequest(value) {
  const parsed = requestSchema.safeParse(value);
  if (!parsed.success)
    return {
      ok: false,
      issues: parsed.error.issues.map((item) =>
        issue("INVALID_INPUT", item.path.join("."), item.message)
      ),
    };
  const data = parsed.data;
  const issues = [];
  const seen = new Set();
  for (const [index, turn] of data.turns.entries()) {
    if (seen.has(turn.id))
      issues.push(
        issue("DUPLICATE_TURN", `turns.${index}.id`, "Turn IDs must be unique")
      );
    seen.add(turn.id);
  }
  if (!data.turns.some((turn) => turn.speaker === "candidate"))
    issues.push(
      issue(
        "NO_CANDIDATE_TURNS",
        "turns",
        "Identify at least one candidate turn"
      )
    );
  if (data.turns.reduce((sum, turn) => sum + turn.text.length, 0) > 20000)
    issues.push(
      issue(
        "TEXT_TOO_LONG",
        "turns",
        "Combined text exceeds 20,000 UTF-16 code units"
      )
    );
  return issues.length ? { ok: false, issues } : { ok: true, data };
}

function validateDraft(input, value) {
  const request = validateRequest(input);
  if (!request.ok) return request;
  const parsed = draftSchema.safeParse(value);
  if (!parsed.success)
    return {
      ok: false,
      issues: parsed.error.issues.map((item) =>
        issue("INVALID_OUTPUT", item.path.join("."), item.message)
      ),
    };
  const issues = [];
  const turns = new Map(request.data.turns.map((turn) => [turn.id, turn]));
  for (const key of CRITERIA) {
    const entry = parsed.data.criteria[key];
    const prefix = `criteria.${key}`;
    if (entry.status !== "not_established" && entry.claims.length === 0)
      issues.push(
        issue("EMPTY_EVIDENCE", prefix, "This status requires a cited claim")
      );
    const citedTurns = new Set();
    for (const [field, value] of [
      ["limitation", entry.limitation],
      ["followUp", entry.followUp],
    ]) {
      if (!value.trim())
        issues.push(
          issue(
            "BLANK_TEXT",
            `${prefix}.${field}`,
            "Text must not be whitespace-only"
          )
        );
    }
    for (const [index, claim] of entry.claims.entries()) {
      if (!claim.text.trim())
        issues.push(
          issue(
            "BLANK_TEXT",
            `${prefix}.claims.${index}.text`,
            "Claim must not be whitespace-only"
          )
        );
      for (const [citationIndex, citation] of claim.citations.entries()) {
        const location = `${prefix}.claims.${index}.citations.${citationIndex}`;
        const turn = turns.get(citation.turnId);
        if (!turn)
          issues.push(
            issue("UNKNOWN_TURN", location, "Citation turn does not exist")
          );
        else if (turn.speaker !== "candidate")
          issues.push(
            issue(
              "WRONG_SPEAKER",
              location,
              "Candidate claims require candidate turns"
            )
          );
        else if (!citation.quote.trim() || !turn.text.includes(citation.quote))
          issues.push(
            issue(
              "QUOTE_MISMATCH",
              location,
              "Quotation is not an exact nonblank substring"
            )
          );
        else citedTurns.add(turn.id);
      }
    }
    if (entry.status === "conflicting_evidence" && citedTurns.size < 2)
      issues.push(
        issue(
          "CONFLICT_NEEDS_TWO_TURNS",
          prefix,
          "Cite both candidate turns in a conflict"
        )
      );
  }
  return issues.length
    ? { ok: false, issues }
    : { ok: true, data: parsed.data };
}

module.exports = {
  VERSION,
  ROLE_VERSION,
  CRITERIA,
  requestSchema,
  draftSchema,
  validateRequest,
  validateDraft,
};
