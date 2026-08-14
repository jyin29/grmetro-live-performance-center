# Dashboard Metric Guide

## Ranking and qualification

**Revenue Rank** is based only on the confirmed Revenue value for the selected day. It uses competition ranking: equal Revenue values receive the same rank and the next lower value receives the position it occupies (`T-1`, `T-1`, `#3`). Deterministic name/ID ordering keeps cards stable but never changes or implies a different business rank. Fallback or unavailable Revenue is not ranked.

**Overall Rank** remains the weighted goal-attainment score documented in `shared/overallScore.js`; it is never replaced and labeled with a different calculation. A technician qualifies only when KPIs with valid data and positive configured goals supply at least the configured 60% minimum valid weight. When goals or data are insufficient, the card explicitly says `Overall Rank · Not qualified` and may separately show the truthful Revenue Rank fallback. The configured weights remain provisional and require management approval before production launch.

## Displayed KPI numbers

| Number | Meaning / units | ServiceTitan source or calculation | Ranking / comparison | Quality and unavailable behavior |
|---|---|---|---|---|
| Revenue | Revenue credited to the technician today, USD | `TotalRevenue` from the validated technician datasource | Descending Revenue Rank; historical comparison is current minus prior snapshot | Confirmed field required; otherwise `No data` |
| Revenue Goal | Editable daily target, USD | Authoritative backend goal store | Goal progress is Revenue / goal; Remaining is max(goal − Revenue, 0) | Requires a positive saved goal |
| Goal Progress | Percent of configured target | KPI value / configured goal × 100 | Historical comparison is percentage-point change | Requires value and positive goal |
| Remaining | Amount/count needed to meet goal | max(goal − value, 0) | No ranking | Requires value and positive goal |
| Closing % | Validated closing rate, percent | `ClosingRate` normalized to percentage points | Descending KPI rank; comparison is percentage-point change | Confirmed field required |
| Opportunities | Qualified opportunity count | `Opportunities` / documented technician datasource mapping | Descending KPI rank; count delta against prior snapshot | Confirmed mapping required |
| Tech Leads | Technician-generated lead count | `TechLeads` | Descending KPI rank | Confirmed field required |
| Marketed Leads | Marketed lead count | `MarketedLeads` | Descending KPI rank | Confirmed field required |
| Memberships Sold | Sold memberships, count | `MembershipsSold` validated datasource field | Descending KPI rank | Confirmed field required; membership opportunities/conversion remain unavailable because no validated source exists |
| Billable Calls | Completed billable service calls, count | Derived only from approved job classifications | Descending KPI rank | Unavailable while classification approval is incomplete |
| Installs | Completed installs, count | Derived only from approved install classification | Descending KPI rank | Unavailable while completed-install definition is incomplete |
| Install Revenue | Revenue from validated completed installs, USD | Sum of approved install-job revenue | Descending KPI rank | Unavailable until install classification is approved |
| Install Average Ticket | Average completed-install revenue, USD | Install Revenue / completed installs; no installs produces `No data`, not zero | Descending KPI rank | Requires validated install revenue and a positive install count |
| Service Revenue | Revenue from validated service jobs, USD | Sum of approved service-job revenue | Descending KPI rank | Unavailable until service classification is approved |
| Lead Conversion % | Validated converted-lead percentage | No production source approved | Descending KPI rank when available | Unavailable pending business definition |
| Overall Rank | Weighted normalized goal attainment | Weighted, capped KPI value/goal contributions in `overallScoreEngine` | Overall standing and prior-rank movement | Requires at least 60% valid configured weight |
| Historical delta | Change from the previous retained snapshot | Current value minus previous snapshot value | ▲ positive, ▼ negative; a zero delta is intentionally hidden | Requires comparable snapshots with data |
| Refresh age/time | Age and clock time of cached payload | Backend `refreshedAt` | Next-refresh countdown uses the 60-second scheduler cadence | Missing timestamp displays waiting/unavailable |
| Slide/countdown/client counts | Current presentation state and connected clients | Backend presentation manager and WebSocket registry | No KPI ranking | Missing connection state displays unavailable |

## Combined visualizations

Sales uses a wide left pipeline panel for Opportunities, Tech Leads, Marketed Leads, and Memberships Sold, plus a narrower right panel with one readable Closing % row per technician. Pipeline technician names are shared across four aligned metric columns rather than repeated in four charts. Each count retains its separate label, value, and backend-prepared scale; the grouping does not stack, total, or otherwise create a new calculation. Operations uses one throughput panel for Billable Calls, Opportunities, Memberships Sold, and Installs, with Install Revenue and Install Average Ticket sharing Install Economics.

## Refresh and synchronization

The dashboard REST client polls cached data every 60 seconds. The backend refresh scheduler contacts ServiceTitan every 60 seconds and prevents overlap. Presentation commands travel over the display-specific WebSocket and update the selected display only. The current presentation-manager interval is 30 seconds. Goal saves are persisted atomically to `data/goals.json`, trigger one backend refresh, and the saving remote immediately reloads cached data; all displays receive the new payload on their normal cached-data poll.
