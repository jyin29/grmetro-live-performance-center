# Dashboard Content Audit and KPI Domain Strategy

Date: 2026-08-11  
Scope: presentation-only redesign using `docs/KPI_CATALOG.md` and the existing dashboard payload

## Catalog status

`docs/KPI_CATALOG.md` existed in this branch and was used as the authoritative KPI specification. It was not regenerated. The catalog identifies 45 present-data KPI concepts and 24 future concepts while preserving Version 1.0's eleven approved canonical KPI concepts.

## Domain grouping

Every KPI eligible for the five-slide presentation has one primary home. Supporting appearances are limited to technician scorecards and podium context, where they explain a person rather than repeat a domain dashboard.

| Domain | Tier 1 emphasis | Tier 2 support | Tier 3 treatment | Tier 4 |
|---|---|---|---|---|
| Revenue | Revenue Today; revenue goal/progress | Service Revenue and Install Revenue only after approved classification | Adjusted revenue and job/opportunity averages remain detail opportunities | Not presented |
| Sales | Closing %, approved Lead Conversion % | 10+ Opportunities, Tech Leads, Marketed Leads | Lead-source conversion and process ratios remain detail opportunities | Not presented |
| Technicians | Overall standing, Revenue, Closing % | Billable Calls and rank movement | Individual KPI/data-quality detail supports each scorecard | Not presented |
| Operations | Billable Service Calls, Installs, Install Average Ticket, Install Revenue when validated | Field activity and throughput | WIP, holds, cancellations, efficiency, hours, and recalls remain future detail opportunities | Not presented |
| Recognition | Backend-qualified Overall Top 3 | Revenue and Closing % as concise winner context | Category-specific recognition remains a detail opportunity | Not presented |

Unavailable and fallback metrics are never promoted into a confirmed result. Service/install classifications, goals, and Lead Conversion remain subject to the catalog's validation constraints.

## Redesigned five-slide organization

1. **Revenue** — tier-one daily revenue progress receives the largest visual region, with a supporting technician distribution chart.
2. **Sales** — Closing Performance is the dominant result; opportunities and lead activity support it.
3. **Technicians** — five reusable scorecards organize rank, Revenue, Closing, and field activity around each technician.
4. **Operations** — service/install throughput and install economics share one operational view; unavailable classifications remain explicitly visible rather than estimated.
5. **Recognition** — the dedicated second–first–third Top 3 podium remains full screen, with Revenue and Closing as concise context.

The slide deck, automatic 30-second rotation, stationary crossfade, light theme, large television typography, SVG/chart animation, missing-data behavior, and reusable visualization components remain intact. No ServiceTitan request, endpoint, API contract, KPI calculation, ranking, or business rule changed.

## Removed presentation concepts

- Sentence-style question headings.
- A management-attention slide that duplicated technician ranking and revenue.
- A data-health/mapping KPI count in the business rotation.
- Revenue-source wording that implied an available service/install split.

Feed freshness remains in the stationary dashboard header, where it is operational context rather than a business domain.

## Management Intelligence layer

A compact, stationary Management Attention banner now supplements the five domain slides. It is not a slide, does not change the rotation, and shows at most two items. Items are ordered Critical, Warning, then Informational; ties retain the deterministic condition order below. The presentation helper consumes only fields already prepared by the backend.

| Insight | Trigger | Priority | Existing backend fields used |
|---|---|---|---|
| Live updates interrupted | The dashboard request reports an error while cached data remains visible | Critical | Existing frontend request state and cached dashboard payload |
| Live data needs attention | `refreshedAt` is missing/invalid or at least 10 minutes old | Critical | `refreshedAt`; established UI freshness threshold |
| Dashboard data is delayed | `refreshedAt` is at least 3 but less than 10 minutes old | Warning | `refreshedAt`; established UI freshness threshold |
| Overall rank moved down | A backend-qualified technician has negative `overall.rankChange`; the largest fall is shown | Warning | `overall.qualifies`, `overall.rankChange`, `overall.rank`, technician display name |
| KPI data needs review | At least one KPI is `fallback` or `unavailable`; at most two metric labels are named | Warning | `kpis.*.dataQuality`, slide metric `id` and `label` |
| Revenue goal achieved | A technician's Revenue metric has `hasData: true` and backend `reached: true`; the highest-ranked matching technician is shown | Informational | `kpis.revenue.hasData`, `reached`, `percentComplete`, backend overall order |
| Overall rank climbed | A backend-qualified technician has positive `overall.rankChange`; the largest climb is shown | Informational | `overall.qualifies`, `overall.rankChange`, `overall.rank`, technician display name |

No team totals, averages, pace, gap, score, or KPI values are calculated in React. “Below goal pace,” “above goal pace,” “goal nearly achieved,” “goal at risk,” comparison with a team average, and the gap between first and second are deliberately not implemented because the current payload does not provide those backend-prepared conclusions or approved thresholds.

## Remaining KPI opportunities

The existing payload can support additional presentation only after backend ownership and business validation are completed:

- Team Revenue Today, coverage-aware team goals, and true time-of-day pace.
- Validated service/install classification for calls, revenues, installs, and Install Average Ticket.
- Approved Lead Conversion and weighted team closing definitions.
- WIP, held, canceled, recall, efficiency, billable-hour, and revenue-per-hour operational views.
- Lead-source mix and source-specific closing drill-downs.
- Historical trends and improvement recognition after a history/storage decision.
- Backend-prepared pace/risk classifications, near-goal events, team benchmarks, and leader-gap insights after business thresholds and aggregation rules are approved.
- Tier 4 dispatch, capacity, profitability, membership, quality, and cycle-time KPIs cataloged for future expansion.

These opportunities require backend-prepared values and must not be calculated or inferred in React.
