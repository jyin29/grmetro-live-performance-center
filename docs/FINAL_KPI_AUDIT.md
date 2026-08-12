# Final Dashboard KPI Audit

Date: 2026-08-12  
Scope: final presentation inventory; no endpoint, normalization, calculation, ranking, or slide changes

## Audit boundary

The dashboard has twelve normalized KPI records per technician: the eleven Version 1.0 canonical concepts
plus the subsequently approved direct `Memberships Sold` count. Six are direct aggregate fields and six are
currently unavailable because their business mapping or job classification has not been approved. Missing
values remain missing; the presentation does not turn them into zero.

## Final normalized KPI inventory

| Normalized KPI | Source / calculation status | Data quality in live mode | Television use |
|---|---|---|---|
| Revenue | Direct `CompletedRevenue` | Confirmed | Revenue, Technicians, Recognition |
| Billable Service Calls | Requires approved job-level service classification | Unavailable | Operations and Technicians only when data becomes available |
| Service Revenue | Requires approved job-level service classification | Unavailable | Not shown; see unused normalized KPIs below |
| 10+ Opportunities | Direct `Opportunity` | Confirmed | Sales, Operations, Technicians |
| Lead Conversion % | No approved ServiceTitan field or business definition | Unavailable | Not shown; see unused normalized KPIs below |
| Tech Leads | Direct `TechLeadJobs` | Confirmed | Sales and Technicians |
| Marketed Leads | Direct `MarketingLeadJobs` | Confirmed | Sales and Technicians |
| Memberships Sold | Direct `MembershipsSold` | Confirmed | Sales, Operations, Technicians |
| Closing % | Direct `CloseRate`, converted once from ratio to percentage | Confirmed | Sales, Technicians, Recognition |
| Number of Installs | Requires approved completed-install classification | Unavailable | Operations only when data becomes available |
| Install Average Ticket | Requires validated install revenue and completed-install count | Unavailable | Operations and Technicians only when data becomes available |
| Install Revenue | Requires approved completed-install classification | Unavailable | Operations and Technicians only when data becomes available |

Mock values are explicitly fallback data and do not change the live-mode statuses above.

## Slide-by-slide use

| Slide | Dominant KPI block | Supporting KPI block | Deliberate exclusions |
|---|---|---|---|
| Revenue | Revenue Today by technician | Revenue Goal, Revenue Remaining, and Goal Progress from the existing goal engine | Service Revenue and Install Revenue are not used as a source split because both classifications are unresolved |
| Sales | Closing % by technician | 10+ Opportunities, Tech Leads, Marketed Leads, and Memberships Sold in one pipeline block | Lead Conversion % is hidden while unavailable; an empty lane would add no decision value |
| Technicians | Overall rank plus the first five available metrics in the fixed priority order: Revenue, Closing %, Billable Calls, Install Revenue, Install Average Ticket, Opportunities, Tech Leads, Marketed Leads, Memberships | Historical rank context when supplied by the backend | Unavailable KPI slots are removed rather than rendered as repeated cards |
| Operations | Billable Service Calls, Opportunities, Memberships Sold, and Number of Installs in one throughput block | Install Average Ticket, Install Revenue, and Number of Installs in one install-economics block | An entirely unavailable group becomes one compact mapping notice instead of five repeated `No data` lanes |
| Recognition | Backend-qualified Overall Top 3 | Revenue and Closing % for each podium position | No category leaderboard or additional score is invented |

The television keeps exactly five slides. Overall rank is a prepared ranking result rather than a thirteenth
KPI, and Revenue Goal, Remaining, and Goal Progress are existing goal-engine fields attached to Revenue rather
than new KPI concepts.

## Normalized KPIs not visible in current live data

- **Service Revenue** is normalized as an unavailable placeholder but has no television placement. Showing it
  would imply a validated split of `CompletedRevenue`; the required service-job classification is unresolved.
- **Lead Conversion %** is normalized as an unavailable placeholder but is intentionally excluded from Sales.
  Neither the business definition nor the correct ServiceTitan source/scale is approved.
- **Billable Service Calls, Number of Installs, Install Average Ticket, and Install Revenue** retain approved
  conditional homes, but their individual lanes are suppressed while every technician has `hasData: false`.
  Operations shows one concise mapping notice for an entirely unavailable group. Technician cards similarly
  fill their limited metric slots with available canonical values instead of repeating `No data`.

No confirmed, already-normalized KPI is orphaned: Revenue, Opportunities, Tech Leads, Marketed Leads,
Memberships Sold, and Closing % all have at least one television placement.

## Requested ServiceTitan fields that remain outside normalization

The existing Technicians datasource requests the following raw fields but the backend does not expose them as
normalized dashboard KPIs. They remain unused because their business meaning, scale, classification, or
product approval is incomplete; requesting a field is not validation.

- Job and workflow: `CompletedJobs`, `WipJobs`, `JobsOnHold`, `CanceledJobs`, `ConvertedJobs`,
  `UnconvertedJobs`, `Upsold`, `SalesOpportunity`, `ClosedOpportunities`, `LeadsSet`.
- Revenue and ticket variants: `TotalJobAverage`, `AdjustmentRevenue`, `CompletedRevenueWithAdjustments`,
  `OpportunityJobAverage`, `TotalSales`, `TotalLeadSales`, `TotalMarketingLeadSales`,
  `TotalSalesFromTgl`, `TotalSalesFromMarketingLeads`.
- Lead and replacement funnel: `OpportunityConversionRate`, `ReplacementLeadJobs`,
  `ReplacementOpportunity`, `ReplacementLeadConversionRate`, `ReplacementLeadsSet`,
  `ReplacementLeadsSold`, `CloseRateFromTgl`, `CloseRateFromMarketingLeads`.
- Membership funnel: `MembershipOpportunities`, `MembershipConversionRate`.
- Quality and productivity: `RecallsCaused`, `Nps`, `CustomerSatisfaction`, `RevenuePerHour`,
  `JobBillableHours`, `BillableEfficiency`, `TasksPerOpportunity`, `OptionsPerOpportunity`.

These raw fields are not silently relabeled, combined, or calculated in React.

## Remaining unavailable ServiceTitan metrics

The unresolved Version 1.0 metrics are Billable Service Calls, Service Revenue, Lead Conversion %, Number of
Installs, Install Average Ticket, and Install Revenue. The first two require an approved service-job
classification. Lead Conversion requires an approved business definition, source field, and percentage scale.
The three install metrics require an approved completed-install classification and install-revenue definition.

Membership Revenue, Maintenance Agreements, Agreement Sales, Recurring Service Agreements, and membership
conversion also remain unavailable. No validated native response mapping was found for the first four, and
the requested `MembershipConversionRate` semantics and scale are not approved.

## Final presentation decision

The final pass favors fewer, denser blocks: one Revenue accountability table, one Sales result block plus one
pipeline block, five person-centered scorecards, two Operations blocks, and one dedicated Top 3 podium. KPI
charts now omit metric lanes with no values across all technicians. This changes presentation density only;
the backend payload continues to preserve every KPI record and its data-quality state for the remote detail
view and future approved mappings.
