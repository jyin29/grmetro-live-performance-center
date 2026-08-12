# GRmetro Live Performance Center
## Implementation Task List

Version 1.0  
Status: Active  
Companion to:

- `docs/PROJECT_SPEC.md`
- `docs/UI_SPEC.md`
- `docs/SERVICETITAN.md`
- `AGENTS.md`

---

# 1. Purpose

This file is the implementation checklist for Codex and human contributors.

Rules:

- Complete tasks in phase order.
- Do not mark a task complete until it works and relevant tests pass.
- Keep the repository installable after each completed phase.
- Update this file in the same commit as completed work.
- Record unresolved blockers beneath the affected task.
- Do not redesign the product while completing tasks.
- Read the full specification before implementation.

Legend:

```text
[ ] Not started
[~] In progress
[x] Complete
[!] Blocked
```

---

# 2. Phase 0 — Repository Foundation

## Repository

- [!] Confirm the GitHub repository is private.
  - Blocked in the isolated Codex work branch: remote inspection is intentionally unavailable. A repository administrator must confirm visibility in GitHub.
- [x] Clone the repository locally.
- [x] Create the root folder structure:

```text
apps/
shared/
assets/
docs/
scripts/
```

- [x] Create the three application folders:

```text
apps/backend/
apps/dashboard/
apps/remote/
```

- [x] Add the approved GRmetro logo to:

```text
assets/branding/grmetro-logo.png
```

- [x] Add the approved dashboard reference image to:

```text
assets/references/dashboard-reference.png
```

## Root Configuration

- [x] Create root `package.json`.
- [x] Configure npm workspaces.
- [x] Add root `npm run dev`.
- [x] Add root `npm run build`.
- [x] Add root `npm test`.
- [x] Add root `npm start`.
- [x] Add root QR-generation command.
- [x] Create `.gitignore`.
- [x] Create `.env.example`.
- [x] Create `.nvmrc` or `.node-version`.
- [x] Create `README.md`.
- [x] Create `AGENTS.md`.
- [x] Confirm no secrets are committed.

## Verification

- [x] `npm install` succeeds.
- [x] Workspace commands resolve.
- [x] Repository structure matches the specification.
- [x] Project builds without undeclared global dependencies.

Progress note (July 31, 2026): Phase 0 repository scaffolding, workspace commands, environment template, asset verification, and foundation tests are complete. Application runtimes and functional QR generation remain assigned to their later implementation phases. GitHub repository visibility is the only Phase 0 item requiring external confirmation.

Recommended commit:

```text
chore: initialize repository and workspace structure
```

---

# 3. Phase 1 — Shared Configuration

## Technicians

- [x] Create `shared/technicians.js`.
- [x] Add Julio Torres with ID `134926818`.
- [x] Add Shamon Ward with ID `3841`.
- [x] Add Charlie E with ID `3853`.
- [x] Add Alex K with ID `133469538`.
- [x] Add Dwight with ID `127491426`.
- [x] Add short names and initials.
- [x] Validate unique technician IDs.

## KPIs

- [x] Create `shared/kpis.js`.
- [x] Define stable ID `revenue`.
- [x] Define stable ID `billableServiceCalls`.
- [x] Define stable ID `serviceRevenue`.
- [x] Define stable ID `opportunities`.
- [x] Define stable ID `leadConversionRate`.
- [x] Define stable ID `techLeads`.
- [x] Define stable ID `marketedLeads`.
- [x] Define stable ID `closingRate`.
- [x] Define stable ID `installs`.
- [x] Define stable ID `installAverageTicket`.
- [x] Define stable ID `installRevenue`.
- [x] Add labels.
- [x] Add number formats.
- [x] Add colors.
- [x] Add goal support.
- [x] Add higher-is-better configuration.

## Slides

- [x] Create `shared/slides.js`.
- [x] Add Revenue slide.
- [x] Add Activity slide.
- [x] Add Performance slide.
- [x] Add Average Ticket slide.
- [x] Add Top 3 slide.
- [x] Confirm there are exactly five live slides.
- [x] Set default KPI-slide duration to 15 seconds.
- [x] Set Top 3 duration to 25 seconds.
- [x] Confirm slide order is fixed.

## Televisions

- [x] Create `shared/televisions.js`.
- [x] Add initial placeholder TV room names.
- [x] Ensure every TV ID is lowercase and URL-safe.
- [x] Validate unique TV IDs.
- [ ] Replace placeholders when final rooms are confirmed. **Blocked: final room names and hardware are not yet confirmed.**

## Goals

- [x] Create `shared/goals.js`.
- [x] Add company-wide default goal structure.
- [x] Add technician-specific overrides.
- [x] Use `null` for unconfigured goals.
- [x] Do not invent final management goals.
- [x] Add validation for unknown KPI goal IDs.

## Job Classification

- [x] Create `shared/jobClassifications.js`.
- [x] Add service classification structure.
- [x] Add installation classification structure.
- [x] Support IDs and name patterns.
- [x] Leave unverified job-type lists empty.
- [x] Mark classification setup as production-blocking.

## Shared Constants and Validation

- [x] Create `shared/constants.js`.
- [x] Define TV modes.
- [x] Define WebSocket event names.
- [x] Define default slide.
- [x] Define client types.
- [x] Create `shared/validation.js`.
- [x] Validate TV IDs.
- [x] Validate technician IDs.
- [x] Validate KPI IDs.
- [x] Validate slide IDs.
- [x] Validate remote selection combinations.

## Verification

- [x] Exactly five technicians are configured.
- [x] Exactly eleven approved KPI IDs exist.
- [x] Exactly five live slides exist.
- [x] Shared validation tests pass.
- [x] No business calculations exist in shared UI configuration.

Recommended commit:

```text
feat: add shared technician KPI slide and TV configuration
```


## Phase 1 Progress Note

Phase 1 shared configuration and validation are complete. All production goals remain
`null`, and service/install classification lists remain empty and explicitly
production-blocking until GRmetro confirms the business definitions. Television IDs
and room labels are clearly marked placeholders pending final room and hardware
assignments. Phase 2 has not begun.

---

# 4. Phase 2 — Mock Data Mode

## Fixtures

- [x] Create backend fixture directory.
- [x] Add normal successful technician data.
- [x] Add zero-value technician data.
- [x] Add missing-data fixture.
- [x] Add no-install fixture.
- [x] Add partial-failure fixture.
- [x] Add stale-data fixture.
- [x] Add ranking-change fixture.
- [x] Add new-leader fixture.
- [x] Add goal-reached fixture.
- [x] Add entered-Top-3 fixture.
- [x] Sanitize all fixture data.

## Mock Provider

- [x] Implement explicit `MOCK_MODE`.
- [x] Implement mock refresh provider.
- [x] Generate all five technicians.
- [x] Generate all five slide payloads.
- [x] Generate deterministic ranks.
- [x] Generate deterministic goals.
- [x] Generate deterministic overall Top 3.
- [x] Support switching fixture scenarios in development.
- [x] Ensure production never silently enables mock mode.

## Verification

- [x] Mock provider starts without Edge, CDP, or ServiceTitan.
- [x] Presentation contract is ready for the Phase 6 dashboard data route.
- [x] Full technician and KPI records support technician-only, KPI-only, and combined remote views.
- [x] Partial-failure diagnostics retain all five configured technician records for later cache integration.
- [x] Tests do not require live ServiceTitan.

Progress note (July 31, 2026): Phase 2 is complete. The deterministic mock refresh
provider exposes sanitized scenarios, exactly five technicians, eleven KPI records per
technician, and exactly five presentation-ready slide payloads. Mock-only goals are
clearly isolated from the production goal configuration. Runtime HTTP routes, TV state,
and override expiration remain in their assigned later phases and were not pulled into
Phase 2.

Recommended commit:

```text
feat: add deterministic mock dashboard data mode
```

---

# 5. Phase 3 — Backend Application Core

## Backend Workspace

- [x] Create `apps/backend/package.json`.
- [x] Add Express.
- [x] Add Playwright.
- [x] Add WebSocket dependency.
- [x] Add environment loader.
- [x] Add validation dependency only if justified. (No validation package needed.)
- [x] Add test runner.
- [x] Add development restart command.

## Application Entry

- [x] Create `src/index.js`.
- [x] Create `src/app.js`.
- [x] Add graceful shutdown handling.
- [x] Avoid business logic in entry files.
- [x] Add startup logs.
- [x] Add application-version reporting.

## Configuration

- [x] Create `src/config.js`.
- [x] Validate `PORT`.
- [x] Validate `HOST`.
- [x] Validate `EDGE_DEBUG_URL`.
- [x] Validate ServiceTitan base URL.
- [x] Validate time zone.
- [x] Validate refresh interval.
- [x] Validate override timeout.
- [x] Validate stale thresholds.
- [x] Validate mock-mode configuration.
- [x] Validate development-route configuration.

## Middleware

- [x] Add JSON request parsing.
- [x] Add request-size limit.
- [x] Add request logging.
- [x] Add not-found handler.
- [x] Add standard error handler.
- [x] Hide stack traces in production.
- [x] Add rate limiting for remote commands.
- [x] Configure development CORS.
- [x] Prefer same-origin production serving.

## Logger

- [x] Create structured logger.
- [x] Support debug, info, warn, and error.
- [x] Add timestamps.
- [x] Redact secrets.
- [x] Avoid raw ServiceTitan payload logging.
- [x] Add log rotation or documented rotation strategy.

Recommended commits:

```text
feat: add backend application and configuration
feat: add backend middleware logging and error handling
```


Progress note: Phase 3 adds only the backend application shell. Mock-provider
selection is wired at startup without starting refreshes; cache, scheduling, REST
routes, WebSockets, and live ServiceTitan behavior remain deferred to later phases.

---

# 6. Phase 4 — Dashboard Cache and Refresh Framework

## Cache

- [x] Create dashboard-cache module.
- [x] Store latest successful payload.
- [x] Store last successful refresh time.
- [x] Store refresh-start time.
- [x] Calculate cache age.
- [x] Support unavailable cache state.
- [x] Preserve payload after refresh failure.
- [x] Preserve individual technician data after partial failure.

## Scheduler

- [x] Create refresh scheduler.
- [x] Run refresh immediately at startup.
- [x] Schedule refresh every sixty seconds.
- [x] Prevent overlapping refreshes.
- [x] Log skipped overlapping refreshes.
- [x] Continue scheduling after failure.
- [x] Stop scheduler during graceful shutdown.
- [x] Handle midnight date rollover.

## Refresh Provider Interface

- [x] Define common refresh-provider contract.
- [x] Implement mock refresh provider.
- [x] Reserve implementation for live ServiceTitan provider.
- [x] Return per-technician result objects.
- [x] Support partial successes.
- [x] Include refresh diagnostics.

## Verification

- [x] Immediate startup refresh works.
- [x] Sixty-second scheduling works.
- [x] Failed refresh preserves cache.
- [x] Empty cache returns correct error.
- [x] Scheduler tests use fake timers.

Progress note (July 31, 2026): Phase 4 is complete. The in-memory dashboard cache
tracks refresh lifecycle and cache-age metadata, reports `CACHE_UNAVAILABLE` before
the first success, and retains successful presentation data across total and partial
failures. The scheduler performs an immediate mock-provider refresh, recalculates the
America/New_York date on every attempt, skips overlap, continues after failure, and
stops during graceful shutdown. The live ServiceTitan provider remains explicitly
reserved for its later phase; no TV state, routes, WebSockets, or live access were
introduced.

Recommended commit:

```text
feat: implement dashboard cache and refresh scheduler
```

---

# 7. Phase 5 — TV State Manager

## State Model

- [x] Create canonical TV state shape.
- [x] Initialize every TV in live mode.
- [x] Include revision number.
- [x] Include selected technician.
- [x] Include selected KPI.
- [x] Include selected slide.
- [x] Include override start time.
- [x] Include expiration time.
- [x] Include update time.

## TV Manager

- [x] Create TV-state map keyed by TV ID.
- [x] Implement get-all TVs.
- [x] Implement get-one TV.
- [x] Implement technician-only override.
- [x] Implement KPI-only override.
- [x] Implement technician-plus-KPI override.
- [x] Implement manual resume.
- [x] Reset timeout on repeated command.
- [x] Increment revision on every change.
- [x] Ensure latest command wins.
- [x] Ensure other TVs remain unchanged.

## Expiration Monitor

- [x] Check expirations every second.
- [x] Change expired TV to returning mode.
- [x] Emit returning state for later broadcast integration.
- [x] Wait configured return-transition time.
- [x] Clear selections.
- [x] Return TV to live mode.
- [x] Emit live state for later broadcast integration.
- [x] Stop monitor and pending transition timers on shutdown.

## Verification

- [x] Empty selection is rejected.
- [x] Invalid TV is rejected.
- [x] Invalid technician is rejected.
- [x] Invalid KPI is rejected.
- [x] Five TVs can have independent state.
- [x] Backend restart initializes all TVs to live.
- [x] Fake-timer tests cover expiration.

Progress note (2026-07-31): Phase 5 is complete. The memory-only manager supports strict independent
technician, KPI, and combined remote view types within the approved `LIVE`, `REMOTE`, and `RETURNING`
modes; revisioned state-change subscriptions; full timeout resets; and the shared `RETURNING` → `LIVE`
sequence for automatic expiration and manual resume.
Phase 6 REST and WebSocket work has not started.

Recommended commit:

```text
feat: implement independent TV state and override expiration
```

---

# 8. Phase 6 — REST API

## Health

- [x] Implement `GET /api/v1/health`.
- [x] Include backend status.
- [x] Include browser status.
- [x] Include ServiceTitan status.
- [x] Include cache status.
- [x] Include last successful refresh.
- [x] Include cache age.
- [x] Include application version.
- [x] Exclude secrets.

## Dashboard

- [x] Implement `GET /api/v1/dashboard`.
- [x] Return normalized presentation payload.
- [x] Return cache-unavailable error when necessary.
- [x] Never return raw ServiceTitan records.

## Televisions

- [x] Implement `GET /api/v1/tvs`.
- [x] Implement `GET /api/v1/tvs/:tvId`.
- [x] Implement `POST /api/v1/tvs/:tvId/override`.
- [x] Implement `POST /api/v1/tvs/:tvId/resume`.
- [x] Return stable validation error codes.
- [x] Include remaining override seconds.

## Development Routes

- [x] Implement manual refresh route.
- [x] Mock-scenario route intentionally omitted as optional; deterministic scenarios remain provider-level controls.
- [x] Disable development routes in production.
- [x] Return `REFRESH_IN_PROGRESS` when appropriate.

## API Tests

- [x] Test valid responses.
- [x] Test malformed JSON.
- [x] Test invalid IDs.
- [x] Test missing selections.
- [x] Test unknown fields.
- [x] Test request-size limit.
- [x] Test rate limiting.
- [x] Test no-secret exposure.

Progress note (2026-07-31): Phase 6 REST API is complete. Domain-isolated routers expose cached
dashboard reads, safe health status, independent TV reads and commands, and an explicitly enabled
development refresh endpoint. All errors use the standard envelope, production errors suppress
internal details, remote mutations are rate-limited, and REST responses do not initiate provider
requests. The optional mock-scenario route was not added. Phase 7 has not started.

Recommended commit:

```text
feat: implement Phase 6 REST API
```

---

# 9. Phase 7 — Business Logic

## Normalizer

- [x] Create ServiceTitan-to-internal normalizer.
- [x] Map configured technician names.
- [x] Map direct confirmed KPIs.
- [x] Convert ratios to percentages.
- [x] Preserve zero values.
- [x] Convert missing values to no-data.
- [x] Add data-quality status.
- [x] Remove private fields.
- [x] Avoid mutating raw input.

## Goal Engine

- [x] Resolve technician-specific goal override.
- [x] Fall back to default goal.
- [x] Calculate percent complete.
- [x] Calculate remaining amount.
- [x] Calculate reached state.
- [x] Allow over-100% progress.
- [x] Handle null and invalid goals.

## Ranking Engine

- [x] Rank each KPI.
- [x] Exclude no-data technicians from ranked positions.
- [x] Use deterministic tie-breaking.
- [x] Track previous ranks.
- [x] Calculate rank changes.
- [x] Sort slide rows by primary KPI.

## Overall Score

- [x] Add configurable weights.
- [x] Validate weight total.
- [x] Normalize against goals.
- [x] Cap each KPI at 150%.
- [x] Redistribute missing-data weights.
- [x] Enforce minimum valid coverage.
- [x] Mark insufficient-data technicians.
- [x] Produce overall ranks.
- [x] Produce overall Top 3.

## Achievement Events

- [x] Detect new overall leader.
- [x] Detect entered Top 3.
- [x] Detect newly reached goal.
- [x] Add created and expiration timestamps.
- [x] Prevent duplicate repeated events.
- [x] Expire presentation events.

## Axis Calculation

- [x] Calculate pleasant maximum.
- [x] Add visual headroom.
- [x] Generate four to six ticks.
- [x] Use fixed 100% performance axis.
- [x] Handle all-zero data.
- [x] Add compact format metadata.

## Dashboard Builder

- [x] Build Revenue slide payload.
- [x] Build Activity slide payload.
- [x] Build Performance slide payload.
- [x] Build Average Ticket slide payload.
- [x] Build dedicated Top 3 payload.
- [x] Build full technician records.
- [x] Add rotation epoch.
- [x] Add status metadata.
- [x] Add events.
- [x] Include normalized ratios.

## Verification

- [x] Business-logic unit tests pass.
- [x] Missing data never ranks as zero.
- [x] Exactly five slides are emitted.
- [x] Top 3 is not embedded in KPI slides.
- [x] Frontend receives no raw ServiceTitan field names.

Recommended commits:

```text
feat: normalize KPI values and goals
feat: add KPI rankings and overall Top 3 scoring
feat: build presentation-ready dashboard payloads
```

Progress note (2026-07-31): Phase 7 is complete. Pure backend modules now normalize only the
confirmed ServiceTitan mappings, resolve goals, calculate deterministic KPI and overall rankings,
detect transition-based achievement events, generate presentation axes, and build exactly five
presentation-ready slides. The overall-score configuration remains explicitly provisional pending
management approval. Unresolved live KPI mappings and production goals remain unavailable; mock-only
values remain isolated to explicit mock mode. Phase 8 has not started.

---

# 10. Phase 8 — Edge Browser Manager

## Connection

- [x] Create persistent CDP browser manager.
- [x] Connect to `127.0.0.1`.
- [x] Use configurable debug URL and connection timeout.
- [x] Reuse one browser connection and one in-flight connection attempt.
- [x] Do not launch Edge.
- [x] Do not close user-launched Edge.
- [x] Expose safe browser connection status.

## Page Discovery

- [x] Prefer Technician Scorecard page.
- [x] Fall back to authenticated ServiceTitan page.
- [x] Reject obvious unauthenticated pages safely.
- [x] Do not include page URLs in public status or production logs.
- [x] Produce actionable no-page error.

## Reconnection

- [x] Detect CDP disconnect.
- [x] Mark browser unavailable.
- [x] Preserve cache by keeping browser recovery isolated from dashboard state.
- [x] Retry with bounded exponential backoff.
- [x] Rediscover ServiceTitan page.
- [x] Leave CSRF refresh to Phase 9; Phase 8 does not implement CSRF handling.
- [x] Leave live refresh scheduling to Phase 9; browser reconnection remains independently available.

## Verification

- [x] Production connector uses Playwright `connectOverCDP` for an existing Edge session.
- [x] Retry when Edge starts late.
- [x] Recover after Edge closes and reopens.
- [x] Never call `browser.close()` on user session.
- [x] Tests mock CDP behavior without requiring Edge or ServiceTitan.

Progress note (2026-07-31): Phase 8 is complete. The live backend now starts a nonblocking,
persistent CDP manager with safe status, cross-context ServiceTitan page discovery, disconnect
handling, bounded retry timing, and idempotent detach-only shutdown. Explicit mock mode never loads
or calls the Playwright connector. CSRF and ServiceTitan request/refresh behavior remain exclusively
incomplete Phase 9 work and were not implemented.

Recommended commit:

```text
feat: connect to persistent authenticated Edge session
```

---

# 11. Phase 9 — ServiceTitan Client

## Endpoint Registry

- [x] Centralize Technician Overview endpoint.
- [x] Centralize Technician Datasource endpoint.
- [x] Centralize Job Drilldown endpoint.
- [x] Centralize metadata endpoints.
- [x] Duplicate no endpoint string elsewhere.

## Field Registry

- [x] Centralize Technician Datasource field list.
- [x] Add required confirmed fields.
- [x] Avoid requesting unnecessary private fields.
- [x] Document field additions.

## Request Builders

- [x] Build today's local date.
- [x] Build Technician Overview payload.
- [x] Build Technician Datasource payload.
- [x] Build Job Drilldown payload.
- [x] Substitute technician ID.
- [x] Add business-unit IDs.
- [x] Add time zone.
- [x] Add reload key.
- [x] Keep reload-key logic centralized.

## CSRF

- [x] Implement dynamic token provider.
- [x] Observe successful ServiceTitan requests when necessary.
- [x] Cache token only in memory.
- [x] Refresh after 401.
- [x] Refresh after 403.
- [x] Refresh after reconnect.
- [x] Never log token.
- [x] Attach the CSRF observer when an already-open authenticated ServiceTitan page is selected.
- [x] Attempt passive token lookup before live requests proceed.
- [x] Use one safe non-mutating GET metadata acquisition request when passive lookup fails.
- [x] Share one in-flight acquisition promise across concurrent technician requests.
- [x] Return retryable acquisition failures and recover automatically on later scheduled refreshes.

## Request Execution

- [x] Send POST requests.
- [x] Include credentials.
- [x] Include required JSON headers.
- [x] Include CSRF token.
- [x] Add timeout.
- [x] Return status, final URL, content type, and body.
- [x] Parse JSON only after validation.

## Response Validation

- [x] Reject `text/html`.
- [x] Reject app-shell HTML.
- [x] Reject hash-route redirects.
- [x] Reject malformed JSON.
- [x] Classify authentication failures.
- [x] Classify CSRF failures.
- [x] Classify timeouts.
- [x] Include safe diagnostic preview.

## Technician Refresh

- [x] Refresh all five technicians.
- [x] Limit concurrency to two or use reliable sequential calls.
- [x] Merge Overview and Datasource only where needed.
- [x] Preserve per-technician failures.
- [x] Record request durations.
- [x] Avoid frontend-triggered ServiceTitan requests.

## Verification

- [ ] All five technician datasource requests return JSON.
- [x] No HTML response is accepted.
- [x] No credentials are stored.
- [x] No token is committed.
- [ ] Refresh completes within interval.
- [ ] Live integration tests are performed manually.


Progress note (2026-07-31): Phase 9 implementation is complete. The backend now uses a centralized endpoint and field registry, pure New York-date request builders, dynamic memory-only CSRF observation, authenticated in-page JSON POST execution, defensive response validation, and a concurrency-two five-technician live provider. Partial technician failures retain prior records, direct Phase 7 mappings alone are normalized, and unresolved lead/service/install KPIs remain unavailable. Dependency-isolated fake-page and fake-browser tests cover the client without requiring Edge or ServiceTitan. The live-environment verification items below remain intentionally unchecked until an authenticated office Edge session is available; Phase 10 derivations have not started.


Corrective note (2026-08-04): Live Windows restart testing found that Phase 9 could connect to an already-authenticated Edge page but miss the CSRF token until a user manually refreshed ServiceTitan. The CSRF provider now attaches immediately, performs passive page-local lookup, falls back to one non-mutating authenticated metadata GET, shares a single in-flight acquisition across concurrent technician requests, clears only on reconnect/page replacement/401/403/CSRF rejection, and retries automatically on later scheduled refreshes without exposing the token. Automated fake-page tests cover unattended startup, shared concurrency, retry, reconnect, safe logging, non-mutating acquisition, and shutdown cleanup.

Corrective note (2026-08-04): The backend syntax build no longer depends on the Unix-only
`find | xargs` pipeline. A dependency-free Node script now discovers and syntax-checks JavaScript
recursively on Windows, macOS, and Linux, with automated coverage for invalid files, nested and
space-containing paths, and missing directories. Phase 9 business behavior is unchanged.

Corrective note (2026-08-11): Phase 10/11 runtime investigation traced dashboard refresh through
the scheduler, live provider, request executor, and CSRF provider. The startup-acquisition refactor
had stopped resolving the shared acquisition promise from the response observer, so an observed
valid token could remain blocked behind a pending Playwright `page.evaluate()` until the outer CSRF
timer expired. Observer acquisition now resolves that promise immediately, and safe stage-only
timeout diagnostics distinguish passive lookup from the metadata request without exposing browser
or authentication data. Frontend consolidation, refresh-provider derivations, and dependency
updates did not change the CSRF acquisition implementation.

Recommended commits:

```text
feat: implement native ServiceTitan API client
feat: add resilient five-technician refresh pipeline
```

---

# 12. Phase 10 — Service and Install Derivations

## Drilldown Research

- [x] Complete native metric-origin and drilldown architecture investigation.
- [x] Add development-only network research observer for Technician Scorecard drilldowns.
- [x] Add sanitized start, stop, results, and clear research routes.
- [x] Add privacy and lifecycle tests for research observer results.
- [x] Update `docs/SERVICETITAN.md`.

## Classification

- [x] Provide centralized service/install job-type and exclusion configuration.
- [x] Log/count ambiguous records in derivation results.
- [x] Exclude unclassified records from confirmed totals.

## Derived KPIs

- [x] Wire live refresh to the job drilldown, classifier, and derivation pipeline.
- [x] Execute derivation while unapproved output remains suppressed.
- [x] Add privacy-safe development pipeline diagnostics.
- [x] Derive Billable Service Calls.
- [x] Derive Service Revenue.
- [x] Derive Install Revenue.
- [x] Derive Number of Installs.
- [x] Derive Install Average Ticket.
- [x] Return no-data when install denominator is zero.
- [x] Mark derived data quality.
- [x] Add calculation tests.

## Business Validation

- [ ] Validate sanitized service, installation, recall, warranty, no-charge, and canceled records.
- [ ] Populate the validated job type IDs and exclusions in shared configuration.
- [ ] Confirm the drilldown revenue and status fields, flags, and `KpiType` meaning.
- [ ] Review calculations with GRmetro management.
- [ ] Confirm definition of completed install.
- [ ] Confirm service-call exclusions.
- [ ] Confirm install revenue basis.
- [ ] Confirm billable definition.
- [ ] Approve production classification.

This phase is release-blocking.


Progress note (2026-08-04): Phase 10 implementation scaffolding is complete. Added a development-only sanitized drilldown route, strict allow-list sanitizer, pure configuration-driven job classifier, and pure derivation functions for the five service/install KPIs. Production classification remains disabled with `classificationApproved: false`; normal live refresh does not yet fetch drilldown records, and live service/install KPIs remain unavailable until GRmetro reviews sanitized records and approves job classification. Follow-up correction (2026-08-04): tightened completed-status and drilldown-date validation, preserved missing monetary values as missing instead of zero, and made derived KPI metadata track each KPI's own required-field completeness. Production classification remains disabled.

Progress note (2026-08-04): Added a development-only network research observer for manually clicked ServiceTitan Technician Scorecard drilldowns. The observer is gated behind development routes, attaches idempotently, retains at most 100 sanitized schema-only events, excludes raw records and private values, and is documented with exact PowerShell start/stop/save commands. Production derivations remain disabled and Phase 11 has not started.

Progress note (2026-08-10): Fixed the research observer's stale-page attachment bug without changing its Playwright request/response architecture. Browser page discovery now rescans connected contexts and follows new pages, replacement pages, and frame navigation; the observer reattaches when the selected Scorecard page changes. Development-only safe page/listener/count diagnostics and bounded origin-plus-path request diagnostics now prove receipt of `GetTechnicianOverview`. Added selection, replacement, reattachment, navigation, lifecycle, filtering, and endpoint-capture tests. Phase 11 has not started.

Progress note (2026-08-10): Expanded the development observer for native service/install KPI discovery across every observed reporting JSON endpoint. It now searches safe metric/datasource/chart metadata and matching response field names without retaining values, reports every endpoint searched, records attributable safe candidates, and produces one `FOUND`, `NOT FOUND`, or `POSSIBLE ALIAS` result for each of the four requested KPIs. A complete authenticated ServiceTitan click-through is still required before treating `NOT FOUND` as conclusive. Production calculations, refresh behavior, and `classificationApproved: false` are unchanged; Phase 11 has not started.

Progress note (2026-08-10): Completed a repository-wide origin audit for Service Revenue, Install Revenue, Number of Installs, and Install Average Ticket in `docs/PHASE_10_METRIC_ORIGIN_AUDIT.md`. The audit confirms that all four concepts are configured and have isolated derivation functions, but the live provider neither fetches the job drilldown nor invokes those derivations; live normalization therefore leaves them unavailable. `numberOfInstalls` does not exist as an identifier—the approved stable ID is `installs`. No behavior changed, classification remains unapproved, and Phase 11 has not started.

Progress note (2026-08-10): Phase 10 implementation is complete. The live refresh now fetches `TechnicianJobsExtendedDrilldownDatasource`, sanitizes its records, executes the single shared classifier and `deriveServiceInstallKpis()`, and merges the results into normalized KPI records. With `classificationApproved: false`, the full pipeline still executes but the service/install outputs remain exactly unavailable. Development-only diagnostics expose safe counts and execution flags without names, customer data, or revenue values. Automated tests prove both suppression and that changing only the approval flag exposes derived values. Only the Business Validation checklist above remains; Phase 11 has not started.

Recommended commit:

```text
feat: derive validated service and installation KPIs
```

---

# 13. Phase 11 — Dashboard Production Foundation

## Application Foundation

- [x] Create the dashboard React and Vite application structure.
- [x] Add the branded, light-theme production shell.
- [x] Add a header, refresh indicator, KPI summaries, main content region, technician leaderboard, and footer status bar.
- [x] Add modular layout, header, KPI, leaderboard, technician, status, loading, error, and empty-state components.
- [x] Connect only to the stable `GET /api/v1/dashboard` REST endpoint through a reusable API service and hook.
- [x] Preserve the last successful payload when a background REST refresh fails.
- [x] Add an explicit retry action for initial request failures.
- [x] Add responsive 720p, 1080p, widescreen, and 4K-oriented scaling.
- [x] Reserve labeled placeholders without implementing charts, TV rotation, AI insights, remote integration, or WebSockets.
- [x] Add focused tests for API response handling, metric formatting, no-data semantics, freshness, and backend-provided ordering.
- [x] Install the frontend dependencies and verify the production bundle in the implementation environment.

## Remaining Dashboard Foundation Work

- [x] Complete dependency installation and run the dashboard test/build commands.
- [ ] Perform stakeholder visual review at 1280×720, 1920×1080, and 3840×2160 after the Vite application can run.
- [x] Replace the chart-region foundation placeholder with the requested Revenue, KPI comparison, and technician ranking visualizations.
- [x] Add a dedicated responsive Technician Performance dashboard as Slide 2 in the indexed deck.
- [x] Add a TV-first Business Performance dashboard as Slide 3 using existing revenue and conversion visualizations.
- [x] Add a recognition-focused Slide 4 with one dominant backend-ranked top performer and secondary backend-prepared achievement categories.
- [x] Add a presentation-only Operations Health Slide 5 using existing refresh, cache, technician, error, and rotation state.
- [x] Add presentation-only 30-second automatic rotation across every registered slide, with a 400 ms crossfade, pause during loading/refresh/error states, and a subtle accessible position indicator.
- [ ] Add display URL routing, TV validation, WebSockets, synchronized rotation, and remote state only in their dedicated later tasks.

Progress note (2026-08-10): Began Phase 11 with a production dashboard foundation that consumes the stable cached dashboard REST payload without modifying backend logic, ServiceTitan integration, refresh providers, or job derivation. The shell renders backend-prepared KPI records and overall ranks, keeps missing values distinct from zero, and retains visible data across background request failures. Future chart, TV rotation, WebSocket, AI, and remote-control regions remain placeholders only. Dependency installation is externally blocked by npm registry HTTP 403 and must be completed before visual approval.

Progress note (2026-08-10): Rebuilt the dashboard delivery directly in this repository and replaced the reserved chart placeholder with production visualization components. The dashboard now renders an overlaid SVG Revenue chart, a Lead Conversion/Closing KPI comparison, and a five-technician overall ranking chart using only backend-prepared values, normalized ratios, and ranks. Loading, no-data, initial error, retry, and cached-data warning states remain intact. Focused component tests cover accessible chart output and zero-versus-no-data presentation; synchronized slide rotation, remote state, and the complete Phase 14 metric-slide engine remain separate work.

Progress note (2026-08-11): Consolidated the current repository's Phase 11 frontend into one runnable production foundation. The production entry point now loads the shared responsive stylesheet, the branded header shows a live clock and continuously updated freshness age, and loading/error states no longer imply a successful refresh. Existing REST hook, cached-data behavior, state views, cards, and visualization components are reused without adding business calculations. Dependency-backed production build verification now passes. Stakeholder visual review remains; display routing, WebSockets, synchronized rotation, and remote control remain later-phase work.

Progress note (2026-08-11): Optimized the production foundation for 65–85 inch room displays with selectively larger typography, more card padding, wider section spacing, and roomier chart and leaderboard treatments while preserving the light GRmetro theme. Added a reusable registry-backed slide deck controlled by a simple index; the existing dashboard is Slide 1 and remains the only rendered slide. Added restrained 200–500 ms card, value, chart, and leaderboard entrance motion with reduced-motion support. Automatic rotation, keyboard controls, WebSockets, TV routing, and remote state remain explicitly deferred. Stakeholder review at 720p, 1080p, and 4K is still outstanding.

Progress note (2026-08-11): Completed a focused Phase 11 presentation-polish pass after auditing the rendered 1080p dashboard. The existing TV scaling and entrance-motion rules were retained and strengthened with immediately visible operations-center typography, proportionally larger card padding and section gutters, a taller usable chart region, and 250–450 ms ease-out entrances without scaling or flashy effects. Refresh freshness now advances every second with seconds included, including minute-and-second labels, while preserving the established live, stale, and critical color thresholds. No backend, API, business logic, rotation, WebSocket, remote-control, or later-slide behavior changed. Stakeholder approval and the remaining multi-resolution visual review are still outstanding.

Progress note (2026-08-11): Added the dedicated Technician Performance dashboard as Slide 2 in the existing indexed deck. Its responsive TV-scale cards reuse the cached dashboard payload and shared formatting/status presentation to show each technician's backend-prepared overall rank, rank movement, Revenue, Closing %, Billable Calls, Install Revenue, Average Ticket, and exact KPI data-quality states. Slide 1 is unchanged, and the deck still has no automatic rotation, keyboard controls, WebSockets, remote control, or new business calculations. Stakeholder visual review at 720p, 1080p, and 4K remains outstanding.

Progress note (2026-08-11): Completed the first production automatic slide experience for the two currently registered Phase 11 dashboards. A single presentation configuration now defines the 15-second interval and 400 ms transition; the deck starts on Slide 1, advances through the full registry, wraps to Slide 1, and pauses while loading, refreshing, or showing an error. Slides crossfade without lateral or scale motion, expose a subdued keyboard-accessible position indicator, and retain reduced-motion behavior. The existing TV-readability sizing was audited and retained, with the indicator sized for legibility without competing with dashboard content. This is local presentation rotation only; shared-epoch synchronization, display routing, WebSockets, remote control, and later slides remain deferred.

Progress note (2026-08-11): Continued Phase 11 presentation polish by changing the local automatic rotation interval from 15 to 30 seconds while preserving the 400 ms crossfade. Fresh cached REST payloads now interpolate changed KPI, revenue, comparison, technician, and rank values over 650 ms with a non-overshooting ease-out; chart geometry transitions in place, and changed KPI cards, technician cards, and ranking rows receive a subtle one-second refresh highlight. Reduced-motion preferences make updates immediate. The successful refresh timestamp continues to reset the header to `Updated 0 sec ago` and count each second. No backend, API, refresh-provider, ServiceTitan, KPI, or business logic changed.

Progress note (2026-08-11): Added Slide 3, a TV-first Business Performance view designed for rapid comprehension at room distance. It pairs the existing overlaid Revenue by Technician SVG with the existing backend-normalized Lead Conversion and Closing comparison in two large, low-density panels. The slide reuses only cached dashboard fields, shared animation, accessibility, responsive, and reduced-motion behavior; Slide 1 and Slide 2 remain unchanged. Display routing, WebSockets, remote control, shared-epoch rotation, and all business calculations remain deferred.

Progress note (2026-08-11): Added Slide 4, Recognition & Achievements, as a presentation-only celebration view. The backend-qualified overall rank-one technician dominates the slide with Revenue, Closing %, and Overall Rank, while secondary cards recognize only leaders and rank movement already present in the cached dashboard payload. The slide reuses shared metric formatting, number animation, ranking presentation, rotation, keyboard navigation, responsive scaling, and reduced-motion behavior. Operations Health, WebSockets, synchronized displays, remote control, AI summaries, and all backend/business logic remain unchanged and deferred.

Progress note (2026-08-11): Completed the five-slide Phase 11 presentation with Slide 5, Operations Health. A large three-second-read status hero and six TV-scale cards reuse only the existing cached payload, refresh/error state, technician count, active slide registry, and local rotation state. The five-entry indicator and existing 30-second wraparound rotation now cover Slides 1–5. No endpoint, API request, backend, ServiceTitan, refresh-provider, KPI, or business logic changed. Stakeholder review at 720p, 1080p, and 4K remains outstanding; display routing, WebSockets, synchronized displays, remote control, and AI summaries remain deferred.

Progress note (2026-08-11): Completed the final five-slide presentation-polish pass. Shared spacing, card geometry, heading scale, chart padding, label placement, and TV-distance typography now form a more consistent operations-center presentation. The header separates LIVE state, local time, last-refresh time, and continuously advancing refresh age into large scan-friendly groups. The 400 ms stationary crossfade now gives the outgoing slide visual priority before the incoming slide appears, and the accessible position indicator transitions smoothly between slides. No backend, ServiceTitan, refresh-provider, dashboard API, KPI, or business logic changed. Stakeholder screenshot approval at 720p, 1080p, and 4K remains the only Phase 11 presentation review item.

Recommended commit:

```text
feat: create production dashboard foundation
```

---

# 13A. Phase 11 Business Follow-up — Lead Conversion Definition

## Business Decision

- [ ] Determine intended meaning of Lead Conversion %.
- [ ] Compare `LeadConversionRate`.
- [ ] Compare `OpportunityConversionRate`.
- [ ] Compare `ReplacementLeadConversionRate`.
- [ ] Compare `CloseRateFromTgl`.
- [ ] Validate against ServiceTitan UI.
- [ ] Record final mapping in `docs/SERVICETITAN.md`.
- [ ] Add normalizer mapping.
- [ ] Add tests.
- [ ] Remove unavailable status after validation.

This phase is release-blocking.

Recommended commit:

```text
feat: implement validated lead conversion KPI mapping
```

---

# 14. Phase 12A — Local Presentation Remote

- [x] Extract active slide, local rotation timer, and paused/running state into a presentation controller outside the visual slide components.
- [x] Make the dashboard deck consume presentation-controller state and commands.
- [x] Add a mobile-friendly light-theme `/remote` route.
- [x] Show the current slide and automatic-rotation status.
- [x] Add touch-friendly Pause, Resume, Next, Previous, and direct Slide 1–5 controls.
- [x] Preserve keyboard focus visibility, responsive phone layout, and reduced-motion behavior.
- [x] Keep Phase 12A frontend-local with no WebSockets, backend endpoints, shared synchronization, or multiple-display behavior.

Progress note (2026-08-11): Began Phase 12 with a local presentation-controller boundary shared by the dashboard and the new `/remote` page. The controller owns active-slide navigation, automatic rotation, and the user pause state; the existing five slide components remain presentation-only and unchanged. The phone-focused remote reports current state and exposes accessible direct controls. A future transport adapter can drive the same controller contract when WebSockets, display identities, backend state, and synchronization are implemented.

Progress note (2026-08-11): Fixed the Phase 12 presentation registration boundary after tracing the deck, controller, indicator, navigation, and timer. Slide metadata and render components now live in one shared five-entry registry; the controller and deck both derive their count, labels, navigation, rendering, and wraparound from that registry. Regression coverage verifies all registered components, `Slide 1 of 5` through `Slide 5 of 5`, the 30-second interval, and the complete `1 → 2 → 3 → 4 → 5 → 1` sequence without a duplicated count constant.

Remaining Phase 12 work: add the realtime layer, backend-authoritative per-TV state, display validation and routing, synchronized rotation, reconnect/revision handling, remote override selection and expiration, and multi-display verification.

---

# 14B. Phase 12 — WebSocket Realtime Layer

## Server

- [ ] Add `/ws` endpoint.
- [ ] Validate client type.
- [ ] Validate dashboard TV ID.
- [ ] Register dashboard clients by TV.
- [ ] Register remote clients.
- [ ] Remove closed clients.
- [ ] Add ping/pong heartbeat.
- [ ] Disconnect dead clients.

## Messages

- [ ] Implement `connection:ready`.
- [ ] Implement `dashboard:update`.
- [ ] Implement `tv:update`.
- [ ] Implement `health:update`.
- [ ] Implement `achievement:event`.
- [ ] Implement `error`.

## Routing

- [ ] Broadcast dashboard refresh to all TVs.
- [ ] Broadcast selected TV update only to affected dashboard.
- [ ] Broadcast TV updates to all remotes.
- [ ] Send initial dashboard and TV state on connect.
- [ ] Include timestamps.
- [ ] Include revision numbers.
- [ ] Avoid replaying expired events.

## Verification

- [ ] Five simulated TVs connect.
- [ ] One override affects one TV.
- [ ] Other TVs remain unchanged.
- [ ] Remote sees state updates.
- [ ] Dead connections are removed.
- [ ] Reconnection receives current state.

Recommended commit:

```text
feat: add realtime dashboard and TV state broadcasting
```

---

# 15. Phase 13 — Dashboard Foundation

## Workspace

- [ ] Create dashboard Vite application.
- [ ] Add React.
- [ ] Add Framer Motion.
- [ ] Avoid a large chart library.
- [ ] Add test setup.
- [ ] Configure production build.

## Routing and Startup

- [ ] Support `/display/:tvId`.
- [ ] Parse TV ID.
- [ ] Validate TV through API.
- [ ] Fetch initial dashboard payload.
- [ ] Fetch current TV state.
- [ ] Open WebSocket.
- [ ] Handle reconnect.
- [ ] Preserve cached visible data.

## Shell

- [ ] Add GRmetro logo.
- [ ] Add application title.
- [ ] Add exactly five navigation tabs.
- [ ] Add animated underline.
- [ ] Add current time.
- [ ] Add updated counter.
- [ ] Add live-status dot.
- [ ] Add safe-area margins.
- [ ] Add optional QR badge.
- [ ] Keep shell mounted during slide changes.

## Rotation

- [ ] Read backend rotation epoch.
- [ ] Use fixed slide durations.
- [ ] Calculate current slide by timestamp.
- [ ] Synchronize multiple TVs.
- [ ] Pause visually during remote override.
- [ ] Return to current global slide after override.
- [ ] Recover after browser suspension.
- [ ] Avoid timer drift.

## States

- [ ] Add branded loading state.
- [ ] Add invalid TV state.
- [ ] Add no-cache state.
- [ ] Add reconnecting state.
- [ ] Add stale-data warning.
- [ ] Add authentication-required warning.

Recommended commits:

```text
feat: build GRmetro dashboard shell
feat: add synchronized five-slide rotation
```

---

# 16. Phase 14 — SVG Metric Slide Engine

## Generic Components

- [ ] Create `SlideEngine`.
- [ ] Create reusable `MetricSlide`.
- [ ] Create `OverlayBarChart`.
- [ ] Create `TechnicianRow`.
- [ ] Create `AnimatedAxis`.
- [ ] Create `AnimatedNumber`.
- [ ] Create `GoalSummary`.
- [ ] Create `RankBadge`.
- [ ] Create `MetricLegend`.
- [ ] Create achievement banner.
- [ ] Use stable animation keys.

## Revenue

- [ ] Render Revenue.
- [ ] Render Service Revenue.
- [ ] Render Install Revenue.
- [ ] Use overlaid transparent bars.
- [ ] Sort by Revenue.
- [ ] Show goals and ranks.
- [ ] Use gold, blue, and green.

## Activity

- [ ] Render Billable Service Calls.
- [ ] Render Opportunities.
- [ ] Render Tech Leads.
- [ ] Render Marketed Leads.
- [ ] Render Installs.
- [ ] Use shared count axis.
- [ ] Sort by Billable Service Calls.
- [ ] Preserve readability with five overlays.

## Performance

- [ ] Render Lead Conversion %.
- [ ] Render Closing %.
- [ ] Use fixed 0–100% axis.
- [ ] Sort by Closing %.
- [ ] Clamp visual width above 100%.
- [ ] Preserve actual numeric label.

## Average Ticket

- [ ] Render Install Average Ticket.
- [ ] Show Install Revenue.
- [ ] Show Number of Installs.
- [ ] Sort by Install Average Ticket.
- [ ] Display no-data when no installs exist.

## Animation

- [ ] Morph title.
- [ ] Morph legend.
- [ ] Morph colors.
- [ ] Resize bars.
- [ ] Rescale axis.
- [ ] Reorder rows.
- [ ] Count numbers.
- [ ] Keep card shell stationary.
- [ ] Avoid full-screen slide transitions.
- [ ] Add reduced-motion support.

## Verification

- [ ] Five rows fit at 1080p.
- [ ] Overlay bars are distinguishable.
- [ ] No Top 3 strip appears.
- [ ] Zero and no-data differ.
- [ ] Axis never jumps abruptly.
- [ ] Screenshot tests pass.

Recommended commits:

```text
feat: implement reusable SVG metric slide engine
feat: add four KPI slide configurations
```

---

# 17. Phase 15 — Dedicated Top 3 Slide

## Layout

- [ ] Create full-screen Top 3 content view.
- [ ] Arrange visual order second, first, third.
- [ ] Make first card larger.
- [ ] Add gold first-place accent.
- [ ] Add silver second-place accent.
- [ ] Add bronze third-place accent.
- [ ] Add neutral placeholder for insufficient data.

## Card Content

- [ ] Show technician name.
- [ ] Show rank.
- [ ] Show Revenue.
- [ ] Show Billable Service Calls.
- [ ] Show Closing %.
- [ ] Show Lead Conversion %.
- [ ] Show Installs.
- [ ] Show Install Average Ticket.
- [ ] Limit to six supporting metrics if layout requires.

## Effects

- [ ] Add subtle first-place glow.
- [ ] Add restrained crown mark.
- [ ] Add subtle sparkle.
- [ ] Disable sparkle under reduced motion.
- [ ] Ensure effects never obscure text.

## Transitions

- [ ] Add entrance sequence.
- [ ] Add value animation.
- [ ] Add exit sequence.
- [ ] Avoid blank frame.
- [ ] Return to synchronized next slide.

## Verification

- [ ] Top 3 appears only as dedicated slide.
- [ ] No KPI chart appears on Top 3.
- [ ] Exactly three qualified cards appear when possible.
- [ ] Screenshot receives stakeholder approval.

Recommended commit:

```text
feat: add dedicated animated Top 3 slide
```

---

# 18. Phase 16 — Celebration and Event Engine

- [x] Add a reusable backend-owned event generator and bounded priority queue.
- [x] Consume only existing achievement records and backend-prepared Critical insights.
- [x] Support Critical, Celebration, and Information priorities.
- [x] Deduplicate active and queued events and enforce a configurable cooldown.
- [x] Configure display duration, queue capacity, and bounded deduplication memory.
- [x] Expire events and advance the queue automatically.
- [x] Synchronize one active event to every display and remote through the presentation platform.
- [x] Hydrate reconnecting clients with an active event.
- [x] Pause rotation without changing the slide and resume after the event queue clears.
- [x] Add an accessible, reduced-motion-aware light-theme overlay with restrained entrance and exit.
- [x] Prevent remotes from manually dismissing events while reflecting active event state.
- [x] Test generation, ordering, deduplication, cooldown, expiration, queue bounds, synchronization,
  reconnect hydration, automatic dismissal, and rotation pause/resume.

Progress note (2026-08-12): Phase 16 is complete. The process-local Event Engine translates existing
goal-reached, new-leader, entered-Top-3, and backend Critical-insight records into prioritized events.
It owns one active event, a deterministic bounded queue, bounded cooldown history, and expiration.
The Presentation Manager pauses synchronized display timers while the shared event is active and resumes
each display on the same slide afterward. Displays render the accessible overlay; remotes report its
state without a dismiss control. New milestones and performance thresholds remain deferred until
authoritative backend facts exist.

---

# 18A. Deferred Remote Display Views

## Technician Scorecard

- [ ] Create full-screen technician-only scorecard.
- [ ] Show eleven approved KPIs.
- [ ] Show overall rank.
- [ ] Use readable metric cards.
- [ ] Do not turn scorecard into a tiny spreadsheet.
- [ ] Include goals where configured.

## KPI-only View

- [ ] Reuse parent metric slide.
- [ ] Highlight selected KPI.
- [ ] Sort by selected KPI.
- [ ] Deemphasize related overlays when needed.
- [ ] Show selected KPI rank and goal.

## Technician-plus-KPI View

- [ ] Show technician name.
- [ ] Show selected KPI prominently.
- [ ] Show goal.
- [ ] Show percent complete.
- [ ] Show rank.
- [ ] Add highlighted team-comparison chart.
- [ ] Show relevant supporting values.

## Return Mode

- [ ] Show Returning to Live Dashboard status.
- [ ] Morph to current synchronized live slide.
- [ ] Remove status after transition.
- [ ] Do not restart rotation at Revenue unless globally current.

Recommended commit:

```text
feat: add technician and KPI remote display views
```

---

# 19. Phase 17 — Mobile Remote Application

## Workspace

- [ ] Create remote Vite application.
- [ ] Add React.
- [ ] Add shared visual tokens.
- [ ] Configure production build.
- [ ] Add test setup.

## URL Handling

- [ ] Support `/remote`.
- [ ] Parse `?tv=<id>`.
- [ ] Skip TV selection when valid TV is supplied.
- [ ] Show clear error for invalid query TV.
- [ ] Support general TV-selection mode.

## TV Selection

- [ ] Show every configured TV.
- [ ] Show current state.
- [ ] Show connected/live status.
- [ ] Use touch-friendly cards.

## Control Panel

- [ ] Show selected TV name.
- [ ] Show current display state.
- [ ] Add independent technician picker.
- [ ] Add independent KPI picker.
- [ ] Add clear-selection controls.
- [ ] Disable Apply when both are empty.
- [ ] Add Apply button with TV name.
- [ ] Add Resume Live Rotation button.
- [ ] Add override countdown.

## Commands

- [ ] Submit technician-only override.
- [ ] Submit KPI-only override.
- [ ] Submit technician-plus-KPI override.
- [ ] Show immediate confirmation.
- [ ] Reset timer after another command.
- [ ] Reflect another remote user's update.
- [ ] Continue REST operation if WebSocket is temporarily unavailable.

## Accessibility

- [ ] Minimum 44×44 touch targets.
- [ ] Add screen-reader labels.
- [ ] Add visible focus.
- [ ] Support keyboard navigation.
- [ ] Support reduced motion.
- [ ] Test iPhone Safari.
- [ ] Test Android Chrome.
- [ ] Test Edge mobile.

Recommended commits:

```text
feat: build mobile QR remote
feat: add override countdown and live TV state
```

---

# 20. Phase 18 — QR-Code Generation

- [ ] Create `scripts/generate-qr-codes.js`.
- [ ] Read TVs from shared configuration.
- [ ] Accept configurable base URL.
- [ ] Generate one PNG per TV.
- [ ] Generate optional SVG versions.
- [ ] Add printable TV labels.
- [ ] Reject localhost base URL for production generation.
- [ ] Test codes on iPhone.
- [ ] Test codes on Android.
- [ ] Commit generated non-sensitive assets when appropriate.

Recommended commit:

```text
feat: generate television-specific QR codes
```

---

# 21. Phase 19 — Production Serving

- [ ] Build dashboard static assets.
- [ ] Build remote static assets.
- [ ] Serve dashboard from Express.
- [ ] Serve remote from Express.
- [ ] Support `/display/:tvId`.
- [ ] Support `/remote`.
- [ ] Preserve `/api/v1/*`.
- [ ] Preserve `/ws`.
- [ ] Add production fallback routing.
- [ ] Confirm same-origin operation.
- [ ] Disable development routes.
- [ ] Disable mock mode.
- [ ] Hide source maps if appropriate.

Recommended commit:

```text
feat: serve dashboard and remote from production backend
```

---

# 22. Phase 20 — Windows Deployment

## Scripts

- [ ] Create Edge startup script.
- [ ] Create backend startup script.
- [ ] Create kiosk browser template.
- [ ] Add Edge path detection or clear instructions.
- [ ] Avoid duplicate debug Edge instances.
- [ ] Use dedicated Edge profile.
- [ ] Create logs directory automatically.

## Windows Startup

- [ ] Document Edge Task Scheduler task.
- [ ] Document backend Task Scheduler task.
- [ ] Configure delayed startup.
- [ ] Configure restart on failure.
- [ ] Test after Windows reboot.

## Network

- [ ] Assign backend DHCP reservation or static IP.
- [ ] Add Windows Firewall rule.
- [ ] Test health route from another office device.
- [ ] Test remote from phone.
- [ ] Test each display URL.
- [ ] Generate production QR codes.

## Kiosk

- [ ] Inventory each TV.
- [ ] Test built-in browsers.
- [ ] Inventory reusable laptops and mini PCs.
- [ ] Assign browser-capable device to every TV.
- [ ] Configure unique kiosk URL.
- [ ] Disable sleep.
- [ ] Test auto-start.
- [ ] Test network recovery.

Recommended commits:

```text
feat: add Windows deployment and kiosk scripts
docs: add office deployment guide
```

---

# 23. Phase 21 — Documentation Completion

- [ ] Finalize `README.md`.
- [ ] Finalize `AGENTS.md`.
- [ ] Confirm `PROJECT_SPEC.md` is complete.
- [ ] Confirm `UI_SPEC.md` is complete.
- [ ] Confirm `SERVICETITAN.md` matches implementation.
- [ ] Update `TASKS.md`.
- [ ] Add screenshots.
- [ ] Add quick-start instructions.
- [ ] Add Edge login instructions.
- [ ] Add troubleshooting links.
- [ ] Add maintenance guide.
- [ ] Add version information.
- [ ] Add known limitations.
- [ ] Document final TV room IDs.
- [ ] Document final job classification.
- [ ] Document final KPI goals and weights.

Recommended commit:

```text
docs: complete Version 1.0 operating documentation
```

---

# 24. Phase 22 — Automated Testing

## Backend

- [ ] Normalizer tests.
- [ ] Percentage-conversion tests.
- [ ] Goal-engine tests.
- [ ] Ranking tests.
- [ ] Overall-score tests.
- [ ] Axis tests.
- [ ] Job-classification tests.
- [ ] Install-average-ticket tests.
- [ ] TV-manager tests.
- [ ] Expiration tests.
- [ ] Cache tests.
- [ ] Scheduler tests.
- [ ] Request-builder tests.
- [ ] HTML-response rejection tests.
- [ ] API route tests.
- [ ] Security response tests.

## WebSocket

- [ ] Connection validation tests.
- [ ] Initial-state tests.
- [ ] Dashboard-broadcast tests.
- [ ] TV-routing tests.
- [ ] Remote-client tests.
- [ ] Heartbeat tests.
- [ ] Reconnect tests.

## Dashboard

- [ ] Header tests.
- [ ] Five-tab tests.
- [ ] Rotation tests.
- [ ] Metric-slide tests.
- [ ] Overlay-bar tests.
- [ ] No-data tests.
- [ ] Top 3 tests.
- [ ] Remote-view tests.
- [ ] Reconnection-state tests.
- [ ] Reduced-motion tests.

## Remote

- [ ] Query-string TV tests.
- [ ] General TV-selection tests.
- [ ] Independent selector tests.
- [ ] Apply validation tests.
- [ ] Countdown tests.
- [ ] Resume tests.
- [ ] Multi-user update tests.
- [ ] Mobile accessibility tests.

## End-to-End

- [ ] Live rotation scenario.
- [ ] Technician override scenario.
- [ ] KPI override scenario.
- [ ] Technician-plus-KPI scenario.
- [ ] Timer expiration scenario.
- [ ] Partial refresh failure scenario.
- [ ] Authentication-required scenario.
- [ ] Backend restart scenario.
- [ ] Five-TV concurrency scenario.
- [ ] Remote multi-client scenario.

Recommended commit:

```text
test: add Version 1.0 automated verification suite
```

---

# 25. Phase 23 — Visual and Performance Testing

## Screenshots

- [ ] Revenue at 1080p.
- [ ] Activity at 1080p.
- [ ] Performance at 1080p.
- [ ] Average Ticket at 1080p.
- [ ] Top 3 at 1080p.
- [ ] Technician scorecard at 1080p.
- [ ] Technician KPI detail at 1080p.
- [ ] Remote on mobile.
- [ ] No-data state.
- [ ] Stale-data state.
- [ ] Reconnecting state.
- [ ] Invalid TV state.
- [ ] 720p key slides.
- [ ] 4K key slides.

## Performance

- [ ] Initial render under target.
- [ ] REST response times acceptable.
- [ ] WebSocket update latency acceptable.
- [ ] Refresh finishes within interval.
- [ ] Five simultaneous displays remain responsive.
- [ ] Animation remains smooth.
- [ ] No sustained memory growth.
- [ ] Eight-hour stability test.
- [ ] Preferably complete a 24-hour test.
- [ ] Test each intended smart-TV browser.

Recommended commits:

```text
test: add visual regression coverage
perf: validate long-running dashboard stability
```

---

# 26. Phase 24 — Business and User Acceptance

## Business Validation

- [ ] Confirm technician list.
- [ ] Confirm final TV room names.
- [ ] Confirm business units.
- [ ] Confirm Lead Conversion definition.
- [ ] Confirm Billable Service Calls definition.
- [ ] Confirm Service Revenue definition.
- [ ] Confirm Install Revenue definition.
- [ ] Confirm Number of Installs definition.
- [ ] Confirm Install Average Ticket formula.
- [ ] Confirm KPI goals.
- [ ] Confirm overall Top 3 weights.
- [ ] Confirm fairness of overall ranking.

## User Acceptance

- [ ] Manager review.
- [ ] Office-staff review.
- [ ] Technician review.
- [ ] Readability test from twenty feet.
- [ ] QR scan test in each room.
- [ ] Correct-TV control test.
- [ ] Two-minute timeout review.
- [ ] Top 3 visual review.
- [ ] Healthy-competition tone review.
- [ ] Record feedback.
- [ ] Resolve release-blocking feedback.

---

# 27. Phase 25 — Security and Production Review

- [ ] `.env` is untracked.
- [ ] No password in repository.
- [ ] No cookies in repository.
- [ ] No CSRF token in repository.
- [ ] No raw private ServiceTitan data in fixtures.
- [ ] Development routes disabled.
- [ ] Mock mode disabled.
- [ ] Production errors hide stack traces.
- [ ] Rate limiting enabled.
- [ ] Firewall limited to private network.
- [ ] Backend not publicly exposed.
- [ ] Dependency audit reviewed.
- [ ] Logs redact sensitive values.
- [ ] QR codes use production local URL.
- [ ] Health route exposes no secrets.

---

# 28. Phase 26 — Version 1.0 Release

## Final Build

- [ ] Clean install succeeds.
- [ ] Tests pass.
- [ ] Production build succeeds.
- [ ] Backend starts.
- [ ] First live refresh succeeds.
- [ ] All five technicians load.
- [ ] All five displays connect.
- [ ] Remote commands work.
- [ ] Overrides expire.
- [ ] Displays recover after restart.
- [ ] Documentation matches deployment.

## Release

- [ ] Resolve all release-blocking defects.
- [ ] Update version to `1.0.0`.
- [ ] Create release notes.
- [ ] Tag:

```text
v1.0.0
```

- [ ] Preserve previous working commit.
- [ ] Back up production `.env`.
- [ ] Back up final configuration.
- [ ] Record installation path.
- [ ] Record backend IP address.
- [ ] Record Edge profile path.
- [ ] Record Task Scheduler configuration.
- [ ] Record final display URLs.

Recommended commits:

```text
chore: prepare Version 1.0 release
```

Release tag:

```text
v1.0.0
```

---

# 29. Current Known Blockers

The following decisions remain unresolved and must be completed before production release.

## Blocker 1 — Lead Conversion %

Required decision:

```text
Which ServiceTitan field represents GRmetro's intended Lead Conversion %?
```

Candidates:

```text
LeadConversionRate
OpportunityConversionRate
ReplacementLeadConversionRate
CloseRateFromTgl
```

Status:

```text
[!] Blocked pending business confirmation
```

---

## Blocker 2 — Billable Service Calls

Required:

- Job drilldown response
- Included service job types
- Excluded job types
- Billable definition

Status:

```text
[!] Blocked pending drilldown validation
```

---

## Blocker 3 — Service Revenue

Required:

- Validated service classification
- Correct revenue field per job

Status:

```text
[!] Blocked pending drilldown validation
```

---

## Blocker 4 — Install Revenue

Required decision:

```text
Completed install revenue, sold revenue, or another measure?
```

Status:

```text
[!] Blocked pending business confirmation and drilldown validation
```

---

## Blocker 5 — Number of Installs

Current proposed definition:

```text
Completed installation jobs
```

Status:

```text
[!] Blocked pending management approval
```

---

## Blocker 6 — Goals

Final goal values have not been supplied.

Status:

```text
[!] Blocked pending management configuration
```

---

## Blocker 7 — TV Room Names and Hardware

Required:

- Final room names
- Final TV IDs
- Browser capability for each display
- Device assignment per TV

Status:

```text
[!] Blocked pending office hardware inventory
```

---

# 30. Codex Progress Notes

## 2026-08-11 — KPI engine planning audit

Added `docs/KPI_CATALOG.md` as a documentation-only trace of ServiceTitan responses through normalization, derivation, refresh, cache, and the dashboard API. The audit records 58 business source fields (59 including the technician join key), every field family emitted to the dashboard, 45 KPI concepts supported by present data, and 24 important missing HVAC KPI concepts. It separates technically available inputs from approved business mappings and leaves goals, Lead Conversion, and service/install classifications explicitly unresolved. The document proposes an incremental backend-owned KPI registry/calculator architecture and maps only approved concepts to the existing five-slide sequence. No runtime, endpoint, ServiceTitan request, business-logic, or frontend behavior changed.

Codex shall add brief dated notes here when important blockers or decisions occur.

Template:

```markdown
## YYYY-MM-DD — Short Title

Work completed:

Files changed:

Tests run:

Blockers:

Next task:
```

Do not place long debugging transcripts in this file.

---

## 2026-08-11 — Business-question dashboard redesign

- Audited all five presentation slides and documented the KPI strategy in `docs/DASHBOARD_CONTENT_AUDIT.md`.
- Reframed the presentation around pace, performance, revenue source, Top 3 recognition, and management attention.
- Removed duplicated charts and implementation-health cards without adding endpoints or frontend business calculations.
- Preserved unresolved mappings as unavailable and documented future HVAC KPI opportunities separately.

## 2026-08-11 — KPI business-domain dashboard redesign

- Confirmed that `docs/KPI_CATALOG.md` already existed and used it as the authoritative presentation inventory.
- Reorganized the five existing views into Revenue, Sales, Technicians, Operations, and Recognition without changing backend data, calculations, API endpoints, or ServiceTitan integration.
- Applied the catalog's tier hierarchy: Tier 1 dominates, Tier 2 supports, Tier 3 remains selective/detail-only, and Tier 4 is excluded.
- Preserved automatic rotation, stationary transitions, animation, the light theme, unavailable-data semantics, and the dedicated Top 3 podium.
- Recorded remaining validation-dependent KPI opportunities in `docs/DASHBOARD_CONTENT_AUDIT.md`.

## 2026-08-11 — Management Intelligence presentation layer

- Added a reusable, presentation-only insight selector using existing refresh, data-quality, goal-achievement, and rank-movement fields.
- Added a compact stationary banner that shows at most two Critical, Warning, or Informational items without changing the five-slide rotation.
- Documented every condition and explicitly deferred pace, benchmark, near-goal, risk, and leader-gap insights until the backend provides approved values or classifications.

## 2026-08-12 — Phase 13 Historical Metrics and Snapshot Engine

- [x] Create immutable, timestamped, schema-versioned dashboard snapshots after successful refreshes.
- [x] Add a configurable bounded in-memory rolling snapshot store.
- [x] Add reusable presentation-neutral value, ranking, overall movement, and goal-progress comparisons.
- [x] Extend the existing dashboard response with backwards-compatible `historicalComparison` data.
- [x] Handle first snapshot, missing/unavailable KPI data, valid zeroes, new technicians, stale partial-refresh records, and failed refreshes.
- [x] Document lifecycle, retention, API shape, limitations, and future persistence/trend extension points.
- [x] Add comprehensive backend snapshot, retention, comparison, movement, and edge-case tests.

No ServiceTitan request, endpoint mapping, normalization, KPI calculation, slide, route, or frontend presentation behavior changed. History remains intentionally process-local and count-bounded; persistence and time-window aggregation are future work.

## 2026-08-12 — Phase 13 Trend Analysis Engine

- [x] Add a reusable trend engine over ordered snapshots and adjacent comparison results.
- [x] Add configurable minimum history and consistency-based noise suppression.
- [x] Analyze KPI values, KPI ranks, goal progress, overall ranks, momentum, consistency, and streaks.
- [x] Preserve unknown states for insufficient, unavailable, or stale history and roster changes.
- [x] Extend `GET /api/v1/dashboard` backwards-compatibly with `historicalTrends` and no new endpoint.
- [x] Document the algorithm, configuration, labels, API contract, and future extensions.
- [x] Cover increasing, decreasing, stable, noisy, missing, partial, addition, removal, and edge cases.

No ServiceTitan integration, normalization, KPI calculation, endpoint mapping, slide, or layout changed. Small trend indicators remain an optional future presentation consumer.

## 2026-08-12 — Phase 14 Historical Intelligence Presentation

- [x] Add reusable trend indicator, trend badge, compact comparison, and dependency-free SVG sparkline presentation components.
- [x] Present backend comparison deltas and trend labels in Revenue, Sales, Operations, and technician standing without frontend trend calculations.
- [x] Present backend streak counts only when consecutive movement is available and meaningful.
- [x] Preserve explicit `Unknown` states while gracefully omitting absent comparison and trend history.
- [x] Prefer backend-provided management insights when the existing dashboard response includes them.
- [x] Add presentation coverage for trend labels, comparison formats, unknown values, missing history, and sparklines.

The backend response does not currently expose historical numeric series, so Revenue, Closing %, and Goal Progress sparklines are gracefully omitted. The reusable SVG primitive is ready for those three placements when the existing response supplies sufficient points; the frontend does not reconstruct a series from trend summaries. No slide, route, ServiceTitan request, backend calculation, normalization rule, endpoint, or dependency changed.

## 2026-08-12 — Phase 15 Local Display Command Architecture

- [x] Add a transport-independent presentation command contract and command bus.
- [x] Support Next, Previous, Go To Slide, Pause, Resume, and Restart Timer commands.
- [x] Add an in-memory Display Manager with isolated slide, timer, paused state, and presentation profile per display.
- [x] Route `/display/:displayId` through the targeted local display controller.
- [x] Improve `/remote` with immediate display selection, targeted status, and the complete command set.
- [x] Preserve the light theme, mobile touch sizing, keyboard focus, and reduced-motion behavior.
- [x] Test dispatch, target changes, wrapping, pause/resume, timer restart, command validation, and isolation.

## 2026-08-12 — Phase 15 Real-Time Multi-Device Synchronization

- [x] Move presentation-only state and every 30-second rotation timer to an in-memory backend Presentation Manager.
- [x] Reuse the existing transport-neutral presentation command contract through a backend command bus.
- [x] Add validated `/ws/presentation` display and remote subscriptions with targeted state broadcasts.
- [x] Hydrate displays and remotes immediately from authoritative state and reconnect automatically with bounded backoff.
- [x] Make `/remote` a live multi-device controller whose selected-display state reflects changes from other remotes.
- [x] Remove independent browser slide advancement while preserving all five existing slides and their presentation behavior.
- [x] Centralize display profiles and command identifiers in shared configuration.
- [x] Cover multiple displays, multiple remotes, target isolation, commands, backend rotation, validation, reconnect hydration, and restart defaults.

Remaining Phase 15 work is operational validation on the final office network and approved display hardware, including the documented long-running stability and multi-TV acceptance runs. Final room/hardware approval remains an existing business blocker.

# 31. Final Completion Criteria

All work is complete only when:

- [ ] Every release checklist item is complete.
- [ ] All known blockers are resolved.
- [ ] Exactly five live slides exist.
- [ ] Top 3 exists only as its dedicated slide.
- [ ] Five configured technicians refresh.
- [ ] All approved KPIs are confirmed or validated derivations.
- [ ] Five TVs maintain independent state.
- [ ] QR remote controls the correct TV.
- [ ] Technician and KPI selection are independent.
- [ ] Overrides expire after two minutes.
- [ ] ServiceTitan refresh occurs every sixty seconds.
- [ ] No credentials are stored.
- [ ] The office deployment recovers from routine failures.
- [ ] Management approves KPI meanings and rankings.
- [ ] Version `v1.0.0` is tagged.

---

# End of TASKS.md

The next root document is:

```text
AGENTS.md
```

It shall provide concise, binding instructions that Codex reads before making repository changes.
