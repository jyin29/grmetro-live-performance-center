function formatCell(value, type) {
  if (value === null || value === undefined || value === "") return "—"; const number = Number(value);
  if (type === "currency" && Number.isFinite(number)) return number.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (type === "percent" && Number.isFinite(number)) return `${number.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  if (type === "number" && Number.isFinite(number)) return number.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (type === "date") { const date = new Date(value); if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }); }
  return String(value);
}
function displayColumns(slide) {
  if (slide.columns.length <= 10) return slide.columns;
  const metricIds = new Set((slide.metrics || []).map(({ id }) => id));
  const identity = slide.columns.filter((column) => column.type === "text" || column.type === "date").slice(0, 2);
  const metrics = slide.columns.filter((column) => metricIds.has(column.id));
  const selected = [...identity, ...metrics].filter((column, index, list) => list.findIndex(({ id }) => id === column.id) === index).slice(0, 10);
  return selected.length >= 4 ? selected : slide.columns.slice(0, 10);
}

export function SpreadsheetSlide({ spreadsheetSlide }) {
  const slide = spreadsheetSlide;
  if (!slide?.enabled || !slide.columns?.length || !slide.rows?.length) return <main className="spreadsheet-slide dashboard-slide"><header><p>Custom data</p><h2>Spreadsheet</h2></header><section className="spreadsheet-slide__empty"><h3>No spreadsheet uploaded</h3><p>Upload Excel, CSV, or TSV data from the customization page.</p></section></main>;
  const columns = displayColumns(slide); const rows = slide.rows.slice(0, 30);
  return <main className="spreadsheet-slide dashboard-slide" aria-labelledby="spreadsheet-slide-title">
    <header className="spreadsheet-slide__heading"><div><p>Custom data · {slide.metrics?.length || 0} metrics detected</p><h2 id="spreadsheet-slide-title">{slide.title}</h2></div><span>{slide.subtitle}</span></header>
    <section className="spreadsheet-slide__table-wrap"><table className="spreadsheet-slide__table"><thead><tr>{columns.map((column) => <th key={column.id}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.id} className={column.type !== "text" ? "is-numeric" : ""}>{formatCell(row[column.id], column.type)}</td>)}</tr>)}</tbody></table></section>
    <footer className="spreadsheet-slide__meta">Showing {rows.length} of {slide.rows.length.toLocaleString()} imported rows{slide.sourceRowCount > slide.rows.length ? ` · ${slide.sourceRowCount.toLocaleString()} source rows` : ""} · {slide.columns.length} columns</footer>
  </main>;
}
