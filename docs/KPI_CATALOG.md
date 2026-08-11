# KPI Catalog and Engine Design

Date: 2026-08-11  
Status: audit and architecture recommendation; no runtime behavior changed

## Scope and counting convention

This catalog traces the current production path and inventories what can be computed **without another ServiceTitan request**. “Can be produced” means the necessary source is already requested by the backend; it does not mean the business mapping, goal, or job classification has been approved. Unapproved results remain `unavailable` or proposed until validation.

The audit found **58 business source fields**: 43 requested aggregate fields and 15 allow-listed job-drilldown fields. `TechnicianId`, the join/configuration key returned with the aggregate row, makes **59 pipeline input fields**. The overview endpoint also returns a verification object, but the refresh provider validates and then discards it; its fields do not reach normalization.

The catalog identifies **45 present-data KPI concepts** and **24 important missing KPI concepts**. The 45 include the currently approved canonical concepts that have a source or conditional derivation plus safe calculations/views from already requested fields; they do not imply that every concept is approved for production. These counts describe catalog rows, not new Version 1.0 KPIs. Version 1.0 remains limited to the approved eleven canonical concepts and five slides.

## 1. Backend data inventory

### 1.1 Complete pipeline trace

```text
ServiceTitan JSON
  ├─ Technician Overview (validated, currently not mapped)
  ├─ Technicians datasource (aggregate row)
  └─ TechnicianJobsExtendedDrilldownDatasource (job rows)
       ↓
response validation and drilldown allow-list sanitization
       ↓
normalizeServiceTitanTechnician + deriveServiceInstallKpis
       ↓
configured public technician identity + canonical KPI records
       ↓
goalEngine → rankingEngine → overallScoreEngine → axis/slide builder
       ↓
ServiceTitanRefreshProvider payload
       ↓
RefreshScheduler (60 seconds, no overlap, partial-result retention)
       ↓
DashboardCache (latest successful in-memory payload)
       ↓
GET /api/v1/dashboard (returns the cached payload unchanged)
```

The aggregate normalizer currently maps only `CompletedRevenue`, `Opportunity`, `TechLeadJobs`, `MarketingLeadJobs`, and `CloseRate`. The drilldown derivation calculates five more concepts, but deliberately suppresses them while `classificationApproved` is false. Lead Conversion has no approved mapping. The overview response is not merged into the model.

### 1.2 ServiceTitan input inventory

All sources use the backend scheduler's same-day date range in `America/New_York` and normally update once every **60 seconds**. A failed technician refresh retains that technician's prior cache record and marks it stale.

#### Aggregate datasource — 43 requested fields

| Field | Meaning / unit | Type | Current use and status |
|---|---|---|---|
| `CompletedRevenue` | completed revenue; dollars | number | Raw; mapped to confirmed `revenue` |
| `CompletedJobs` | completed job count; jobs | integer | Raw; available, but **not** Billable Service Calls |
| `Opportunity` | opportunity count; opportunities | integer | Raw; mapped to confirmed `opportunities` |
| `OpportunityConversionRate` | opportunity conversion; ratio | number | Raw; available, not approved as Lead Conversion |
| `RecallsCaused` | recalls attributed; recalls | integer | Raw; requested, not normalized |
| `Nps` | net promoter score; score | number | Raw; requested, not normalized |
| `CustomerSatisfaction` | customer-satisfaction result; score/object | number/object | Raw; requested, not normalized; response shape needs validation |
| `WipJobs` | work-in-progress jobs; jobs | integer | Raw; requested, not normalized |
| `JobsOnHold` | on-hold jobs; jobs | integer | Raw; requested, not normalized |
| `CanceledJobs` | canceled jobs; jobs | integer | Raw; requested, not normalized |
| `TotalJobAverage` | average across jobs; dollars/job | number | Raw; requested, business denominator not validated |
| `AdjustmentRevenue` | revenue adjustment; dollars | number | Raw; requested, not normalized |
| `CompletedRevenueWithAdjustments` | adjusted completed revenue; dollars | number | Raw; requested, not normalized |
| `ConvertedJobs` | converted-job count; jobs | integer | Raw; requested, definition not validated |
| `UnconvertedJobs` | unconverted-job count; jobs | integer | Raw; requested, definition not validated |
| `OpportunityJobAverage` | opportunity-job average; dollars/job | number | Raw; requested, not normalized |
| `Upsold` | upsold result/count; unknown | number | Raw; requested, semantics need metadata validation |
| `ReplacementLeadJobs` | replacement-lead jobs; jobs | integer | Raw; requested, not normalized |
| `ReplacementOpportunity` | replacement opportunities; opportunities | integer | Raw; requested, not normalized |
| `ReplacementLeadConversionRate` | replacement lead conversion; ratio | number | Raw; candidate only, not approved Lead Conversion |
| `ReplacementLeadsSet` | replacement leads set; leads | integer | Raw; requested, not normalized |
| `ReplacementLeadsSold` | replacement leads sold; leads | integer | Raw; requested, not normalized |
| `TechLeadJobs` | technician-generated lead jobs; leads/jobs | integer | Raw; mapped to confirmed `techLeads` |
| `TotalLeadSales` | lead sales; dollars | number | Raw; requested, not normalized |
| `CloseRateFromTgl` | technician-generated-lead close rate; ratio | number | Raw; requested, not normalized |
| `MarketingLeadJobs` | marketed lead jobs; leads/jobs | integer | Raw; mapped to confirmed `marketedLeads` |
| `TotalMarketingLeadSales` | marketed-lead sales; dollars | number | Raw; requested, not normalized |
| `CloseRateFromMarketingLeads` | marketed-lead close rate; ratio | number | Raw; requested, not normalized |
| `MembershipsSold` | memberships sold; memberships | integer | Raw; requested, not normalized |
| `MembershipOpportunities` | membership opportunities; opportunities | integer | Raw; requested, not normalized |
| `MembershipConversionRate` | membership conversion; ratio | number | Raw; requested, not normalized |
| `RevenuePerHour` | revenue per hour; dollars/hour | number | Raw; requested, not normalized |
| `JobBillableHours` | billable job hours; hours | number | Raw; requested, not normalized |
| `BillableEfficiency` | billable efficiency; ratio | number | Raw; requested, not normalized |
| `TasksPerOpportunity` | tasks per opportunity; tasks/opportunity | number | Raw; requested, not normalized |
| `OptionsPerOpportunity` | options per opportunity; options/opportunity | number | Raw; requested, not normalized |
| `SalesOpportunity` | sales opportunity count; opportunities | integer | Raw; requested, not normalized |
| `ClosedOpportunities` | closed opportunities; opportunities | integer | Raw; requested, not completed installs |
| `TotalSales` | total sales; dollars | number | Raw; requested, not Install Revenue |
| `CloseRate` | closing rate; ratio | number | Raw; converted ×100 to confirmed `closingRate` |
| `TotalSalesFromTgl` | sales from technician-generated leads; dollars | number | Raw; requested, not normalized |
| `TotalSalesFromMarketingLeads` | sales from marketed leads; dollars | number | Raw; requested, not normalized |
| `LeadsSet` | leads set; leads | integer | Raw; requested, not normalized |

The returned `TechnicianId` is an integer identity key used to select the matching row and join it to the five configured public identities. `Name`, links, private identity, and arbitrary provider fields are not copied.

#### Sanitized job drilldown — 15 allow-listed fields

| Internal field | Meaning / unit | Type | Raw/derived use |
|---|---|---|---|
| `recordKey` | non-presentation record key | string/number | Raw; diagnostics/deduplication candidate only |
| `technicianId` | technician join key | integer | Raw; not exposed from job rows |
| `jobTypeId` | ServiceTitan job-type key | integer | Raw; classifier input |
| `jobTypeName` | job-type label | string | Raw; classifier input; never presented |
| `businessUnitId` | business-unit key | integer | Raw; potential segmentation input |
| `businessUnitName` | business-unit label | string | Raw; potential segmentation input; not presented |
| `status` | job lifecycle status | string | Raw; completed/canceled classifier input |
| `completedOn` | completion timestamp | date-time/string | Raw; potential timing input; not currently derived |
| `revenue` | selected job revenue basis; dollars | number/string | Raw; service/install sum input, basis unapproved |
| `isBillable` | billable indicator | boolean-like | Raw; Billable Service Calls input |
| `isRecall` | recall indicator | boolean-like | Raw; exclusion input |
| `isWarranty` | warranty indicator | boolean-like | Raw; exclusion input |
| `isNoCharge` | no-charge indicator | boolean-like | Raw; exclusion input |
| `invoiceSubtotal` | invoice subtotal; dollars | number/string | Raw; retained for research, not currently used |
| `invoiceTotal` | invoice total; dollars | number/string | Raw; retained for research, not currently used |

The sanitizer has 15 unique targets. Unknown and privacy-sensitive fields are removed before derivation. Classification configuration is empty and unapproved, so derived output remains unavailable.

### 1.3 Fields that reach `GET /api/v1/dashboard`

| Path | Meaning | Type / units | Source | Raw or derived | Frequency |
|---|---|---|---|---|---|
| `version` | payload contract version | integer | builder | derived metadata | each successful refresh |
| `provider` | `servicetitan` or mock provider | string | provider | metadata | each refresh |
| `generatedAt`, `refreshedAt` | payload timestamps | ISO string | builder | derived metadata | each refresh |
| `rotationEpoch` | shared-rotation anchor | ISO string | previous payload/builder | derived state | retained across refreshes |
| `status.browser`, `.serviceTitan`, `.cache`, `.staleTechnicianCount` | feed health | string/integer | provider | derived status | each refresh |
| `technicians[].id`, `.name`, `.shortName`, `.initials` | approved public identity | integer/string | shared configuration | normalized | each refresh |
| `technicians[].stale`, `.available`, `.lastSuccessfulUpdate` | per-technician freshness | boolean/ISO/null | provider | derived status | each refresh |
| `technicians[].kpis.<id>.id`, `.label`, `.shortLabel`, `.format`, `.unit` | canonical metric metadata | strings | shared KPI registry | normalized metadata | stable, emitted each refresh |
| `...value`, `...hasData`, `...dataQuality` | metric result and quality | number/null, boolean, enum | normalization/derivation | raw-normalized or derived | each refresh |
| `...goal`, `...percentComplete`, `...remaining`, `...reached` | goal result | number/null, boolean | goal engine | derived | each refresh |
| `...rank`, `...previousRank`, `...rankChange` | KPI ranking | integer/null | ranking engine | derived | each refresh |
| `technicians[].overall.qualifies`, `.status`, `.validWeight`, `.rank`, `.previousRank`, `.rankChange` | overall qualification/ranking | boolean/string/number | overall-score engine | derived | each refresh |
| `slides.<id>.id`, `.label`, `.durationSeconds`, `.primaryKpiId` | slide contract | strings/integer | shared registry/builder | derived presentation | each refresh |
| `slides.<id>.metrics[]` | metric IDs, labels, colors | objects | shared KPI registry | presentation metadata | each refresh |
| `slides.<id>.axis` | minimum, maximum, ticks, format, compact | object | axis engine | derived presentation | each refresh |
| `slides.<id>.rows[]` | public identity, primary rank, metrics | objects | builder | derived presentation | each refresh |
| `slides...metrics[].normalizedRatio` | value / axis maximum | number/null | builder | derived presentation | each refresh |
| `slides.top-three.entries[]`, `overallTopThree[]` | qualified top-three or placeholders | array | overall ranking | derived presentation | each refresh |
| `events[]` | new leader, entered top three, goal reached | array | achievement engine | derived event | each refresh; expires after 3 seconds |
| `diagnostics.date`, `.results[]` | safe refresh outcome, durations, request status, optional dev derivation counts | object | provider | diagnostics | each refresh |

The public `overall.score` is intentionally removed. Raw ServiceTitan objects, job rows, goals configuration, browser URL, CSRF data, and private identity do not reach the dashboard.

## 2. Complete present-data KPI catalog

Availability codes: **Yes** = all inputs exist and semantics are sufficiently direct; **Conditional** = data exists but business validation/configuration is required; **No goal/history** = current value exists but requested comparison cannot be meaningful until goals or history exist. Tier assignments appear in section 4.

### Revenue and financial

| KPI | Business value | Formula | Required fields | Inputs exist? |
|---|---|---|---|---|
| Revenue Today | Primary daily outcome by technician | `CompletedRevenue` | `CompletedRevenue` | Yes; current canonical `revenue` |
| Team Revenue Today | Owner's total daily production | sum of technician `revenue` with data | all technician revenue values | Yes; engine should return coverage count |
| Revenue per Technician | Productivity comparison | team revenue / technicians with revenue data | revenue, coverage | Yes |
| Revenue per Active Technician | Avoids diluting average with missing technicians | team revenue / available technicians with data | revenue, `available` | Yes |
| Revenue Distribution | Revenue concentration by technician | technician revenue / team revenue ×100 | technician/team revenue | Yes; no-data if team total is zero |
| Highest Revenue / Top Revenue Performer | Recognition and coaching | technician with revenue rank 1 | revenue ranks | Yes; already ranked |
| Lowest Revenue Performer | Management attention without invented threshold | last ranked technician with data | revenue ranks | Yes |
| Adjusted Revenue | Shows effect of adjustments | `CompletedRevenueWithAdjustments` | aggregate adjusted revenue | Conditional: accounting meaning needs approval |
| Revenue Adjustments | Quantifies adjustments | `AdjustmentRevenue`, or adjusted − base after reconciliation | both aggregate fields | Conditional |
| Opportunity Average Ticket | Sales quality on opportunity jobs | `OpportunityJobAverage` | aggregate field | Conditional: denominator meaning needs validation |
| Total Job Average | Broad average ticket | `TotalJobAverage` | aggregate field | Conditional: not the approved Install Average Ticket |
| Revenue per Billable Hour | Labor monetization | `RevenuePerHour` (verify against revenue / billable hours) | aggregate field | Conditional: native formula semantics need validation |

### Sales, closing, and lead funnel

| KPI | Business value | Formula | Required fields | Inputs exist? |
|---|---|---|---|---|
| 10+ Opportunities | Measures opportunity creation | native `Opportunity` | `Opportunity` | Yes; label threshold still follows approved business label |
| Team Opportunities | Daily team funnel volume | sum `opportunities` | normalized opportunity values | Yes |
| Opportunities per Technician | Funnel distribution | team opportunities / technicians with data | opportunities, coverage | Yes |
| Closing % | Measures close effectiveness | `CloseRate × 100` | `CloseRate` | Yes; current canonical `closingRate` |
| Team Average Closing % | Simple technician benchmark | mean of technician closing percentages with data | closing values | Yes, but label as unweighted average |
| Weighted Team Closing % | True team close effectiveness | closed outcomes / eligible opportunities ×100 | validated numerator/denominator | Conditional; candidate fields exist but business definition is unapproved |
| Tech Leads | Technician-created lead volume | native `TechLeadJobs` | `TechLeadJobs` | Yes; current canonical `techLeads` |
| Marketed Leads | Market-generated lead volume | native `MarketingLeadJobs` | `MarketingLeadJobs` | Yes; current canonical `marketedLeads` |
| Lead Source Mix | Shows reliance on technician vs marketing leads | each lead type / (`techLeads + marketedLeads`) ×100 | both lead counts | Yes; no-data when total is zero |
| Tech-Lead Closing % | Effectiveness of technician-generated leads | `CloseRateFromTgl × 100` | aggregate field | Conditional: validate eligible population |
| Marketed-Lead Closing % | Marketing lead effectiveness | `CloseRateFromMarketingLeads × 100` | aggregate field | Conditional |
| Replacement Lead Conversion % | Replacement funnel performance | `ReplacementLeadConversionRate × 100` | aggregate field | Conditional; not approved Lead Conversion % |
| Membership Conversion % | Membership sales effectiveness | `MembershipConversionRate × 100` | aggregate field | Conditional |

### Operations and productivity

| KPI | Business value | Formula | Required fields | Inputs exist? |
|---|---|---|---|---|
| Calls/Jobs Completed | Daily throughput | native `CompletedJobs` | aggregate field | Yes as completed jobs; must not be labeled Billable Service Calls |
| Billable Service Calls | Valid service-call volume | count completed, classified service jobs where `isBillable=true` | drilldown type/status/billable/exclusions | Conditional; pipeline exists, classification unapproved |
| Work in Progress | Work not yet completed | native `WipJobs` | aggregate field | Conditional: status definition needs validation |
| Jobs on Hold | Blocked operational work | native `JobsOnHold` | aggregate field | Conditional |
| Canceled Jobs | Lost/avoided workload | native `CanceledJobs` | aggregate field | Conditional |
| Recall Count | Quality/callback signal | native `RecallsCaused` | aggregate field | Conditional: attribution/window semantics need validation |
| Billable Efficiency | Labor utilization proxy | `BillableEfficiency × 100` | aggregate field | Conditional: ServiceTitan formula needs validation |
| Job Billable Hours | Monetized labor time | native `JobBillableHours` | aggregate field | Conditional |
| Tasks per Opportunity | Sales-process discipline | native `TasksPerOpportunity` | aggregate field | Conditional |
| Options per Opportunity | Option-building discipline | native `OptionsPerOpportunity` | aggregate field | Conditional |

### Service/install, recognition, and goals

| KPI | Business value | Formula | Required fields | Inputs exist? |
|---|---|---|---|---|
| Service Revenue | Service-line contribution | sum revenue for completed classified service jobs | drilldown classification/status/revenue/exclusions | Conditional; currently suppressed |
| Install Revenue | Install-line contribution | sum revenue for completed classified install jobs | same | Conditional; currently suppressed |
| Number of Installs | Install throughput | count completed classified install jobs | classification/status/exclusions | Conditional; currently suppressed |
| Install Average Ticket | Install sales quality | eligible install revenue / eligible install count | install revenue and count | Conditional; currently suppressed; no data at zero denominator |
| Technician KPI Ranking | Identifies leaders per metric | descending value; revenue then name tie-break | any canonical KPI | Yes; already built |
| Overall Technician Ranking / Top Performer | Balanced recognition | weighted goal attainment over valid KPI weights | canonical metrics, approved goals/weights | No goal/history: engine exists, production goals are null and weights provisional |
| Top 3 | Recognition podium | first three qualified overall ranks | overall rankings | No goal/history in production; payload emits placeholders until qualified |
| Biggest Improvement | Recognizes positive movement | max current `rankChange` | previous cached rank and current rank | Yes for rank movement after two successful snapshots; restart resets history |
| Outstanding Issues | Directs management attention | stale/unavailable mappings + bottom ranks + goal remaining | status, quality, ranks, goals | Conditional: facts exist; alert policy must be explicit |
| Revenue Goal / Remaining / Daily Goal Progress | Makes the target actionable | configured goal; `max(0, goal−value)`; `value/goal×100` | revenue and positive goal | No goal/history: formulas already built, production goals null |
| Weekly Goal Progress | Longer-horizon accountability | week-to-date revenue / weekly goal ×100 | multi-day values and weekly goal | **No** under current same-day/in-memory pipeline; included in missing analysis |
| Monthly Goal Progress | Month-to-date accountability | month-to-date revenue / monthly goal ×100 | multi-day values and monthly goal | **No** under current pipeline |

The tables contain 45 present-data concepts before the two explicitly marked missing weekly/monthly rows; those two are repeated only to prevent a common misclassification and are counted in the missing catalog, not the present-data count.

## 3. Missing KPI analysis — 24 concepts

| Missing KPI | Why useful | Missing backend data | Likely in ServiceTitan? / endpoint impact |
|---|---|---|---|
| Revenue Pace vs Time | Predicts whether today is on track | business-day schedule and intraday elapsed/expected curve | Time is local; pacing policy is not. No endpoint necessarily required after policy approval |
| Weekly Revenue / Goal Progress | Smooths daily volatility | week-to-date data and weekly goals | Likely reporting data; current requests are same-day, so date-range request or storage required |
| Monthly Revenue / Goal Progress | Owner-level trend | month-to-date data and monthly goals | Likely reporting data; broader request or storage required |
| Prior-day/week/month Growth | Measures improvement | historical comparable values | Likely reporting endpoints; current in-memory cache has no durable history |
| Revenue per Truck | Fleet productivity | validated technician↔truck assignment and truck activity | Overview exposes `truck`, but it is discarded/private-boundary review needed; may use overview without a new endpoint |
| Revenue per Labor Hour | Productivity benchmark | validated worked hours and revenue basis | `RevenuePerHour` exists, but worked-hour denominator is not requested in current field registry; metadata/request change may be required |
| Gross Profit / Margin | Financial quality beyond sales | material, equipment, labor, discounts, commissions/cost | Likely invoice/job-costing endpoints; additional endpoint(s) required |
| Collected Revenue / AR | Cash realization | payments, balances, invoice aging | Likely accounting endpoints; additional requests required |
| Open Calls | Dispatch workload | appointment/job status at call level | Likely dispatch/jobs endpoint; additional endpoint required |
| Dispatched Calls | Near-term technician load | dispatch status and assignment | Likely dispatch board/appointments endpoint; additional endpoint required |
| Unassigned Calls | Capacity risk | unassigned appointments/jobs | Likely dispatch endpoint; additional endpoint required |
| Late Calls / On-time Arrival | Customer experience and routing | appointment windows and arrival timestamps | Likely appointments/dispatch endpoint; additional endpoint required |
| Calls per Truck | Field asset throughput | truck assignment plus completed call classification | Likely overview + jobs, but truck assignment is not retained and classification is unapproved |
| Drive Time / Route Efficiency | Reduces unproductive time | GPS/dispatch travel timestamps | Likely dispatch/fleet sources; additional endpoints/integration required |
| Labor Utilization | Measures productive vs paid time | clocked/paid hours and billable/work time | Likely timesheet/payroll endpoint; additional endpoint required |
| First-time Fix Rate | Service quality | repeat visit linkage and resolution definition | Likely job/appointment history; additional data and business rules required |
| Callback Rate | Quality and avoidable cost | validated recalls/callback denominator and linked prior jobs | `RecallsCaused` is candidate numerator; denominator/linkage needs job history, likely additional range/endpoint |
| Maintenance Agreement Renewal Rate | Recurring-revenue health | expiring memberships and renewals | Likely memberships endpoint; additional request required |
| Membership Attach Rate | Sales behavior per eligible call | memberships sold plus eligible call denominator | numerator exists; eligibility/classification missing, perhaps job drilldown after approval |
| Accessory / IAQ Sales | High-margin add-on performance | invoice item categories and amounts | Likely invoice/item endpoints; additional request required |
| Estimate-to-Sale Conversion | Sales funnel quality | estimates presented/approved/sold linkage | Likely estimates/sales endpoints; additional request required |
| Install Backlog | Capacity and cash planning | sold installs not completed, scheduled date/value | Likely sales/projects/appointments endpoints; additional request required |
| Sold-to-Installed Cycle Time | Customer wait and production flow | sold timestamp linked to completion timestamp | Likely multiple endpoints and stable job/project key; additional requests required |
| Capacity / Schedule Fill Rate | Dispatch planning | available technician hours and scheduled demand | Likely schedules/shifts/appointments; additional endpoint(s) required |

“Likely” is a research hypothesis, not an approved mapping. No endpoint should be added until ServiceTitan metadata and GRmetro business definitions validate it.

## 4. KPI prioritization

### Tier 1 — owner should see constantly

- Revenue Today, Team Revenue Today, Revenue Goal/Remaining/Progress (once goals are approved)
- Closing %, Team Average Closing %, Revenue Distribution
- Revenue/Closing top performer and overall Top 3 (once goals/weights qualify it)
- Billable Service Calls, Service Revenue, Install Revenue, Installs, and Install Average Ticket only after classification approval
- Feed freshness and unavailable-data warnings as context, not as business KPIs

### Tier 2 — operations managers

- Calls/Jobs Completed, Work in Progress, Jobs on Hold, Canceled Jobs
- Opportunities, Tech Leads, Marketed Leads, lead-source mix
- Billable Efficiency, Job Billable Hours, Revenue per Hour
- Biggest rank improvement, lowest performer, goal remaining, outstanding issues
- Recall count after attribution validation

### Tier 3 — useful drill-down

- Opportunity Average Ticket, Total Job Average, adjusted revenue and adjustments
- Tech-lead and marketed-lead closing rates
- Replacement lead conversion, membership conversion
- Tasks/Options per Opportunity, membership sales/opportunities
- Technician contribution, per-technician averages, individual KPI ranks

### Tier 4 — future expansion

- All 24 missing-history, dispatch, capacity, profitability, membership, quality, and cycle-time KPIs in section 3
- Any new metric remains outside Version 1.0 until separately approved

## 5. Recommended KPI engine architecture

```text
ServiceTitan adapters
  → provider-specific validated raw DTOs
  → normalization/classification (provider names end here)
  → canonical facts (technician-day, job facts, freshness/coverage)
  → KPI Engine
      ├─ registry: id, label, unit, scope, tier, quality requirements
      ├─ calculators: pure value/hasData/coverage computations
      ├─ goals: target, progress, remaining, reached
      ├─ comparisons: team aggregates, ranks, movement, contribution
      └─ presentation builder: slide rows, axes, Top 3, events
  → immutable in-memory dashboard snapshot
  → Dashboard API
  → presentation-only clients
```

Recommended modules (design only):

```text
apps/backend/src/kpi/
  registry.js              # canonical definitions and approval state
  engine.js                # dependency ordering and evaluation
  result.js                # value/hasData/quality/coverage contract
  technicianCalculators.js # technician-day calculations
  teamCalculators.js       # sums, means, shares, leaders
  goalCalculators.js       # progress/remaining/reached
  comparisonCalculators.js # rankings and snapshot movement
```

Each calculator should be pure, accept canonical facts rather than ServiceTitan field names, and return `{ value, hasData, dataQuality, coverage, sourceIds, calculatedAt }`. Registry dependencies should be acyclic and validated at startup. A team total must report included and expected technician counts so partial refreshes cannot silently look complete. Ratio calculators must define numerator, denominator, zero-denominator behavior, unit, and aggregation method. Calculators must never turn missing into zero.

Calculation ownership:

- **Normalization:** direct field conversion, percentage conversion, identity allow-listing, job classification.
- **KPI Engine:** technician metrics, team totals/averages/shares, goals, pace, ranks, improvement, overall score, coverage and quality propagation.
- **Presentation builder:** axes, slide grouping, labels/colors, display ordering, event envelopes.
- **Cache/API:** store and return the immutable prepared snapshot; no calculations.
- **Dashboard:** formatting and pixels/animation only.

Migration should be incremental: first wrap existing goal/rank/overall calculations behind the engine contract with characterization tests, then add approved team aggregations. Do not change the API contract or enable any conditional KPI during the planning phase.

## 6. Suggested dashboard mapping

This is a future content recommendation within the fixed five-slide sequence; it is not authorization to change the UI.

| Approved slide | Tier-appropriate eventual content |
|---|---|
| Revenue | Revenue Today by technician; team revenue, approved goal/progress/remaining; Service and Install Revenue only when derived/approved |
| Activity | Billable Service Calls, 10+ Opportunities, Tech Leads, Marketed Leads, Installs; completed jobs may appear only with its honest label in a drill-down |
| Performance | Closing %, approved Lead Conversion %, team benchmarks; efficiency or revenue/hour only as approved supporting drill-downs, not new main KPIs |
| Average Ticket | Install Average Ticket, Install Revenue, Installs; opportunity/total job averages must keep distinct validated labels |
| Top 3 | Backend-qualified overall Top 3 with concise Revenue, Calls, Closing, Lead Conversion, Installs, and Install Average Ticket context |

Management exception details, dispatch KPIs, and financial drill-downs should be remote/detail views or future scope, not a sixth live slide. Weekly/monthly/historical metrics require a separate storage/date-range decision before dashboard mapping.

## Audit conclusion

The backend already transports substantially more ServiceTitan data than the eleven canonical KPI records expose. Five canonical metrics are directly normalized, five job-derived metrics have a complete but deliberately suppressed pipeline, and Lead Conversion remains unresolved. The safest next phase is to establish the canonical-fact and KPI-result contracts, approve goals and classifications, and add characterization tests—without expanding requests or presentation behavior.
