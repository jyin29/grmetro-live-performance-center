import { useEffect, useState } from "react";
import { fetchSpreadsheetSlide, removeSpreadsheetSlide, saveSpreadsheetSlide } from "../api/managementApi";
import { readSpreadsheetFile } from "../lib/spreadsheetImport";

export function SpreadsheetCustomization() {
  const [state, setState] = useState({ slide: null, status: "", error: false, busy: false });
  useEffect(() => { fetchSpreadsheetSlide().then(({ slide }) => setState((current) => ({ ...current, slide }))).catch(() => {}); }, []);
  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      setState((current) => ({ ...current, busy: true, status: "Reading and detecting spreadsheet metrics…", error: false }));
      const interpreted = await readSpreadsheetFile(file); const result = await saveSpreadsheetSlide(interpreted);
      const metricCount = result.slide.metrics?.length || 0;
      setState({ slide: result.slide, status: `Added “${result.slide.title}” · ${result.slide.rows.length.toLocaleString()} rows · ${metricCount} recognized metrics.`, error: false, busy: false });
    } catch (error) { setState((current) => ({ ...current, busy: false, status: error.message, error: true })); }
    event.target.value = "";
  };
  const remove = async () => { try { const result = await removeSpreadsheetSlide(); setState({ slide: result.slide, status: "Spreadsheet slide cleared.", error: false, busy: false }); } catch (error) { setState((current) => ({ ...current, status: error.message, error: true })); } };
  return <section className="spreadsheet-customization">
    <div className="settings-title"><span className="mobile-eyebrow">Custom slide · Smart spreadsheet</span><h2>Upload Spreadsheet</h2><p>Upload Excel, CSV, or TSV data. The dashboard detects headers, data types, and common HVAC performance metrics such as revenue, closing rate, average ticket, calls, leads, memberships, and installs.</p></div>
    <label className="spreadsheet-upload"><strong>{state.busy ? "Processing…" : "Choose spreadsheet"}</strong><span>.xlsx, CSV or TSV · up to 20 columns and 5,000 imported rows</span><input type="file" accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values" disabled={state.busy} onChange={upload} /></label>
    {state.slide?.enabled && <div className="spreadsheet-current"><div><strong>{state.slide.title}</strong><span>{state.slide.rows?.length?.toLocaleString() || 0} rows · {state.slide.columns?.length || 0} columns · {state.slide.metrics?.length || 0} detected metrics</span></div><button type="button" onClick={remove}>Remove Slide</button></div>}
    {state.slide?.metrics?.length > 0 && <div className="spreadsheet-metrics"><strong>Detected metrics:</strong> {state.slide.metrics.map((metric) => metric.label).join(" · ")}</div>}
    {state.status && <div className={`operations-alert${state.error ? " is-error" : " is-success"}`}>{state.status}</div>}
  </section>;
}
