describe("Reviewer access", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/demo/voice", {
      available: true,
      remaining: 5,
      sharedRemaining: 20,
    });
    cy.intercept("GET", "/api/ai/config", {
      providers: [
        { id: "openai", configured: true },
        { id: "gemini", configured: true },
        { id: "deepseek", configured: false },
      ],
    });
  });
  it("requires consent and permits a keyless voice room with selected language/provider", () => {
    cy.visit("/demo");
    cy.contains("button", "Start free voice demo").should("be.disabled");
    cy.get("#demo-language").select("Bahasa Indonesia");
    cy.get("#demo-provider").select("gemini");
    cy.get('input[type="checkbox"]').check();
    cy.intercept("POST", "/api/demo/start", {
      sessionId: "demo-reviewer-11111111-1111-4111-8111-111111111111",
      expiresAt: Date.now() + 480000,
    }).as("startDemo");
    cy.contains("button", "Start free voice demo").click();
    cy.wait("@startDemo");
    cy.location("pathname").should("eq", "/interview");
    cy.contains("Hosted voice").should("be.visible");
    cy.contains("button", "Start Interview").should("be.disabled");
    cy.contains("label", "Saya telah membaca").find("input").check();
    cy.contains("button", "Start Interview").should("be.enabled");
  });
  it("blocks exhausted usage and fits a narrow screen", () => {
    cy.intercept("GET", "/api/demo/voice", {
      available: true,
      remaining: 0,
      sharedRemaining: 10,
    });
    cy.viewport(390, 844);
    cy.visit("/demo");
    cy.get('input[type="checkbox"]').check();
    cy.contains("button", "Start free voice demo").should("be.disabled");
    cy.contains("free allowance is used").should("be.visible");
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(390)
    );
  });
});
