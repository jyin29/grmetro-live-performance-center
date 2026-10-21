import { useEffect, useState } from "react";
import { SLIDE_ROTATION_INTERVAL_MS } from "../../config/slideRotation";

function formatCell(value, type) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (type === "currency" && Number.isFinite(number)) return number.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (type === "percent" && Number.isFinite(number)) return `${number.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  if (type === "number" && Number.isFinite(number)) return number.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (type === "date") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  }
  return String(value);
}

function SpreadsheetPage({ slide, page, pageIndex, pageCount, columnsPerPage, continuation = false }) {
  if (!page) return <main className="spreadsheet-slide dashboard-slide"><header><p>Custom data</p><h2>Spreadsheet</h2></header><section className="spreadsheet-slide__empty"><h3>No spreadsheet uploaded</h3><p>Upload Excel, CSV, or TSV data from the customization page.</p></section></main>;
  const rowRange = `${page.rowStart + 1}–${page.rowEnd}`;
  const columnRange = `${page.columnStart + 1}–${page.columnEnd}`;
  const fillerColumns = Math.max(0, (columnsPerPage || page.columns.length) - page.columns.length);
  return <main className={`spreadsheet-slide dashboard-slide${continuation ? " spreadsheet-slide--continuation" : ""}`} aria-labelledby="spreadsheet-slide-title">
    <header className="spreadsheet-slide__heading"><div><p>{continuation ? "Spreadsheet continued" : `Custom data · ${slide.metrics?.length || 0} metrics detected`}</p><h2 id="spreadsheet-slide-title">{slide.title}</h2></div><span>{slide.subtitle}</span></header>
    <section className="spreadsheet-slide__table-wrap"><table className="spreadsheet-slide__table"><thead><tr>{page.columns.map((column) => <th key={column.id} className={column.type !== "text" ? "is-numeric" : ""}>{column.label}</th>)}{Array.from({ length: fillerColumns }, (_, index) => <th key={`filler-${index}`} className="is-filler" aria-hidden="true" />)}</tr></thead><tbody>{page.rows.map((row, index) => <tr key={page.rowStart + index}>{page.columns.map((column) => { const formatted = formatCell(row[column.id], column.type); return <td key={column.id} className={column.type !== "text" ? "is-numeric" : ""} title={formatted}>{formatted}</td>; })}{Array.from({ length: fillerColumns }, (_, fillerIndex) => <td key={`filler-${fillerIndex}`} className="is-filler" aria-hidden="true" />)}</tr>)}</tbody></table></section>
    <footer className="spreadsheet-slide__meta">Rows {rowRange} of {slide.rows.length.toLocaleString()} · Columns {columnRange} of {slide.columns.length.toLocaleString()}{slide.sourceRowCount > slide.rows.length ? ` · ${slide.sourceRowCount.toLocaleString()} source rows` : ""}<span>Page {pageIndex + 1} of {pageCount}</span></footer>
  </main>;
}

function continuationPageIndex(pageCount, startedAt) {
  if (pageCount <= 1) return 0;
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start)) return 0;
  return Math.floor(Math.max(0, Date.now() - start) / SLIDE_ROTATION_INTERVAL_MS) % pageCount;
}

export function SpreadsheetSlide({ spreadsheetSlide, spreadsheetPagination }) {
  const slide = spreadsheetSlide;
  if (!slide?.enabled || !slide.columns?.length || !slide.rows?.length) return <SpreadsheetPage slide={slide} />;
  return <SpreadsheetPage slide={slide} page={spreadsheetPagination?.pages?.[0]} pageIndex={0} pageCount={spreadsheetPagination?.pageCount || 1} columnsPerPage={spreadsheetPagination?.capacity?.columnsPerPage} />;
}

export function SpreadsheetContinuationSlide({ spreadsheetSlide, spreadsheetPagination, presentationState = {} }) {
  const pages = spreadsheetPagination?.pages?.slice(1) || [];
  const [pageIndex, setPageIndex] = useState(() => continuationPageIndex(pages.length, presentationState.rotationStartedAt));
  useEffect(() => {
    if (!pages.length) { setPageIndex(0); return undefined; }
    const synchronize = () => setPageIndex(continuationPageIndex(pages.length, presentationState.rotationStartedAt));
    synchronize();
    if (!presentationState.isRunning || presentationState.rotationPaused) return undefined;
    const start = Date.parse(presentationState.rotationStartedAt);
    const elapsed = Number.isFinite(start) ? Math.max(0, Date.now() - start) : 0;
    const delay = SLIDE_ROTATION_INTERVAL_MS - (elapsed % SLIDE_ROTATION_INTERVAL_MS);
    let interval;
    const timeout = window.setTimeout(() => { synchronize(); interval = window.setInterval(synchronize, SLIDE_ROTATION_INTERVAL_MS); }, delay);
    return () => { window.clearTimeout(timeout); if (interval) window.clearInterval(interval); };
  }, [pages.length, presentationState.isRunning, presentationState.rotationPaused, presentationState.rotationStartedAt, presentationState.timerRevision]);
  const safeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  return <SpreadsheetPage slide={spreadsheetSlide} page={pages[safeIndex]} pageIndex={safeIndex + 1} pageCount={spreadsheetPagination?.pageCount || 1} columnsPerPage={spreadsheetPagination?.capacity?.columnsPerPage} continuation />;
}
