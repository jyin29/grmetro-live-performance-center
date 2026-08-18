import { useEffect, useState } from "react";
import { fetchDisplaySettings, saveDisplaySettings } from "../api/managementApi";

const SLIDES = [
  ["slide2", "Slide 2 · Sales", { opportunities: "Opportunities", techLeads: "Tech Leads", marketedLeads: "Marketed Leads", membershipsSold: "Memberships Sold", closingRate: "Closing %" }],
  ["slide3", "Slide 3 · Technicians", {
    revenue: "Revenue", closingRate: "Closing %", billableServiceCalls: "Billable Calls", installRevenue: "Install Revenue",
    installAverageTicket: "Average Ticket", opportunities: "Opportunities", techLeads: "Tech Leads", marketedLeads: "Marketed Leads",
    membershipsSold: "Memberships", serviceRevenue: "Service Revenue", leadConversionRate: "Lead Conversion %", installs: "Installs"
  }],
  ["slide4", "Slide 4 · Operations", { billableServiceCalls: "Billable Calls", opportunities: "Opportunities", membershipsSold: "Memberships Sold", installs: "Installs", installAverageTicket: "Average Ticket", installRevenue: "Install Revenue" }]
];
const EXTRA_SERVICETITAN_KPIS = new Set(["serviceRevenue", "leadConversionRate", "installs"]);
export function MetricCustomization() {
  const [state, setState] = useState({ loading: true, settings: null, saved: null, status: "", error: false });
  useEffect(() => { fetchDisplaySettings().then(({ settings }) => setState({ loading: false, settings, saved: settings, status: "", error: false })).catch(() => setState({ loading: false, settings: null, saved: null, status: "Could not load display settings.", error: true })); }, []);
  if (state.loading) return <div className="operations-alert">Loading display settings…</div>;
  if (!state.settings) return <div className="operations-alert is-error">{state.status}</div>;
  const toggle = (slideId, metricId) => setState((current) => ({ ...current, status: "", error: false, settings: { ...current.settings, metrics: { ...current.settings.metrics, [slideId]: { ...current.settings.metrics[slideId], [metricId]: !current.settings.metrics[slideId][metricId] } } } }));
  const reset = () => setState((current) => ({ ...current, settings: current.saved, status: "Changes canceled.", error: false }));
  const save = async () => { try { const result = await saveDisplaySettings(state.settings); setState({ loading: false, settings: result.settings, saved: result.settings, status: "Metric visibility saved. The current slide keeps running; displays update within a few seconds.", error: false }); } catch (error) { setState((current) => ({ ...current, status: error.message, error: true })); } };
  return <div className="metric-customization">
    <div className="settings-title"><span className="mobile-eyebrow">Presentation layout · Phase 1</span><h2>Dashboard Metrics</h2><p>Choose which metrics appear on Slides 2, 3, and 4. Lead Conversion uses the ServiceTitan Lead Generation overview rows rather than the individual technician detail page.</p></div>
    <div className="metric-customization__slides">{SLIDES.map(([slideId, title, labels]) => <section key={slideId} className="metric-customization__slide"><header><strong>{title}</strong><small>{Object.values(state.settings.metrics[slideId] || {}).filter(Boolean).length} enabled</small></header><div>{Object.entries(labels).map(([metricId, label]) => { const checked = state.settings.metrics?.[slideId]?.[metricId] !== false; const extra = slideId === "slide3" && EXTRA_SERVICETITAN_KPIS.has(metricId); return <label key={metricId}><span><strong>{label}</strong><small>{extra ? `ServiceTitan KPI · ${checked ? "Shown" : "Available to add"}` : checked ? "Shown" : "Hidden"}</small></span><input type="checkbox" checked={checked} onChange={() => toggle(slideId, metricId)} /><i aria-hidden="true" /></label>; })}</div></section>)}</div>
    {state.status && <div className={`operations-alert${state.error ? " is-error" : " is-success"}`}>{state.status}</div>}
    <div className="goal-management__actions"><button type="button" onClick={reset}>Cancel</button><button className="operations-primary" type="button" onClick={save}>Save Display Settings</button></div>
  </div>;
}
