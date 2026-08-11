export function formatMetric(metric) {
  if (!metric?.hasData || metric.value === null || metric.value === undefined) return "No data";
  if (metric.format === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(metric.value);
  if (metric.format === "percentage") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(metric.value)}%`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(metric.value);
}

export function refreshLabel(timestamp, now = Date.now()) {
  const refreshedAt = new Date(timestamp).getTime();
  if (!timestamp || !Number.isFinite(refreshedAt)) return "Waiting for data";
  const elapsed = Math.max(0, now - refreshedAt);
  const seconds = Math.floor(elapsed / 1_000);
  const minutes = Math.floor(elapsed / 60_000);
  if (seconds < 5) return "Just now";
  if (minutes < 1) return `${seconds} seconds ago`;
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
}

export function freshness(timestamp, now = Date.now()) {
  const refreshedAt = new Date(timestamp).getTime();
  if (!timestamp || !Number.isFinite(refreshedAt)) return "offline";
  const minutes = Math.max(0, now - refreshedAt) / 60_000;
  if (minutes >= 5) return "offline";
  if (minutes >= 2) return "stale";
  return "live";
}

export function refreshTime(timestamp) {
  const date = new Date(timestamp);
  if (!timestamp || !Number.isFinite(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date);
}

export function clockParts(now = Date.now()) {
  const date = new Date(now);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
    date: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date)
  };
}

export function rankedTechnicians(technicians = []) {
  return [...technicians].sort((left, right) => {
    const leftRank = left.overall?.rank ?? Number.POSITIVE_INFINITY;
    const rightRank = right.overall?.rank ?? Number.POSITIVE_INFINITY;
    return leftRank - rightRank || left.name.localeCompare(right.name);
  });
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
