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

- [ ] Confirm the GitHub repository is private.
- [ ] Clone the repository locally.
- [ ] Create the root folder structure:

```text
apps/
shared/
assets/
docs/
scripts/
```

- [ ] Create the three application folders:

```text
apps/backend/
apps/dashboard/
apps/remote/
```

- [ ] Add the approved GRmetro logo to:

```text
assets/grmetro-logo.png
```

- [ ] Add the approved dashboard reference image to:

```text
assets/references/dashboard-reference.png
```

## Root Configuration

- [ ] Create root `package.json`.
- [ ] Configure npm workspaces.
- [ ] Add root `npm run dev`.
- [ ] Add root `npm run build`.
- [ ] Add root `npm test`.
- [ ] Add root `npm start`.
- [ ] Add root QR-generation command.
- [ ] Create `.gitignore`.
- [ ] Create `.env.example`.
- [ ] Create `.nvmrc` or `.node-version`.
- [ ] Create `README.md`.
- [ ] Create `AGENTS.md`.
- [ ] Confirm no secrets are committed.

## Verification

- [ ] `npm install` succeeds.
- [ ] Workspace commands resolve.
- [ ] Repository structure matches the specification.
- [ ] Project builds without undeclared global dependencies.

Recommended commit:

```text
chore: initialize repository and workspace structure
```

---

# 3. Phase 1 — Shared Configuration

## Technicians

- [ ] Create `shared/technicians.js`.
- [ ] Add Julio Torres with ID `134926818`.
- [ ] Add Shamon Ward with ID `3841`.
- [ ] Add Charlie E with ID `3853`.
- [ ] Add Alex K with ID `133469538`.
- [ ] Add Dwight with ID `127491426`.
- [ ] Add short names and initials.
- [ ] Validate unique technician IDs.

## KPIs

- [ ] Create `shared/kpis.js`.
- [ ] Define stable ID `revenue`.
- [ ] Define stable ID `billableServiceCalls`.
- [ ] Define stable ID `serviceRevenue`.
- [ ] Define stable ID `opportunities`.
- [ ] Define stable ID `leadConversionRate`.
- [ ] Define stable ID `techLeads`.
- [ ] Define stable ID `marketedLeads`.
- [ ] Define stable ID `closingRate`.
- [ ] Define stable ID `installs`.
- [ ] Define stable ID `installAverageTicket`.
- [ ] Define stable ID `installRevenue`.
- [ ] Add labels.
- [ ] Add number formats.
- [ ] Add colors.
- [ ] Add goal support.
- [ ] Add higher-is-better configuration.

## Slides

- [ ] Create `shared/slides.js`.
- [ ] Add Revenue slide.
- [ ] Add Activity slide.
- [ ] Add Performance slide.
- [ ] Add Average Ticket slide.
- [ ] Add Top 3 slide.
- [ ] Confirm there are exactly five live slides.
- [ ] Set default KPI-slide duration to 15 seconds.
- [ ] Set Top 3 duration to 25 seconds.
- [ ] Confirm slide order is fixed.

## Televisions

- [ ] Create `shared/televisions.js`.
- [ ] Add initial placeholder TV room names.
- [ ] Ensure every TV ID is lowercase and URL-safe.
- [ ] Validate unique TV IDs.
- [ ] Replace placeholders when final rooms are confirmed.

## Goals

- [ ] Create `shared/goals.js`.
- [ ] Add company-wide default goal structure.
- [ ] Add technician-specific overrides.
- [ ] Use `null` for unconfigured goals.
- [ ] Do not invent final management goals.
- [ ] Add validation for unknown KPI goal IDs.

## Job Classification

- [ ] Create `shared/jobClassifications.js`.
- [ ] Add service classification structure.
- [ ] Add installation classification structure.
- [ ] Support IDs and name patterns.
- [ ] Leave unverified job-type lists empty.
- [ ] Mark classification setup as production-blocking.

## Shared Constants and Validation

- [ ] Create `shared/constants.js`.
- [ ] Define TV modes.
- [ ] Define WebSocket event names.
- [ ] Define default slide.
- [ ] Define client types.
- [ ] Create `shared/validation.js`.
- [ ] Validate TV IDs.
- [ ] Validate technician IDs.
- [ ] Validate KPI IDs.
- [ ] Validate slide IDs.
- [ ] Validate remote selection combinations.

## Verification

- [ ] Exactly five technicians are configured.
- [ ] Exactly eleven approved KPI IDs exist.
- [ ] Exactly five live slides exist.
- [ ] Shared validation tests pass.
- [ ] No business calculations exist in shared UI configuration.

Recommended commit:

```text
feat: add shared technician KPI slide and TV configuration
```

---

# 4. Phase 2 — Mock Data Mode

## Fixtures

- [ ] Create backend fixture directory.
- [ ] Add normal successful technician data.
- [ ] Add zero-value technician data.
- [ ] Add missing-data fixture.
- [ ] Add no-install fixture.
- [ ] Add partial-failure fixture.
- [ ] Add stale-data fixture.
- [ ] Add ranking-change fixture.
- [ ] Add new-leader fixture.
- [ ] Add goal-reached fixture.
- [ ] Add entered-Top-3 fixture.
- [ ] Sanitize all fixture data.

## Mock Provider

- [ ] Implement explicit `MOCK_MODE`.
- [ ] Implement mock refresh provider.
- [ ] Generate all five technicians.
- [ ] Generate all five slide payloads.
- [ ] Generate deterministic ranks.
- [ ] Generate deterministic goals.
- [ ] Generate deterministic overall Top 3.
- [ ] Support switching fixture scenarios in development.
- [ ] Ensure production never silently enables mock mode.

## Verification

- [ ] Backend can start without Edge in mock mode.
- [ ] Dashboard data route works in mock mode.
- [ ] TV routes work in mock mode.
- [ ] Remote override behavior works in mock mode.
- [ ] Tests do not require live ServiceTitan.

Recommended commit:

```text
feat: add deterministic mock dashboard data mode
```

---

# 5. Phase 3 — Backend Application Core

## Backend Workspace

- [ ] Create `apps/backend/package.json`.
- [ ] Add Express.
- [ ] Add Playwright.
- [ ] Add WebSocket dependency.
- [ ] Add environment loader.
- [ ] Add validation dependency only if justified.
- [ ] Add test runner.
- [ ] Add development restart command.

## Application Entry

- [ ] Create `src/index.js`.
- [ ] Create `src/app.js`.
- [ ] Add graceful shutdown handling.
- [ ] Avoid business logic in entry files.
- [ ] Add startup logs.
- [ ] Add application-version reporting.

## Configuration

- [ ] Create `src/config.js`.
- [ ] Validate `PORT`.
- [ ] Validate `HOST`.
- [ ] Validate `EDGE_DEBUG_URL`.
- [ ] Validate ServiceTitan base URL.
- [ ] Validate time zone.
- [ ] Validate refresh interval.
- [ ] Validate override timeout.
- [ ] Validate stale thresholds.
- [ ] Validate mock-mode configuration.
- [ ] Validate development-route configuration.

## Middleware

- [ ] Add JSON request parsing.
- [ ] Add request-size limit.
- [ ] Add request logging.
- [ ] Add not-found handler.
- [ ] Add standard error handler.
- [ ] Hide stack traces in production.
- [ ] Add rate limiting for remote commands.
- [ ] Configure development CORS.
- [ ] Prefer same-origin production serving.

## Logger

- [ ] Create structured logger.
- [ ] Support debug, info, warn, and error.
- [ ] Add timestamps.
- [ ] Redact secrets.
- [ ] Avoid raw ServiceTitan payload logging.
- [ ] Add log rotation or documented rotation strategy.

Recommended commits:

```text
feat: add backend application and configuration
feat: add backend middleware logging and error handling
```

---

# 6. Phase 4 — Dashboard Cache and Refresh Framework

## Cache

- [ ] Create dashboard-cache module.
- [ ] Store latest successful payload.
- [ ] Store last successful refresh time.
- [ ] Store refresh-start time.
- [ ] Calculate cache age.
- [ ] Support unavailable cache state.
- [ ] Preserve payload after refresh failure.
- [ ] Preserve individual technician data after partial failure.

## Scheduler

- [ ] Create refresh scheduler.
- [ ] Run refresh immediately at startup.
- [ ] Schedule refresh every sixty seconds.
- [ ] Prevent overlapping refreshes.
- [ ] Log skipped overlapping refreshes.
- [ ] Continue scheduling after failure.
- [ ] Stop scheduler during graceful shutdown.
- [ ] Handle midnight date rollover.

## Refresh Provider Interface

- [ ] Define common refresh-provider contract.
- [ ] Implement mock refresh provider.
- [ ] Reserve implementation for live ServiceTitan provider.
- [ ] Return per-technician result objects.
- [ ] Support partial successes.
- [ ] Include refresh diagnostics.

## Verification

- [ ] Immediate startup refresh works.
- [ ] Sixty-second scheduling works.
- [ ] Failed refresh preserves cache.
- [ ] Empty cache returns correct error.
- [ ] Scheduler tests use fake timers.

Recommended commit:

```text
feat: implement dashboard cache and refresh scheduler
```

---

# 7. Phase 5 — TV State Manager

## State Model

- [ ] Create canonical TV state shape.
- [ ] Initialize every TV in live mode.
- [ ] Include revision number.
- [ ] Include selected technician.
- [ ] Include selected KPI.
- [ ] Include selected slide.
- [ ] Include override start time.
- [ ] Include expiration time.
- [ ] Include update time.

## TV Manager

- [ ] Create TV-state map keyed by TV ID.
- [ ] Implement get-all TVs.
- [ ] Implement get-one TV.
- [ ] Implement technician-only override.
- [ ] Implement KPI-only override.
- [ ] Implement technician-plus-KPI override.
- [ ] Implement manual resume.
- [ ] Reset timeout on repeated command.
- [ ] Increment revision on every change.
- [ ] Ensure latest command wins.
- [ ] Ensure other TVs remain unchanged.

## Expiration Monitor

- [ ] Check expirations every second.
- [ ] Change expired TV to returning mode.
- [ ] Broadcast returning state.
- [ ] Wait configured return-transition time.
- [ ] Clear selections.
- [ ] Return TV to live mode.
- [ ] Broadcast live state.
- [ ] Stop monitor on shutdown.

## Verification

- [ ] Empty selection is rejected.
- [ ] Invalid TV is rejected.
- [ ] Invalid technician is rejected.
- [ ] Invalid KPI is rejected.
- [ ] Five TVs can have independent state.
- [ ] Backend restart initializes all TVs to live.
- [ ] Fake-timer tests cover expiration.

Recommended commit:

```text
feat: implement independent TV state and override expiration
```

---

# 8. Phase 6 — REST API

## Health

- [ ] Implement `GET /api/v1/health`.
- [ ] Include backend status.
- [ ] Include browser status.
- [ ] Include ServiceTitan status.
- [ ] Include cache status.
- [ ] Include last successful refresh.
- [ ] Include cache age.
- [ ] Include application version.
- [ ] Exclude secrets.

## Dashboard

- [ ] Implement `GET /api/v1/dashboard`.
- [ ] Return normalized presentation payload.
- [ ] Return cache-unavailable error when necessary.
- [ ] Never return raw ServiceTitan records.

## Televisions

- [ ] Implement `GET /api/v1/tvs`.
- [ ] Implement `GET /api/v1/tvs/:tvId`.
- [ ] Implement `POST /api/v1/tvs/:tvId/override`.
- [ ] Implement `POST /api/v1/tvs/:tvId/resume`.
- [ ] Return stable validation error codes.
- [ ] Include remaining override seconds.

## Development Routes

- [ ] Implement manual refresh route.
- [ ] Implement mock-scenario route if useful.
- [ ] Disable development routes in production.
- [ ] Return `REFRESH_IN_PROGRESS` when appropriate.

## API Tests

- [ ] Test valid responses.
- [ ] Test malformed JSON.
- [ ] Test invalid IDs.
- [ ] Test missing selections.
- [ ] Test unknown fields.
- [ ] Test request-size limit.
- [ ] Test rate limiting.
- [ ] Test no-secret exposure.

Recommended commit:

```text
feat: add dashboard TV and health REST APIs
```

---

# 9. Phase 7 — Business Logic

## Normalizer

- [ ] Create ServiceTitan-to-internal normalizer.
- [ ] Map configured technician names.
- [ ] Map direct confirmed KPIs.
- [ ] Convert ratios to percentages.
- [ ] Preserve zero values.
- [ ] Convert missing values to no-data.
- [ ] Add data-quality status.
- [ ] Remove private fields.
- [ ] Avoid mutating raw input.

## Goal Engine

- [ ] Resolve technician-specific goal override.
- [ ] Fall back to default goal.
- [ ] Calculate percent complete.
- [ ] Calculate remaining amount.
- [ ] Calculate reached state.
- [ ] Allow over-100% progress.
- [ ] Handle null and invalid goals.

## Ranking Engine

- [ ] Rank each KPI.
- [ ] Exclude no-data technicians from ranked positions.
- [ ] Use deterministic tie-breaking.
- [ ] Track previous ranks.
- [ ] Calculate rank changes.
- [ ] Sort slide rows by primary KPI.

## Overall Score

- [ ] Add configurable weights.
- [ ] Validate weight total.
- [ ] Normalize against goals.
- [ ] Cap each KPI at 150%.
- [ ] Redistribute missing-data weights.
- [ ] Enforce minimum valid coverage.
- [ ] Mark insufficient-data technicians.
- [ ] Produce overall ranks.
- [ ] Produce overall Top 3.

## Achievement Events

- [ ] Detect new overall leader.
- [ ] Detect entered Top 3.
- [ ] Detect newly reached goal.
- [ ] Add created and expiration timestamps.
- [ ] Prevent duplicate repeated events.
- [ ] Expire presentation events.

## Axis Calculation

- [ ] Calculate pleasant maximum.
- [ ] Add visual headroom.
- [ ] Generate four to six ticks.
- [ ] Use fixed 100% performance axis.
- [ ] Handle all-zero data.
- [ ] Add compact format metadata.

## Dashboard Builder

- [ ] Build Revenue slide payload.
- [ ] Build Activity slide payload.
- [ ] Build Performance slide payload.
- [ ] Build Average Ticket slide payload.
- [ ] Build dedicated Top 3 payload.
- [ ] Build full technician records.
- [ ] Add rotation epoch.
- [ ] Add status metadata.
- [ ] Add events.
- [ ] Include normalized ratios.

## Verification

- [ ] Business-logic unit tests pass.
- [ ] Missing data never ranks as zero.
- [ ] Exactly five slides are emitted.
- [ ] Top 3 is not embedded in KPI slides.
- [ ] Frontend receives no raw ServiceTitan field names.

Recommended commits:

```text
feat: normalize KPI values and goals
feat: add KPI rankings and overall Top 3 scoring
feat: build presentation-ready dashboard payloads
```

---

# 10. Phase 8 — Edge Browser Manager

## Connection

- [ ] Create persistent CDP browser manager.
- [ ] Connect to `127.0.0.1`.
- [ ] Use configurable debug URL.
- [ ] Reuse one browser connection.
- [ ] Do not launch Edge.
- [ ] Do not close user-launched Edge.
- [ ] Expose browser connection status.

## Page Discovery

- [ ] Prefer Technician Scorecard page.
- [ ] Fall back to authenticated ServiceTitan page.
- [ ] Reject unauthenticated page.
- [ ] Print page URLs only in safe development diagnostics.
- [ ] Produce actionable no-page error.

## Reconnection

- [ ] Detect CDP disconnect.
- [ ] Mark browser unavailable.
- [ ] Preserve cache.
- [ ] Retry with exponential backoff.
- [ ] Rediscover ServiceTitan page.
- [ ] Refresh CSRF state after reconnect.
- [ ] Resume scheduled refreshes.

## Verification

- [ ] Connect to existing Edge.
- [ ] Retry when Edge starts late.
- [ ] Recover after Edge closes and reopens.
- [ ] Never call `browser.close()` on user session.
- [ ] Tests mock CDP behavior.

Recommended commit:

```text
feat: connect to persistent authenticated Edge session
```

---

# 11. Phase 9 — ServiceTitan Client

## Endpoint Registry

- [ ] Centralize Technician Overview endpoint.
- [ ] Centralize Technician Datasource endpoint.
- [ ] Centralize Job Drilldown endpoint.
- [ ] Centralize metadata endpoints.
- [ ] Duplicate no endpoint string elsewhere.

## Field Registry

- [ ] Centralize Technician Datasource field list.
- [ ] Add required confirmed fields.
- [ ] Avoid requesting unnecessary private fields.
- [ ] Document field additions.

## Request Builders

- [ ] Build today's local date.
- [ ] Build Technician Overview payload.
- [ ] Build Technician Datasource payload.
- [ ] Build Job Drilldown payload.
- [ ] Substitute technician ID.
- [ ] Add business-unit IDs.
- [ ] Add time zone.
- [ ] Add reload key.
- [ ] Keep reload-key logic centralized.

## CSRF

- [ ] Implement dynamic token provider.
- [ ] Observe successful ServiceTitan requests when necessary.
- [ ] Cache token only in memory.
- [ ] Refresh after 401.
- [ ] Refresh after 403.
- [ ] Refresh after reconnect.
- [ ] Never log token.

## Request Execution

- [ ] Send POST requests.
- [ ] Include credentials.
- [ ] Include required JSON headers.
- [ ] Include CSRF token.
- [ ] Add timeout.
- [ ] Return status, final URL, content type, and body.
- [ ] Parse JSON only after validation.

## Response Validation

- [ ] Reject `text/html`.
- [ ] Reject app-shell HTML.
- [ ] Reject hash-route redirects.
- [ ] Reject malformed JSON.
- [ ] Classify authentication failures.
- [ ] Classify CSRF failures.
- [ ] Classify timeouts.
- [ ] Include safe diagnostic preview.

## Technician Refresh

- [ ] Refresh all five technicians.
- [ ] Limit concurrency to two or use reliable sequential calls.
- [ ] Merge Overview and Datasource only where needed.
- [ ] Preserve per-technician failures.
- [ ] Record request durations.
- [ ] Avoid frontend-triggered ServiceTitan requests.

## Verification

- [ ] All five technician datasource requests return JSON.
- [ ] No HTML response is accepted.
- [ ] No credentials are stored.
- [ ] No token is committed.
- [ ] Refresh completes within interval.
- [ ] Live integration tests are performed manually.

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
- [ ] Update `docs/SERVICETITAN.md`.

## Classification

- [ ] Populate service job-type configuration.
- [ ] Populate install job-type configuration.
- [ ] Configure exclusions.
- [ ] Log ambiguous records.
- [ ] Exclude unclassified records from confirmed totals.

## Derived KPIs

- [ ] Derive Billable Service Calls.
- [ ] Derive Service Revenue.
- [ ] Derive Install Revenue.
- [ ] Derive Number of Installs.
- [ ] Derive Install Average Ticket.
- [ ] Return no-data when install denominator is zero.
- [ ] Mark derived data quality.
- [ ] Add calculation tests.

## Business Validation

- [ ] Review calculations with GRmetro management.
- [ ] Confirm definition of completed install.
- [ ] Confirm service-call exclusions.
- [ ] Confirm install revenue basis.
- [ ] Confirm billable definition.
- [ ] Approve production classification.

This phase is release-blocking.

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