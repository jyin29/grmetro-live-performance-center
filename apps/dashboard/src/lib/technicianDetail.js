const KPI_GROUPS = Object.freeze([
  { id: "revenue", label: "Revenue", kpis: ["revenue", "serviceRevenue"] },
  { id: "sales", label: "Sales", kpis: ["closingRate", "leadConversionRate", "opportunities", "installRevenue", "installs", "installAverageTicket"] },
  { id: "operations", label: "Operations", kpis: ["billableServiceCalls", "techLeads", "marketedLeads", "membershipsSold"] }
]);

const KPI_LABELS = Object.freeze({
  revenue: "Revenue Today", serviceRevenue: "Service Revenue", closingRate: "Closing %",
  leadConversionRate: "Lead Conversion %", opportunities: "10+ Opportunities",
  installRevenue: "Install Revenue", installs: "Install Count",
  installAverageTicket: "Install Average Ticket", billableServiceCalls: "Billable Calls",
  techLeads: "Tech Leads", marketedLeads: "Marketed Leads", membershipsSold: "Memberships Sold"
});

export function resolveSelectedTechnician(technicians = [], selectedId = null) {
  return technicians.find(({ id }) => String(id) === String(selectedId)) || technicians[0] || null;
}

export function technicianDetailModel(data, selectedId) {
  const technician = resolveSelectedTechnician(data?.technicians, selectedId);
  if (!technician) return null;
  const id = String(technician.id);
  const comparison = data?.historicalComparison?.technicians?.[id] || null;
  const trends = data?.historicalTrends?.technicians?.[id] || null;
  const groups = KPI_GROUPS.map((group) => ({ ...group, metrics: group.kpis.map((kpiId) => ({
    id: kpiId, label: KPI_LABELS[kpiId] || technician.kpis?.[kpiId]?.label || kpiId,
    metric: technician.kpis?.[kpiId] || null,
    comparison: comparison?.kpis?.[kpiId] || null,
    trend: trends?.kpis?.[kpiId] || null
  })) }));
  const events = (data?.events || []).filter((event) => String(event.technicianId) === id);
  const insights = Array.isArray(data?.managementInsights)
    ? data.managementInsights
    : data?.managementInsights?.insights || [];
  return { technician, groups, comparison, trends, events, insights, refreshedAt: data?.refreshedAt || null };
}

export { KPI_GROUPS };
