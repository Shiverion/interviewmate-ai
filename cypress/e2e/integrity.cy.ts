// Synthetic local rehearsal; mocked browser signals, no microphone/API/Firebase write.
describe("session pauses and technical recovery", () => {
  beforeEach(() => {
    cy.clock(100000, ["Date", "setInterval", "clearInterval"]);
    cy.visit("http://127.0.0.1:3000/review-brief/integrity-demo", {
      onBeforeLoad(win) {
        win.sessionStorage.clear();
        Object.keys(win.localStorage)
          .filter((k) => k.startsWith("interview-recovery-v1:"))
          .forEach((k) => win.localStorage.removeItem(k));
      },
    });
    cy.document().then((doc) => cy.stub(doc, "hasFocus").returns(true));
  });
  function start() {
    cy.contains("label", "I have read").find("input").check();
    cy.contains("button", "Start local rehearsal").click();
    cy.tick(10000);
  }
  function visible(hidden: boolean) {
    cy.document().then((doc) => {
      Object.defineProperty(doc, "hidden", {
        configurable: true,
        value: hidden,
      });
      doc.dispatchEvent(new Event("visibilitychange"));
    });
  }
  function away(ms = 1000) {
    visible(true);
    cy.tick(ms);
    visible(false);
  }
  function resume() {
    cy.contains("button", "I understand — resume with a new question").click();
    cy.contains("Rehearsal status:").should("contain", "running");
  }
  it("gates start and ignores subsecond switches", () => {
    cy.contains("button", "Start local rehearsal").should("be.disabled");
    start();
    away(500);
    cy.get("dialog").should("not.exist");
    cy.contains("Rehearsal status:").should("contain", "running");
  });
  it("covers the entire screen, traps focus and requires explicit resume with a new question", () => {
    start();
    cy.get('[aria-label="Current question"]')
      .invoke("text")
      .then((old) => {
        away();
        cy.get("dialog")
          .should("be.visible")
          .and("have.attr", "aria-modal", "true");
        cy.get("dialog").then((el) => {
          const rect = el[0].getBoundingClientRect();
          expect(rect.width).to.equal(Cypress.config("viewportWidth"));
          expect(rect.height).to.equal(Cypress.config("viewportHeight"));
        });
        cy.get("dialog button").first().focus().type("{esc}");
        cy.get("dialog").should("be.visible");
        cy.contains("Rehearsal status:").should("contain", "paused");
        resume();
        cy.get('[aria-label="Current question"]').should("not.have.text", old);
      });
  });
  it("warns on the second interruption, ends on the third, and retains the end across reload", () => {
    start();
    away();
    resume();
    away();
    cy.contains("Final warning — interview paused").should("be.visible");
    resume();
    away();
    cy.contains("h2", "Interview ended").should("be.visible");
    cy.contains("button", "I understand — resume with a new question").should(
      "not.exist"
    );
    cy.reload();
    cy.contains("h2", "Interview ended").should("be.visible");
  });
  it("freezes the timer while continuously away, warns at six seconds and ends at fifteen", () => {
    start();
    visible(true);
    cy.tick(1000);
    cy.contains("Rehearsal status:").should("contain", "paused");
    cy.contains("Rehearsal status:")
      .invoke("text")
      .then((paused) => {
        const time = paused.split("Time remaining:")[1];
        cy.tick(5000);
        cy.contains("Final warning — interview paused").should("be.visible");
        cy.contains("Rehearsal status:").should("contain", time);
        cy.tick(9000);
        cy.contains("h2", "Interview ended").should("be.visible");
      });
  });
  it("recovers after reload with time preserved and a replacement question", () => {
    start();
    cy.get('[aria-label="Current question"]')
      .invoke("text")
      .then((old) => {
        cy.contains("button", "Simulate connection loss").click();
        cy.contains("Reconnect your interview").should("be.visible");
        cy.contains("Rehearsal status:")
          .invoke("text")
          .then((text) => {
            const time = text.split("Time remaining:")[1];
            cy.tick(30000);
            cy.contains("Rehearsal status:").should("contain", time);
            cy.reload();
            cy.contains("Reconnect your interview").should("be.visible");
            cy.contains("Rehearsal status:").should("contain", time);
            resume();
            cy.get('[aria-label="Current question"]').should(
              "not.have.text",
              old
            );
          });
      });
  });
  it("supports Indonesian full-screen alerts on mobile", () => {
    cy.viewport(360, 800);
    cy.contains("label", "Notice language")
      .find("select")
      .select("Bahasa Indonesia");
    cy.contains("label", "Saya telah membaca").find("input").check();
    cy.contains("button", "Start local rehearsal").click();
    cy.tick(10000);
    away();
    cy.contains("Wawancara dijeda").should("be.visible");
    cy.contains(
      "button",
      "Saya mengerti — lanjut dengan pertanyaan baru"
    ).click();
    cy.get('[aria-label="Current question"]').should(
      "contain",
      "Tenggat proyek"
    );
  });
  it("gates the real interview start without calling the model", () => {
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
});
