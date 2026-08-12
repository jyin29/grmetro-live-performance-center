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

const INSIGHT_PRIORITY = Object.freeze({ critical: 0, warning: 1, informational: 2 });

function metricLabelIndex(data) {
  return Object.values(data?.slides || {}).reduce((labels, slide) => {
    for (const metric of slide?.metrics || []) labels.set(metric.id, metric.label);
    return labels;
  }, new Map());
}

// This presentation helper uses prepared fields only: no KPI aggregation,
// averaging, scoring, or pace calculation belongs in the dashboard.
export function managementInsights(data, presentationState = {}, now = Date.now(), limit = 2) {
  const preparedInsights = Array.isArray(data?.managementInsights)
    ? data.managementInsights
    : data?.managementInsights?.insights;
  if (Array.isArray(preparedInsights)) return preparedInsights.slice(0, limit);
  const insights = [];
  const add = (insight) => insights.push(insight);
  const freshnessState = freshness(data?.refreshedAt, now);

  if (presentationState.hasError) {
    add({ id: "feed-interrupted", priority: "critical", eyebrow: "Feed health", title: "Live updates interrupted", detail: "Showing the last successful dashboard update." });
  } else if (freshnessState === "critical") {
    add({ id: "feed-critical", priority: "critical", eyebrow: "Feed health", title: "Live data needs attention", detail: data?.refreshedAt ? "The last successful update is more than 10 minutes old." : "No successful dashboard update is available." });
  } else if (freshnessState === "stale") {
    add({ id: "feed-stale", priority: "warning", eyebrow: "Feed health", title: "Dashboard data is delayed", detail: "The last successful update is more than 3 minutes old." });
  }

  const ranked = rankedTechnicians(data?.technicians);
  const falling = ranked.filter(({ overall }) => overall?.qualifies && overall.rankChange < 0)
    .sort((left, right) => left.overall.rankChange - right.overall.rankChange || left.overall.rank - right.overall.rank)[0];
  if (falling) add({ id: `rank-falling-${falling.id}`, priority: "warning", eyebrow: "Ranking movement", title: `${falling.shortName || falling.name} moved down ${Math.abs(falling.overall.rankChange)} ${Math.abs(falling.overall.rankChange) === 1 ? "place" : "places"}`, detail: `Now ranked #${falling.overall.rank} overall.` });

  const labels = metricLabelIndex(data);
  const qualityIds = new Set();
  for (const technician of data?.technicians || []) {
    for (const [id, metric] of Object.entries(technician.kpis || {})) {
      if (metric?.dataQuality === "fallback" || metric?.dataQuality === "unavailable") qualityIds.add(id);
    }
  }
  if (qualityIds.size) {
    const qualityLabels = [...qualityIds].map((id) => labels.get(id) || id).slice(0, 2);
    const remaining = qualityIds.size - qualityLabels.length;
    add({ id: "data-quality", priority: "warning", eyebrow: "Data quality", title: `${qualityLabels.join(" and ")} ${qualityLabels.length === 1 ? "needs" : "need"} review`, detail: `${remaining > 0 ? `Plus ${remaining} more. ` : ""}Fallback or unavailable values are not treated as confirmed results.` });
  }

  const reached = ranked.find((technician) => technician.kpis?.revenue?.hasData && technician.kpis.revenue.reached);
  if (reached) add({ id: `goal-${reached.id}`, priority: "informational", eyebrow: "Goal achieved", title: `${reached.shortName || reached.name} reached the Revenue goal`, detail: `${Math.round(reached.kpis.revenue.percentComplete)}% of the backend-configured goal.` });

  const climbing = ranked.filter(({ overall }) => overall?.qualifies && overall.rankChange > 0)
    .sort((left, right) => right.overall.rankChange - left.overall.rankChange || left.overall.rank - right.overall.rank)[0];
  if (climbing) add({ id: `rank-climbing-${climbing.id}`, priority: "informational", eyebrow: "Ranking movement", title: `${climbing.shortName || climbing.name} climbed ${climbing.overall.rankChange} ${climbing.overall.rankChange === 1 ? "place" : "places"}`, detail: `Now ranked #${climbing.overall.rank} overall.` });

  return insights.sort((left, right) => INSIGHT_PRIORITY[left.priority] - INSIGHT_PRIORITY[right.priority]).slice(0, limit);
}

export function operationsHealthPresentation(data, presentationState = {}, now = Date.now()) {
  const refreshTime = data?.refreshedAt ? new Date(data.refreshedAt) : null;
  const hasRefreshTime = refreshTime && Number.isFinite(refreshTime.getTime());
  const freshnessState = hasRefreshTime ? freshness(data.refreshedAt, now) : "critical";
  const hasError = Boolean(presentationState.hasError);
  const isHealthy = !hasError && freshnessState === "live";

  return {
    overall: {
      label: isHealthy ? "Dashboard Healthy" : hasError ? "Updates Interrupted" : "Data Needs Attention",
      detail: isHealthy ? "Live data is current and the presentation is running." : hasError
        ? "Showing the last successful dashboard update."
        : data?.refreshedAt ? "The latest dashboard data is older than expected." : "Waiting for the first successful update.",
      tone: isHealthy ? "healthy" : "warning"
    },
    cards: [
      {
        id: "refresh",
        label: "Last Successful Refresh",
        value: hasRefreshTime ? refreshLabel(data.refreshedAt, now).replace(/^Updated /, "") : "Unavailable",
        detail: hasRefreshTime ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(refreshTime) : "No successful refresh yet",
        tone: freshnessState === "live" ? "healthy" : "warning"
      },
      {
        id: "refresh-state",
        label: "Refresh State",
        value: presentationState.refreshing ? "Refreshing" : hasError ? "Interrupted" : "Ready",
        detail: presentationState.refreshing ? "Updating cached dashboard data" : hasError ? "Last update remains visible" : "Waiting for the next refresh",
        tone: hasError ? "warning" : "healthy"
      },
      {
        id: "cache",
        label: "Cache Status",
        value: data ? "Available" : "Unavailable",
        detail: data ? "Dashboard data is ready" : "No dashboard payload available",
        tone: data ? "healthy" : "warning"
      },
      {
        id: "technicians",
        label: "Technicians",
        value: Array.isArray(data?.technicians) ? String(data.technicians.length) : "Unavailable",
        detail: Array.isArray(data?.technicians) ? "Included in this dashboard" : "Technician count unavailable",
        tone: Array.isArray(data?.technicians) ? "healthy" : "neutral"
      },
      {
        id: "slide",
        label: "Current Slide",
        value: "Operations Health",
        detail: "Slide 5 of 5",
        tone: "neutral"
      },
      {
        id: "rotation",
        label: "Rotation Status",
        value: presentationState.rotationPaused ? "Paused" : "Running",
        detail: presentationState.rotationPaused ? "Resumes when updates recover" : "30-second presentation rotation",
        tone: presentationState.rotationPaused ? "warning" : "healthy"
      }
    ]
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
