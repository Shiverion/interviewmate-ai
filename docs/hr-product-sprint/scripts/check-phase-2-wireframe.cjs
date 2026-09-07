#!/usr/bin/env node
"use strict";

// DOM interaction rehearsal with jsdom supplied by the installed Jest stack.
// Dialog/focus/scroll shims do not replace a real browser/accessibility audit.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const html = fs.readFileSync(
  path.resolve(__dirname, "../design/wireframe.html"),
  "utf8"
);
let checks = 0;

for (const narrow of [false, true]) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://127.0.0.1/wireframe.html",
    virtualConsole,
    beforeParse(window) {
      window.structuredClone = structuredClone;
      window.matchMedia = () => ({ matches: narrow });
      window.confirm = () => true;
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.HTMLDialogElement.prototype.showModal = function () {
        this.open = true;
      };
      window.HTMLDialogElement.prototype.close = function () {
        this.open = false;
        this.dispatchEvent(new window.Event("close"));
      };
    },
  });
  const { window } = dom;
  const doc = window.document;
  const $ = (id) => {
    const el = doc.getElementById(id);
    assert.ok(el, id);
    return el;
  };
  const type = (id, value) => {
    $(id).value = value;
    $(id).dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  const choose = (value) => {
    $("case-select").value = value;
    $("case-select").dispatchEvent(
      new window.Event("change", { bubbles: true })
    );
  };
  const payload = () => JSON.parse($("export-content").textContent);
  function check(name, run) {
    try {
      run();
      assert.equal(
        errors.length,
        0,
        errors.map((error) => error.message).join("\n")
      );
      checks++;
    } catch (error) {
      throw new Error(
        `${narrow ? "narrow" : "wide"}: ${name}: ${error.message}`,
        { cause: error }
      );
    }
  }
  check("Role confirmation gates authored loading", () => {
    assert.equal($("load").disabled, true);
    choose("conflicting");
    $("role-confirm").click();
    $("load").click();
    assert.equal($("review-area").hidden, false);
    assert.equal(doc.querySelectorAll("article.criterion").length, 4);
    assert.ok($("card-R1").textContent.includes("Conflicting evidence"));
  });
  check(
    "Both conflict sources are visible and inspection does not approve",
    () => {
      $("cite-R1-0-0").click();
      assert.equal(doc.querySelectorAll("#source mark").length, 2);
      assert.equal(doc.activeElement.id, "turn-P1-B-T02");
      assert.equal($("review-count").textContent, "0 of 4 checked");
      if (narrow) assert.equal($("card-R1").nextElementSibling.id, "source");
      $("return-claim").click();
      assert.equal(doc.activeElement.id, "cite-R1-0-0");
    }
  );
  check("Four checks and reviewer ID enable reviewed authored export", () => {
    type(
      "reviewer-note",
      "Ask for ownership clarification in the next discussion."
    );
    type("reviewer-id", "wireframe-rehearsal");
    for (const key of ["R1", "R2", "R3", "R4"]) $("checked-" + key).click();
    assert.equal($("mark-reviewed").disabled, false);
    $("mark-reviewed").click();
    assert.equal($("export-json").disabled, false);
    assert.equal(payload().sourceType, "authored_example");
    assert.equal(payload().model, null);
  });
  const originalClaim = payload().originalDraft.criteria.R1.claims[0].text;
  check("Editing preserves original and resets review eligibility", () => {
    $("edit-R1").click();
    doc.querySelector('[name="claim-0"]').value =
      "Describes incompatible ownership accounts that need clarification.";
    $("edit-form").dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true })
    );
    assert.equal($("editor").open, false);
    assert.equal($("source").isConnected, true);
    assert.equal($("review-count").textContent, "3 of 4 checked");
    assert.equal($("export-json").disabled, true);
    $("checked-R1").click();
    $("mark-reviewed").click();
    assert.equal(
      payload().originalDraft.criteria.R1.claims[0].text,
      originalClaim
    );
    assert.notEqual(
      payload().reviewedDraft.criteria.R1.claims[0].text,
      originalClaim
    );
    assert.equal(payload().sourceType, "authored_example");
    assert.ok(
      $("draft-meta").textContent.includes(payload().revision + " revision(s)")
    );
  });
  check(
    "Removing evidence blocks review until restored or status corrected",
    () => {
      doc.querySelector('[data-remove="R3,0"]').click();
      $("checked-R3").click();
      assert.equal($("mark-reviewed").disabled, true);
      doc.querySelector('[data-restore="R3"]').click();
      $("checked-R3").click();
      $("mark-reviewed").click();
      assert.equal($("export-json").disabled, false);
    }
  );
  check("Reviewer note edits reset all checks", () => {
    type("reviewer-note", "Changed process note.");
    assert.equal($("review-count").textContent, "0 of 4 checked");
    assert.equal($("export-text").disabled, true);
  });
  check("Sparse record permits genuinely empty evidence entries", () => {
    $("start-over").click();
    choose("sparse");
    $("load").click();
    assert.ok($("card-R3").textContent.includes("Not established"));
    assert.equal($("card-R3").querySelectorAll(".claim").length, 0);
    assert.equal($("card-R4").querySelectorAll(".claim").length, 0);
  });
  check("Loading/error previews do not pretend a model ran", () => {
    $("start-over").click();
    $("preview-loading").click();
    assert.ok($("status-area").textContent.includes("No request is running"));
    $("cancel-loading").click();
    $("preview-error").click();
    assert.ok($("status-area").textContent.includes("no model request ran"));
    $("dismiss-error").click();
    assert.equal($("status-area").textContent, "");
  });
  check("DOM IDs stay unique", () => {
    const ids = [...doc.querySelectorAll("[id]")].map((el) => el.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  dom.window.close();
}
console.log(
  `${checks} wireframe interaction checks passed across wide/narrow DOM configurations.`
);
console.log(
  "This is a jsdom rehearsal with dialog/media/scroll shims, not live AI evaluation or a browser accessibility audit."
);
