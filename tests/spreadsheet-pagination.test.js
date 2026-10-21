"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { paginateSpreadsheetSlide, spreadsheetPageCapacity } = require("../shared/spreadsheetPagination.cjs");

function spreadsheet(columnCount, rowCount) {
  const columns = Array.from({ length: columnCount }, (_, index) => ({ id: `column-${index}`, label: `Column ${index + 1}`, type: index ? "number" : "text" }));
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => Object.fromEntries(columns.map((column, columnIndex) => [column.id, columnIndex ? rowIndex * 100 + columnIndex : `Row ${rowIndex + 1}`])));
  return { enabled: true, columns, rows };
}

const testSettings = { maximumColumns: 4, maximumRows: 3, minimumColumnWidth: 100, rowHeight: 30, horizontalPadding: 0, verticalReserve: 120 };
const testDimensions = { width: 800, height: 600 };

test("spreadsheet content that fits remains on Slide 6", () => {
  const result = paginateSpreadsheetSlide(spreadsheet(4, 3), { dimensions: testDimensions, settings: testSettings });
  assert.equal(result.pageCount, 1);
  assert.equal(result.hasContinuation, false);
  assert.deepEqual(result.pages[0].columns.map(({ id }) => id), ["column-0", "column-1", "column-2", "column-3"]);
  assert.deepEqual(result.pages[0].rows.map((row) => row["column-0"]), ["Row 1", "Row 2", "Row 3"]);
});

test("row overflow continues in order with repeated column headers", () => {
  const result = paginateSpreadsheetSlide(spreadsheet(3, 8), { dimensions: testDimensions, settings: testSettings });
  assert.equal(result.pageCount, 3);
  assert.equal(result.continuationPageCount, 2);
  assert.equal(result.hasContinuation, true);
  for (const page of result.pages) assert.deepEqual(page.columns.map(({ id }) => id), ["column-0", "column-1", "column-2"]);
  assert.deepEqual(result.pages.flatMap((page) => page.rows.map((row) => row["column-0"])), Array.from({ length: 8 }, (_, index) => `Row ${index + 1}`));
});

test("column overflow preserves every column and repeats every row in each column band", () => {
  const result = paginateSpreadsheetSlide(spreadsheet(9, 2), { dimensions: testDimensions, settings: testSettings });
  assert.equal(result.pageCount, 3);
  assert.deepEqual(result.pages.flatMap((page) => page.columns.map(({ id }) => id)), Array.from({ length: 9 }, (_, index) => `column-${index}`));
  for (const page of result.pages) assert.deepEqual(page.rows.map((row) => row["column-0"]), ["Row 1", "Row 2"]);
});

test("multiple continuation pages preserve row and column order without silent omission", () => {
  const sheet = spreadsheet(9, 8);
  const result = paginateSpreadsheetSlide(sheet, { dimensions: testDimensions, settings: testSettings });
  assert.equal(result.pageCount, 9);
  assert.equal(result.continuationPageCount, 8);
  for (let columnStart = 0; columnStart < 9; columnStart += 4) {
    const band = result.pages.filter((page) => page.columnStart === columnStart);
    assert.deepEqual(band.flatMap((page) => page.rows.map((row) => row["column-0"])), sheet.rows.map((row) => row["column-0"]));
  }
  assert.deepEqual([...new Set(result.pages.flatMap((page) => page.columns.map(({ id }) => id)))], sheet.columns.map(({ id }) => id));
});

test("pagination capacity recalculates for changed dimensions and settings", () => {
  assert.deepEqual(spreadsheetPageCapacity(testDimensions, testSettings), { columnsPerPage: 4, rowsPerPage: 3 });
  assert.deepEqual(spreadsheetPageCapacity({ width: 400, height: 360 }, { ...testSettings, maximumColumns: 10, maximumRows: 10 }), { columnsPerPage: 4, rowsPerPage: 8 });
  assert.equal(paginateSpreadsheetSlide(spreadsheet(5, 4), { dimensions: testDimensions, settings: testSettings }).pageCount, 4);
  assert.equal(paginateSpreadsheetSlide(spreadsheet(5, 4), { dimensions: { width: 1000, height: 720 }, settings: { ...testSettings, maximumColumns: 5, maximumRows: 4 } }).pageCount, 1);
});

test("empty or disabled-like data produces no continuation pages", () => {
  for (const sheet of [null, {}, { columns: [], rows: [] }, { columns: [{ id: "a" }], rows: [] }]) {
    const result = paginateSpreadsheetSlide(sheet, { dimensions: testDimensions, settings: testSettings });
    assert.equal(result.pageCount, 0);
    assert.equal(result.hasContinuation, false);
  }
});
