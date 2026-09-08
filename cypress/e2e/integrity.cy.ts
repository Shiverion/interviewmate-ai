// Simulated browser visibility events; no AI calls, microphone, or database writes.
describe("lightweight session-integrity rehearsal", () => {
  beforeEach(() => {
    cy.clock(100000, ["Date"]);
    cy.visit("http://127.0.0.1:3000/review-brief/integrity-demo", {
      onBeforeLoad(win) {
        win.sessionStorage.clear();
      },
    });
    cy.document().then((doc) => cy.stub(doc, "hasFocus").returns(true));
  });
  function start() {
    cy.contains("label", "I have read").find("input").check();
    cy.contains("button", "Start local rehearsal").click();
    cy.tick(10000);
  }
  function away(duration = 3000) {
    cy.document().then((doc) => {
      Object.defineProperty(doc, "hidden", { configurable: true, value: true });
      doc.dispatchEvent(new Event("visibilitychange"));
    });
    cy.tick(duration);
    cy.document().then((doc) => {
      Object.defineProperty(doc, "hidden", {
        configurable: true,
        value: false,
      });
      doc.dispatchEvent(new Event("visibilitychange"));
    });
  }
  it("requires notice acknowledgment and ignores quick switches", () => {
    cy.contains("button", "Start local rehearsal").should("be.disabled");
    start();
    away(2000);
    cy.contains("Hidden-page events: 0").should("be.visible");
    cy.get('[aria-label="Interview page reminder"]').should("not.exist");
  });
  it("gates the actual interview start on the candidate notice", () => {
    cy.visit("http://127.0.0.1:3000/interview", {
      onBeforeLoad(win) {
        win.localStorage.removeItem("interview-store");
        win.sessionStorage.clear();
      },
    });
    cy.contains("button", "Start Interview").should("be.disabled");
    cy.contains("label", "I have read the session rules").find("input").check();
    cy.contains("button", "Start Interview").should("not.be.disabled");
  });
  it("shows the return alert even when the browser has not restored page focus", () => {
    start();
    cy.document().then((doc) => {
      (doc.hasFocus as Cypress.Agent<sinon.SinonStub>).returns(false);
    });
    away();
    cy.get('[aria-label="Interview page reminder"]').should("be.visible");
    cy.contains("Recorded events: 1").should("be.visible");
    cy.contains("button", "Got it, continue").click();
    cy.window().trigger("focus");
    cy.get('[aria-label="Interview page reminder"]').should("not.exist");
  });
  it("warns at three, flags at five, and still allows the candidate to continue", () => {
    start();
    for (let i = 0; i < 3; i++) {
      away();
      cy.contains("Your interview page was hidden").should("be.visible");
      cy.contains("button", "Got it, continue").click();
    }
    cy.contains("Repeated page-away events").should("be.visible");
    for (let i = 0; i < 2; i++) {
      away();
      cy.contains("button", "Got it, continue").click();
    }
    cy.contains("Human review suggested").should("be.visible");
    cy.contains("Rehearsal status:").should("contain", "active");
    cy.contains("button", "Finish rehearsal").should("not.be.disabled");
    cy.contains("summary", "Review events").click();
    cy.get('[aria-label="Context for event 1"]').select("technical_issue");
    cy.contains("button", "Finish rehearsal").click();
    cy.contains("Session integrity · human review").should("be.visible");
    cy.contains("candidate context: technical issue").should("exist");
    cy.contains("button", "Export session record").click();
    cy.readFile("cypress/downloads/session-integrity.json").then((r) => {
      expect(r.hiddenCount).to.eq(5);
      expect(r.policy.autoTerminate).to.eq(false);
    });
  });
  it("supports the Indonesian notice and narrow screens", () => {
    cy.viewport(360, 800);
    cy.contains("label", "Notice language")
      .find("select")
      .select("Bahasa Indonesia");
    cy.contains("Sebelum mulai").should("be.visible");
    cy.contains("label", "Saya telah membaca").find("input").check();
    cy.contains("button", "Start local rehearsal").click();
    cy.tick(10000);
    away();
    cy.contains("Halaman wawancara sempat tersembunyi").should("be.visible");
    cy.contains("button", "Mengerti, lanjutkan").click();
    cy.contains("Kejadian halaman tersembunyi: 1").should("be.visible");
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(360)
    );
  });
  it("supports optional sound, keyboard dismissal and a fresh reminder", () => {
    start();
    cy.contains("button", "Enable & test alert sound").click();
    cy.contains("button", "Mute alert sound").should(
      "have.attr",
      "aria-pressed",
      "true"
    );
    away();
    cy.get('[aria-label="Interview page reminder"]').should("be.visible");
    cy.get("body").type("{esc}");
    cy.get('[aria-label="Interview page reminder"]').should("not.exist");
    cy.contains("button", "Mute alert sound").click();
    away();
    cy.get('[aria-label="Interview page reminder"]').should(
      "contain",
      "Recorded events: 2"
    );
    cy.contains("button", "Got it, continue").click();
    cy.contains("button", "Finish rehearsal").click();
    cy.get('[aria-label="Interview page reminder"]').should("not.exist");
  });
});
