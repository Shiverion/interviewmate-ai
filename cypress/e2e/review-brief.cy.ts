// Provider responses here are deliberately mocked. The real smoke run is recorded separately.
import input from "../../src/lib/review-brief/fixtures/practice-a.request.json";
import draft from "../../src/lib/review-brief/fixtures/practice-a.draft.json";

describe("local synthetic review brief", () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.visit("http://127.0.0.1:3000/review-brief");
  });
  const confirm = () =>
    cy.contains("label", "This role fits").find("input").check();
  const authored = () => {
    confirm();
    cy.contains("button", "Load authored example").click();
    cy.contains("strong", "Authored example · no live AI response").should(
      "be.visible"
    );
  };
  const checkAll = () => cy.get('article input[type="checkbox"]').check();

  it("opens a validated mock provider response and rejects mismatched provenance", () => {
    cy.window().then(async (window) => {
      const digest = await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(input))
      );
      const inputHash = Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, "0")
      ).join("");
      const body = {
        ok: true,
        generation: {
          generationId: "mock-browser-only",
          generatedAtUtc: "2026-09-08T00:00:00Z",
          sourceType: "live_model",
          contractVersion: "review-brief-v1",
          contractHash: "a".repeat(64),
          roleVersion: "frontend-review-v1",
          roleHash: "b".repeat(64),
          promptVersion: "review-brief-v1",
          promptHash: "c".repeat(64),
          modelRequested: "gpt-4o-2024-08-06",
          modelReturned: "gpt-4o-2024-08-06",
          inputHash,
          latencyMs: 123,
          usage: null,
        },
        draft,
        warnings: [],
      };
      cy.intercept("POST", "/api/review-brief", { body }).as("mockSuccess");
      confirm();
      cy.contains("button", "Generate AI draft").click();
      cy.wait("@mockSuccess");
      cy.contains("strong", "Live model draft").should("exist");
      cy.contains("button", "Export JSON").should("be.disabled");
      cy.intercept("POST", "/api/review-brief", {
        body: {
          ...body,
          generation: { ...body.generation, inputHash: "0".repeat(64) },
        },
      }).as("wrongHash");
      cy.contains("button", "Generate a new AI draft").click();
      cy.wait("@wrongHash");
      cy.get('[role="alert"]').should(
        "contain.text",
        "did not match this transcript"
      );
      cy.contains("strong", "Live model draft").should("exist");
    });
  });

  it("imports sparse synthetic JSON and keeps missing evidence visible", () => {
    cy.get('input[type="file"]').selectFile(
      "src/lib/review-brief/fixtures/sparse.request.json"
    );
    cy.get("#transcript").should("have.value", "imported");
    confirm();
    cy.contains("button", "Load authored example").should("be.disabled");
    cy.get("#transcript").select("P2-SPARSE");
    authored();
    cy.contains("Not established").should("exist");
    cy.screenshot("review-brief-desktop", { capture: "viewport" });
  });

  it("reviews sources, corrects a claim, exports original plus reviewed content, and relocks", () => {
    authored();
    cy.contains("button", "Export JSON").should("be.disabled");
    cy.contains("button", "View source").first().click();
    cy.get('section[aria-label="Source transcript"]').should("be.focused");
    cy.get('article input[type="checkbox"]').first().should("not.be.checked");
    cy.contains("button", "Close source").click();
    cy.focused().should("contain.text", "View source");
    cy.contains("button", "Edit criterion").first().click();
    cy.get("article form textarea")
      .first()
      .clear()
      .type(
        "Reviewer checked the implementation account; ownership remains bounded."
      );
    cy.contains("button", "Save changes").click();
    cy.get("#reviewer").type("synthetic-reviewer");
    cy.get("#reviewer-note").type("Practice workflow check only.");
    checkAll();
    cy.contains("button", "Mark reviewed").click();
    cy.contains("button", "Export JSON").should("be.enabled").click();
    cy.contains('[role="status"]', /Revision \d+ reviewed/)
      .invoke("text")
      .then((text) => {
        const revision = text.match(/Revision (\d+)/)![1];
        cy.readFile(
          `cypress/downloads/${input.transcriptId}-review-v${revision}.json`
        ).then((record) => {
          expect(record.originalDraft).to.deep.equal(draft);
          expect(record.reviewedDraft.criteria.R1.claims[0].text).to.contain(
            "Reviewer checked"
          );
          expect(record.generation.sourceType).to.equal("authored_example");
          expect(record.generation.modelRequested).to.equal(null);
        });
      });
    cy.contains("button", "Edit criterion").first().click();
    cy.contains("button", "Export JSON").should("be.disabled");
    cy.get("article form textarea").first().type(" Updated.");
    cy.contains("button", "Save changes").click();
    cy.contains("button", "Export JSON").should("be.disabled");
  });

  it("preserves stable removed claims and clears checks after notes change", () => {
    authored();
    const original = draft.criteria.R1.claims[0].text;
    cy.contains("button", "Remove claim").first().click();
    cy.contains(original).should("not.exist");
    cy.contains("button", "Restore last removed claim").click();
    cy.contains(original).should("exist");
    cy.get("#reviewer").type("reviewer");
    checkAll();
    cy.contains("button", "Mark reviewed").click();
    cy.contains("button", "Export text").should("be.enabled");
    cy.get("#reviewer-note").type("New limitation.");
    cy.get('article input[type="checkbox"]').should("not.be.checked");
    cy.contains("button", "Export text").should("be.disabled");
  });
  it("shows both conflicting accounts with source context on a 320px screen", () => {
    cy.viewport(320, 800);
    cy.get("#transcript").select("P1-B");
    cy.get("#transcript").should("have.value", "P1-B");
    cy.contains("p", /14 turns · P1-B/).should("exist");
    authored();
    cy.get("#transcript").should("have.value", "P1-B");
    cy.contains("Conflicting evidence").should("exist");
    cy.contains("button", "View source · both accounts").first().click();
    cy.get(
      'section[aria-label="Source transcript"] [class*="highlight"]'
    ).should("have.length.at.least", 2);
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
    });
    cy.screenshot("review-brief-mobile", { capture: "viewport" });
  });
  it("shows provider failure without replacing the current review or silently retrying", () => {
    authored();
    cy.intercept("POST", "/api/review-brief", {
      statusCode: 429,
      body: {
        ok: false,
        attemptId: "mock-rate-limit",
        error: {
          code: "RATE_LIMITED",
          message: "Mock provider limit; retry explicitly.",
          retryable: true,
          issues: [],
        },
      },
    }).as("generate");
    cy.contains("button", "Generate a new AI draft").click();
    cy.wait("@generate");
    cy.get('[role="alert"]')
      .should("contain.text", "RATE_LIMITED")
      .and("be.focused");
    cy.contains("strong", "Authored example · no live AI response").should(
      "exist"
    );
    cy.get("@generate.all").should("have.length", 1);
  });
  it("cancels a pending attempt and discards a late response after source changes", () => {
    cy.intercept("POST", "/api/review-brief", {
      delay: 1000,
      statusCode: 502,
      body: {
        ok: false,
        error: { code: "LATE_RESPONSE", message: "Must not appear" },
      },
    }).as("late");
    confirm();
    cy.contains("button", "Generate AI draft").click();
    cy.contains("button", "Cancel generation").click();
    cy.get("#transcript").select("P2-SPARSE");
    cy.contains("label", "This role fits")
      .find("input")
      .should("not.be.checked");
    cy.contains("LATE_RESPONSE").should("not.exist");
    cy.contains("Start with a completed interview.").should("exist");
  });
});
