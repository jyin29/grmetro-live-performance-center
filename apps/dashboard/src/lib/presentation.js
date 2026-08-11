export function formatMetric(metric) {
  if (!metric?.hasData || metric.value === null || metric.value === undefined) return "No data";
  if (metric.format === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(metric.value);
  if (metric.format === "percentage") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(metric.value)}%`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(metric.value);
}

export function refreshLabel(timestamp, now = Date.now()) {
  if (!timestamp) return "Waiting for live data";
  const elapsed = Math.max(0, now - new Date(timestamp).getTime());
  if (!Number.isFinite(elapsed)) return "Update time unavailable";
  const seconds = Math.floor(elapsed / 1_000);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return `Updated ${seconds} sec ago`;
  return `Updated ${minutes} min ${String(seconds % 60).padStart(2, "0")} sec ago`;
}

export function formatClock(now = Date.now()) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);
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

export function recognitionPresentation(technicians = []) {
  const ranked = rankedTechnicians(technicians);
  const featured = ranked.find((technician) => technician.overall?.qualifies && technician.overall?.rank === 1) ?? null;
  const metricLeader = (id) => technicians.find((technician) => (
    technician.kpis?.[id]?.hasData && technician.kpis[id].rank === 1
  ));
  const biggestImprovement = [...technicians]
    .filter((technician) => technician.overall?.qualifies && technician.overall?.rankChange > 0)
    .sort((left, right) => right.overall.rankChange - left.overall.rankChange || left.overall.rank - right.overall.rank)[0];

  const recognitions = [
    { id: "revenue", symbol: "★", label: "Highest Revenue", technician: metricLeader("revenue") },
    { id: "rank-improvement", symbol: "↑", label: "Biggest Rank Improvement", technician: biggestImprovement },
    { id: "closing", symbol: "◎", label: "Highest Closing %", technician: metricLeader("closingRate") },
    { id: "overall", symbol: "◆", label: "Top Overall Ranking", technician: featured }
  ].filter(({ technician }) => technician);

  return { featured, recognitions };
}
