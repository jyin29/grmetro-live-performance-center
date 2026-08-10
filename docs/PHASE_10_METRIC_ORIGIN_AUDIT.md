# Phase 10 Metric Origin Audit

Date: 2026-08-10

Scope: repository investigation only; no production behavior changed

Phase 11 status: not started

## Executive conclusion

The four requested KPI concepts are configured, but the live pipeline does not currently populate or calculate them:

| Requested concept | Canonical repository ID | Configured | Mock populated | Derivation implemented | Live populated/calculated | Current live state | UI used |
|---|---|---:|---:|---:|---:|---|---:|
| Service Revenue | `serviceRevenue` | Yes | Yes | Yes | No | `unavailable` | No dashboard UI exists yet |
| Install Revenue | `installRevenue` | Yes | Yes | Yes | No | `unavailable` | No dashboard UI exists yet |
| Number of Installs | `installs` | Yes | Yes | Yes | No | `unavailable` | No dashboard UI exists yet |
| Install Average Ticket | `installAverageTicket` | Yes | Yes | Yes | No | `unavailable` | No dashboard UI exists yet |

There is no `numberOfInstalls` identifier anywhere in the pre-audit repository. The approved stable ID is `installs`; its label is `Number of Installs`.

The intended Phase 10 origin is the job drilldown datasource followed by validated job classification and `deriveServiceInstallKpis()`. That derivation exists and is unit tested, but it is not imported or called by the live refresh provider. The development client can fetch and sanitize the drilldown only through a development route. The production classification configuration is deliberately empty and has `classificationApproved: false`.

## Complete live path trace

### Dashboard UI

There is currently no dashboard application source or runnable UI. `apps/dashboard/package.json` contains status-only scripts. Consequently none of the four metrics is rendered by a Dashboard component today.

The backend-prepared presentation contract already places:

- `serviceRevenue` and `installRevenue` on the Revenue slide;
- `installs` on the Activity slide;
- `installAverageTicket`, `installRevenue`, and `installs` on the Average Ticket slide;
- `installs` and `installAverageTicket` on Top 3 entries.

### API response

The intended UI reads `GET /api/v1/dashboard`. The route returns `DashboardCache.getPayload()` without calculation or refresh. The payload contains both `technicians[].kpis.<id>` and prepared `slides.<slideId>.rows[].metrics[]` records produced by `buildDashboardPayload()`.

### Backend presentation builder

`buildDashboardPayload()` receives already-normalized technician records, applies goals, rankings, overall score, axes, and slide grouping. It does not derive service/install business values. Missing KPI records pass through with `value: null`, `hasData: false`, and `dataQuality: "unavailable"`.

### Live refresh provider

`ServiceTitanRefreshProvider.refreshTechnician()` posts to Technician Overview and Technician Datasource, validates the responses, selects the matching datasource row, and calls `normalizeServiceTitanTechnician()`. It never calls `deriveServiceInstallKpis()` and never fetches the job drilldown.

`normalizeKpis()` directly maps only `CompletedRevenue`, `Opportunity`, `TechLeadJobs`, `MarketingLeadJobs`, and `CloseRate`. Since none of the four audited KPI IDs appears in `CONFIRMED_DIRECT_FIELDS`, all four are normalized from `null` and are unavailable in live mode.

### ServiceTitan client and endpoints

The normal one-minute refresh uses:

1. `POST /app/api/reporting/modulardashboard/GetTechnicianOverview` — response shape is validated, but its data is not used to populate these four metrics.
2. `POST /app/api/reporting/CustomReport/GetDatasourceData?datasource=Technicians&forTechScorecards=true` — supplies the aggregate row passed to the normalizer. Its requested field list contains none of the four canonical IDs and no approved native mapping for them.

The expected Phase 10 derivation source exists separately:

3. `POST /app/api/reporting/CustomReport/GetDatasourceData?datasource=TechnicianJobsExtendedDrilldownDatasource&parentDatasource=Technicians&forTechScorecards=true` — `createServiceTitanClient().fetchTechnicianJobDrilldown()` can fetch and sanitize this data for the development-only drilldown route. It is not part of the refresh provider.
4. `GET /app/api/reporting/CustomReport/GetDatasourceForTechScorecards?name=TechnicianJobsExtendedDrilldownDatasource` — metadata/research endpoint only; not part of refresh.

Thus the current complete live path is:

```text
Dashboard UI (not implemented)
  ↓ planned GET /api/v1/dashboard
DashboardCache payload
  ↓
buildDashboardPayload(normalized records)
  ↓
ServiceTitanRefreshProvider
  ↓ normalizeServiceTitanTechnician(raw aggregate row)
normalizeKpis
  ↓ no direct mappings for the four KPIs
value: null / hasData: false / dataQuality: unavailable
  ↓
Technician Datasource endpoint
```

The expected, but not enabled, Phase 10 path is:

```text
TechnicianJobsExtendedDrilldownDatasource
  ↓ sanitized job records
validated job classification (currently unapproved)
  ↓
deriveServiceInstallKpis(records, approved configuration)
  ├─ serviceRevenue = sum revenue of completed classified service jobs
  ├─ installRevenue = sum revenue of completed classified install jobs
  ├─ installs = count completed classified install jobs
  └─ installAverageTicket = eligible install revenue / eligible install count
  ↓ NOT WIRED INTO LIVE PROVIDER
normalize/presentation/cache/API/UI
```

## Status by metric

### `serviceRevenue`

- **Configured:** stable KPI metadata, goal slot, score weight, Revenue slide membership, and remote parent-slide mapping exist.
- **Populated:** only mock fixtures populate it.
- **Calculated:** `deriveServiceInstallKpis()` sums revenue from completed records classified as service. This function is not connected to live refresh.
- **Unavailable:** yes in live normalization because it has no confirmed direct field mapping; also explicitly unavailable whenever classification is not approved.
- **Unused:** not semantically unused—the backend presentation contract consumes it—but there is no Dashboard UI and the live provider does not supply it.

### `installRevenue`

- **Configured:** stable KPI metadata, goal slot, score weight, Revenue/Average Ticket slide membership, and remote mapping exist.
- **Populated:** only mock fixtures populate it.
- **Calculated:** `deriveServiceInstallKpis()` sums revenue from completed records classified as install. It is not connected to live refresh.
- **Unavailable:** yes in live normalization and whenever classification is unapproved.
- **Unused:** present in backend payload construction, but no Dashboard UI exists and no live calculation supplies it.

### `numberOfInstalls` / `installs`

- **Configured:** `numberOfInstalls` is not an identifier. `installs` is the configured ID labeled `Number of Installs`, with a goal, score weight, Activity/Average Ticket membership, Top 3 inclusion, and remote mapping.
- **Populated:** only mock fixtures populate it.
- **Calculated:** `deriveServiceInstallKpis()` counts completed records classified as install. It is not connected to live refresh.
- **Unavailable:** yes in live normalization and whenever classification is unapproved.
- **Unused:** backend payload construction consumes `installs`; no Dashboard UI currently renders it.

### `installAverageTicket`

- **Configured:** stable KPI metadata, goal slot, score weight, Average Ticket primary-KPI role, Top 3 inclusion, and remote mapping exist.
- **Populated:** only mock fixtures populate it.
- **Calculated:** for classified completed install records with a usable revenue basis, `deriveServiceInstallKpis()` divides summed revenue by the eligible count. A zero denominator correctly returns no data. It is not connected to live refresh.
- **Unavailable:** yes in live normalization, with no data also used for a zero eligible denominator.
- **Unused:** the backend presentation contract makes it the Average Ticket primary KPI, but no Dashboard UI currently exists.

## Repository reference inventory

The following is the complete pre-audit, tracked-file inventory produced with case-insensitive `git grep` for the four requested identifiers. Generated dependency files and `.git` internals are not product references.

### `serviceRevenue`

- Runtime/backend: `apps/backend/src/data/dashboardBuilder.js:14`; `apps/backend/src/data/jobDerivations.js:8-10,19-20,32`; `apps/backend/src/providers/mockRefreshProvider.js:11,78`; `apps/backend/src/tv/tvManager.js:17`.
- Tests: `apps/backend/test/business-normalization.test.js:27`; `apps/backend/test/dashboardBuilder.test.js:16`; `apps/backend/test/job-derivations.test.js:9-10,37-39`; `apps/backend/test/servicetitan-research-observer.test.js:170,178,183`; `tests/shared-validation.test.js:18`.
- Shared configuration: `shared/goals.js:7`; `shared/kpis.js:14-15`; `shared/overallScore.js:12`.
- Documentation/specification: `docs/PROJECT_SPEC.md:1541,2329,4078,4196,4477,6530,6580,6638,6711`; `docs/SERVICETITAN.md:946`; `docs/TASKS.md:128`.

### `installRevenue`

- Runtime/backend: `apps/backend/src/data/dashboardBuilder.js:14,17`; `apps/backend/src/data/jobDerivations.js:8-10,25-27,33,35`; `apps/backend/src/providers/mockRefreshProvider.js:13,78,81`; `apps/backend/src/tv/tvManager.js:18`.
- Tests: `apps/backend/test/business-normalization.test.js:27`; `apps/backend/test/job-derivations.test.js:9,40-42,49`; `apps/backend/test/servicetitan-research-observer.test.js:147,154,190,193`; `tests/mock-mode.test.js:70`; `tests/shared-validation.test.js:19`.
- Shared configuration: `shared/goals.js:15`; `shared/kpis.js:54-55`; `shared/overallScore.js:20`.
- Documentation/specification: `docs/PROJECT_SPEC.md:1542,2337,4086,4485,6538,6586,6645,6718,7018`; `docs/SERVICETITAN.md:954`; `docs/TASKS.md:136`.

### `installAverageTicket`

- Runtime/backend: `apps/backend/src/data/dashboardBuilder.js:17,19,44,51`; `apps/backend/src/data/jobDerivations.js:8-9,25-26,35`; `apps/backend/src/providers/mockRefreshProvider.js:13,81,83`; `apps/backend/src/tv/tvManager.js:26`.
- Tests: `apps/backend/test/business-normalization.test.js:27,34,36`; `apps/backend/test/job-derivations.test.js:9-10,46-48,55-56`; `apps/backend/test/tvManager.test.js:87,93`; `tests/mock-mode.test.js:71`; `tests/shared-validation.test.js:19`.
- Shared configuration: `shared/goals.js:14`; `shared/kpis.js:49-50`; `shared/overallScore.js:19`.
- Documentation/specification: `docs/PROJECT_SPEC.md:1555,2336,4085,4484,4641,5617,6537,6969,6992,6996,7109`; `docs/SERVICETITAN.md:953`; `docs/TASKS.md:135`.

### `numberOfInstalls`

- Exact identifier references: **none**.
- Canonical replacement: `installs`, configured at `shared/kpis.js:44-46` with the label `Number of Installs`.
- Runtime/backend canonical references: `apps/backend/src/data/dashboardBuilder.js:15,17,51`; `apps/backend/src/data/jobDerivations.js:8-10,23,34`; `apps/backend/src/providers/mockRefreshProvider.js:13,79,81`; `apps/backend/src/tv/tvManager.js:23`.
- Test canonical references: `apps/backend/test/business-normalization.test.js:27,34-35`; `apps/backend/test/job-derivations.test.js:9,43-45,49,52,54`; `apps/backend/test/servicetitan-research-observer.test.js:167,180`; `tests/mock-mode.test.js:67,69`; `tests/shared-validation.test.js:19`.
- Shared configuration canonical references: `shared/goals.js:13`; `shared/kpis.js:44-46`; `shared/overallScore.js:18`.
- Documentation references to the label/canonical mapping: `AGENTS.md:225,243,315`; `README.md:108,679,1130`; `docs/SERVICETITAN.md:853,858,935,952,1279,1287,1488,1945,1949-1951`; `docs/TASKS.md:134,816,1038,1040,1488,1657`.

## Investigation safeguards

- No production calculations were modified or enabled.
- The one-minute refresh remains unchanged.
- `classificationApproved` remains `false`.
- No ServiceTitan mapping was guessed.
- Phase 11 was not started.
