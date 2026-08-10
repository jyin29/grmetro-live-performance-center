export function formatMetric(metric) {
  if (!metric?.hasData || metric.value === null || metric.value === undefined) return "No data";
  if (metric.format === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(metric.value);
  if (metric.format === "percentage") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(metric.value)}%`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(metric.value);
}

export function refreshLabel(timestamp, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(timestamp).getTime());
  if (!Number.isFinite(elapsed)) return "Update time unavailable";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes === 1) return "Updated 1 min ago";
  return `Updated ${minutes} min ago`;
}

export function freshness(timestamp, now = Date.now()) {
  const minutes = (now - new Date(timestamp).getTime()) / 60_000;
  if (!Number.isFinite(minutes) || minutes >= 10) return "critical";
  if (minutes >= 3) return "stale";
  return "live";
}

export function rankedTechnicians(technicians = []) {
  return [...technicians].sort((left, right) => {
    const leftRank = left.overall?.rank ?? Number.POSITIVE_INFINITY;
    const rightRank = right.overall?.rank ?? Number.POSITIVE_INFINITY;
    return leftRank - rightRank || left.name.localeCompare(right.name);
  });
}

export function chartMetric(technician, kpiId) {
  return technician?.kpis?.[kpiId] ?? null;
}

export function rankChangeLabel(change) {
  if (change > 0) return `Up ${change} rank${change === 1 ? "" : "s"}`;
  if (change < 0) return `Down ${Math.abs(change)} rank${change === -1 ? "" : "s"}`;
  return "Rank steady";
}

export function performerGroups(technicians = []) {
  const qualified = technicians.filter((technician) => technician.overall?.qualifies);
  return { top: qualified.slice(0, 2), bottom: qualified.slice(-2).reverse() };
}

export function technicianStatus(technician) {
  if (technician?.available === false) return { label: "Unavailable", tone: "neutral" };
  if (technician?.stale) return { label: "Stale", tone: "warning" };
  return { label: "Healthy", tone: "live" };
}

export function dashboardStatus(status = {}, { refreshing = false, requestFailed = false } = {}) {
  if (refreshing) return { label: "Refreshing", tone: "refreshing" };
  if (status.cache === "unavailable") return { label: "Data unavailable", tone: "neutral" };
  if (requestFailed || status.cache === "stale") return { label: "Stale data", tone: "warning" };
  return { label: "Healthy", tone: "live" };
}

export function summaryMetrics(data) {
  const definitions = [
    ["revenue", "Revenue"], ["billableServiceCalls", "Billable Calls"],
    ["closingRate", "Closing"], ["installAverageTicket", "Install Avg Ticket"]
  ];
  return definitions.map(([id, label]) => {
    const ranked = data?.technicians?.filter((technician) => technician.kpis?.[id]?.hasData)
      .sort((a, b) => (a.kpis[id].rank ?? Infinity) - (b.kpis[id].rank ?? Infinity));
    return { id, label, metric: ranked?.[0]?.kpis[id] ?? null, technician: ranked?.[0]?.shortName ?? "Awaiting data" };
  });
}
