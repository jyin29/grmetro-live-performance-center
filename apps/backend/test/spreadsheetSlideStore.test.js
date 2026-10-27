"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { SpreadsheetSlideStore, hasSpreadsheetContent } = require("../src/settings/spreadsheetSlideStore");

test("spreadsheet availability requires enabled content with columns and rows", () => {
  assert.equal(hasSpreadsheetContent(null), false);
  assert.equal(hasSpreadsheetContent({ enabled: true, columns: [], rows: [] }), false);
  assert.equal(hasSpreadsheetContent({ enabled: false, columns: [{ id: "name" }], rows: [{ name: "A" }] }), false);
  assert.equal(hasSpreadsheetContent({ enabled: true, columns: [{ id: "name" }], rows: [{ name: "A" }] }), true);
});

test("spreadsheet store publishes absent and present eligibility changes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-spreadsheet-store-"));
  const filePath = path.join(directory, "spreadsheet-slide.json");
  try {
    const store = new SpreadsheetSlideStore({ filePath });
    const events = []; const unsubscribe = store.subscribe((state) => events.push(state.available));
    assert.equal(store.getPublicState().available, false);
    store.save({ enabled: true, columns: [{ id: "name", label: "Name", type: "text" }], rows: [{ name: "Alpha" }] });
    assert.equal(store.getPublicState().available, true);
    store.clear();
    assert.equal(store.getPublicState().available, false);
    assert.deepEqual(events, [true, false]);
    unsubscribe();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
