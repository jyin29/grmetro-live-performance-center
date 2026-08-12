# Membership KPI Pipeline Audit

Date: 2026-08-12  
Status: Implemented for `Memberships Sold`; other membership concepts unavailable

## Audit result

The existing live integration already requested `MembershipsSold`, `MembershipOpportunities`, and
`MembershipConversionRate` from ServiceTitan, but none crossed the normalization boundary. This change
exposes only **Memberships Sold**, the direct count returned by ServiceTitan. It does not derive or infer
membership revenue, maintenance agreements, agreement sales, recurring service agreements, or attach rate.

Repository and response-shape searches found no validated fields for Membership Revenue, Maintenance
Agreements, Agreement Sales, or Recurring Service Agreements. `MembershipConversionRate` is present in the
raw response request but remains intentionally unnormalized: its business meaning and percentage scale have
not been validated. `MembershipOpportunities` likewise remains raw-only because it was not requested as a
presentation KPI.

## Existing ServiceTitan request

No new ServiceTitan request is required. The existing request is:

- Method: `POST`
- Endpoint: `/app/api/reporting/CustomReport/GetDatasourceData?datasource=Technicians&forTechScorecards=true`
- Per-technician request fields:
  - `TechnicianId`: configured numeric ID serialized as a string
  - `BusinessUnitId`: configured business-unit IDs serialized as comma-separated values
  - `JobTypes`: empty string
  - `DashboardReloadKey`: configured ServiceTitan reload key
  - `From`: current office-local date (`YYYY-MM-DD`)
  - `To`: current office-local date (`YYYY-MM-DD`)
  - `Fields`: centralized technician datasource field list, including `MembershipsSold`
  - `VisibleFields`: the same centralized list, including `MembershipsSold`
  - `TimeZone`: configured office time zone

The response is a JSON array. The row matching `TechnicianId` contains the direct response field
`MembershipsSold`. HTML is still rejected by the existing JSON response validator.

## Pipeline changes

1. Add `membershipsSold` to shared KPI metadata as an integer count without a goal.
2. Normalize raw `MembershipsSold` directly to `technician.kpis.membershipsSold` with confirmed data quality
   when present; preserve missing values as `{ value: null, hasData: false }`.
3. Add `membershipsSold` to the backend-prepared Activity slide rows and metadata.
4. Present it with Opportunities, Tech Leads, and Marketed Leads on Sales, and with Calls, Opportunities, and
   Installs on Operations. The frontend performs no membership calculation.
5. Include explicit sanitized membership counts in mock mode and normalization coverage.

## Future additions

Supporting Membership Revenue, agreement state, renewal rate, or recurring agreement reporting requires
capturing and validating a native ServiceTitan JSON endpoint that actually returns those concepts. Until that
endpoint, its request contract, and its response semantics are observed in the authenticated session, the
required endpoint and fields are **unknown** and must not be invented. Once validated, centralize the endpoint
and requested fields, normalize direct values with an approved data-quality status, and extend the existing
payload without creating a sixth slide.
