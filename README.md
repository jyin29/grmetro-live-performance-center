# GRmetro Live Performance Center

Live technician performance digital signage for **GRmetro Heating & Cooling**, powered by ServiceTitan data.

The system displays live technician KPIs across multiple independent televisions and includes a QR-code mobile remote for temporarily showing a selected technician, KPI, or both.

---

# Overview

The project contains three applications:

```text
Backend
Dashboard
Remote
```

The backend connects to a manually authenticated Microsoft Edge session, retrieves native ServiceTitan JSON data, normalizes technician metrics, calculates rankings and goals, and broadcasts updates to all connected televisions.

Each television has independent state.

Example:

```text
Break Room TV
Julio Torres — Revenue
```

```text
Dispatch TV
Closing %
```

```text
Training Room TV
Live Rotation
```

A remote override automatically expires after two minutes, returning that television to the synchronized live rotation.

---

# Version 1.0 Features

- Native ServiceTitan JSON integration
- Five configured technicians
- Five live slides
- Independent multi-TV state
- One-minute data refresh
- QR-code mobile remote
- Technician-only remote view
- KPI-only remote view
- Technician-plus-KPI remote view
- Two-minute automatic override timeout
- WebSocket live updates
- In-memory cache
- Smooth morph animations
- Custom SVG overlaid bar charts
- Dedicated full-screen Top 3 slide
- Light GRmetro-branded design
- Windows office-network deployment
- Explicit mock mode for development

---

# Live Slides

The default rotation contains exactly five slides:

```text
Revenue
Activity
Performance
Average Ticket
Top 3
```

Default timing:

```text
Revenue          15 seconds
Activity         15 seconds
Performance      15 seconds
Average Ticket   15 seconds
Top 3            25 seconds
```

Top 3 is a dedicated slide.

It does not appear beneath the normal KPI slides.

---

# Approved KPIs

Version 1.0 uses these KPI concepts:

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

Several service and installation KPIs require validated job-level classification before production use.

See:

```text
docs/SERVICETITAN.md
```

---

# Repository Structure

```text
grmetro-live-performance-center/
│
├── apps/
│   ├── backend/
│   ├── dashboard/
│   └── remote/
│
├── shared/
│   ├── technicians.js
│   ├── goals.js
│   ├── kpis.js
│   ├── slides.js
│   ├── televisions.js
│   ├── jobClassifications.js
│   ├── constants.js
│   └── validation.js
│
├── assets/
│   ├── grmetro-logo.png
│   ├── dashboard-reference.png
│   └── qr/
│
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── UI_SPEC.md
│   ├── SERVICETITAN.md
│   └── TASKS.md
│
├── scripts/
│   ├── generate-qr-codes.js
│   ├── start-servicetitan-edge.cmd
│   ├── start-backend.cmd
│   └── display-kiosk-template.cmd
│
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── .nvmrc
```

---

# System Requirements

## Backend Computer

Recommended:

```text
Windows 10 or Windows 11
Node.js LTS
Microsoft Edge
Git
8 GB RAM
Reliable office-network connection
```

Only the backend computer needs access to ServiceTitan.

## Television Display Devices

Each television needs access to a modern browser through one of:

- Built-in smart-TV browser
- Existing office computer
- Retired laptop
- Existing streaming device with browser support
- Mini PC
- Another browser-capable HDMI device

Each display opens its own URL.

Example:

```text
http://192.168.1.50:3000/display/break-room
```

---

# Initial Setup

## 1. Clone the Repository

```powershell
git clone <repository-url> C:\GRmetro\live-performance-center
cd C:\GRmetro\live-performance-center
```

## 2. Install Dependencies

```powershell
npm install
```

## 3. Create the Environment File

Copy:

```text
.env.example
```

to:

```text
.env
```

Example PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env`.

Example production configuration:

```env
NODE_ENV=production

HOST=0.0.0.0
PORT=3000

EDGE_DEBUG_URL=http://127.0.0.1:9222
SERVICETITAN_BASE_URL=https://go.servicetitan.com

TIMEZONE=America/New_York

REFRESH_INTERVAL_SECONDS=60
REMOTE_OVERRIDE_SECONDS=120
RETURN_TRANSITION_MILLISECONDS=1000

STALE_WARNING_SECONDS=180
STALE_CRITICAL_SECONDS=600

DASHBOARD_BASE_URL=http://192.168.1.50:3000

MOCK_MODE=false
ENABLE_DEVELOPMENT_ROUTES=false
```

Do not place ServiceTitan credentials in `.env`.

---

# Starting Microsoft Edge for ServiceTitan

The backend reuses a manually authenticated Edge session.

It does not store or submit ServiceTitan credentials.

Recommended command:

```bat
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\GRmetro\EdgeAutomation" ^
  https://go.servicetitan.com
```

Alternative executable path:

```bat
"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
```

After Edge opens:

1. Sign into ServiceTitan manually.
2. Complete MFA or phone verification.
3. Leave the authenticated ServiceTitan tab open.
4. Keep Edge running while the backend operates.

---

# Confirming Edge Remote Debugging

Open:

```text
http://127.0.0.1:9222/json/version
```

A successful response contains a browser name and WebSocket debugger URL.

If this address does not load, the backend cannot connect to Edge.

Use:

```text
127.0.0.1
```

rather than:

```text
localhost
```

to avoid IPv6 connection issues.

---

# Development Mode

Start all applications:

```powershell
npm run dev
```

Expected development services:

```text
Backend
Dashboard Vite server
Remote Vite server
```

Individual applications may be started separately:

```powershell
npm run dev:backend
npm run dev:dashboard
npm run dev:remote
```

---

# Mock Mode

Mock mode allows development without Edge or ServiceTitan.

Set:

```env
MOCK_MODE=true
```

Then start:

```powershell
npm run dev
```

Mock mode must be explicitly enabled.

Production must use:

```env
MOCK_MODE=false
```

The application shall never silently fall back to mock data.

---

# Production Build

Build the dashboard and remote:

```powershell
npm run build
```

Start the production backend:

```powershell
npm start
```

The backend serves:

```text
Dashboard
Remote
REST API
WebSocket endpoint
```

No Vite development server is required in production.

---

# Production URLs

Assuming the backend is:

```text
192.168.1.50:3000
```

## Health

```text
http://192.168.1.50:3000/api/v1/health
```

## General Remote

```text
http://192.168.1.50:3000/remote
```

## Display URLs

```text
http://192.168.1.50:3000/display/break-room
http://192.168.1.50:3000/display/dispatch
http://192.168.1.50:3000/display/training-room
http://192.168.1.50:3000/display/front-office
http://192.168.1.50:3000/display/shop
```

The final room IDs are configured in:

```text
shared/televisions.js
```

---

# QR Remote

Each TV should have a unique QR code.

Preferred URL format:

```text
http://192.168.1.50:3000/remote?tv=break-room
```

Scanning the code opens the control panel for that TV directly.

The user may select:

```text
Technician only
KPI only
Technician and KPI
```

After two minutes, the TV returns automatically to live rotation.

---

# Generating QR Codes

Example:

```powershell
npm run generate:qr -- --base-url=http://192.168.1.50:3000
```

Output:

```text
assets/qr/
```

Do not generate production QR codes using:

```text
localhost
127.0.0.1
```

Those addresses refer to the phone or display device itself.

---

# Remote Behavior

Valid remote selections:

| Technician | KPI | Result |
|---|---|---|
| Selected | None | Individual technician scorecard |
| None | Selected | Team KPI graph and ranking |
| Selected | Selected | Individual technician KPI detail |
| None | None | Invalid |

A command affects only the selected television.

Another TV may display something different at the same time.

---

# API Routes

Production API prefix:

```text
/api/v1
```

Primary routes:

```text
GET  /api/v1/health
GET  /api/v1/dashboard
GET  /api/v1/tvs
GET  /api/v1/tvs/:tvId
POST /api/v1/tvs/:tvId/override
POST /api/v1/tvs/:tvId/resume
```

Development-only routes may exist when explicitly enabled.

---

# WebSocket

Endpoint:

```text
/ws
```

Dashboard example:

```text
ws://192.168.1.50:3000/ws?client=dashboard&tv=break-room
```

Remote example:

```text
ws://192.168.1.50:3000/ws?client=remote
```

WebSockets provide:

- Dashboard data updates
- TV state updates
- Achievement events
- Connection status

State-changing remote commands use REST.

---

# Configuring Technicians

Edit:

```text
shared/technicians.js
```

Version 1.0 technicians:

```text
Julio Torres — 134926818
Shamon Ward — 3841
Charlie E — 3853
Alex K — 133469538
Dwight — 127491426
```

Technicians are configured manually.

Automatic discovery is outside Version 1.0.

---

# Configuring Goals

Edit:

```text
shared/goals.js
```

Goals may contain:

- Company-wide defaults
- Technician-specific overrides

Use:

```javascript
null
```

when a goal has not been configured.

Do not invent production goals.

Management must approve final values.

---

# Configuring Televisions

Edit:

```text
shared/televisions.js
```

Each television requires:

```javascript
{
  id: "break-room",
  name: "Break Room TV"
}
```

IDs must be:

- Unique
- Lowercase
- URL-safe
- Stable after QR codes are printed

---

# Configuring Business Units

Business unit IDs are documented in:

```text
docs/SERVICETITAN.md
```

Keep them in one centralized configuration module.

Do not duplicate the list throughout the codebase.

---

# Configuring Job Classifications

Edit:

```text
shared/jobClassifications.js
```

This configuration determines:

- Billable Service Calls
- Service Revenue
- Install Revenue
- Number of Installs
- Install Average Ticket

ID-based classification is preferred.

Unclassified jobs must not be silently included in confirmed metrics.

This setup requires business validation before production launch.

---

# Testing

Run all tests:

```powershell
npm test
```

Build all applications:

```powershell
npm run build
```

Where configured:

```powershell
npm run lint
```

Automated tests shall not require live ServiceTitan.

Use sanitized mock fixtures.

---

# Windows Firewall

Allow inbound TCP traffic on the backend port.

Administrative PowerShell example:

```powershell
New-NetFirewallRule `
  -DisplayName "GRmetro Live Performance Center" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3000 `
  -Action Allow `
  -Profile Private
```

Limit access to the private office network.

Do not expose the application directly to the public internet.

---

# Automatic Startup

Recommended Windows Task Scheduler tasks:

```text
GRmetro ServiceTitan Edge
GRmetro Live Performance Backend
```

Suggested order:

```text
At user login
↓
Start Edge after 15 seconds
↓
Start backend after 30–45 seconds
```

The backend still needs automatic retry behavior.

Full instructions are in:

```text
docs/PROJECT_SPEC.md
```

---

# Kiosk Display Example

Windows display-device example:

```bat
@echo off
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --kiosk ^
  --edge-kiosk-type=fullscreen ^
  --no-first-run ^
  --disable-session-crashed-bubble ^
  http://192.168.1.50:3000/display/break-room
```

Use:

```text
Extend these displays
```

rather than:

```text
Duplicate these displays
```

when one computer drives more than one independent screen.

---

# Daily Operation

Normal daily sequence:

1. Backend computer starts.
2. Dedicated Edge launches.
3. Confirm ServiceTitan remains signed in.
4. Backend starts automatically.
5. First data refresh completes.
6. TV displays reconnect.
7. Live rotation begins.

When ServiceTitan requires reauthentication:

1. Open the dedicated Edge window.
2. Sign in manually.
3. Complete MFA.
4. Leave ServiceTitan open.
5. Wait for the next refresh.

The TVs continue showing cached data while the login is restored.

---

# Health Check

Open:

```text
http://127.0.0.1:3000/api/v1/health
```

Expected health categories:

```text
Backend
Browser
ServiceTitan
Cache
Application version
```

The health route must not expose secrets.

---

# Troubleshooting

## Backend Does Not Start

Check:

```text
Node.js installed
Dependencies installed
.env exists
Port 3000 available
Configuration valid
```

Run:

```powershell
npm install
npm start
```

---

## Edge Cannot Be Reached

Check:

```text
Dedicated Edge running
Remote-debugging flag present
Port 9222 active
Correct profile launched
EDGE_DEBUG_URL uses 127.0.0.1
```

Test:

```text
http://127.0.0.1:9222/json/version
```

---

## ServiceTitan Returns HTML

Likely causes:

- Wrong HTTP method
- Missing POST body
- Missing CSRF token
- Expired session
- Incorrect endpoint
- Request routed to the app shell

The technician datasource requires:

```text
POST
```

not GET.

See:

```text
docs/SERVICETITAN.md
```

---

## Data Is Stale

Check:

```text
ServiceTitan login
Browser connection
Last successful refresh
CSRF errors
Network connection
Per-technician errors
```

The dashboard should keep showing the last successful data.

---

## One Technician Is Missing

Check:

```text
Technician ID
Business units
Current date
Permissions
ServiceTitan response
Partial refresh logs
```

One technician failure should not remove the others.

---

## QR Code Does Not Work

Check:

```text
Phone is on office Wi-Fi
QR URL uses backend IP
Backend IP has not changed
Firewall allows port 3000
TV ID exists
Remote URL loads manually
```

Do not use `localhost` in the QR code.

---

## TV Says Invalid Display

Check the URL.

Example:

```text
/display/break-room
```

The ID must match:

```text
shared/televisions.js
```

---

## Remote Changes the Wrong TV

This is a release-blocking problem.

Check:

```text
TV ID in URL
Override API route
TV manager state map
WebSocket subscription
Dashboard display URL
```

Each override must affect one TV only.

---

## TVs Are Not Synchronized

Check:

```text
Rotation epoch
Slide durations
Backend timestamps
Device clocks
Browser tab suspension
Dashboard build versions
```

Live clients should calculate the active slide from the shared rotation epoch.

---

# Logs

Recommended directory:

```text
logs/
```

Production logs should include:

- Refresh activity
- Technician failures
- Browser connection
- ServiceTitan status
- API errors
- TV overrides
- WebSocket status

Logs must not include:

- Passwords
- Cookies
- CSRF tokens
- Phone numbers
- Email addresses
- Customer data

Logs should rotate and remain bounded.

---

# Updating the Application

Recommended:

```powershell
cd C:\GRmetro\live-performance-center
git pull
npm install
npm run build
```

Then restart the backend.

Preserve the previous working Git commit for rollback.

---

# Rollback

Example:

```powershell
git checkout <previous-working-commit>
npm install
npm run build
```

Restart the backend after rollback.

Version 1.0 has no database migrations.

---

# Important Documentation

Read before implementation:

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/UI_SPEC.md
docs/SERVICETITAN.md
docs/TASKS.md
```

Purpose:

```text
PROJECT_SPEC.md
Complete product and engineering specification
```

```text
UI_SPEC.md
Approved visual design and interaction rules
```

```text
SERVICETITAN.md
Native integration details and data-mapping warnings
```

```text
TASKS.md
Implementation checklist and current blockers
```

```text
AGENTS.md
Binding rules for Codex and coding agents
```

---

# Current Production Blockers

Before release, GRmetro must confirm:

- Lead Conversion % definition
- Billable Service Calls classification
- Service Revenue classification
- Install Revenue definition
- Number of Installs definition
- Install Average Ticket basis
- Final KPI goals
- Overall Top 3 weights
- Final TV room names
- Browser-capable device for every TV

See:

```text
docs/TASKS.md
```

---

# Security

Version 1.0 is intended for a trusted local office network.

Do not:

- Expose the backend publicly
- Commit `.env`
- Store ServiceTitan credentials
- Store cookies
- Store CSRF tokens
- Enable development routes in production
- Enable mock mode in production
- Commit private ServiceTitan records

Public access requires a separate security review.

---

# Codex Handoff

Recommended initial prompt:

```text
Read AGENTS.md and all files in docs before modifying the repository.

Treat docs/PROJECT_SPEC.md as authoritative.

Inspect the current repository and begin with the earliest incomplete task in docs/TASKS.md.

Work directly in the repository. Keep changes small, coherent, tested, and documented. Do not redesign the product or guess unresolved KPI mappings.

After each task:
- run relevant tests,
- run the build,
- update TASKS.md,
- summarize changed files,
- report blockers.
```

---

# Version

Current planned release:

```text
v1.0.0
```

Release is complete only when all Definition of Done requirements in `docs/PROJECT_SPEC.md` and `docs/TASKS.md` are satisfied.

---

# License and Internal Use

This is an internal GRmetro Heating & Cooling application.

A formal repository license may be added according to company policy.

Do not publish ServiceTitan integration details, company configuration, private assets, or production URLs without authorization.