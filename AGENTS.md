# AGENTS.md
## GRmetro Live Performance Center — Coding Agent Instructions

Version 1.0  
Status: Binding Repository Rules

---

# 1. Purpose

This file contains mandatory instructions for Codex and any future coding agent working in this repository.

Before changing code, read:

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/UI_SPEC.md
docs/SERVICETITAN.md
docs/TASKS.md
```

These files define the approved product, architecture, data mappings, user experience, implementation order, and unresolved business questions.

Do not begin implementation from chat history or assumptions when repository documentation is available.

---

# 2. Source of Truth

The priority order is:

```text
1. Latest explicit user decision
2. docs/PROJECT_SPEC.md
3. docs/SERVICETITAN.md
4. docs/UI_SPEC.md
5. docs/TASKS.md
6. Existing implementation
```

When two requirements conflict:

1. Identify the conflict.
2. Prefer the later and more specific requirement.
3. Do not silently invent a compromise.
4. Ask for approval when business meaning or product behavior would change.
5. Update the affected documentation after approval.

Existing code does not override the specification merely because it already works.

---

# 3. Product Identity

Project:

```text
GRmetro Live Performance Center
```

Company:

```text
GRmetro Heating & Cooling
```

The application is an internal live technician-performance digital-signage product.

It consists of:

```text
Backend
Dashboard
QR Remote
Shared Configuration
```

It is not a general analytics platform or a replacement for ServiceTitan.

---

# 4. Version 1.0 Product Rules

Version 1.0 contains exactly five live slides:

```text
Revenue
Activity
Performance
Average Ticket
Top 3
```

Do not add a sixth live slide.

Do not add hidden experimental live slides.

Remote-only technician or KPI detail views are allowed, but they are not live-rotation slides.

---

# 5. Top 3 Rule

Top 3 is a dedicated full-screen slide.

It must not appear:

- Beneath Revenue
- Beneath Activity
- Beneath Performance
- Beneath Average Ticket
- In a persistent footer
- In a permanent sidebar
- As a small strip on normal KPI slides

The approved live sequence is:

```text
Revenue
Activity
Performance
Average Ticket
Top 3
```

---

# 6. ServiceTitan Integration Rules

Never scrape ServiceTitan HTML.

Never parse visible scorecard cards from the DOM.

Never use OCR or screenshots to collect KPI values.

Never automate UI clicks merely to extract metrics.

Use only ServiceTitan's native JSON requests through the manually authenticated Edge session.

Playwright is used to reuse authentication, not to automate login.

---

# 7. Authentication Rules

Never store:

- ServiceTitan username
- ServiceTitan password
- MFA codes
- Cookies
- Session IDs
- CSRF tokens

Never commit these values.

Never print them in logs.

Never add automatic MFA or bot-detection bypass behavior.

The user manually authenticates in a dedicated Microsoft Edge profile.

---

# 8. Browser Rules

Connect to the user-launched Edge instance through CDP.

Default:

```text
http://127.0.0.1:9223
```

Prefer `127.0.0.1` over `localhost`.

Reuse one persistent browser connection.

Do not launch a separate automated browser in production.

Do not close the user's Edge session during graceful shutdown.

Do not call `browser.close()` on a manually launched browser unless the behavior is explicitly verified as safe and approved.

---

# 9. ServiceTitan Endpoint Rules

Keep endpoint paths in one centralized module.

Do not duplicate endpoint strings throughout the repository.

Known native endpoints are documented in:

```text
docs/SERVICETITAN.md
```

Requests must use the correct:

- Method
- URL
- JSON body
- Dynamic CSRF token
- Authenticated browser context

Reject HTML responses when JSON is expected.

---

# 10. KPI Rules

Version 1.0 uses exactly eleven approved KPI concepts:

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

Do not add unrelated KPIs to the main product without approval.

---

# 11. KPI Mapping Rules

Do not guess business mappings.

Specifically:

- Do not label `CompletedJobs` as Billable Service Calls without validated job classification.
- Do not label `CompletedRevenue` as Service Revenue.
- Do not label `TotalSales` as Install Revenue without validation.
- Do not label `ClosedOpportunities` as completed installs.
- Do not select a Lead Conversion field solely because its name appears similar.

Unverified KPIs must be marked:

```text
fallback
```

or:

```text
unavailable
```

They must not be presented as confirmed production data.

---

# 12. Data Quality Rules

Every KPI must distinguish:

```text
confirmed
derived
fallback
unavailable
```

Definitions:

```text
confirmed
Direct ServiceTitan field validated against intended business meaning
```

```text
derived
Calculated from validated job-level data
```

```text
fallback
Temporary approximation requiring review
```

```text
unavailable
Cannot currently be calculated reliably
```

Production UI should normally show only confirmed and derived values.

---

# 13. Zero Versus No Data

Zero and missing data are different.

Examples:

```text
Closing Rate = 0%
```

may be valid.

```text
Install Average Ticket = No Data
```

is correct when there are no completed installs.

Never convert missing data into zero.

Use:

```javascript
{
  value: null,
  hasData: false
}
```

for unavailable values.

---

# 14. Backend Ownership

The backend owns all business logic.

Backend responsibilities include:

- KPI normalization
- Goal calculations
- Percent complete
- Rankings
- Tie-breaking
- Overall Top 3 score
- Axis maxima
- Slide payloads
- Achievement-event detection
- Data-quality status
- Service/install derivations

The frontend shall render backend-prepared data.

Do not duplicate business calculations in React.

---

# 15. Frontend Ownership

The dashboard owns presentation behavior only.

Frontend responsibilities include:

- Rendering
- Formatting
- Morph animations
- Number animation
- SVG bar width from normalized data
- Reconnection display
- Synchronized slide presentation
- Remote override presentation

The frontend may calculate pixel dimensions but not business meaning.

---

# 16. State and Storage Rules

Version 1.0 uses in-memory state only.

Do not introduce:

- SQL
- MongoDB
- Redis
- Persistent TV-state storage
- Historical KPI database

Backend restart may clear:

- TV overrides
- Previous-rank snapshot
- Achievement events
- Cache

This is acceptable in Version 1.0.

---

# 17. Refresh Rules

ServiceTitan refresh interval:

```text
60 seconds
```

Only the backend refresh scheduler may contact ServiceTitan.

TVs and phones shall not trigger ServiceTitan requests.

Frontend requests must use cached normalized data.

Prevent overlapping refreshes.

Use limited request concurrency.

A failure for one technician must not discard successful data for the others.

---

# 18. Technician Rules

Version 1.0 uses exactly five manually configured technicians:

```text
Julio Torres — 134926818
Shamon Ward — 3841
Charlie E — 3853
Alex K — 133469538
Dwight — 127491426
```

Do not implement automatic technician discovery in Version 1.0.

Adding or changing a technician should require editing shared configuration only.

---

# 19. Multi-TV Rules

Every TV has independent state.

A command to one TV must never change another TV.

Valid examples:

```text
Break Room TV → Julio Revenue
Dispatch TV → Closing %
Training Room TV → Live Rotation
```

All may occur simultaneously.

Use stable TV IDs encoded in display URLs.

---

# 20. TV Modes

Allowed TV modes:

```text
live
remote
returning
```

Do not create additional modes without approval.

---

# 21. Remote Selection Rules

Technician and KPI selection are independent.

Valid combinations:

```text
Technician only
KPI only
Technician + KPI
```

Invalid:

```text
No technician and no KPI
```

Do not force:

```text
Technician → KPI
```

The user may select either first.

---

# 22. Remote Timeout Rules

A successful override lasts:

```text
120 seconds
```

A later valid command to the same TV resets the timer.

When the timer expires:

1. TV enters `returning`
2. Return animation runs
3. TV resumes synchronized live rotation

Do not require manual reset.

---

# 23. Live Rotation Rules

Live rotation is globally synchronized through a shared epoch.

Default durations:

```text
Revenue: 15 seconds
Activity: 15 seconds
Performance: 15 seconds
Average Ticket: 15 seconds
Top 3: 25 seconds
```

When remote mode ends, the TV returns to the slide currently active in the shared live rotation.

It does not automatically restart at Revenue unless Revenue is globally current.

---

# 24. Visual Theme Rules

Version 1.0 uses the approved light theme.

Required:

- Light gray background
- White cards
- Rounded corners
- Soft shadows
- GRmetro logo
- Large TV-readable typography
- Gold emphasis
- Custom SVG overlay bars

Do not replace it with a dark theme.

---

# 25. Transition Rules

The entire page shall not slide horizontally.

The shell remains stationary.

Animate only changing elements:

- Title
- Navigation underline
- Legend
- Bars
- Axis
- Numbers
- Technician order
- Goal summaries

Avoid full-screen page wipes or PowerPoint-style transitions.

---

# 26. Chart Rules

Use custom SVG charts.

Do not introduce a large chart library unless explicitly justified and approved.

Overlay bars must:

- Share one technician lane
- Use transparency
- Remain distinguishable
- Not become stacked bars
- Not become grouped bars

Use stable keys based on technician and KPI IDs.

Never use array indices as animation identity.

---

# 27. Top 3 Visual Rules

Top 3 visual order:

```text
Second | First | Third
```

First place:

- Centered
- Larger
- Gold accent
- Restrained glow
- Optional subtle sparkle

No continuous confetti.

No sound.

No distracting particles across text.

---

# 28. Mock Mode Rules

Mock mode must be explicit:

```env
MOCK_MODE=true
```

Production must never silently fall back to mock data.

Mock fixtures must be sanitized.

They must not contain:

- Real phone numbers
- Real email addresses
- Customer details
- Cookies
- Tokens
- Session data

---

# 29. Security Rules

Do not expose:

- Raw ServiceTitan responses
- Browser debugger URL
- Local filesystem paths in production errors
- Stack traces in production responses
- Personal technician details beyond approved display names
- Development routes in production

The product is local-office-network first.

Do not expose it publicly without a separate security review.

---

# 30. Dependency Rules

Avoid unnecessary dependencies.

Before adding a package, determine whether:

- Existing code can solve the problem clearly
- The package is maintained
- It materially reduces complexity
- It is appropriate for long-running TV browsers
- It does not duplicate an existing dependency

Do not add Turborepo, Nx, Docker, Kubernetes, or a database framework in Version 1.0.

---

# 31. JavaScript Rules

Version 1.0 uses JavaScript.

Backend:

```text
Node.js
CommonJS or a consistently selected module system
```

Frontend:

```text
React
Vite
ES modules
```

Do not migrate the repository to TypeScript without explicit approval.

Use clear naming, validation, and tests to maintain reliability.

---

# 32. Code Organization Rules

Keep responsibilities isolated.

Examples:

```text
ServiceTitan client
does not calculate rankings
```

```text
Ranking engine
does not perform network requests
```

```text
React components
do not know ServiceTitan field names
```

```text
TV manager
does not build chart payloads
```

Avoid large all-purpose files.

Avoid circular dependencies.

---

# 33. Testing Rules

Business-critical changes require tests.

Mandatory coverage areas:

- Normalization
- Percentage conversion
- Goals
- Rankings
- Overall score
- Job classification
- Install Average Ticket
- TV overrides
- Expiration
- Cache preservation
- HTML response rejection
- API validation
- WebSocket routing
- Live rotation calculation

Run relevant tests before marking a task complete.

---

# 34. Build Rules

Before merging or completing a phase, run:

```bash
npm test
npm run build
```

Where relevant, also run:

```bash
npm run lint
```

Do not mark a task complete when the build is broken.

---

# 35. TASKS.md Rules

Work from the earliest incomplete task in:

```text
docs/TASKS.md
```

After completing work:

1. Run tests
2. Run build
3. Update task status
4. Add a short progress note when useful
5. Summarize changed files
6. Identify unresolved blockers

Do not skip ahead merely because later visual work is more interesting.

---

# 36. Documentation Rules

Update documentation in the same change when behavior changes.

Examples:

```text
ServiceTitan request changed
→ update SERVICETITAN.md
```

```text
API contract changed
→ update PROJECT_SPEC.md
```

```text
Visual layout changed
→ update UI_SPEC.md
```

```text
Task completed
→ update TASKS.md
```

Documentation drift is a defect.

---

# 37. Commit Rules

Use small, coherent commits.

Recommended prefixes:

```text
feat:
fix:
test:
docs:
refactor:
chore:
perf:
style:
```

Examples:

```text
feat: implement independent TV overrides
fix: reject ServiceTitan HTML app-shell responses
test: cover override expiration and revision ordering
docs: document validated lead conversion mapping
```

Avoid vague commit messages.

---

# 38. Branch Rules

Keep `main` installable and testable.

Use short-lived feature branches when practical.

Do not maintain many long-lived branches.

Do not rewrite unrelated working code while completing a focused task.

---

# 39. Conflict Handling

When a requested task conflicts with the specification:

- Stop before implementing the conflicting behavior
- Identify the exact sections
- Explain the impact
- Ask for approval
- Update documentation after a decision

Do not silently reinterpret product requirements.

---

# 40. Blocker Handling

When work depends on unresolved business data:

- Implement interfaces and mock behavior where safe
- Mark live mapping unavailable or blocked
- Do not invent production values
- Record the blocker in `docs/TASKS.md`
- Continue with unrelated nonblocked tasks

Current known blockers include:

- Lead Conversion definition
- Billable Service Calls classification
- Service Revenue classification
- Install Revenue definition
- Completed Install definition
- Final KPI goals
- Final TV room names and hardware

---

# 41. Privacy Rules

Do not display or persist:

- Technician phone numbers
- Email addresses
- Home addresses
- Payroll IDs
- User IDs
- Customer data

Approved employee display data is limited to:

- Configured name
- Initials
- Approved performance KPIs
- Rankings
- Goals

---

# 42. Performance Rules

Target:

```text
Five TVs
Several remote clients
Five technicians
Sixty-second refresh
Smooth 1080p display
```

Avoid:

- Excessive DOM nodes
- Continuous high-cost decorative animation
- Repeated full component remounts
- Large data duplication
- Unbounded logs
- Unbounded WebSocket client storage
- Overlapping ServiceTitan refreshes

---

# 43. Error Recovery Rules

Temporary failure must not blank the dashboard.

When possible:

- Keep the previous cache
- Mark data stale
- Show nonblocking warning
- Retry automatically
- Preserve independent TV state
- Reconnect WebSockets
- Reconnect to Edge

Do not fabricate values during failure.

---

# 44. Production Rules

Production must use:

```text
NODE_ENV=production
MOCK_MODE=false
ENABLE_DEVELOPMENT_ROUTES=false
```

The backend shall serve the built dashboard and remote applications.

Prefer same-origin deployment.

Do not depend on Vite development servers in production.

---

# 45. Definition of Safe Completion

A task is safely complete when:

- Behavior matches the specification
- Relevant tests pass
- Build passes
- No secrets were added
- No unrelated regressions were introduced
- Documentation is updated
- TASKS.md is updated
- Remaining blockers are explicit

---

# 46. Initial Codex Instruction

When beginning work, follow this sequence:

```text
1. Read all repository specification files
2. Inspect current repository state
3. Identify earliest incomplete task
4. Plan the smallest coherent implementation
5. Make repository changes
6. Add or update tests
7. Run tests
8. Run build
9. Update TASKS.md
10. Summarize work and blockers
```

Do not begin by redesigning the architecture.

---

# 47. Standard Codex Prompt

Use this prompt when assigning implementation work:

```text
Read AGENTS.md and all files in docs before modifying the repository.

Treat docs/PROJECT_SPEC.md as authoritative.

Inspect the repository and continue with the earliest incomplete task in docs/TASKS.md.

Work directly in the repository. Keep changes small, coherent, tested, and documented. Preserve the exact five-slide product, independent per-TV state, native ServiceTitan JSON integration, one-minute backend refresh, two-minute remote timeout, dedicated Top 3 slide, light GRmetro design, and morph-only transition behavior.

Do not guess unresolved business mappings. Mark them blocked or unavailable and continue with nonblocked work.

After completing the task:
- run relevant tests,
- run the build,
- update docs/TASKS.md,
- summarize changed files,
- report blockers.
```

---

# End of AGENTS.md

The remaining recommended root document is:

```text
README.md
```

It shall provide the concise setup and operating guide, while the detailed specifications remain in `docs/`.