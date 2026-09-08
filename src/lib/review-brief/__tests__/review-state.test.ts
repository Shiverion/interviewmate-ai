/** @jest-environment node */
import { fixtures } from "../fixtures";
import { CRITERIA, validateDraft, validateRequest } from "../contract";
import {
  canExport,
  canReview,
  checkCriterion,
  createReview,
  editCriterion,
  exportReview,
  markReviewed,
  removeClaim,
  restoreClaim,
  setNote,
  setReviewer,
} from "../review-state";
import type { Generation } from "../types";

const generation: Generation = {
  generationId: "test-authored",
  sourceType: "authored_example",
  generatedAtUtc: null,
  contractVersion: "review-brief-v1",
  contractHash: "a".repeat(64),
  roleVersion: "frontend-review-v1",
  roleHash: "b".repeat(64),
  promptVersion: "review-brief-v1",
  promptHash: "c".repeat(64),
  modelRequested: null,
  modelReturned: null,
  inputHash: "d".repeat(64),
  latencyMs: null,
  usage: null,
};
const fresh = () =>
  createReview(fixtures[0].input, fixtures[0].draft, generation);
const reviewed = () =>
  markReviewed(
    CRITERIA.reduce(
      (state, key) => checkCriterion(state, key, true),
      setReviewer(fresh(), "reviewer-01")
    )
  );

test.each(fixtures)(
  "runtime accepts unchanged Phase 2 $id fixtures",
  (fixture) => {
    expect(validateRequest(fixture.input).ok).toBe(true);
    expect(validateDraft(fixture.input, fixture.draft).ok).toBe(true);
  }
);
test("exact candidate quotes are required, even if a paraphrase is plausible", () => {
  const draft = structuredClone(fixtures[0].draft);
  draft.criteria.R1.claims[0].citations[0].quote =
    "A plausible but invented source sentence.";
  expect(validateDraft(fixtures[0].input, draft)).toMatchObject({
    ok: false,
    issues: [expect.objectContaining({ code: "QUOTE_MISMATCH" })],
  });
});
test("interviewer and unknown turns cannot support candidate claims", () => {
  for (const speaker of ["interviewer", "unknown"] as const) {
    const input = structuredClone(fixtures[0].input);
    const cite = fixtures[0].draft.criteria.R1.claims[0].citations[0];
    input.turns.find((turn) => turn.id === cite.turnId)!.speaker = speaker;
    expect(validateDraft(input, fixtures[0].draft).ok).toBe(false);
  }
});
test("review requires an ID and all four checks; exports reject unfinished work", () => {
  expect(canReview(fresh())).toBe(false);
  expect(() => exportReview(fresh())).toThrow();
  expect(() => markReviewed(fresh())).toThrow();
  expect(canExport(reviewed())).toBe(true);
});
test("editing invalidates only that criterion and preserves immutable original", () => {
  const before = reviewed();
  const entry = structuredClone(before.currentDraft.criteria.R1);
  entry.claims[0].text =
    "Reviewer correction, still requiring semantic inspection.";
  const after = editCriterion(before, "R1", entry);
  expect(after.checked).toEqual({ R1: false, R2: true, R3: true, R4: true });
  expect(canExport(after)).toBe(false);
  expect(after.originalDraft).toEqual(fixtures[0].draft);
  expect(before.currentDraft).toEqual(fixtures[0].draft);
});
test("citations cannot be rewritten through the text editor", () => {
  const entry = structuredClone(fresh().currentDraft.criteria.R1);
  entry.claims[0].citations[0].quote = "replacement";
  expect(() => editCriterion(fresh(), "R1", entry)).toThrow();
});
test("remove and restore use stable IDs, preserve edits and block an invalid empty positive status", () => {
  let state = fresh();
  const entry = structuredClone(state.currentDraft.criteria.R1);
  entry.claims[0].text = "Edited before removal.";
  state = editCriterion(state, "R1", entry);
  const originalId = state.claimIds.R1[0];
  const count = state.claimIds.R1.length;
  state = removeClaim(state, "R1", originalId);
  expect(state.claimIds.R1).not.toContain(originalId);
  expect(canReview(state)).toBe(false);
  state = restoreClaim(state, "R1");
  expect(state.claimIds.R1[0]).toBe(originalId);
  expect(state.claimIds.R1).toHaveLength(count);
  expect(state.currentDraft.criteria.R1.claims[0].text).toBe(
    "Edited before removal."
  );
});
test.each(["identity", "note"])(
  "changing %s clears every check and review attestation",
  (kind) => {
    const state =
      kind === "identity"
        ? setReviewer(reviewed(), "someone-else")
        : setNote(reviewed(), "New caveat");
    expect(Object.values(state.checked)).toEqual([false, false, false, false]);
    expect(canExport(state)).toBe(false);
  }
);
test("unchecking after review locks exports; conflicts can remain reviewed", () => {
  expect(canExport(checkCriterion(reviewed(), "R2", false))).toBe(false);
  const conflict = createReview(
    fixtures[1].input,
    fixtures[1].draft,
    generation
  );
  const state = markReviewed(
    CRITERIA.reduce(
      (value, key) => checkCriterion(value, key, true),
      setReviewer(conflict, "reviewer")
    )
  );
  expect(canExport(state)).toBe(true);
});
test("export carries original and reviewed content and authored provenance without aliases", () => {
  const state = reviewed();
  const record = exportReview(state);
  record.originalDraft.criteria.R1.limitation = "changed outside state";
  expect(state.originalDraft).toEqual(fixtures[0].draft);
  expect(record.generation.sourceType).toBe("authored_example");
  expect(record.generation.modelRequested).toBeNull();
  expect(record.input).toEqual(fixtures[0].input);
});
