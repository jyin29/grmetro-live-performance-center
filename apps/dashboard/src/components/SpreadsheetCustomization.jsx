import { useEffect, useState } from "react";
import { fetchSpreadsheetSlide, removeSpreadsheetSlide, saveSpreadsheetSlide } from "../api/managementApi";

function parseDelimited(text, delimiter) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]; const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") i += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}

function idFor(label, index) { return `${String(label || `column-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `column-${index + 1}`}-${index}`; }
function numeric(value) { const cleaned = String(value ?? "").replace(/[$,%\s,]/g, ""); return cleaned !== "" && Number.isFinite(Number(cleaned)) ? Number(cleaned) : null; }
function inferType(label, values) {
  const name = label.toLowerCase();
  if (/percent|%|rate|conversion|closing/.test(name)) return "percent";
  if (/revenue|sales|price|cost|amount|ticket|dollar|\$/.test(name)) return "currency";
  const populated = values.filter((value) => String(value ?? "").trim() !== ""); const numbers = populated.filter((value) => numeric(value) !== null);
  if (populated.length && numbers.length / populated.length >= .8) return "number";
  return "text";
}
function interpret(rows, fileName) {
  if (rows.length < 2) throw new Error("The spreadsheet needs a header row and at least one data row.");
  const headers = rows[0].slice(0, 8); const body = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== "")).slice(0, 30);
  const columns = headers.map((label, index) => ({ id: idFor(label, index), label: label || `Column ${index + 1}`, type: inferType(label || "", body.map((row) => row[index])) }));
  const dataRows = body.map((source) => Object.fromEntries(columns.map((column, index) => { const raw = source[index] ?? ""; const number = numeric(raw); return [column.id, column.type === "text" ? raw : number ?? raw]; })));
  return { enabled: true, title: fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), subtitle: "Uploaded spreadsheet", columns, rows: dataRows };
}

export function SpreadsheetCustomization() {
  const [state, setState] = useState({ slide: null, status: "", error: false, busy: false });
  useEffect(() => { fetchSpreadsheetSlide().then(({ slide }) => setState((current) => ({ ...current, slide }))).catch(() => {}); }, []);
  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      setState((current) => ({ ...current, busy: true, status: "Reading spreadsheet…", error: false }));
      if (!/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error("For this first version, upload a CSV or TSV spreadsheet. Excel .xlsx support is next.");
      const text = await file.text(); const delimiter = /\.tsv$/i.test(file.name) ? "\t" : (text.split(/\r?\n/, 1)[0].split("\t").length > text.split(/\r?\n/, 1)[0].split(",").length ? "\t" : ",");
      const interpreted = interpret(parseDelimited(text, delimiter), file.name); const result = await saveSpreadsheetSlide(interpreted);
      setState({ slide: result.slide, status: `Added “${result.slide.title}” to the slideshow.`, error: false, busy: false });
    } catch (error) { setState((current) => ({ ...current, busy: false, status: error.message, error: true })); }
    event.target.value = "";
  };
  const remove = async () => { try { const result = await removeSpreadsheetSlide(); setState({ slide: result.slide, status: "Spreadsheet slide cleared.", error: false, busy: false }); } catch (error) { setState((current) => ({ ...current, status: error.message, error: true })); } };
  return <section className="spreadsheet-customization">
    <div className="settings-title"><span className="mobile-eyebrow">Custom slide · Spreadsheet</span><h2>Upload Spreadsheet</h2><p>Upload a CSV or TSV. The dashboard reads the headers, detects text, numbers, currency, and percentages, then turns the data into a TV-ready sixth slide.</p></div>
    <label className="spreadsheet-upload"><strong>{state.busy ? "Processing…" : "Choose spreadsheet"}</strong><span>CSV or TSV · up to 8 columns and 30 displayed rows</span><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" disabled={state.busy} onChange={upload} /></label>
    {state.slide?.enabled && <div className="spreadsheet-current"><div><strong>{state.slide.title}</strong><span>{state.slide.rows?.length || 0} rows · {state.slide.columns?.length || 0} columns</span></div><button type="button" onClick={remove}>Remove Slide</button></div>}
    {state.status && <div className={`operations-alert${state.error ? " is-error" : " is-success"}`}>{state.status}</div>}
  </section>;
}
