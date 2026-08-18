function formatCell(value, type) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (type === "currency" && Number.isFinite(number)) return number.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  if (type === "percent" && Number.isFinite(number)) return `${number.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  if (type === "number" && Number.isFinite(number)) return number.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(value);
}

export function SpreadsheetSlide({ spreadsheetSlide }) {
  const slide = spreadsheetSlide;
  if (!slide?.enabled || !slide.columns?.length || !slide.rows?.length) return <main className="spreadsheet-slide dashboard-slide"><header><p>Custom data</p><h2>Spreadsheet</h2></header><section className="spreadsheet-slide__empty"><h3>No spreadsheet uploaded</h3><p>Upload a CSV from the customization page to populate this slide.</p></section></main>;
  return <main className="spreadsheet-slide dashboard-slide" aria-labelledby="spreadsheet-slide-title">
    <header className="spreadsheet-slide__heading"><div><p>Custom data</p><h2 id="spreadsheet-slide-title">{slide.title}</h2></div><span>{slide.subtitle}</span></header>
    <section className="spreadsheet-slide__table-wrap"><table className="spreadsheet-slide__table"><thead><tr>{slide.columns.map((column) => <th key={column.id}>{column.label}</th>)}</tr></thead><tbody>{slide.rows.map((row, index) => <tr key={index}>{slide.columns.map((column) => <td key={column.id} className={column.type !== "text" ? "is-numeric" : ""}>{formatCell(row[column.id], column.type)}</td>)}</tr>)}</tbody></table></section>
    <footer className="spreadsheet-slide__meta">{slide.rows.length} rows · Uploaded data</footer>
  </main>;
}
