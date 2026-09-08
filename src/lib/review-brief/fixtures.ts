import roleProfile from "./role-profile.json";
import aInput from "./fixtures/practice-a.request.json";
import aDraft from "./fixtures/practice-a.draft.json";
import bInput from "./fixtures/practice-b.request.json";
import bDraft from "./fixtures/practice-b.draft.json";
import sparseInput from "./fixtures/sparse.request.json";
import sparseDraft from "./fixtures/sparse.draft.json";
import { validateDraft, validateRequest } from "./contract";

export { roleProfile };
export const fixtures = [
  {
    id: "P1-A",
    label: "P1-A · Detailed account",
    input: aInput,
    draft: aDraft,
  },
  {
    id: "P1-B",
    label: "P1-B · Conflicting ownership",
    input: bInput,
    draft: bDraft,
  },
  {
    id: "P2-SPARSE",
    label: "P2-SPARSE · Incomplete coverage",
    input: sparseInput,
    draft: sparseDraft,
  },
].map((fixture) => {
  const input = validateRequest(fixture.input);
  const draft = validateDraft(fixture.input, fixture.draft);
  if (!input.ok || !draft.ok)
    throw new Error(`Invalid bundled fixture: ${fixture.id}`);
  return { ...fixture, input: input.data, draft: draft.data };
});
