describe("Private recruiter and candidate entry", () => {
  it("redirects a signed-out dashboard visitor to login while preserving the destination", () => {
    cy.intercept("GET", "/api/access/reviewer", { mode: "guest" });
    cy.visit("/dashboard");
    cy.location("pathname").should("eq", "/login");
    cy.location("search").should("contain", "returnUrl=%2Fdashboard");
    cy.contains("Continue with Google").should("be.visible");
  });
  it("requires the invited account before revealing scheduled candidate details", () => {
    cy.visit("/apply/synthetic-private-session");
    cy.contains("Sign in to your interview").should("be.visible");
    cy.contains("Sign in to continue").click();
    cy.location("pathname").should("eq", "/login");
    cy.location("search").should("contain", "returnUrl=%2Fapply%2Fsynthetic-private-session");
  });
});
