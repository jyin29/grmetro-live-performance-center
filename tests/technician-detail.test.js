"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

let server; let React; let renderToStaticMarkup; let TechnicianDetail; let resolveSelectedTechnician; let technicianDetailModel;

function metric(id, value, format = "integer", extra = {}) {
  return { id, value, format, hasData: value !== null, dataQuality: value === null ? "unavailable" : "confirmed", ...extra };
}
function payload(revenue = 12000) {
  const technician = { id: 101, name: "Sample Technician", initials: "ST", overall: { rank: 2, rankChange: 1, qualifies: true }, kpis: {
    revenue: metric("revenue", revenue, "currency", { goal: 15000, remaining: 3000, percentComplete: 80 }), serviceRevenue: metric("serviceRevenue", null, "currency"),
    closingRate: metric("closingRate", 72, "percentage"), leadConversionRate: metric("leadConversionRate", 44, "percentage"), opportunities: metric("opportunities", 8),
    installRevenue: metric("installRevenue", 5000, "currency"), installs: metric("installs", 2), installAverageTicket: metric("installAverageTicket", 2500, "currency"),
    billableServiceCalls: metric("billableServiceCalls", 7), techLeads: metric("techLeads", 3), marketedLeads: metric("marketedLeads", 2)
  }};
  return { refreshedAt: "2026-08-12T12:00:00.000Z", technicians: [technician, { ...technician, id: 202, name: "Second Technician" }],
    historicalComparison: { technicians: { "101": { available: true, overallRanking: { available: true, delta: 1 }, kpis: { revenue: { value: { available: true, delta: 500 } } } } } },
    historicalTrends: { technicians: { "101": { available: true, snapshotCount: 4, overallRanking: { available: true, trend: "improving" }, kpis: { revenue: { value: { available: true, trend: "increasing" } } } } } },
    events: [{ type: "goal-reached", technicianId: 101, ruleId: "goal", createdAt: "2026-08-12T12:00:00.000Z", title: "Revenue goal achieved" }],
    managementInsights: [{ id: "attention", priority: "warning", title: "Install data needs review", detail: "Mapping is unavailable." }] };
}
function render(data = payload()) { return renderToStaticMarkup(React.createElement(TechnicianDetail, { data, selectedId: 101 })); }

before(async () => {
  const { createServer } = await import("vite");
  React = await import("react"); ({ renderToStaticMarkup } = await import("react-dom/server"));
  server = await createServer({ root: path.resolve("apps/dashboard"), server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ TechnicianDetail } = await server.ssrLoadModule("/src/components/TechnicianDetail.jsx"));
  ({ resolveSelectedTechnician, technicianDetailModel } = await server.ssrLoadModule("/src/lib/technicianDetail.js"));
});
after(async () => server?.close());

test("technician drilldown preserves stable selection across refresh updates", () => {
  assert.equal(resolveSelectedTechnician(payload().technicians, 202).name, "Second Technician");
  assert.equal(technicianDetailModel(payload(12750), 101).technician.kpis.revenue.value, 12750);
});
test("technician drilldown renders grouped available backend metrics", () => {
  const markup = render(); for (const text of ["Revenue", "Sales", "Operations", "Recognition", "History", "$12,000", "Goal Progress", "Overall Rank"]) assert.ok(markup.includes(text));
});
test("technician drilldown renders missing KPI handling", () => { const markup = render(); assert.match(markup, /Service Revenue/); assert.match(markup, /No data/); assert.match(markup, /Data quality: unavailable/); });
test("technician drilldown renders backend historical trends", () => { const markup = render(); assert.match(markup, /Increasing/); assert.match(markup, /\+\$500/); assert.match(markup, /Improving/); });
test("technician drilldown renders recent events, achievements, and alerts", () => { const markup = render(); assert.match(markup, /Achievements &amp; Recent Events/); assert.match(markup, /Revenue goal achieved/); assert.match(markup, /Install data needs review/); });
