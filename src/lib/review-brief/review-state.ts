import {
  Claim,
  Criterion,
  CriterionId,
  CRITERIA,
  ReviewDraft,
  ReviewInput,
  validateDraft,
} from "./contract";
import type { Generation } from "./types";
import roleProfile from "./role-profile.json";

export const STATUS_LABELS: Record<Criterion["status"], string> = {
  specific_evidence: "Specific evidence",
  limited_evidence: "Limited evidence",
  not_established: "Not established",
  conflicting_evidence: "Conflicting evidence",
};
type PerCriterion<T> = Record<CriterionId, T>;
const perCriterion = <T>(create: (key: CriterionId) => T): PerCriterion<T> =>
  Object.fromEntries(
    CRITERIA.map((key) => [key, create(key)])
  ) as PerCriterion<T>;
export type ReviewSession = {
  input: ReviewInput;
  generation: Generation;
  originalDraft: ReviewDraft;
  currentDraft: ReviewDraft;
  claimIds: PerCriterion<string[]>;
  removed: PerCriterion<{ id: string; claim: Claim; position: number }[]>;
  checked: PerCriterion<boolean>;
  revision: number;
  reviewedRevision: number | null;
  reviewedAt: string | null;
  reviewerId: string;
  reviewerNote: string;
};
export function createReview(
  input: ReviewInput,
  draft: ReviewDraft,
  generation: Generation
): ReviewSession {
  const checked = validateDraft(input, draft);
  if (!checked.ok)
    throw new Error("Cannot open a draft with invalid evidence references");
  return {
    input: structuredClone(input),
    generation: structuredClone(generation),
    originalDraft: structuredClone(draft),
    currentDraft: structuredClone(draft),
    claimIds: perCriterion((key) =>
      draft.criteria[key].claims.map((_, i) => `${key}-C${i + 1}`)
    ),
    removed: perCriterion(() => []),
    checked: perCriterion(() => false),
    revision: 1,
    reviewedRevision: null,
    reviewedAt: null,
    reviewerId: "",
    reviewerNote: "",
  };
}
function invalidate(session: ReviewSession, key?: CriterionId): ReviewSession {
  return {
    ...session,
    revision: session.revision + 1,
    reviewedRevision: null,
    reviewedAt: null,
    checked: key
      ? { ...session.checked, [key]: false }
      : perCriterion(() => false),
  };
}
export function editCriterion(
  session: ReviewSession,
  key: CriterionId,
  entry: Criterion
): ReviewSession {
  const before = session.currentDraft.criteria[key];
  if (
    entry.claims.length !== before.claims.length ||
    entry.claims.some(
      (claim, i) =>
        JSON.stringify(claim.citations) !==
        JSON.stringify(before.claims[i].citations)
    )
  )
    throw new Error(
      "Edit claim text while keeping its source references unchanged"
    );
  const currentDraft = {
    ...session.currentDraft,
    criteria: {
      ...session.currentDraft.criteria,
      [key]: structuredClone(entry),
    },
  };
  // Other criteria can temporarily be invalid after removal; validate the edited entry against the original valid draft.
  const checked = validateDraft(session.input, {
    ...session.originalDraft,
    criteria: { ...session.originalDraft.criteria, [key]: entry },
  });
  if (!checked.ok)
    throw new Error(checked.issues.map((issue) => issue.message).join("; "));
  return invalidate({ ...session, currentDraft }, key);
}
export function removeClaim(
  session: ReviewSession,
  key: CriterionId,
  id: string
): ReviewSession {
  const next = structuredClone(session);
  const index = next.claimIds[key].indexOf(id);
  if (index < 0) return session;
  const [claim] = next.currentDraft.criteria[key].claims.splice(index, 1);
  next.claimIds[key].splice(index, 1);
  next.removed[key].push({ id, claim, position: index });
  return invalidate(next, key);
}
export function restoreClaim(
  session: ReviewSession,
  key: CriterionId
): ReviewSession {
  const next = structuredClone(session);
  const removed = next.removed[key].pop();
  if (!removed) return session;
  next.currentDraft.criteria[key].claims.splice(
    removed.position,
    0,
    removed.claim
  );
  next.claimIds[key].splice(removed.position, 0, removed.id);
  return invalidate(next, key);
}
export function checkCriterion(
  session: ReviewSession,
  key: CriterionId,
  checked: boolean
): ReviewSession {
  return {
    ...session,
    checked: { ...session.checked, [key]: checked },
    reviewedRevision: null,
    reviewedAt: null,
  };
}
export function setReviewer(
  session: ReviewSession,
  reviewerId: string
): ReviewSession {
  return reviewerId === session.reviewerId
    ? session
    : invalidate({ ...session, reviewerId: reviewerId.slice(0, 80) });
}
export function setNote(
  session: ReviewSession,
  reviewerNote: string
): ReviewSession {
  return reviewerNote === session.reviewerNote
    ? session
    : invalidate({ ...session, reviewerNote: reviewerNote.slice(0, 1000) });
}
export function canReview(session: ReviewSession): boolean {
  return (
    !!session.reviewerId.trim() &&
    CRITERIA.every((key) => session.checked[key]) &&
    validateDraft(session.input, session.currentDraft).ok
  );
}
export function markReviewed(
  session: ReviewSession,
  now = new Date().toISOString()
): ReviewSession {
  if (!canReview(session))
    throw new Error(
      "Check every criterion, resolve validation errors and enter a reviewer ID first"
    );
  return { ...session, reviewedRevision: session.revision, reviewedAt: now };
}
export function canExport(session: ReviewSession): boolean {
  return (
    session.reviewedAt !== null &&
    session.reviewedRevision === session.revision &&
    canReview(session)
  );
}
export function exportReview(session: ReviewSession) {
  if (!canExport(session))
    throw new Error("Only the current reviewed revision can be exported");
  return structuredClone({
    exportVersion: "review-brief-export-v1",
    input: session.input,
    roleProfile,
    generation: session.generation,
    originalDraft: session.originalDraft,
    reviewedDraft: session.currentDraft,
    revision: session.revision,
    reviewedRevision: session.reviewedRevision,
    checked: session.checked,
    reviewerId: session.reviewerId,
    reviewerNote: session.reviewerNote,
    reviewedAt: session.reviewedAt,
  });
}
export function exportText(session: ReviewSession): string {
  const record = exportReview(session);
  return [
    "INTERVIEWMATE REVIEW BRIEF · SYNTHETIC DATA",
    `Source: ${record.generation.sourceType === "live_model" ? "Live model draft, reviewed by a human" : "Authored example, not a live AI response"}`,
    `Transcript: ${record.input.transcriptId} (${record.input.transcriptVersion})`,
    `Role: ${record.generation.roleVersion} | Prompt: ${record.generation.promptVersion}`,
    `Model: ${record.generation.modelReturned ?? record.generation.modelRequested ?? "Not used"}`,
    `Generation: ${record.generation.generationId} | Input SHA-256: ${record.generation.inputHash}`,
    `Contract SHA-256: ${record.generation.contractHash}`,
    `Role SHA-256: ${record.generation.roleHash}`,
    `Prompt SHA-256: ${record.generation.promptHash}`,
    `Generated: ${record.generation.generatedAtUtc ?? "Authored example"}`,
    `Reviewed by: ${record.reviewerId} | Revision: ${record.revision} | Reviewed at: ${record.reviewedAt}`,
    "Reviewed means inspected, not a hiring decision.",
    "",
    ...CRITERIA.flatMap((key) => {
      const entry = record.reviewedDraft.criteria[key];
      return [
        `${key} · ${roleProfile.criteria.find((c) => c.id === key)?.label} · ${STATUS_LABELS[entry.status]}`,
        ...entry.claims.flatMap((claim) => [
          claim.text,
          ...claim.citations.map(
            (citation) => `  ${citation.turnId}: ${citation.quote}`
          ),
        ]),
        `What remains unclear: ${entry.limitation}`,
        `Follow-up: ${entry.followUp}`,
        "",
      ];
    }),
    `Reviewer note: ${record.reviewerNote}`,
    "",
    "The JSON export contains the original draft and full source transcript.",
  ].join("\n");
}
