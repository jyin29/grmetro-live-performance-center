"use strict";

const DEFAULT_SPREADSHEET_DIMENSIONS = Object.freeze({ width: 1920, height: 1080 });
const DEFAULT_SPREADSHEET_SETTINGS = Object.freeze({ horizontalPadding: 84, verticalReserve: 320, minimumColumnWidth: 170, rowHeight: 52, maximumColumns: 10, maximumRows: 30 });
function bounded(value, fallback, minimum, maximum) { const number = Number(value); return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback; }
function spreadsheetPageCapacity(dimensions = {}, settings = {}) {
  const width = bounded(dimensions.width, DEFAULT_SPREADSHEET_DIMENSIONS.width, 320, 7680);
  const height = bounded(dimensions.height, DEFAULT_SPREADSHEET_DIMENSIONS.height, 320, 4320);
  const horizontalPadding = bounded(settings.horizontalPadding, DEFAULT_SPREADSHEET_SETTINGS.horizontalPadding, 0, width / 2);
  const verticalReserve = bounded(settings.verticalReserve, DEFAULT_SPREADSHEET_SETTINGS.verticalReserve, 120, height - 80);
  const minimumColumnWidth = bounded(settings.minimumColumnWidth, DEFAULT_SPREADSHEET_SETTINGS.minimumColumnWidth, 90, 500);
  const rowHeight = bounded(settings.rowHeight, DEFAULT_SPREADSHEET_SETTINGS.rowHeight, 30, 120);
  const maximumColumns = Math.floor(bounded(settings.maximumColumns, DEFAULT_SPREADSHEET_SETTINGS.maximumColumns, 1, 20));
  const maximumRows = Math.floor(bounded(settings.maximumRows, DEFAULT_SPREADSHEET_SETTINGS.maximumRows, 1, 100));
  return Object.freeze({
    columnsPerPage: Math.max(1, Math.min(maximumColumns, Math.floor((width - horizontalPadding) / minimumColumnWidth))),
    rowsPerPage: Math.max(1, Math.min(maximumRows, Math.floor((height - verticalReserve) / rowHeight))),
  });
}
function paginateSpreadsheetSlide(slide, options = {}) {
  const columns = Array.isArray(slide?.columns) ? slide.columns : [];
  const rows = Array.isArray(slide?.rows) ? slide.rows : [];
  const capacity = spreadsheetPageCapacity(options.dimensions, options.settings);
  if (!columns.length || !rows.length) return Object.freeze({ pages: Object.freeze([]), pageCount: 0, continuationPageCount: 0, hasContinuation: false, capacity });
  const pages = [];
  for (let columnStart = 0; columnStart < columns.length; columnStart += capacity.columnsPerPage) {
    const pageColumns = columns.slice(columnStart, columnStart + capacity.columnsPerPage);
    for (let rowStart = 0; rowStart < rows.length; rowStart += capacity.rowsPerPage) {
      pages.push(Object.freeze({
        columns: Object.freeze(pageColumns), rows: Object.freeze(rows.slice(rowStart, rowStart + capacity.rowsPerPage)),
        columnStart, columnEnd: columnStart + pageColumns.length, rowStart,
        rowEnd: Math.min(rows.length, rowStart + capacity.rowsPerPage),
      }));
    }
  }
  return Object.freeze({ pages: Object.freeze(pages), pageCount: pages.length, continuationPageCount: Math.max(0, pages.length - 1), hasContinuation: pages.length > 1, capacity });
}
module.exports = { DEFAULT_SPREADSHEET_DIMENSIONS, DEFAULT_SPREADSHEET_SETTINGS, spreadsheetPageCapacity, paginateSpreadsheetSlide };
