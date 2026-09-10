describe("Evidence revision", () => {
  it("keeps reviewer access private and provides safe setup navigation", () => {
    cy.visit("/reviewer");
    cy.contains("Unlock Reviewer Mode").should("be.disabled");
    cy.visit("/interview");
    cy.contains("Return to Setup").should("be.visible");
    cy.contains("Exit Interview").should("be.visible");
  });
  it("persists a synthetic scheduled assessment and stable human judgments", () => {
    cy.task<string>("reviewerCookie", null, { log: false }).then((cookie) =>
      cy.setCookie("interviewmate-reviewer", cookie, {
        httpOnly: true,
        log: false,
      })
    );
    cy.visit("/dashboard");
    cy.location("pathname").should("eq", "/login");
    cy.visit("/reviewer");
    cy.contains("Set up your interview").should("be.visible");
    cy.contains("Evaluation Sandbox").should("not.exist");
    cy.request({
      method: "POST",
      url: "/api/evaluate",
      headers: { Origin: "http://localhost:3000" },
      body: { transcript: [] },
    }).then(({ body }) => {
      expect(body.evaluation.overallScore).to.eq(null);
      cy.request({
        method: "POST",
        url: "/api/reviewer/sessions",
        headers: { Origin: "http://localhost:3000" },
        body: {
          candidateName: "Synthetic browser test",
          jobTitle: "Frontend Engineer",
          jobDescription: "Validate ownership and technical decisions",
          configuration: {},
          startsAt: Date.now() - 60000,
          endsAt: Date.now() + 3600000,
        },
      }).then(({ body: session }) => {
        cy.request({
          method: "PUT",
          url: "/api/reviewer/sessions",
          headers: { Origin: "http://localhost:3000" },
          body: {
            id: session.id,
            transcript: [],
            evaluation: body.evaluation,
            model: body.model,
            provider: body.provider,
          },
        });
        cy.visit(`/reviewer/session/${session.id}`);
        cy.contains(
          "Insufficient Evidence for Reliable Overall Assessment"
        ).should("be.visible");
        cy.get("select").each((el) => cy.wrap(el).select("not_assessable"));
        cy.get('[aria-label="Human reviewer ID"]').type("browser-validation");
        cy.get('[aria-label="Human review notes"]').type(
          "No answer test. Not a model-quality benchmark."
        );
        cy.get("select").each((el) =>
          cy.wrap(el).should("have.value", "not_assessable")
        );
        cy.reload();
        cy.get("select").each((el) =>
          cy.wrap(el).should("have.value", "not_assessable")
        );
        cy.contains("button", "Submit human review").click();
        cy.contains("Completed review saved", { timeout: 15000 }).should(
          "be.visible"
        );
        cy.reload();
        cy.get('[aria-label="Human reviewer ID"]').should("be.disabled");
        cy.contains("Export completed review").should("be.visible");
      });
    });
  });
});
