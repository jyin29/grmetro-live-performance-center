# Historical Metrics and Snapshot Engine

Date: 2026-08-12  
Status: Phase 13 backend infrastructure

## Purpose and boundaries

The historical engine records the already-normalized, already-calculated dashboard payload. It does not contact ServiceTitan, alter endpoint mappings, normalize fields, calculate KPI business meaning, or introduce a presentation view. The existing `GET /api/v1/dashboard` route remains the only dashboard endpoint.

The lifecycle is:

```text
ServiceTitan native JSON
→ normalization
→ current KPI calculations
→ dashboard payload
→ immutable dashboard snapshot
→ bounded snapshot store
→ historical comparison engine
→ trend analysis engine
→ existing dashboard API
```

## Snapshot lifecycle and format

Every successful refresh passed to `DashboardCache.storeSuccessfulPayload` creates exactly one snapshot. A failed refresh creates no snapshot and leaves the last successful payload and comparison intact. A partial refresh creates a snapshot because it is a successful dashboard result, but technicians explicitly marked stale do not receive misleading movement comparisons.

Snapshots are deep-cloned and recursively frozen. This prevents later mutation of the provider payload or a consumer reference from rewriting history. The in-memory record is:

```javascript
{
  schemaVersion: 1,
  id: "snapshot-00000042",
  capturedAt: "2026-08-12T16:42:01.000Z",
  sourceGeneratedAt: "2026-08-12T16:42:00.000Z",
  sourceRefreshedAt: "2026-08-12T16:42:00.000Z",
  dashboard: { /* complete calculated dashboard payload */ }
}
```

`historicalComparison` and `historicalTrends` are removed before snapshot storage so derived history never recursively contains older results. Sequence IDs are process-local and reset on restart; timestamps are the durable temporal identity for a future persistence adapter.

## Retention strategy

`SNAPSHOT_RETENTION_LIMIT` controls the maximum number of successful snapshots retained. The default is `1440`, approximately 24 hours at the normal one-minute refresh interval. Configuration accepts `1` through `10080`. When the bound is exceeded, the oldest snapshots are removed before returning from the append operation. Memory therefore grows only to the configured count.

History is intentionally in memory. A backend restart clears it, and the first post-restart response reports `no-history`. There is no database, disk file, or browser storage in this phase.

## Comparison engine

The comparison engine is a pure backend module. It accepts a baseline and current snapshot and emits presentation-neutral values; it does not choose symbols, colors, copy, charts, or alert thresholds.

Supported comparison types are:

- KPI value delta, including Revenue and Closing percentage-point changes.
- KPI ranking movement, where a positive delta means movement toward rank one.
- Overall technician ranking movement using the same convention.
- Goal progress delta in percentage points.
- Unchanged values through the explicit `unchanged` direction.
- Technician additions through `technician-not-in-baseline`.
- Missing/unavailable KPI states without coercing them to zero.
- Stale technician suppression during partial refreshes.

An available numeric comparison has this stable shape:

```javascript
{
  available: true,
  reason: null,
  delta: 125,
  direction: "up", // "up", "down", or "unchanged"
  previous: 1000,
  current: 1125
}
```

Unavailable comparisons use `available: false`, a machine-readable `reason`, and null numeric fields. A valid zero remains available and compares normally.

## Dashboard API addition

The existing response retains every prior field and adds one top-level field:

```javascript
{
  // all existing dashboard fields remain unchanged
  historicalComparison: {
    available,
    reason,
    baselineSnapshotId,
    currentSnapshotId,
    baselineCapturedAt,
    currentCapturedAt,
    technicians: {
      "134926818": {
        available,
        reason,
        overallRanking,
        kpis: {
          revenue: { value, ranking, goalProgress }
        }
      }
    }
  }
}
```

The first snapshot returns `available: false` with reason `no-history`. Existing clients that ignore unknown fields continue working. No frontend change is required.

## Trend analysis engine

The reusable trend engine consumes the snapshot store's ordered immutable records and obtains every adjacent movement through the comparison engine. It never reads ServiceTitan fields or recalculates a KPI. For each current technician it analyzes existing KPI values, KPI ranks, goal progress, and overall rank independently.

The default minimum is four snapshots (three adjacent comparisons), configured with `TREND_MINIMUM_HISTORY`; the accepted range is 3–1,440. A direction is reported only when at least 75 percent of adjacent movements agree and the net comparison delta agrees. Mixed short-term movement is therefore `stable` rather than reacting to one refresh. Output also includes presentation-neutral momentum, consistency, net change, and current consecutive increase/decrease counts.

Supported labels are:

- KPI values: `increasing`, `decreasing`, `stable`, or `unknown`.
- KPI rank, overall rank, and goal progress: `improving`, `declining`, `stable`, or `unknown`.
- Momentum: `increasing`, `decreasing`, `stable`, `mixed`, or `unknown`, based on up to the latest three deltas.

Unavailable KPIs, stale partial-refresh technicians, or another unusable point produce `unknown` with `incomplete-history`; missing history produces `insufficient-history`. A new technician gets an independent history window and remains unknown until it reaches the minimum. Removed technicians are excluded from current trend maps and listed in `removedTechnicianIds`. Valid zeroes remain observations.

The existing dashboard response retains all prior fields and also adds:

```javascript
{
  historicalTrends: {
    available,
    reason,
    minimumHistory,
    snapshotCount,
    firstSnapshotId,
    currentSnapshotId,
    removedTechnicianIds,
    technicians: {
      "134926818": {
        available,
        reason,
        overallRanking: { trend, momentum, consistency, consecutiveIncreases, consecutiveDecreases },
        kpis: { revenue: { value, ranking, goalProgress } }
      }
    }
  }
}
```

No endpoint was added. Future small indicators may map increasing/improving to `▲ Trending Up`, decreasing/declining to `▼ Trending Down`, and stable to `→ Stable`; symbol and copy selection remain presentation responsibilities.

## Future persistence and extension strategy

`InMemorySnapshotStore` provides a narrow append/latest/previous/list contract. A future store can implement the same boundary with batched disk or database persistence while keeping snapshot creation and comparisons unchanged. Persistence should store schema-versioned snapshots, index `capturedAt`, apply an explicit retention policy, encrypt or access-restrict operational data, and migrate records rather than mutating historical documents.

Hourly, daily, and weekly policies can select or aggregate immutable snapshots by timestamp before invoking the trend engine. Sparklines and exports can read snapshot series. Management insights and AI summaries can consume trend results without raw ServiceTitan responses. Future extensions may add configurable consistency thresholds, elapsed-time windows, approved KPI-specific tolerances, persistence, seasonality, and acceleration; these belong in selection or analysis policies, not snapshot format or React.

## Limitations

- History resets when the backend restarts.
- Retention is count-based rather than elapsed-time-based.
- Comparisons use the immediately previous successful snapshot; trends use retained ordered snapshots and adjacent comparisons.
- No historical endpoint, elapsed-time aggregation, export, or frontend indicator is included.
- Snapshot IDs are local to one process lifetime.
- A fully failed refresh does not create a time point; cache staleness remains represented by existing cache metadata.
- Stale technicians in a partial refresh are deliberately excluded from movement comparisons.
