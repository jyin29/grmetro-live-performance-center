# GRmetro Live Performance Center
## ServiceTitan Integration Reference

Version 1.0  
Status: Initial Verified Integration Reference  
Last Verified: July 31, 2026  
Companion to: `docs/PROJECT_SPEC.md`

---

# 1. Purpose

This document contains the ServiceTitan-specific information required to build and maintain the GRmetro Live Performance Center.

It consolidates:

- Technician IDs
- Business unit IDs
- Known native ServiceTitan endpoints
- HTTP methods
- Required headers
- Captured request bodies
- Verified response examples
- KPI field mappings
- CSRF behavior
- Edge remote-debugging setup
- Data-quality warnings
- Service and install KPI research requirements
- Troubleshooting procedures

This document shall never contain:

- ServiceTitan passwords
- Authentication cookies
- Session IDs
- Persistent CSRF tokens
- Customer information
- Unredacted private employee information

---

# 2. Integration Rules

The application shall use ServiceTitan's native JSON requests.

The application shall not:

- Scrape visible HTML
- Read KPI cards from the DOM
- Simulate navigation clicks to collect metrics
- Parse screenshots
- Schedule CSV exports
- Store ServiceTitan login credentials
- Automate MFA
- Attempt to bypass ServiceTitan bot protection

Playwright is used only to attach to a manually authenticated Microsoft Edge session.

---

# 3. ServiceTitan Environment

Base URL:

```text
https://go.servicetitan.com
```

Confirmed technician scorecard route example:

```text
https://go.servicetitan.com/#/new/dashboards/technician-scorecard/134926818?Dates=Today
```

The browser page is hash-routed, but API requests use normal server paths under:

```text
/app/api/
```

Do not append API paths to the hash route.

---

# 4. Microsoft Edge Remote Debugging

Default debugging address:

```text
http://127.0.0.1:9222
```

Use `127.0.0.1` rather than `localhost`.

This avoids connection failures caused by resolving `localhost` to:

```text
::1
```

Recommended environment variable:

```env
EDGE_DEBUG_URL=http://127.0.0.1:9222
```

---

# 5. Edge Launch Command

Preferred Windows command:

```bat
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\GRmetro\EdgeAutomation" ^
  https://go.servicetitan.com
```

Alternative Edge path:

```bat
"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
```

The Edge profile directory should be dedicated to this application.

Do not use the employee's ordinary Edge profile unless necessary.

---

# 6. Confirming Remote Debugging

Open:

```text
http://127.0.0.1:9222/json/version
```

A valid response should include fields similar to:

```json
{
  "Browser": "Edg/150...",
  "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/browser/..."
}
```

If the page does not load, the backend cannot connect to Edge.

---

# 7. Authentication Workflow

Initial authentication is manual.

Required sequence:

1. Launch the dedicated Edge profile
2. Enter ServiceTitan username
3. Submit
4. Enter password
5. Submit
6. Complete phone or MFA verification
7. Open an authenticated ServiceTitan page
8. Leave Edge running
9. Start the backend

The backend shall not store or submit the username or password.

---

# 8. Configured Technicians

Version 1.0 uses exactly five manually configured technicians.

```javascript
module.exports = [
  {
    id: 134926818,
    name: "Julio Torres",
    shortName: "Julio",
    initials: "JT"
  },
  {
    id: 3841,
    name: "Shamon Ward",
    shortName: "Shamon",
    initials: "SW"
  },
  {
    id: 3853,
    name: "Charlie E",
    shortName: "Charlie",
    initials: "CE"
  },
  {
    id: 133469538,
    name: "Alex K",
    shortName: "Alex",
    initials: "AK"
  },
  {
    id: 127491426,
    name: "Dwight",
    shortName: "Dwight",
    initials: "DW"
  }
];
```

ServiceTitan may return:

```json
"Name": null
```

The application shall use the configured technician name rather than relying on the raw response name.

---

# 9. Business Unit IDs

The captured Technician Scorecard requests used the following business units:

```javascript
[
  127825768,
  1103,
  1107,
  1105,
  1111,
  1113,
  1109,
  1123,
  3586,
  3588,
  3589,
  3587,
  1119,
  1115,
  1121,
  1117,
  1095,
  1099,
  1101,
  1097
]
```

CSV request form:

```text
127825768,1103,1107,1105,1111,1113,1109,1123,3586,3588,3589,3587,1119,1115,1121,1117,1095,1099,1101,1097
```

These IDs shall be centralized in configuration.

They must not be repeated throughout the codebase.

Management or the ServiceTitan administrator should verify that these are the intended business units before production launch.

---

# 10. Time Zone

Captured requests use:

```text
America/New_York
```

Recommended environment variable:

```env
TIMEZONE=America/New_York
```

Version 1.0 requests today's local date.

Format:

```text
YYYY-MM-DD
```

Example:

```text
2026-07-31
```

---

# 11. Required Request Headers

Captured successful requests included:

```text
Accept: application/json
Content-Type: application/json
X-Requested-With: XMLHttpRequest
X-CSRF-Token: <current dynamic token>
```

Authenticated cookies are supplied by the Edge browser session.

Do not hardcode browser fingerprint headers such as:

```text
sec-ch-ua
traceparent
tracestate
user-agent
```

unless testing proves they are required.

---

# 12. CSRF Token

Successful ServiceTitan API requests require:

```text
X-CSRF-Token
```

A captured token is temporary and must not be placed in source code.

The backend shall obtain the current token dynamically.

Startup acquisition order:

1. Attach one response observer to the selected authenticated ServiceTitan page as soon as the page is selected.
2. Attempt passive token discovery from known page-local sources, including CSRF meta tags and confirmed ServiceTitan application globals.
3. If passive discovery fails, send one safe authenticated `GET` metadata request through the page context to `technicianMetadata`; this request must not mutate ServiceTitan state and must not include a CSRF token.
4. Share the single in-flight acquisition promise across concurrent technician refreshes so startup does not create five independent waits or five acquisition requests.
5. Cache the acquired token in backend memory and allow the first live refresh to await acquisition instead of requiring a manual page refresh.

The startup acquisition flow is noninteractive. If acquisition fails or times out, the backend returns a retryable `SERVICE_TITAN_CSRF_ERROR`, preserves the previous dashboard cache, and retries on the next scheduled refresh without a tight retry loop.

Refresh the cached token after:

- Browser reconnection
- ServiceTitan reauthentication
- HTTP 401
- HTTP 403
- Explicit CSRF error
- Failed token validation

The token remains in memory only.

---

# 13. Native Endpoint — Technician Overview

Method:

```text
POST
```

Path:

```text
/app/api/reporting/modulardashboard/GetTechnicianOverview
```

Full URL:

```text
https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview
```

Purpose:

- Basic technician identity
- Summary KPIs
- Fallback validation
- Health and consistency checks

---

# 14. Technician Overview Request

Captured request body:

```json
{
  "from": "2026-07-31",
  "to": "2026-07-31",
  "businessUnitIds": [
    127825768,
    1103,
    1107,
    1105,
    1111,
    1113,
    1109,
    1123,
    3586,
    3588,
    3589,
    3587,
    1119,
    1115,
    1121,
    1117,
    1095,
    1099,
    1101,
    1097
  ],
  "reloadKey": "2",
  "timeZone": "America/New_York",
  "technicianId": 134926818
}
```

Dynamic values:

```text
from
to
technicianId
timeZone
```

Configurable values:

```text
businessUnitIds
reloadKey
```

`reloadKey` must not be assumed permanent.

---

# 15. Technician Overview Verified Response

Verified example:

```json
{
  "personalInfo": {
    "id": 134926818,
    "companyPosition": "Service",
    "technicianType": "Managed",
    "role": "Technician",
    "truck": "Truck 1",
    "phoneNumber": "REDACTED",
    "zones": [],
    "skills": []
  },
  "kpis": {
    "completedRevenue": 848.0,
    "completedRevenueWithAdjustments": 848.0,
    "completedJobs": 2,
    "totalHoursWorked": 1.9,
    "totalSales": 0.0,
    "salesOpportunity": 2,
    "nps": 0.0,
    "customerSatisfaction": {
      "promoters": 0,
      "detractors": 0,
      "surveys": 0,
      "totalSurveyRating": 0,
      "averageRating": 0.0,
      "nps": 0.0
    }
  }
}
```

The production client shall discard private fields such as:

```text
phoneNumber
```

before data reaches the frontend.

---

# 16. Native Endpoint — Technician Datasource

Method:

```text
POST
```

Path:

```text
/app/api/reporting/CustomReport/GetDatasourceData?datasource=Technicians&forTechScorecards=true
```

Full URL:

```text
https://go.servicetitan.com/app/api/reporting/CustomReport/GetDatasourceData?datasource=Technicians&forTechScorecards=true
```

This is the primary aggregate KPI endpoint.

---

# 17. Technician Datasource Request

Captured body:

```json
{
  "TechnicianId": "134926818",
  "BusinessUnitId": "127825768,1103,1107,1105,1111,1113,1109,1123,3586,3588,3589,3587,1119,1115,1121,1117,1095,1099,1101,1097",
  "JobTypes": "",
  "DashboardReloadKey": "2",
  "From": "2026-07-31",
  "To": "2026-07-31",
  "Fields": "CompletedRevenue,CompletedJobs,Opportunity,OpportunityConversionRate,RecallsCaused,Nps,CustomerSatisfaction,WipJobs,JobsOnHold,CanceledJobs,TotalJobAverage,AdjustmentRevenue,CompletedRevenueWithAdjustments,ConvertedJobs,UnconvertedJobs,OpportunityJobAverage,Upsold,ReplacementLeadJobs,ReplacementOpportunity,ReplacementLeadConversionRate,ReplacementLeadsSet,ReplacementLeadsSold,TechLeadJobs,TotalLeadSales,CloseRateFromTgl,MarketingLeadJobs,TotalMarketingLeadSales,CloseRateFromMarketingLeads,MembershipsSold,MembershipOpportunities,MembershipConversionRate,RevenuePerHour,JobBillableHours,BillableEfficiency,TasksPerOpportunity,OptionsPerOpportunity,SalesOpportunity,ClosedOpportunities,TotalSales,CloseRate,TotalSalesFromTgl,TotalSalesFromMarketingLeads,LeadsSet",
  "VisibleFields": "CompletedRevenue,CompletedJobs,Opportunity,OpportunityConversionRate,RecallsCaused,Nps,CustomerSatisfaction,WipJobs,JobsOnHold,CanceledJobs,TotalJobAverage,AdjustmentRevenue,CompletedRevenueWithAdjustments,ConvertedJobs,UnconvertedJobs,OpportunityJobAverage,Upsold,ReplacementLeadJobs,ReplacementOpportunity,ReplacementLeadConversionRate,ReplacementLeadsSet,ReplacementLeadsSold,TechLeadJobs,TotalLeadSales,CloseRateFromTgl,MarketingLeadJobs,TotalMarketingLeadSales,CloseRateFromMarketingLeads,MembershipsSold,MembershipOpportunities,MembershipConversionRate,RevenuePerHour,JobBillableHours,BillableEfficiency,TasksPerOpportunity,OptionsPerOpportunity,SalesOpportunity,ClosedOpportunities,TotalSales,CloseRate,TotalSalesFromTgl,TotalSalesFromMarketingLeads,LeadsSet",
  "TimeZone": "America/New_York"
}
```

The field list shall be stored once.

Recommended module:

```text
apps/backend/src/servicetitan/fields.js
```

---

# 18. Technician Datasource Verified Response Shape

The endpoint returns an array.

Example:

```json
[
  {
    "Name": null,
    "NameLink": "new/dashboards/technician-scorecard/134926818?...",
    "TechnicianId": 134926818,
    "CompletedJobs": 2,
    "ConvertedJobs": 1,
    "UnconvertedJobs": 1,
    "CanceledJobs": 1,
    "WipJobs": 1,
    "TechLeadJobs": 0,
    "MarketingLeadJobs": 2,
    "Opportunity": 2,
    "SalesOpportunity": 2,
    "CompletedRevenue": 848.0,
    "OpportunityConversionRate": 0.5,
    "CompletedRevenueWithAdjustments": 848.0,
    "OpportunityJobAverage": 424.0,
    "TotalJobAverage": 424.0,
    "CloseRate": 0.0,
    "LeadConversionRate": 0.0,
    "RevenuePerHour": 446.3157894736842,
    "BillableEfficiency": 0.5736842105263158,
    "RecallsCaused": 0,
    "JobBillableHours": 1.09,
    "WorkHours": 1.9,
    "ClosedOpportunities": 0,
    "TotalSales": 0.0,
    "CloseRateFromTgl": 0.0,
    "CloseRateFromMarketingLeads": 0.0,
    "TotalSalesFromTgl": 0.0,
    "TotalSalesFromMarketingLeads": 0.0,
    "LeadsSet": 0
  }
]
```

The actual response contains many additional fields.

The normalizer shall select only approved values.

---

# 19. Important Aggregate Fields

Confirmed available fields include:

```text
TechnicianId
CompletedRevenue
CompletedRevenueWithAdjustments
CompletedJobs
Opportunity
OpportunityConversionRate
TechLeadJobs
MarketingLeadJobs
LeadConversionRate
CloseRate
TotalJobAverage
OpportunityJobAverage
ClosedOpportunities
TotalSales
RevenuePerHour
BillableEfficiency
RecallsCaused
JobBillableHours
WorkHours
LeadsSet
```

Availability does not automatically prove business equivalence to the requested KPI.

---

# 20. Native Endpoint — Technician Job Drilldown

Method:

```text
POST
```

Path:

```text
/app/api/reporting/CustomReport/GetDatasourceData?datasource=TechnicianJobsExtendedDrilldownDatasource&parentDatasource=Technicians&forTechScorecards=true
```

Full URL:

```text
https://go.servicetitan.com/app/api/reporting/CustomReport/GetDatasourceData?datasource=TechnicianJobsExtendedDrilldownDatasource&parentDatasource=Technicians&forTechScorecards=true
```

Purpose:

- Job-level data
- Job-type grouping
- Service/install classification
- Derived service and install metrics

---

# 21. Technician Job Drilldown Request

Captured body:

```json
{
  "TechnicianId": "134926818",
  "BusinessUnitId": "127825768,1103,1107,1105,1111,1113,1109,1123,3586,3588,3589,3587,1119,1115,1121,1117,1095,1099,1101,1097",
  "JobTypes": "",
  "DashboardReloadKey": "2",
  "From": "2026-07-31",
  "To": "2026-07-31",
  "KpiType": "2",
  "TimeZone": "America/New_York"
}
```

The meaning of:

```text
KpiType
```

has not yet been fully documented.

Do not guess its meaning.

---

# 21A. Development Drilldown Capture Route

The backend exposes a development-only research route for sanitized job drilldown capture:

```text
POST /api/v1/dev/servicetitan/drilldown
```

Request body:

```json
{
  "technicianId": 134926818,
  "date": "2026-08-04"
}
```

Availability rules:

- The route is registered only when `ENABLE_DEVELOPMENT_ROUTES=true`.
- The route is never registered when `NODE_ENV=production`.
- `technicianId` must match one of the five configured Version 1.0 technicians.
- `date` must use `YYYY-MM-DD`.
- The route uses the authenticated Edge session, dynamic CSRF token, centralized endpoint registry, and centralized `TechnicianJobsExtendedDrilldownDatasource` request builder.
- The route does not persist records automatically.

Sanitized response contract:

```json
{
  "ok": true,
  "drilldown": {
    "technicianId": 134926818,
    "date": "2026-08-04",
    "recordCount": 1,
    "removedFields": ["CustomerName"],
    "records": [
      {
        "recordKey": 123456,
        "technicianId": 134926818,
        "jobTypeId": 111,
        "jobTypeName": "Example Job Type",
        "businessUnitId": 1103,
        "businessUnitName": "Example Business Unit",
        "status": "Completed",
        "completedOn": "2026-08-04T14:30:00",
        "revenue": 250,
        "isBillable": true,
        "isRecall": false,
        "isWarranty": false,
        "isNoCharge": false
      }
    ]
  }
}
```

The sanitizer is allow-list based. Unknown fields do not pass through automatically. Customer names, customer IDs where unnecessary, addresses, phone numbers, emails, notes, appointment text, invoice descriptions, private employee information, cookies, CSRF tokens, session IDs, and other authentication values are removed. `removedFields` lists redacted or discarded source field names where useful.

PowerShell capture command for Julio Torres on August 4, 2026:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:3000/api/v1/dev/servicetitan/drilldown" -ContentType "application/json" -Body '{"technicianId":134926818,"date":"2026-08-04"}' | ConvertTo-Json -Depth 20
```

Live research workflow:

1. Start the manually authenticated Edge profile with CDP on `http://127.0.0.1:9222`.
2. Sign in to ServiceTitan manually; do not store credentials, cookies, session IDs, CSRF tokens, or MFA codes.
3. Start the backend with `MOCK_MODE=false`, `ENABLE_DEVELOPMENT_ROUTES=true`, and a non-production `NODE_ENV`.
4. Run the PowerShell command above for a selected configured technician and date.
5. Save or share only the sanitized JSON response. Do not capture browser DevTools exports or raw ServiceTitan records.
6. Review the sanitized job type, business unit, status, revenue, billable, recall, warranty, and no-charge fields with GRmetro before populating production classification rules.

Classification status: not approved. The following remain unknown until sanitized drilldown records are captured and reviewed: final service job type IDs, final install job type IDs, exclusions, status field semantics, revenue field basis, billable indicator, recall indicator, warranty indicator, no-charge indicator, and `KpiType` meaning. Derived service/install KPIs must remain unavailable in production while `classificationApproved` is false.

---

# 21B. Development Network Research Observer

The backend also exposes a development-only ServiceTitan network research observer for Phase 10 datasource discovery. It is intended only for a manually authenticated ServiceTitan Technician Scorecard page while a developer clicks drilldowns in the real UI. It does not automate login, does not click the UI, and does not enable production derivations.

Routes:

```text
POST /api/v1/dev/servicetitan/research/start
POST /api/v1/dev/servicetitan/research/stop
GET /api/v1/dev/servicetitan/research/results
DELETE /api/v1/dev/servicetitan/research/results
```

Availability and lifecycle rules:

- Routes are registered only when `ENABLE_DEVELOPMENT_ROUTES=true` and `NODE_ENV` is not `production`.
- Start asks the browser manager to rescan every connected browser context and attaches at most one observer to the preferred Technician Scorecard page.
- The browser manager watches new pages, popups, page closure, and frame navigation. When page selection changes, the observer detaches from the old page and attaches to the replacement before retaining further events.
- Repeated starts are idempotent and do not duplicate listeners.
- Stop detaches request and response listeners.
- Shutdown stops the observer and clears retained results.
- Results are held in memory only, capped at 100 events, and the oldest events are discarded when full.

Observed request scope:

- URLs containing `/app/api/reporting/`.
- `GetDatasourceData` requests.
- `GetDatasourceForTechScorecards` requests.
- Modular dashboard reporting endpoints.

Sanitized result contract:

```json
{
  "ok": true,
  "research": {
    "active": true,
    "attached": true,
    "eventCount": 1,
    "maxEvents": 100,
    "count": 1,
    "diagnostics": {
      "selectedPageUrl": "https://go.servicetitan.com/app/technician-scorecard",
      "selectedPageTitle": "Technician Scorecard",
      "browserContextCount": 1,
      "pageCount": 2,
      "frameCount": 3,
      "listenerAttached": true,
      "listenerActive": true,
      "retainedEventCount": 1,
      "ignoredEventCount": 4
    },
    "urlDiagnostics": [
      {
        "timestamp": "2026-08-04T12:00:00.000Z",
        "method": "POST",
        "url": "https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview"
      }
    ],
    "events": [
      {
        "timestamp": "2026-08-04T12:00:00.000Z",
        "endpoint": "/app/api/reporting/CustomReport/GetDatasourceData",
        "datasource": "TechnicianJobsExtendedDrilldownDatasource",
        "parentDatasource": "Technicians",
        "request": {
          "method": "POST",
          "bodyFields": ["From", "KpiType", "TechnicianId", "To"],
          "safeValues": {
            "TechnicianId": "134926818",
            "KpiType": "2",
            "From": "2026-08-04",
            "To": "2026-08-04"
          }
        },
        "response": {
          "status": 200,
          "contentType": "application/json",
          "shape": "array",
          "recordCount": 3,
          "fields": [
            { "field": "JobTypeId", "types": ["number"], "presentInRecords": 3 }
          ]
        }
      }
    ]
  }
}
```

The observer retains only endpoint path, datasource names, request body field names, approved scalar request values (`TechnicianId`, `KpiType`, `From`, and `To`), response status/content type, top-level JSON shape, response field-name schema, and record counts. It never returns CSRF tokens, cookies, headers, customer values, invoice values, addresses, phone numbers, email addresses, raw response records, authentication data, or unknown response values. HTML, non-JSON, and malformed JSON responses are summarized by shape only.

Native KPI discovery expands this safe contract across every observed reporting JSON response. It recursively inspects metric/KPI/datasource/chart/reporting definitions by ID, label, internal name, and datasource field name, case-insensitively, for service/install revenue, ticket, count, job, call, billable-service, and sales terminology. A metadata match retains only endpoint, datasource, metric ID, label, internal field name, chart/group name, and value type. When matching terminology occurs as a response field rather than a definition, it retains only endpoint, field name, detected type, and `present: true`; the field value is never retained.

Research results now also contain:

- `endpointsSearched`: every distinct reporting endpoint with a completed retained response in the current bounded session.
- `nativeKpiDiscoveryReport`: exactly one `FOUND`, `NOT FOUND`, or `POSSIBLE ALIAS` result for Service Revenue, Install Revenue, Number of Installs, and Install Average Ticket, plus candidate field names.
- Per-event `metadataMatches` and `valueMatches`, so each finding remains attributable to its endpoint and datasource.

An exact desired name produces `FOUND`. Related `service sales`, `install sales`, `install jobs`, or `install ticket` terminology produces `POSSIBLE ALIAS` and must receive business validation; similar names are not silently accepted as the desired KPI. `NOT FOUND` means only that the metric was absent from all reporting JSON responses retained during that observer session. Therefore a conclusive report requires the operator to exercise all accessible reporting surfaces during one session, including Technician Overview, Modular Dashboard, Technician Datasource, KPI drilldowns, Completed Jobs, Revenue drilldowns, install-related drilldowns, reporting datasource metadata, and any newly observed reporting endpoint.

If that complete live session reports `NOT FOUND` (or only unvalidated aliases), Phase 10 job-level derivation remains necessary because Service Revenue must sum revenue from validated completed billable service jobs, Install Revenue must sum revenue from validated completed installation jobs, Number of Installs must count those validated completed installation jobs, and Install Average Ticket must divide that install revenue by that nonzero completed-install count. Those results cannot be reconstructed safely from aggregate Revenue, Completed Jobs, Total Sales, Closed Opportunities, or name similarity alone. `classificationApproved` remains `false`, production calculations remain unchanged, and no drilldown request is added to the one-minute refresh.

Development diagnostics additionally expose the selected page URL with query string and fragment removed, selected page title, browser-context/page/frame counts, listener attachment/activity, retained-event count, and ignored-request count. The bounded `urlDiagnostics` list records each request's timestamp, method, and origin plus pathname only. It never records query strings, headers, or bodies. These diagnostics are available only through the development-only research routes.

Root cause fixed on 2026-08-10: the browser manager cached the first authenticated ServiceTitan `Page` selected during CDP connection. If Technician Scorecard was opened later in a new tab/window, or an existing ServiceTitan page navigated to Scorecard while the cached page remained open, `getServiceTitanPage()` returned the stale page without rescanning. The observer correctly installed `page.on("request")` and `page.on("response")`, but installed them on that stale `Page`; Playwright page events are page-scoped, so the request visible in DevTools for the actual Scorecard page never reached those listeners. The fix preserves page-event interception and adds deterministic rescanning plus page/popup/frame lifecycle tracking and observer reattachment. No fetch/XMLHttpRequest injection is used.

PowerShell research workflow for Windows:

```powershell
$BaseUrl = "http://127.0.0.1:3000"
Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/dev/servicetitan/research/start"
```

Then, in the manually authenticated ServiceTitan Edge window, open Julio Torres and click relevant Technician Scorecard KPI cards or drilldowns, including Completed Jobs, Revenue, Opportunities, service-call-related metrics, and install-related metrics. The goal is to identify alternative datasource names, `KpiType` values, request body differences, response fields, job type fields, status fields, and billable/recall/warranty/no-charge indicators.

Immediately read the results after clicking **Completed Revenue** and verify all of the following:

1. `diagnostics.selectedPageTitle` and `diagnostics.selectedPageUrl` identify the intended Technician Scorecard page.
2. `diagnostics.listenerAttached` and `diagnostics.listenerActive` are `true`.
3. Browser-context, page, and frame counts agree with the open Edge session.
4. `urlDiagnostics` contains `POST https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview` (the origin may differ by configured ServiceTitan environment, but the pathname must match exactly).
5. After its response completes, `events` contains endpoint `/app/api/reporting/modulardashboard/GetTechnicianOverview` and `retainedEventCount` increases.

If the URL diagnostic is absent, the selected page diagnostics identify a remaining page/context mismatch or the listener is inactive. If the URL diagnostic is present but no retained event appears, the request was received and response completion/content handling should be investigated instead; do not replace the observer architecture based only on a zero retained count.

```powershell
Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/dev/servicetitan/research/stop"
$Research = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/dev/servicetitan/research/results"
$Research | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 ".\servicetitan-research-results.json"
```

Optional cleanup after saving:

```powershell
Invoke-RestMethod -Method Delete -Uri "$BaseUrl/api/v1/dev/servicetitan/research/results"
```

Classification status remains not approved. The live finding that `KpiType` `2` returned three Julio Torres records totaling `$266.99` validates only the aggregate Revenue match for that observed case. The observed fields (`JobId`, `JobNumber`, `BusinessUnit`, `CompletionDate`, `Converted`, `Opportunity`, `Revenue`, `Split`, and `Subtotal`) are still insufficient to classify service and installation jobs because they do not expose job type, recall, warranty, no-charge, canceled/completed status beyond completion date, or an explicit billable indicator. Production derivations must remain disabled while `classificationApproved` is false.

---

# 22. Datasource Metadata Endpoints

Known endpoints:

```text
GET /app/api/reporting/CustomReport/GetDatasourceForTechScorecards?name=Technicians
```

```text
GET /app/api/reporting/CustomReport/GetDatasourceForTechScorecards?name=TechnicianJobsExtendedDrilldownDatasource
```

Possible uses:

- Confirm field availability
- Inspect datasource metadata
- Diagnose ServiceTitan changes
- Validate field names

These endpoints do not need to run every minute.

---

# 23. Approved KPI List

Version 1.0 uses exactly eleven KPI concepts:

```text
Revenue
Billable Service Calls
Service Revenue
10+ Opportunities
Lead Conversion %
Tech Leads
Marketed Leads
Closing %
Number of Installs
Install Average Ticket
Install Revenue
```

Internal IDs:

```javascript
{
  revenue: "revenue",
  billableServiceCalls: "billableServiceCalls",
  serviceRevenue: "serviceRevenue",
  opportunities: "opportunities",
  leadConversionRate: "leadConversionRate",
  techLeads: "techLeads",
  marketedLeads: "marketedLeads",
  closingRate: "closingRate",
  installs: "installs",
  installAverageTicket: "installAverageTicket",
  installRevenue: "installRevenue"
}
```

---

# 24. Confirmed Direct Mappings

## Revenue

Internal:

```text
revenue
```

ServiceTitan:

```text
CompletedRevenue
```

Format:

```text
Currency
```

Quality:

```text
confirmed
```

---

## Opportunities

Visible label:

```text
10+ Opportunities
```

Internal:

```text
opportunities
```

ServiceTitan:

```text
Opportunity
```

Format:

```text
Integer
```

Quality:

```text
confirmed
```

The value remains a count.

The goal determines whether ten or more has been achieved.

---

## Tech Leads

Internal:

```text
techLeads
```

ServiceTitan:

```text
TechLeadJobs
```

Format:

```text
Integer
```

Quality:

```text
confirmed
```

---

## Marketed Leads

Internal:

```text
marketedLeads
```

ServiceTitan:

```text
MarketingLeadJobs
```

Format:

```text
Integer
```

Quality:

```text
confirmed
```

---

## Closing %

Internal:

```text
closingRate
```

ServiceTitan:

```text
CloseRate
```

Conversion:

```text
decimal ratio × 100
```

Example:

```text
0.65 → 65%
```

Quality:

```text
confirmed
```

The business must confirm whether ServiceTitan's scorecard `CloseRate` exactly matches GRmetro's intended definition.

---

# 25. Lead Conversion Mapping Requires Confirmation

Requested KPI:

```text
Lead Conversion %
```

Potential ServiceTitan fields:

```text
LeadConversionRate
OpportunityConversionRate
ReplacementLeadConversionRate
CloseRateFromTgl
```

These fields have different meanings.

The implementation shall not select one merely because its label sounds similar.

Required business decision:

```text
Does GRmetro mean:
- Conversion of technician-generated leads?
- Opportunity conversion?
- Replacement lead conversion?
- Another scorecard measure?
```

Until confirmed, the internal KPI shall carry:

```text
dataQuality: unavailable
```

or an explicitly configured mapping.

The earlier provisional mapping to:

```text
LeadConversionRate
```

must be validated before production.

---

# 26. Billable Service Calls Require Derivation

Do not map:

```text
CompletedJobs
```

directly to:

```text
Billable Service Calls
```

Approved definition:

```text
Completed jobs classified as billable service work.
```

The calculation must exclude work such as:

- Installations
- No-charge jobs
- Warranty jobs where appropriate
- Recalls where appropriate
- Non-service job categories

Required data source:

```text
TechnicianJobsExtendedDrilldownDatasource
```

Required configuration:

```text
shared/jobClassifications.js
```

Production status remains blocked until validated.

---

# 27. Service Revenue Requires Derivation

Do not map:

```text
CompletedRevenue
```

to both:

```text
Revenue
```

and:

```text
Service Revenue
```

Approved definition:

```text
Completed revenue from jobs classified as service work.
```

Required calculation:

```text
Sum revenue for service-classified completed jobs
```

Production status remains blocked until classification is validated.

---

# 28. Install Revenue Requires Derivation

Do not assume:

```text
TotalSales
```

equals:

```text
Install Revenue
```

Approved definition:

```text
Completed or recognized revenue from jobs classified as installations.
```

Preferred source:

- Install-classified completed job records
- Confirmed replacement/install datasource
- Explicit ServiceTitan field validated by GRmetro

Production status remains blocked until validated.

---

# 29. Number of Installs Requires Derivation

Do not map:

```text
ClosedOpportunities
```

directly to completed installs.

Approved definition:

```text
Count of completed installation jobs.
```

A sold opportunity that has not yet been installed does not count unless management explicitly changes the definition.

---

# 30. Install Average Ticket

Approved formula:

```text
Install Revenue ÷ Number of Completed Installs
```

When install count is zero:

```text
No Data
```

Do not show:

```text
$0
```

unless one or more actual installations exist with zero revenue.

---

# 31. General Average Ticket Fields

Available candidate fields:

```text
TotalJobAverage
OpportunityJobAverage
AverageTicket
```

Captured response behavior showed:

```text
AverageTicket = 0
TotalJobAverage = 424
OpportunityJobAverage = 424
```

These fields are not interchangeable.

Version 1.0 does not require a general average-ticket KPI unless approved as supporting context.

Install Average Ticket remains the required KPI.

---

# 32. Job Classification Configuration

Recommended:

```javascript
module.exports = {
  service: {
    includedJobTypeIds: [],
    includedJobTypeNames: [],
    excludedJobTypeIds: [],
    excludedJobTypeNames: [],
    includedNamePatterns: [],
    excludedNamePatterns: [
      "install",
      "replacement"
    ]
  },

  install: {
    includedJobTypeIds: [],
    includedJobTypeNames: [],
    excludedJobTypeIds: [],
    excludedJobTypeNames: [],
    includedNamePatterns: [
      "install",
      "replacement"
    ],
    excludedNamePatterns: []
  }
};
```

ID-based matching is preferred.

Name-pattern matching is a fallback.

Unknown jobs shall be logged and excluded from confirmed calculations.

---

# 33. Required Drilldown Research

Before production, capture and document successful drilldown responses for:

- One normal service call
- One completed installation
- One recall
- One warranty job
- One no-charge job
- One canceled job
- One job with adjustment revenue

For each record, document:

```text
Job ID or sanitized identifier
Job type ID
Job type name
Business unit
Completion status
Revenue field
Billable status
Recall status
Warranty status
Technician ID
```

No customer-identifying data shall be committed.

---

# 34. Data-Quality Values

Every KPI shall use one of:

```text
confirmed
derived
fallback
unavailable
```

Definitions:

```text
confirmed
Direct ServiceTitan field validated against the UI
```

```text
derived
Calculated from validated drilldown records
```

```text
fallback
Temporary approximation requiring review
```

```text
unavailable
Cannot be calculated reliably
```

Production display should normally include only:

```text
confirmed
derived
```

---

# 35. Missing Data

The backend must distinguish:

```text
0
```

from:

```text
null / unavailable
```

Examples:

```text
Closing Rate = 0%
```

may be valid when actual opportunities exist and none were closed.

```text
Install Average Ticket = No Data
```

is correct when no installs occurred.

Normalized shape:

```javascript
{
  value: null,
  hasData: false,
  dataQuality: "unavailable"
}
```

---

# 36. Rate Conversion

ServiceTitan commonly returns decimal ratios.

Examples:

```text
0.5 → 50%
0.5736842105 → 57.4%
1 → 100%
```

Use one shared helper.

Do not multiply fields already expressed as whole percentages.

Tests must define expected behavior field by field.

---

# 37. Request Execution

Preferred request execution occurs inside the authenticated page.

Example conceptual implementation:

```javascript
await page.evaluate(
  async ({ url, body, csrfToken }) => {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": csrfToken
      },
      body: JSON.stringify(body)
    });

    return {
      status: response.status,
      url: response.url,
      contentType: response.headers.get("content-type"),
      body: await response.text()
    };
  },
  { url, body, csrfToken }
);
```

The response shall be inspected before JSON parsing.

---

## Phase 9 Client Implementation (2026-07-31)

The implemented backend client keeps endpoint paths in `apps/backend/src/servicetitan/endpoints.js` and the captured Technician Datasource field selection in `apps/backend/src/servicetitan/fields.js`. Request builders are pure and recalculate the configured local date for every refresh.

The CSRF provider observes successful response-associated request headers on the selected authenticated page, stores the token only in memory, moves its single listener when the browser page changes, and clears the token on reconnect, authentication/CSRF failures, HTTP 401/403, and shutdown. Request execution uses an authenticated in-page `fetch` with a bounded timeout and only the required JSON, XMLHttpRequest, and CSRF headers.

The live provider attempts the configured five technicians with concurrency two. It validates Overview and Datasource responses independently, passes only the allow-listed aggregate record into the Phase 7 normalizer, and retains prior normalized technician data after an isolated failure. Metadata requests and job drilldown requests are not part of the one-minute refresh. The job drilldown builder exists for Phase 10 research, but no service/install derivation or Lead Conversion mapping is implemented.

Automated verification uses fake pages and browser managers. Actual endpoint success and refresh duration against the office's manually authenticated Edge session remain operational verification steps and are not claimed by this implementation record.

# 38. HTML Response Detection

Reject when:

- Status indicates failure
- Content type contains `text/html`
- Body begins with `<!doctype html`
- Body appears to be the ServiceTitan shell
- Final URL is the scorecard hash route
- JSON parsing fails
- Response is empty when JSON is expected

Known previous failure:

```text
Status: 404
Final URL:
https://go.servicetitan.com/#/new/dashboards/technician-scorecard/...
Body:
ServiceTitan HTML application shell
```

This occurred because the request method/body was incorrect.

The correct Technician Datasource request is:

```text
POST
```

not GET.

---

# 39. Request Timeout

Recommended timeout:

```text
15–30 seconds per request
```

The backend shall classify timeout separately from:

- Authentication failure
- CSRF failure
- Invalid response
- Browser disconnect
- ServiceTitan server error

A timed-out technician shall retain its prior cached data.

---

# 40. Request Concurrency

Five technicians are configured.

Recommended concurrency:

```text
2
```

Do not issue unlimited parallel requests.

Sequential requests are acceptable when latency remains comfortably below the sixty-second refresh interval.

---

# 41. Partial Failure

If one technician fails:

- Preserve the last successful record
- Mark it stale
- Continue processing other technicians
- Do not discard the whole refresh
- Report stale count in health status

Example:

```javascript
{
  technicianId: 3853,
  stale: true,
  lastSuccessfulUpdate: "2026-07-31T16:45:00.000Z"
}
```

---

# 42. Refresh Frequency

Default:

```text
60 seconds
```

Environment variable:

```env
REFRESH_INTERVAL_SECONDS=60
```

No TV or phone request shall trigger a live ServiceTitan fetch.

The backend refresh scheduler is authoritative.

---

# 43. Refresh Date Handling

At each refresh:

1. Read current time in `America/New_York`
2. Calculate local date
3. Set From and To to that date
4. Build payloads for all five technicians
5. Execute requests
6. Normalize results
7. Update cache
8. Broadcast

The application must handle midnight rollover without restart.

---

# 44. Dashboard Reload Key

Captured value:

```text
2
```

Request fields:

```text
reloadKey
DashboardReloadKey
```

This value may represent ServiceTitan dashboard state or versioning.

Implementation options:

1. Central configuration with clear diagnostics
2. Discover from live scorecard request
3. Observe and cache from captured request traffic

Preferred long-term approach:

```text
Observe or discover dynamically
```

Temporary configuration is acceptable during initial integration.

---

# 45. Capturing Updated Requests

Development listener example:

```javascript
page.on("request", request => {
  const url = request.url();

  if (
    url.includes("GetTechnicianOverview") ||
    url.includes("GetDatasourceData")
  ) {
    console.log("METHOD:", request.method());
    console.log("URL:", url);
    console.log("HEADERS:", request.headers());
    console.log("POST DATA:", request.postData());
  }
});
```

Never leave sensitive full-header logging enabled in production.

---

# 46. Capturing Responses

Development response listener should capture:

- Endpoint
- Status
- Content type
- Sanitized response body
- Technician ID
- Duration

Raw responses should be saved only in sanitized development fixtures.

---

# 47. Fields Not Required by Version 1.0

ServiceTitan exposes many additional fields, including:

```text
MembershipsSold
MembershipOpportunities
MembershipConversionRate
RevenuePerHour
BillableEfficiency
RecallsCaused
Nps
CustomerSatisfaction
ReplacementLeadConversionRate
TotalSalesFromTgl
TotalSalesFromMarketingLeads
```

Do not add them to live slides unless explicitly approved for a later version.

They may be retained in raw diagnostic fixtures.

---

# 48. Privacy Filtering

Discard or redact:

```text
Phone
Email
HomeStreet
HomeCity
HomeState
HomeZip
Biography
License
PayrollId
UserId
Photo
```

The public office dashboard needs technician names and configured initials only.

---

# 49. Production Logging Rules

Production logs may include:

```text
Endpoint name
Technician ID
Request duration
HTTP status
Error category
Refresh status
```

Production logs shall not include:

```text
CSRF token
Cookie headers
Full request headers
Full raw response
Phone number
Email
Home address
Customer data
```

---

# 50. Health Status Values

Recommended ServiceTitan status values:

```text
connected
authentication-required
browser-disconnected
csrf-error
invalid-response
partial-failure
unavailable
```

Health output shall include the most recent non-sensitive error summary.

---

# 51. Mock Mode

Mock mode shall bypass:

- Edge
- CDP
- CSRF
- ServiceTitan

Environment:

```env
MOCK_MODE=true
```

Mock fixtures must match normalized production contracts.

Production shall fail visibly rather than silently using mock data.

---

# 52. Verification Checklist

Before live release:

- [ ] `127.0.0.1:9222/json/version` works
- [ ] Backend finds authenticated ServiceTitan tab
- [ ] CSRF token is dynamic
- [ ] Overview endpoint returns JSON
- [ ] Technician datasource returns JSON
- [ ] All five technician IDs work
- [ ] Date changes automatically
- [ ] Business units are approved
- [ ] Direct mappings match ServiceTitan UI
- [ ] Lead Conversion definition is confirmed
- [ ] Job drilldown response is documented
- [ ] Billable Service Calls classification is approved
- [ ] Service Revenue classification is approved
- [ ] Install Revenue classification is approved
- [ ] Install count classification is approved
- [ ] Install Average Ticket matches manual calculation
- [ ] HTML responses are rejected
- [ ] Partial failure preserves cached data
- [ ] Private fields are removed
- [ ] No credentials or tokens are committed

---

# 53. Known Unresolved Business Questions

These questions must be answered before production accuracy approval.

## Lead Conversion %

Which ServiceTitan definition matches GRmetro's intended KPI?

Candidates:

```text
LeadConversionRate
OpportunityConversionRate
ReplacementLeadConversionRate
CloseRateFromTgl
```

## Billable Service Calls

Which job types count?

Which should be excluded?

## Service Revenue

Which job types and business units constitute service work?

## Install Revenue

Does GRmetro want:

- Completed install revenue
- Sold install revenue
- Recognized replacement revenue
- Another ServiceTitan measure

## Number of Installs

Does the KPI mean:

- Completed installs
- Sold installs
- Scheduled installs
- Replacement leads sold

Current specification assumes:

```text
Completed install jobs
```

## Install Average Ticket

Current formula assumes:

```text
Completed Install Revenue ÷ Completed Install Count
```

Management must approve.

---

# 54. Troubleshooting — 404 with HTML

Likely causes:

- GET used instead of POST
- Missing body
- Incorrect API path
- Request resolved through hash route
- Missing CSRF token
- Invalid ServiceTitan state

Check:

```text
Method
Full URL
Content type
Final URL
POST body
CSRF token
```

---

# 55. Troubleshooting — Playwright CDP Timeout

Observed behavior may include:

```text
WebSocket connected
but connectOverCDP times out
```

Steps:

1. Retry once
2. Confirm `json/version`
3. Close duplicate debug Edge instances
4. Relaunch dedicated profile
5. Increase timeout moderately
6. Confirm compatible Playwright and Edge versions
7. Use `127.0.0.1`

Do not assume WebSocket connection alone means Playwright initialization finished.

---

# 56. Troubleshooting — No ServiceTitan Page Found

Print open page URLs in development.

Select a page containing:

```text
go.servicetitan.com
```

Preference:

```text
technician-scorecard
```

Fallback:

```text
any authenticated ServiceTitan page
```

If no page exists, instruct the user to open ServiceTitan in the dedicated Edge profile.

---

# 57. Troubleshooting — CSRF Failure

Symptoms:

```text
403
CSRF error
Unauthorized request
```

Resolution:

1. Clear cached CSRF token
2. Observe a new successful ServiceTitan request
3. Reacquire token
4. Retry once
5. Verify the ServiceTitan session is authenticated

Do not repeatedly retry an invalid token indefinitely.

---

# 58. Troubleshooting — Empty Technician Array

Check:

- Technician ID
- Date
- Business units
- Permissions
- Reload key
- Requested fields
- Job-type filters
- Technician activity that day

An empty array is valid JSON but may represent missing or mismatched filters.

---

# 59. Troubleshooting — All Values Are Zero

Possible causes:

- Technician had no activity
- Wrong date
- Wrong business units
- Wrong technician ID
- Wrong job-type filter
- Stale reload key
- ServiceTitan permissions
- Data is not finalized

Compare against the scorecard UI for the same technician and date.

---

# 60. Maintenance Procedure After ServiceTitan Changes

When an endpoint changes:

1. Open DevTools Network
2. Refresh Technician Scorecard
3. Capture successful request
4. Confirm method and URL
5. Capture sanitized headers
6. Capture POST body
7. Capture response shape
8. Update this document
9. Update centralized endpoint/request modules
10. Update fixtures and tests
11. Validate all five technicians
12. Commit with clear notes

---

# 61. Document Update Template

When verifying a ServiceTitan behavior, add:

```markdown
## Verification Record

Date:
Verified By:
ServiceTitan Client Version:
Endpoint:
Technician:
Date Range:
Result:
Notes:
```

Do not include sensitive values.

---

# 62. Final Integration Acceptance Criteria

The ServiceTitan integration is complete when:

1. The backend attaches to manually authenticated Edge
2. No credentials are stored
3. CSRF token is acquired dynamically
4. Technician Overview succeeds
5. Technician Datasource succeeds
6. All five technicians refresh every sixty seconds
7. HTML responses are rejected
8. Partial failures preserve prior data
9. Direct KPI values are verified
10. Derived service/install KPIs are validated from drilldown data
11. Missing data is distinguished from zero
12. Private fields never reach the frontend
13. Logs contain no authentication secrets
14. Integration survives Edge restart and reauthentication
15. This document reflects the live verified implementation

---

# End of SERVICETITAN.md

The next companion document is:

```text
docs/TASKS.md
```

It shall convert the approved implementation phases into a concise, checkable task list for Codex.
