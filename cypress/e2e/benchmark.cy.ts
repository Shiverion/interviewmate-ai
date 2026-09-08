// Authored mock responses only. These UI tests do not measure real provider quality.
import type {
  BenchmarkCase,
  ProviderProfile,
} from "../../src/lib/benchmark/types";
describe("English-first benchmark workspace", () => {
  let bootstrap: {
    cases: BenchmarkCase[];
    datasetHash: string;
    providers: ProviderProfile[];
  };
  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.request("http://127.0.0.1:3000/api/benchmark").then((r) => {
      bootstrap = r.body;
    });
    cy.visit("http://127.0.0.1:3000/review-brief/evaluation");
  });
  function mockRun(badQuote = false) {
    cy.intercept("POST", "/api/benchmark", (req) => {
      const c = bootstrap.cases.find((c) => c.id === req.body.caseId)!;
      const p = bootstrap.providers.find((p) => p.id === req.body.providerId)!;
      const config = p.configurations[c.language];
      const draft = {
        schemaVersion: "review-brief-v1",
        criteria: Object.fromEntries(
          Object.entries(c.reference.criteria).map(([id, r]) => [
            id,
            {
              status: r.expectedStatus,
              claims: r.support.map((s) => ({
                text: "Authored browser-test claim.",
                citations: [
                  { ...s, quote: badQuote ? "invented text" : s.quote },
                ],
              })),
              limitation: "Self-report only.",
              followUp: "What would you verify next?",
            },
          ])
        ),
      };
      req.reply({
        body: {
          studyVersion: "english-first-pilot-v1",
          datasetHash: bootstrap.datasetHash,
          caseId: c.id,
          language: c.language,
          inputHash: c.inputHash,
          referenceHash: c.referenceHash,
          configurationHash: config.hash,
          providerId: p.id,
          modelRequested: p.model,
          result: {
            ok: true,
            draft,
            warnings: [],
            generation: {
              sourceType: "live_model",
              generationId: "mock-" + p.id,
              generatedAtUtc: "2026-09-08T00:00:00Z",
              contractVersion: "review-brief-v1",
              contractHash: "a".repeat(64),
              roleVersion: "frontend-review-v1",
              roleHash: "b".repeat(64),
              promptVersion: "review-brief-v1",
              promptHash: config.promptHash,
              inputHash: c.inputHash,
              modelRequested: p.model,
              modelReturned: p.model,
              latencyMs: 100,
              usage: null,
            },
          },
        },
      });
    }).as("mockGeneration");
  }
  function approve() {
    cy.get("#reviewer-alias").type("reviewer-1");
    cy.contains("summary", "Provisional reference").click();
    cy.contains("label", "I checked this transcript").find("input").check();
  }
  it("defaults to English and requires reference review before any generation", () => {
    cy.get("#track").should("have.value", "en");
    cy.contains("button", "Run 3 selected models").should("be.disabled");
    cy.contains("button", "Finish review").should("be.disabled");
    approve();
    cy.contains("button", "Run 3 selected models").should("not.be.disabled");
  });
  it("runs three explicit providers, hides their identities, and locks review after reveal", () => {
    mockRun();
    approve();
    cy.contains("button", "Run 3 selected models").click();
    cy.wait(["@mockGeneration", "@mockGeneration", "@mockGeneration"]);
    cy.contains("3 attempts recorded").should("be.visible");
    cy.get("#output option")
      .should("have.length", 3)
      .each((option) => {
        expect(option.text()).not.to.match(/openai|gemini|deepseek/i);
      });
    for (let i = 0; i < 3; i++) {
      cy.get("#output").select(i);
      for (const id of ["R1", "R2", "R3", "R4"])
        cy.get("#verdict-" + id).select("acceptable");
    }
    cy.contains("button", "Finish review").click();
    cy.contains("td", "openai").should("be.visible");
    cy.contains("td", "gemini").should("be.visible");
    cy.contains("td", "deepseek").should("be.visible");
    cy.contains("Observed rank 1").should("exist");
    cy.get("#verdict-R1").should("be.disabled");
    cy.contains("button", "Run 3 selected models").should("be.disabled");
    cy.contains("button", "Export study").click();
    cy.readFile("cypress/downloads/interviewmate-study.json")
      .its("attempts")
      .should("have.length", 3);
  });
  it("keeps Indonesian an explicit adaptation with a paired English source", () => {
    cy.get("#track").select("id");
    cy.get("#case").should("have.value", "ID-C01");
    cy.contains("AI-authored adaptation").should("be.visible");
    cy.contains("summary", "Paired English original").click();
    cy.contains("My name is Maya Chen").should("be.visible");
    cy.contains(
      "label",
      "including meaning against the English original"
    ).should("be.visible");
  });
  it("rejects a plausible response with fabricated citations and stops the batch", () => {
    mockRun(true);
    approve();
    cy.contains("button", "Run 3 selected models").click();
    cy.wait("@mockGeneration");
    cy.contains("1 attempts recorded").should("be.visible");
    cy.contains("CLIENT_RESPONSE_UNAVAILABLE").should("be.visible");
    cy.contains("Authored browser-test claim").should("not.exist");
    cy.contains("button", "Finish review").click();
    cy.contains("Not measured").should("exist");
    cy.contains("Not ranked").should("exist");
  });
  it("fits narrow screens and restores an exported study", () => {
    cy.viewport(360, 800);
    approve();
    cy.contains("button", "Export study").click();
    cy.readFile("cypress/downloads/interviewmate-study.json").then((saved) => {
      cy.visit("http://127.0.0.1:3000/review-brief/evaluation");
      cy.get("input[type=file]").selectFile({
        contents: Cypress.Buffer.from(JSON.stringify(saved)),
        fileName: "study.json",
        mimeType: "application/json",
      });
    });
    cy.contains("Study restored").should("be.visible");
    cy.get("#reviewer-alias").should("have.value", "reviewer-1");
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(360)
    );
    cy.screenshot("benchmark-mobile", { capture: "viewport" });
  });
});
