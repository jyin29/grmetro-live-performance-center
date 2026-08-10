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

Recommended commits:

```text
feat: implement native ServiceTitan API client
feat: add resilient five-technician refresh pipeline
```

---

# 12. Phase 10 — Service and Install Derivations

## Drilldown Research

- [ ] Capture sanitized normal service record.
- [ ] Capture sanitized installation record.
- [ ] Capture sanitized recall record.
- [ ] Capture sanitized warranty record.
- [ ] Capture sanitized no-charge record.
- [ ] Capture sanitized canceled record.
- [ ] Identify job type IDs.
- [ ] Identify revenue field.
- [ ] Identify status field.
- [ ] Identify recall/warranty flags.
- [ ] Document `KpiType` meaning.
- [x] Add development-only network research observer for Technician Scorecard drilldowns.
- [x] Add sanitized start, stop, results, and clear research routes.
- [x] Add privacy and lifecycle tests for research observer results.
- [x] Update `docs/SERVICETITAN.md`.

## Classification

- [ ] Populate service job-type configuration.
- [ ] Populate install job-type configuration.
- [ ] Configure exclusions.
- [x] Log/count ambiguous records in derivation results.
- [x] Exclude unclassified records from confirmed totals.

## Derived KPIs

- [x] Derive Billable Service Calls.
- [x] Derive Service Revenue.
- [x] Derive Install Revenue.
- [x] Derive Number of Installs.
- [x] Derive Install Average Ticket.
- [x] Return no-data when install denominator is zero.
- [x] Mark derived data quality.
- [x] Add calculation tests.

## Business Validation

- [ ] Review calculations with GRmetro management.
- [ ] Confirm definition of completed install.
- [ ] Confirm service-call exclusions.
- [ ] Confirm install revenue basis.
- [ ] Confirm billable definition.
- [ ] Approve production classification.

This phase is release-blocking.


Progress note (2026-08-04): Phase 10 implementation scaffolding is complete. Added a development-only sanitized drilldown route, strict allow-list sanitizer, pure configuration-driven job classifier, and pure derivation functions for the five service/install KPIs. Production classification remains disabled with `classificationApproved: false`; normal live refresh does not yet fetch drilldown records, and live service/install KPIs remain unavailable until GRmetro reviews sanitized records and approves job classification. Follow-up correction (2026-08-04): tightened completed-status and drilldown-date validation, preserved missing monetary values as missing instead of zero, and made derived KPI metadata track each KPI's own required-field completeness. Production classification remains disabled.

Progress note (2026-08-04): Added a development-only network research observer for manually clicked ServiceTitan Technician Scorecard drilldowns. The observer is gated behind development routes, attaches idempotently, retains at most 100 sanitized schema-only events, excludes raw records and private values, and is documented with exact PowerShell start/stop/save commands. Production derivations remain disabled and Phase 11 has not started.

Progress note (2026-08-10): Fixed the research observer without beginning Phase 11. The original `attached` diagnostic only confirmed Playwright Page listeners and did not verify interception in the fetch/XHR execution context. The development observer now patches and verifies fetch/XHR in every current and newly navigated frame, captures the Technician Overview request as URL-only metadata, filters FullStory/unrelated analytics, reports safe interception diagnostics, restores native functions on stop/shutdown, and fails start when verification fails.

Recommended commit:

```text
feat: derive validated service and installation KPIs
```

---

# 13. Phase 11 — Lead Conversion Definition

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

# 14. Phase 12 — WebSocket Realtime Layer

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

# 18. Phase 16 — Remote Display Views

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
