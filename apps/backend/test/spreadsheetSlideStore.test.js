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

test("spreadsheet store exposes continuation eligibility as content changes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-spreadsheet-pagination-store-"));
  const filePath = path.join(directory, "spreadsheet-slide.json");
  try {
    const store = new SpreadsheetSlideStore({ filePath });
    const columns = Array.from({ length: 2 }, (_, index) => ({ id: `c${index}`, label: `Column ${index}`, type: "text" }));
    store.save({ enabled: true, columns, rows: [{ c0: "one", c1: "two" }] });
    assert.equal(store.hasContinuation(), false);
    assert.equal(store.getContinuationPageCount(), 0);
    store.save({ enabled: true, columns, rows: Array.from({ length: 31 }, (_, index) => ({ c0: `row ${index}`, c1: index })) });
    assert.equal(store.hasContinuation(), true);
    assert.equal(store.getPagination().pageCount, 3);
    assert.equal(store.getContinuationPageCount(), 2);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
