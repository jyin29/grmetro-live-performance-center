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

## Remaining KPI opportunities

The existing payload can support additional presentation only after backend ownership and business validation are completed:

- Team Revenue Today, coverage-aware team goals, and true time-of-day pace.
- Validated service/install classification for calls, revenues, installs, and Install Average Ticket.
- Approved Lead Conversion and weighted team closing definitions.
- WIP, held, canceled, recall, efficiency, billable-hour, and revenue-per-hour operational views.
- Lead-source mix and source-specific closing drill-downs.
- Historical trends and improvement recognition after a history/storage decision.
- Tier 4 dispatch, capacity, profitability, membership, quality, and cycle-time KPIs cataloged for future expansion.

These opportunities require backend-prepared values and must not be calculated or inferred in React.
