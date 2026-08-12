# GRmetro Live Performance Center
## Software Requirements Specification (SRS)

Version 1.0

Status: Design Frozen

Author: OpenAI + GRmetro Heating & Cooling

---

# 1. Introduction

## 1.1 Purpose

The GRmetro Live Performance Center is an internal digital signage application that displays live technician performance metrics sourced from ServiceTitan.

The application is intended for installation on multiple televisions throughout the GRmetro office and serves as a continuously updating performance center for technicians, office staff, and management.

The system is designed to present operational data in a visually engaging, premium-quality interface that encourages healthy competition while remaining professional and informative.

This application is **not** intended to replace ServiceTitan.

Instead, it acts as a visualization layer built on top of ServiceTitan's existing APIs.

---

# 1.2 Product Vision

When a customer, technician, or employee walks into the office, the dashboard should immediately communicate professionalism.

The desired first impression is:

> "This looks like a feature ServiceTitan should have shipped."

The dashboard should never resemble:

- PowerPoint
- Excel
- Google Slides
- Traditional business dashboards

Instead it should resemble:

- Bloomberg Terminal
- ESPN broadcast graphics
- Apple keynote presentations
- Tesla vehicle interface
- Enterprise digital signage

Every animation, transition, and interaction should reinforce this feeling.

---

# 1.3 Primary Objectives

The application has six primary objectives.

1. Display live technician KPIs.

2. Encourage healthy competition among technicians.

3. Allow any employee to temporarily display an individual technician's performance using a QR-code-based remote.

4. Operate continuously on multiple televisions with no manual intervention.

5. Integrate natively with ServiceTitan using existing authenticated browser sessions.

6. Be maintainable and extensible without requiring architectural rewrites.

---

# 1.4 Guiding Principles

The following principles are mandatory.

## Principle 1 — Product First

This project is a software product.

It is not a dashboard prototype.

Every design decision should prioritize long-term maintainability over rapid implementation.

---

## Principle 2 — Single Source of Truth

Business logic shall exist in one location only.

Leaderboards, rankings, goals, and calculations shall never be duplicated between backend and frontend.

---

## Principle 3 — Native ServiceTitan Integration

The application shall communicate exclusively through ServiceTitan's native JSON endpoints.

HTML scraping is prohibited.

DOM parsing is prohibited.

Browser automation shall only be used to reuse an authenticated session.

---

## Principle 4 — Smoothness

The application should never visually "jump."

Instead:

- Numbers count upward.
- Bars resize.
- Rankings slide.
- Titles morph.
- Axes animate.

Entire page transitions are prohibited.

---

## Principle 5 — TV First

The dashboard is optimized for viewing from approximately 15–30 feet away.

Large typography and generous spacing take priority over information density.

---

## Principle 6 — Simplicity

Every screen should answer one question immediately.

If a visitor cannot understand the current slide within approximately five seconds, the design is too complicated.

---

# 2. Product Overview

The system consists of three applications sharing a common backend.

```

+---------------------------------------------------+
|            ServiceTitan Cloud                     |
+---------------------------------------------------+
                    │
                    │ Native JSON API
                    ▼
+---------------------------------------------------+
|                  Backend                          |
|                                                   |
|  • ServiceTitan Client                            |
|  • Cache                                          |
|  • Leaderboards                                   |
|  • WebSocket Server                               |
|  • TV State Manager                               |
+---------------------------------------------------+
            │                          │
            │                          │
            ▼                          ▼

+----------------------+      +----------------------+
| Dashboard TVs        |      | QR Remote            |
|                      |      |                      |
| Full Screen Display  |      | Mobile Controller    |
+----------------------+      +----------------------+

```

The backend is the authoritative source of all data.

Neither the dashboard nor the remote application communicate directly with ServiceTitan.

---

# 3. User Roles

The application supports three categories of users.

## Technician

Technicians primarily interact with the system through QR codes displayed on each television.

Capabilities:

- Select a television.
- Display personal statistics.
- Select a specific KPI.
- Allow the television to automatically return to live mode after inactivity.

Technicians cannot permanently alter dashboard behavior.

---

## Office Staff

Office staff may temporarily display any technician or KPI on any television.

This override expires automatically after a configurable timeout.

---

## Management

Management primarily observes the live rotation.

Management may optionally trigger manual refreshes or modify KPI goals through future administrative tools.

No administrative interface is included in Version 1.0.

---

# 4. System Architecture

The application consists of three independent runtime applications.

## Backend

Responsibilities:

- Maintain authenticated ServiceTitan connection.
- Refresh technician metrics.
- Normalize ServiceTitan responses.
- Calculate rankings.
- Calculate goals.
- Maintain television state.
- Broadcast updates.

---

## Dashboard

Responsibilities:

- Display live slides.
- Render animations.
- Receive WebSocket updates.
- Never perform business calculations.

---

## Remote

Responsibilities:

- Select television.
- Select technician.
- Select KPI.
- Submit override requests.

The remote never directly accesses ServiceTitan.

---

# 5. Functional Requirements

Version 1.0 consists of exactly five dashboard slides.

1. Revenue
2. Activity
3. Performance
4. Average Ticket
5. Top 3

No additional slides shall exist in Version 1.0.

Future functionality belongs in Version 1.1.

---

# 6. Display Rotation

Default rotation order is fixed.

Revenue

↓

Activity

↓

Performance

↓

Average Ticket

↓

Top 3

↓

Revenue

The sequence repeats indefinitely.

Rotation timing shall be configurable but defaults to:

Revenue — 15 seconds

Activity — 15 seconds

Performance — 15 seconds

Average Ticket — 15 seconds

Top 3 — 25 seconds

---

# 7. Television Behavior

Each television maintains independent state.

Example:

Lobby TV

• Revenue
• Live Rotation

Break Room TV

• Dwight
• Performance

Training Room TV

• Top 3

No television shall influence another.

---

# 8. Remote Override

When a user scans a QR code:

1. Select television.
2. Select technician.
3. Optionally select a KPI.
4. Apply.

The selected television immediately transitions to the requested view.

After two minutes of inactivity the television automatically returns to the default slideshow.

No manual reset is required.

---

# 9. Refresh Strategy

ServiceTitan data refreshes every sixty seconds.

The refresh process shall occur entirely within the backend.

Televisions receive updates through WebSockets.

The dashboard shall never poll for new data.

---

# 10. Version 1.0 Scope Freeze

The following features are explicitly included.

• Five dashboard slides.
• Native ServiceTitan integration.
• Multiple independent televisions.
• QR remote.
• Automatic timeout.
• Live leaderboards.
• Goal indicators.
• Smooth morph animations.
• Custom SVG charts.
• Light theme.
• GRmetro branding.

The following features are explicitly excluded.

• Historical analytics.
• User authentication.
• Administrative dashboard.
• Database storage.
• Sound effects.
• Email notifications.
• Push notifications.
• Artificial intelligence.
• Predictive analytics.

These belong to future versions of the product.

---

**End of Part 1**



# Part 2 — User Interface & User Experience Specification

---

# 11. UI Philosophy

The dashboard is not a reporting tool.

It is not an analytics platform.

It is not a replacement for ServiceTitan.

The dashboard is **digital signage**.

Every design decision should optimize for:

• readability from across the room

• visual impact

• simplicity

• motion

• professionalism

A visitor should understand the current slide within approximately five seconds.

If additional explanation is required, the interface is too complicated.

---

# 12. Overall Experience

The dashboard should feel like watching an ESPN broadcast rather than flipping through PowerPoint slides.

The interface should always appear alive.

Nothing should ever "jump."

Instead:

• values count

• bars resize

• titles morph

• rankings slide

• indicators pulse

Every animation should preserve visual continuity.

---

# 13. Visual Design Language

Design inspiration includes:

• Apple

• Linear

• Stripe Dashboard

• Bloomberg

• ESPN

The interface should communicate:

Professional

Modern

Premium

Energetic

Minimal

Competitive

---

# 14. Theme

Version 1.0 uses a light theme.

Background

```
#F7F9FC
```

Cards

```
#FFFFFF
```

Primary Text

```
#111827
```

Secondary Text

```
#6B7280
```

Borders

```
#E5E7EB
```

Cards should use:

• 16–20 px border radius

• soft shadows

• no heavy outlines

• generous whitespace

---

# 15. Branding

Upper-left corner always displays:

GRmetro Heating & Cooling logo

Application title:

```
Live Performance Center
```

Logo requirements:

• Preserve aspect ratio

• SVG preferred

• PNG fallback

• Never crop

• Never stretch

---

# 16. Header

The header remains visible on every screen.

Structure

```
+---------------------------------------------------------------+

LOGO

Live Performance Center

Revenue | Activity | Performance | Avg Ticket | Top 3

10:42 AM

Updated 18 sec ago ●

+---------------------------------------------------------------+
```

Header height:

Approximately 90 pixels.

---

# 17. Live Status

Upper-right corner displays:

Current Time

Example

```
10:42 AM
```

Live Update Counter

Example

```
Updated 23 sec ago
```

Green status indicator

●

Behavior

Counter increments every second.

When backend refreshes:

Counter resets.

Indicator pulses once.

---

# 18. Navigation

Exactly five navigation tabs exist.

Revenue

Activity

Performance

Avg Ticket

Top 3

No additional tabs.

No hidden pages.

No user customization.

---

Navigation behavior

Current tab indicated using

Animated underline.

Underline slides smoothly.

Entire navigation never moves.

---

# 19. Dashboard Layout

Every KPI slide shares an identical layout.

```
----------------------------------------------------------

Header

----------------------------------------------------------

Large Chart Area

----------------------------------------------------------

Summary Panel

----------------------------------------------------------

```

The layout never changes between slides.

Only content changes.

This consistency reduces cognitive load.

---

# 20. Slide Philosophy

The dashboard never transitions between pages.

Instead,

the current slide morphs into the next slide.

Example

Revenue

↓

Activity

The following elements animate:

Title

Axis

Bars

Numbers

Goal

Summary

Everything else remains fixed.

---

# 21. Animation Principles

Animations must always serve readability.

Animations should never exist simply because they are attractive.

Animation goals:

Guide attention

Preserve continuity

Emphasize change

Animation durations

Minor

200–300 ms

Standard

350–600 ms

Large

700–1000 ms

Top 3 Entrance

900–1200 ms

---

# 22. Typography

Primary Font

Inter

Fallback

Segoe UI

Roboto

Arial

Font Sizes

Application Title

40 px

Slide Title

56 px

Technician Name

28–32 px

Metric Value

40–48 px

Goal

20 px

Axis Labels

18 px

Secondary Text

16 px

Everything must remain readable from 20 feet.

---

# 23. Revenue Slide

Purpose

Display technician revenue performance.

Metrics

Revenue

Service Revenue

Install Revenue

Graph

One shared horizontal axis.

Three overlapping transparent SVG bars.

Revenue

Gold

Service Revenue

Blue

Install Revenue

Green

Bars overlap.

Never stacked.

Never grouped.

Right Summary Panel

Current Revenue

Goal ⭐

Percent Complete

Current Rank

Optional trend indicator

Example

Revenue

$8,420

⭐ Goal

$10,000

84%

Rank #2

---

# 24. Activity Slide

Purpose

Display technician activity volume.

Metrics

Billable Service Calls

10+ Opportunities

Tech Leads

Marketing Leads

Installs

Graph

One shared axis.

Five transparent overlapping bars.

Longest value defines scale.

---

Summary Panel

Current Value

Goal

Rank

Percent Complete

---

# 25. Performance Slide

Purpose

Display technician efficiency.

Metrics

Lead Conversion %

Closing %

Billable Efficiency

Revenue Per Hour

Graph

Normalized values.

Shared horizontal axis.

Consistent colors.

Summary

Current Value

Goal

Rank

Trend

---

# 26. Average Ticket Slide

Purpose

Display sales quality.

Metrics

Average Ticket

Install Average Ticket

Service Average Ticket

Install Revenue

Install Count

Graph

Three overlapping bars.

Summary

Average Ticket

Goal

Rank

Install Revenue

Install Count

---

# 27. Top 3 Slide

Top 3 is an independent slide.

It NEVER appears as a strip on KPI slides.

Entire screen becomes:

```
TOP 3 TECHNICIANS
```

Layout

```
             🥇

     Technician #1

🥈                          🥉

Technician #2      Technician #3
```

Center card

Largest

Gold border

Subtle glow

Very small sparkle every few seconds

Second card

Silver accent

Third card

Bronze accent

Each card contains:

Technician Name

Revenue

Calls

Lead Conversion

Closing %

Average Ticket

Installs

No graphs appear on this slide.

---

# 28. Goal Indicators

Every KPI supports goals.

Goals are always displayed beside the chart.

Never inside the graph.

Example

Revenue

$8,450

⭐ Goal

$10,000

84%

Goals are configured by management.

Goals are never hardcoded in the frontend.

---

# 29. Number Animations

When values change:

Old

```
8420
```

New

```
8565
```

Numbers count upward.

Approximate duration

900 milliseconds.

No abrupt replacement.

---

# 30. Bar Animations

Bars resize.

Bars never disappear.

Axis rescales smoothly.

Opacity remains constant.

---

# 31. Rank Animations

If technicians swap positions:

Rows slide.

Names slide.

Bars resize.

No popping.

No fade-outs.

---

# 32. Achievement Indicators

If technician reaches a goal:

Display

```
⭐ GOAL REACHED
```

for approximately

3 seconds.

If technician becomes overall leader:

Display

```
👑 NEW LEADER
```

for approximately

3 seconds.

If technician enters Top 3:

Display

```
⬆ TOP 3
```

for approximately

3 seconds.

No sound effects.

No confetti.

Animations should remain subtle and professional.

---

# 33. Dashboard Rotation

Revenue

15 seconds

↓

Activity

15 seconds

↓

Performance

15 seconds

↓

Average Ticket

15 seconds

↓

Top 3

25 seconds

↓

Revenue

Repeat indefinitely.

---

# 34. Remote Override Experience

When a QR code is scanned:

User selects:

TV

↓

Technician

↓

(Optional KPI)

↓

Apply

The selected TV immediately morphs into the requested view.

No loading screen.

After two minutes without interaction:

TV automatically returns to Live Rotation.

---

# 35. Responsiveness

Primary Target

1920×1080 televisions.

Must also support

3840×2160

No mobile layout exists for the dashboard.

The remote application is a separate interface.

---

# 36. Accessibility

Minimum color contrast:

WCAG AA

No flashing elements.

No animation should reduce readability.

Motion should always enhance comprehension.

---

**End of Part 2**

# Part 3 — Backend Architecture & Data Pipeline

---

# 37. Backend Philosophy

The backend is the brain of the application.

Its responsibilities are:

• Connect to ServiceTitan

• Download live technician data

• Normalize ServiceTitan responses

• Calculate all business logic

• Maintain television state

• Broadcast updates

The frontend shall NEVER perform business calculations.

---

# 38. Technology Stack

Runtime

Node.js LTS

Framework

Express.js

Realtime

WebSockets

Browser Automation

Playwright

Caching

Memory

Configuration

Environment Variables + JSON

No SQL database.

No MongoDB.

No Redis.

No long-term storage.

---

# 39. High-Level Architecture

```

ServiceTitan

↓

Playwright Session

↓

ServiceTitan Client

↓

Normalizer

↓

Leaderboard Engine

↓

Memory Cache

↓

WebSocket Server

↓

Dashboard TVs

↓

QR Remote

```

All clients consume normalized backend data.

No client communicates directly with ServiceTitan.

---

# 40. Browser Authentication

The backend never performs login.

Instead,

an employee manually signs into ServiceTitan using Microsoft Edge.

Edge launches with Remote Debugging enabled.

Playwright attaches to the existing browser session.

Advantages

No password storage.

No cookie management.

No MFA automation.

Session remains identical to user browser.

---

# 41. Browser Lifecycle

Server Startup

↓

Connect to Edge

↓

Locate ServiceTitan tab

↓

Verify authentication

↓

Reuse existing page

↓

Never reconnect unless disconnected

Reconnect automatically if browser restarts.

---

# 42. ServiceTitan Integration

Only native JSON endpoints are permitted.

HTML scraping is prohibited.

DOM parsing is prohibited.

Button clicking is prohibited.

Current known endpoints

POST

/app/api/reporting/modulardashboard/GetTechnicianOverview

POST

/app/api/reporting/CustomReport/GetDatasourceData

Future endpoints may be added.

Existing endpoints should never be modified unless ServiceTitan changes.

---

# 43. Technician Configuration

Technicians are configured manually.

Version 1.0 does not automatically discover technicians.

Example

```javascript
[
    {
        id:134926818,
        name:"Julio Torres",
        short:"JT"
    },
    {
        id:3841,
        name:"Shamon Ward",
        short:"SW"
    }
]
```

Technician IDs remain configurable.

---

# 44. Refresh Cycle

Every

60 seconds

the backend performs one refresh.

Pipeline

Connect

↓

Download Technician Data

↓

Normalize

↓

Calculate Goals

↓

Calculate Rankings

↓

Generate Slides

↓

Update Cache

↓

Broadcast

No frontend request shall ever trigger a ServiceTitan refresh.

---

# 45. Internal Data Model

Raw ServiceTitan responses shall never leave the backend.

Instead each technician becomes

```javascript
{
    id,
    name,
    short,

    revenue,
    serviceRevenue,
    installRevenue,

    billableCalls,
    opportunities,
    techLeads,
    marketedLeads,

    closingRate,
    leadConversion,

    installs,

    averageTicket,
    installAverageTicket,

    billableEfficiency,
    revenuePerHour,

    recalls,

    goals,

    ranks
}
```

This object becomes the single source of truth.

---

# 46. KPI Normalization

ServiceTitan field

↓

Internal field

CompletedRevenue

↓

revenue

CompletedJobs

↓

billableCalls

Opportunity

↓

opportunities

TechLeadJobs

↓

techLeads

MarketingLeadJobs

↓

marketedLeads

CloseRate

↓

closingRate

OpportunityConversionRate

↓

leadConversion

OpportunityJobAverage

↓

averageTicket

RevenuePerHour

↓

revenuePerHour

BillableEfficiency

↓

billableEfficiency

RecallsCaused

↓

recalls

The frontend never knows ServiceTitan field names.

---

# 47. Goal Engine

Goals are backend configuration.

Example

```javascript
Revenue:10000

BillableCalls:10

LeadConversion:60

ClosingRate:65

Installs:3
```

Backend calculates

Current

Goal

Percent Complete

Remaining

Frontend simply renders.

---

# 48. Leaderboard Engine

Every KPI has an independent leaderboard.

Revenue

Sort revenue.

Activity

Sort billable calls.

Performance

Sort weighted efficiency score.

Average Ticket

Sort average ticket.

Top 3

Sort weighted overall score.

Frontend never sorts.

---

# 49. Overall Ranking

Version 1.0 uses weighted scoring.

Revenue

40%

Closing %

20%

Lead Conversion

15%

Install Revenue

15%

Average Ticket

10%

Weights remain configurable.

---

# 50. Memory Cache

Single in-memory object.

```javascript
{
    updated,

    technicians,

    leaderboards,

    tvs
}
```

No persistent storage.

Restarting the backend clears cache.

Next refresh rebuilds everything.

---

# 51. Television State

Every television stores

```javascript
{
    id,

    mode,

    technician,

    slide,

    expires
}
```

Mode

LIVE

↓

REMOTE

↓

RETURNING

Televisions never affect each other.

---

# 52. Live Mode

Television follows slideshow.

Revenue

↓

Activity

↓

Performance

↓

Average Ticket

↓

Top 3

Repeat forever.

---

# 53. Remote Mode

Triggered by QR application.

User selects

TV

↓

Technician

↓

Optional KPI

↓

Apply

Television immediately changes.

No restart required.

---

# 54. Idle Recovery

When override begins

```
expires = now + 120 seconds
```

Backend checks expiration every second.

Expired TVs return to LIVE mode.

Transition should be animated.

---

# 55. REST API

Version

v1

Routes

GET

/api/dashboard

Returns

Entire normalized cache.

---

GET

/api/tv/:id

Returns

Television state.

---

POST

/api/tv/:id

Updates television state.

---

POST

/api/refresh

Triggers manual refresh.

Development only.

---

GET

/api/health

Returns

```
OK
```

---

# 56. WebSocket Protocol

Single WebSocket connection.

Supported events

dashboard:update

leaderboard:update

tv:update

remote:connected

remote:expired

Future events may be added.

---

# 57. Broadcast Strategy

Refresh

↓

Cache Updated

↓

Broadcast

↓

Dashboard Receives

↓

Animate

No polling.

No repeated HTTP requests.

---

# 58. Error Handling

If ServiceTitan becomes unavailable

Keep previous cache.

Display

Updated 2m ago

Retry next cycle.

Dashboard must never go blank.

---

# 59. Logging

Every refresh logs

Refresh Started

Refresh Completed

Duration

Technicians Updated

Errors

API failures

Browser disconnects

Logs should be timestamped.

---

# 60. Configuration

Configuration shall include

Refresh Interval

Slide Durations

Goals

Technicians

Business Units

Timezone

TV Names

No magic values may exist inside application code.

---

# 61. Performance Requirements

Refresh

<2 seconds

Cache update

<50 ms

Broadcast

<100 ms

Dashboard animation

60 FPS

Memory usage

<250 MB

---

# 62. Security

Frontend shall never receive

Cookies

CSRF Tokens

Session IDs

ServiceTitan payloads

Browser information

Only normalized application data.

---

**End of Part 3**

# Part 4 — Repository Structure, Frontend Architecture & Shared Modules

---

# 63. Repository Strategy

The project shall use one GitHub repository containing all runtime applications and shared configuration.

The repository shall remain simple enough for a non-specialist maintainer to understand.

Version 1.0 shall use JavaScript rather than TypeScript.

The repository shall not require Turborepo, Nx, Docker, Kubernetes, or another monorepo framework.

The root `package.json` may use npm workspaces to simplify dependency installation and shared commands.

---

# 64. Final Repository Structure

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
│   ├── constants.js
│   └── validation.js
│
├── assets/
│   ├── branding/
│   │   └── grmetro-logo.png
│   ├── references/
│   │   └── dashboard-reference.png
│   └── qr/
│
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── UI_SPEC.md
│   ├── SERVICETITAN.md
│   └── TASKS.md
│
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── .env.example
└── .gitignore
```

The repository shall contain exactly three applications:

1. Backend
2. Dashboard
3. Remote

The dashboard and remote shall be separate browser applications but may share the same React and styling conventions.

---

# 65. Root Files

## `package.json`

The root package file shall:

- Declare npm workspaces.
- Provide shared development commands.
- Install all application dependencies through one root command.
- Avoid unnecessary build tooling.

Recommended scripts:

```json
{
  "scripts": {
    "install:all": "npm install",
    "dev": "concurrently \"npm run dev --workspace apps/backend\" \"npm run dev --workspace apps/dashboard\" \"npm run dev --workspace apps/remote\"",
    "dev:backend": "npm run dev --workspace apps/backend",
    "dev:dashboard": "npm run dev --workspace apps/dashboard",
    "dev:remote": "npm run dev --workspace apps/remote",
    "build": "npm run build --workspace apps/dashboard && npm run build --workspace apps/remote",
    "start": "npm run start --workspace apps/backend",
    "test": "npm run test --workspaces --if-present"
  }
}
```

The exact package versions may be selected during implementation.

---

## `.env.example`

The root environment template shall document all required configuration.

Example:

```env
PORT=3000
HOST=0.0.0.0

EDGE_DEBUG_URL=http://127.0.0.1:9222
EDGE_CONNECTION_TIMEOUT_MILLISECONDS=30000
SERVICETITAN_BASE_URL=https://go.servicetitan.com

TIMEZONE=America/New_York
REFRESH_INTERVAL_SECONDS=60
REMOTE_OVERRIDE_SECONDS=120

DASHBOARD_ORIGIN=http://localhost:5173
REMOTE_ORIGIN=http://localhost:5174
```

Secrets shall never be committed.

ServiceTitan credentials shall not be stored in `.env`.

---

## `.gitignore`

The ignore file shall include:

```text
node_modules/
dist/
.env
.env.local
*.log
coverage/
.DS_Store
Thumbs.db
playwright-report/
test-results/
```

---

## `README.md`

The README shall explain:

- What the application does.
- System requirements.
- How to launch Edge with remote debugging.
- How to install dependencies.
- How to start development mode.
- How to configure televisions.
- How to generate QR codes.
- How to deploy on the office network.
- Common troubleshooting steps.

---

## `AGENTS.md`

This file shall contain binding instructions for Codex and future coding agents.

It shall require agents to:

- Read all specification files before changing architecture.
- Never scrape ServiceTitan HTML.
- Keep exactly five slides.
- Preserve independent per-TV state.
- Keep business calculations in the backend.
- Avoid introducing databases in Version 1.0.
- Avoid adding dependencies without justification.
- Preserve the approved light GRmetro visual design.
- Update documentation when implementation changes.

---

# 66. Shared Module Philosophy

The `shared` directory is the single source of truth for configuration used by multiple applications.

Shared modules shall contain plain JavaScript objects and utility functions.

They shall not depend on browser-only or server-only APIs.

Backend, dashboard, and remote may import shared modules.

Business-sensitive calculations shall still occur in the backend.

The shared folder may define names, IDs, labels, colors, and allowed values.

---

# 67. Shared Files

## `shared/technicians.js`

Contains the five configured technicians.

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

Technicians are intentionally configured manually in Version 1.0.

Adding a technician should require changing only this file.

---

## `shared/goals.js`

Contains KPI goals.

Goals may be company-wide or technician-specific.

Recommended structure:

```javascript
module.exports = {
  default: {
    revenue: 0,
    billableServiceCalls: 0,
    serviceRevenue: 0,
    opportunities: 10,
    leadConversionRate: 0,
    techLeads: 0,
    marketedLeads: 0,
    closingRate: 0,
    installs: 0,
    installAverageTicket: 0,
    installRevenue: 0
  },

  technicians: {
    "134926818": {},
    "3841": {},
    "3853": {},
    "133469538": {},
    "127491426": {}
  }
};
```

A technician-specific value overrides the default.

A goal value of `null` means no goal is configured.

A goal value of zero is valid only when management intentionally defines zero as the target.

---

## `shared/kpis.js`

Defines all supported KPIs and their display metadata.

Each KPI definition shall include:

- Stable internal ID.
- Display label.
- Short label.
- Data type.
- Number format.
- Unit.
- Higher-is-better behavior.
- Goal support.
- Color.
- ServiceTitan source or derivation note.

Example:

```javascript
module.exports = {
  revenue: {
    id: "revenue",
    label: "Revenue",
    shortLabel: "Revenue",
    format: "currency",
    higherIsBetter: true,
    supportsGoal: true,
    color: "#D4AF37"
  },

  billableServiceCalls: {
    id: "billableServiceCalls",
    label: "Billable Service Calls",
    shortLabel: "Billable Calls",
    format: "integer",
    higherIsBetter: true,
    supportsGoal: true,
    color: "#2563EB"
  }
};
```

Only KPIs approved in the specification shall appear.

---

## `shared/slides.js`

Defines the five-slide rotation.

```javascript
module.exports = [
  {
    id: "revenue",
    label: "Revenue",
    durationSeconds: 15
  },
  {
    id: "activity",
    label: "Activity",
    durationSeconds: 15
  },
  {
    id: "performance",
    label: "Performance",
    durationSeconds: 15
  },
  {
    id: "average-ticket",
    label: "Avg Ticket",
    durationSeconds: 15
  },
  {
    id: "top-three",
    label: "Top 3",
    durationSeconds: 25
  }
];
```

Slide order is fixed in Version 1.0.

---

## `shared/televisions.js`

Defines available television IDs and friendly names.

Example:

```javascript
module.exports = [
  {
    id: "break-room",
    name: "Break Room TV"
  },
  {
    id: "dispatch",
    name: "Dispatch TV"
  },
  {
    id: "training-room",
    name: "Training Room TV"
  },
  {
    id: "front-office",
    name: "Front Office TV"
  },
  {
    id: "shop",
    name: "Shop TV"
  }
];
```

Names may be adjusted when final room assignments are known.

Each ID shall be:

- Unique.
- Lowercase.
- URL-safe.
- Stable after deployment.

---

## `shared/constants.js`

Contains shared fixed values.

Example:

```javascript
module.exports = {
  TV_MODES: {
    LIVE: "live",
    REMOTE: "remote",
    RETURNING: "returning"
  },

  WS_EVENTS: {
    DASHBOARD_UPDATE: "dashboard:update",
    TV_UPDATE: "tv:update",
    CONNECTION_STATUS: "connection:status"
  },

  DEFAULT_SLIDE_ID: "revenue"
};
```

---

## `shared/validation.js`

Provides shared validation helpers for:

- Television IDs.
- Technician IDs.
- KPI IDs.
- Slide IDs.
- Remote override payloads.

The backend remains authoritative and must validate all incoming requests.

---

# 68. Backend Application Structure

```text
apps/backend/
│
├── package.json
├── src/
│   ├── index.js
│   ├── app.js
│   ├── config.js
│   │
│   ├── browser/
│   │   ├── browserManager.js
│   │   └── findServiceTitanPage.js
│   │
│   ├── servicetitan/
│   │   ├── client.js
│   │   ├── endpoints.js
│   │   ├── requestBuilder.js
│   │   ├── responseParser.js
│   │   └── csrf.js
│   │
│   ├── data/
│   │   ├── normalizer.js
│   │   ├── metricDerivations.js
│   │   ├── goalEngine.js
│   │   ├── rankingEngine.js
│   │   └── dashboardBuilder.js
│   │
│   ├── cache/
│   │   └── dashboardCache.js
│   │
│   ├── tv/
│   │   ├── tvManager.js
│   │   └── expirationMonitor.js
│   │
│   ├── realtime/
│   │   ├── websocketServer.js
│   │   └── broadcaster.js
│   │
│   ├── routes/
│   │   ├── dashboardRoutes.js
│   │   ├── tvRoutes.js
│   │   ├── healthRoutes.js
│   │   └── developmentRoutes.js
│   │
│   ├── jobs/
│   │   └── refreshScheduler.js
│   │
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── requestLogger.js
│   │   └── validateJson.js
│   │
│   └── utils/
│       ├── logger.js
│       ├── dates.js
│       ├── numbers.js
│       └── errors.js
│
└── test/
    ├── normalizer.test.js
    ├── rankingEngine.test.js
    ├── goalEngine.test.js
    └── tvManager.test.js
```

---

# 69. Backend File Responsibilities

## `src/index.js`

Application entry point.

Responsibilities:

- Load configuration.
- Start HTTP server.
- Attach WebSocket server.
- Connect to Edge.
- Run the first ServiceTitan refresh.
- Start scheduled refreshes.
- Start television expiration monitoring.
- Handle shutdown signals.

No business logic shall exist here.

---

## `src/app.js`

Creates and configures the Express application.

Responsibilities:

- JSON parsing.
- CORS policy.
- Request logging.
- Route registration.
- Static production file hosting.
- Final error handling.

---

## `src/config.js`

Reads environment variables and validates configuration.

The application shall fail clearly at startup when required configuration is missing or invalid.

---

## `browser/browserManager.js`

Maintains one persistent Playwright CDP connection.

Responsibilities:

- Connect to Edge.
- Reuse the browser connection.
- Detect disconnects.
- Reconnect with bounded retries.
- Return the correct ServiceTitan page.

The browser manager shall never launch an automated browser.

---

## `browser/findServiceTitanPage.js`

Finds the active ServiceTitan page in the connected Edge context.

Preference order:

1. Technician Scorecard page.
2. Any authenticated `go.servicetitan.com` page.
3. Fail with an actionable message.

---

## `servicetitan/client.js`

Provides the only interface through which the backend communicates with ServiceTitan.

Responsibilities:

- Execute authenticated requests inside the logged-in page.
- Send required headers.
- Include CSRF token.
- Validate HTTP status.
- Parse JSON.
- Produce useful errors.

It shall not calculate rankings or dashboard values.

---

## `servicetitan/endpoints.js`

Contains all known ServiceTitan endpoint paths in one location.

No endpoint string shall be duplicated elsewhere.

---

## `servicetitan/requestBuilder.js`

Builds request payloads using:

- Technician ID.
- Current date.
- Time zone.
- Business unit IDs.
- Required ServiceTitan field list.
- Current dashboard reload key when required.

Request payload logic shall be isolated from the client.

---

## `servicetitan/responseParser.js`

Checks raw API response shapes.

Responsibilities:

- Confirm arrays and objects exist as expected.
- Detect login redirects or HTML responses.
- Produce typed normalized errors.
- Avoid silently accepting malformed data.

---

## `servicetitan/csrf.js`

Retrieves the current CSRF token from the authenticated ServiceTitan page or from a recently observed request.

The token shall never be hardcoded.

---

## `data/normalizer.js`

Transforms ServiceTitan records into the internal technician model.

Raw ServiceTitan objects shall not leave this module unprocessed.

---

## `data/metricDerivations.js`

Contains approved derivations where one requested KPI does not map directly to one ServiceTitan field.

Every derivation shall include a comment explaining its business meaning and limitations.

No guessed derivation shall be implemented without explicit configuration or validation.

---

## `data/goalEngine.js`

Combines current values with configured goals.

Output includes:

```javascript
{
  value,
  goal,
  percentComplete,
  remaining,
  reached
}
```

Percent complete may exceed 100%.

---

## `data/rankingEngine.js`

Calculates:

- Rank for each KPI.
- Slide-specific ordering.
- Overall Top 3 score.
- Previous-vs-current rank changes.

Tie behavior must be deterministic.

Default tie-break order:

1. Primary metric.
2. Revenue.
3. Technician name alphabetically.

---

## `data/dashboardBuilder.js`

Creates the final frontend payload.

The dashboard frontend shall receive data already organized by:

- Technicians.
- Slides.
- Rankings.
- Goals.
- Overall Top 3.
- Update timestamps.

---

## `cache/dashboardCache.js`

Stores the latest successful dashboard payload and metadata.

It shall retain the previous successful payload when a refresh fails.

---

## `tv/tvManager.js`

Maintains independent state for all configured televisions.

It handles:

- Live mode.
- Remote override.
- Selected technician.
- Selected KPI or slide.
- Expiration time.
- Return to live rotation.

---

## `tv/expirationMonitor.js`

Checks remote overrides once per second.

When an override expires:

1. Set TV mode to `returning`.
2. Broadcast state.
3. Allow the frontend return animation.
4. Set mode to `live`.
5. Broadcast final state.

The return animation interval shall be configurable and short.

---

## `realtime/websocketServer.js`

Accepts dashboard and remote WebSocket clients.

Responsibilities:

- Register clients.
- Associate dashboard connections with TV IDs.
- Handle reconnects.
- Remove closed clients.
- Reject malformed messages.

---

## `realtime/broadcaster.js`

Sends:

- Dashboard updates to all displays.
- TV state updates only to affected displays and remotes.
- Connection status events.
- Initial state after a client connects.

---

## `routes/dashboardRoutes.js`

Provides normalized dashboard data.

Primary route:

```text
GET /api/v1/dashboard
```

---

## `routes/tvRoutes.js`

Provides television state and remote override actions.

Routes:

```text
GET /api/v1/tvs
GET /api/v1/tvs/:tvId
POST /api/v1/tvs/:tvId/override
POST /api/v1/tvs/:tvId/resume
```

---

## `routes/healthRoutes.js`

Provides health information.

Route:

```text
GET /api/v1/health
```

Response shall include:

- Backend status.
- Browser connection status.
- ServiceTitan status.
- Last successful refresh.
- Cache age.

Sensitive information shall not be included.

---

## `routes/developmentRoutes.js`

Development-only routes.

May include:

```text
POST /api/v1/dev/refresh
POST /api/v1/dev/mock
```

These routes must be disabled in production.

---

## `jobs/refreshScheduler.js`

Runs the data refresh immediately at startup and then every sixty seconds.

It shall prevent overlapping refreshes.

If one refresh is still running, the next scheduled attempt is skipped and logged.

---

# 70. Dashboard Application Structure

```text
apps/dashboard/
│
├── package.json
├── vite.config.js
├── index.html
├── public/
│   └── logo.png
│
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    │
    ├── api/
    │   ├── dashboardApi.js
    │   └── websocketClient.js
    │
    ├── state/
    │   ├── useDashboardStore.js
    │   ├── useTvState.js
    │   └── useRotation.js
    │
    ├── layout/
    │   ├── DashboardShell.jsx
    │   ├── Header.jsx
    │   ├── Navigation.jsx
    │   ├── LiveStatus.jsx
    │   └── Footer.jsx
    │
    ├── slides/
    │   ├── SlideEngine.jsx
    │   ├── MetricSlide.jsx
    │   ├── TopThreeSlide.jsx
    │   └── TechnicianDetailView.jsx
    │
    ├── charts/
    │   ├── OverlayBarChart.jsx
    │   ├── TechnicianBars.jsx
    │   ├── AnimatedAxis.jsx
    │   ├── GoalSummary.jsx
    │   └── chartMath.js
    │
    ├── components/
    │   ├── AnimatedNumber.jsx
    │   ├── TechnicianLabel.jsx
    │   ├── RankBadge.jsx
    │   ├── MetricLegend.jsx
    │   ├── StatusBanner.jsx
    │   ├── ErrorOverlay.jsx
    │   └── QrCodeBadge.jsx
    │
    ├── topThree/
    │   ├── TopThreeCard.jsx
    │   ├── FirstPlaceCard.jsx
    │   └── SpotlightEffects.jsx
    │
    ├── animation/
    │   ├── motionConfig.js
    │   ├── numberAnimation.js
    │   └── transitions.js
    │
    └── utils/
        ├── formatters.js
        ├── time.js
        └── display.js
```

---

# 71. Dashboard Technology

The dashboard shall use:

- React.
- Vite.
- Framer Motion.
- Custom SVG charts.
- Plain CSS or CSS modules.

Tailwind CSS is not required.

Avoiding Tailwind may make exact mockup matching and future maintenance simpler for this project.

No large chart library shall be used in Version 1.0.

---

# 72. Dashboard Component Responsibilities

## `App.jsx`

Reads the TV ID from the URL.

Example:

```text
/display/break-room
```

Responsibilities:

- Validate TV ID.
- Load initial dashboard data.
- Open WebSocket connection.
- Render the main shell.
- Handle reconnect state.

---

## `DashboardShell.jsx`

Provides the fixed visual frame.

It contains:

- Header.
- Navigation.
- Main content area.
- Status banners.
- Optional QR badge.

The shell itself never slides.

---

## `Header.jsx`

Displays:

- GRmetro logo.
- Application title.
- Navigation.
- Current time.
- Last updated status.

---

## `Navigation.jsx`

Displays exactly five tabs.

The active underline animates between tab positions.

TV viewers cannot interact with navigation.

---

## `SlideEngine.jsx`

Determines what content to render based on:

- Current live rotation slide.
- TV mode.
- Remote-selected technician.
- Remote-selected KPI.

It shall preserve component identity where possible so content morphs rather than remounts.

---

## `MetricSlide.jsx`

Reusable slide renderer for:

- Revenue.
- Activity.
- Performance.
- Average Ticket.

It receives slide configuration and backend-prepared data.

It shall not contain KPI-specific business rules.

---

## `TopThreeSlide.jsx`

Renders the dedicated Top 3 slide.

It shall not render on any other slide.

---

## `TechnicianDetailView.jsx`

Used during remote override when a technician is selected.

Behavior:

- Technician without KPI: rotate or display an approved compact scorecard view.
- Technician with KPI: display the selected KPI prominently with graph, goal, rank, and supporting metrics.

The exact remote detail layout shall remain visually consistent with normal slides.

---

# 73. SVG Chart Engine

Charts shall be built with SVG.

Benefits:

- Precise overlapping transparency.
- Smooth width morphing.
- Lightweight rendering.
- Consistent scaling.
- No dependency on a general chart package.

---

## Overlay Bars

For each technician row, multiple bars occupy the same vertical lane.

Example:

```text
Technician name | ███████████████████ Total Revenue
                | █████████████ Service Revenue
                | █████ Install Revenue
```

Bars are drawn over one another with:

- Different widths.
- Fixed colors.
- Controlled opacity.
- Slight vertical offsets only when required for readability.

They are not stacked.

They are not grouped into separate rows.

---

## Scale Calculation

For each slide:

```text
maximum displayed metric value
→ rounded visual maximum
→ axis tick generation
```

The axis maximum shall use human-friendly rounding.

Examples:

```text
8,420 → 10,000
43 → 50
0.72 → 100%
```

Scale changes shall animate.

---

## Bar Animation

Bar width shall animate from the previous value to the new value.

The bar element shall remain mounted.

Default duration:

```text
600–900 ms
```

Animation easing shall be smooth and restrained.

---

## Zero Values

A zero value shall display:

- No visible bar width or a minimal baseline marker.
- A numeric zero label when zero is valid data.

Missing data shall display an em dash rather than zero.

---

# 74. Frontend State

The dashboard shall maintain only presentation state:

- Current slide.
- Previous slide.
- TV mode.
- Selected technician.
- Selected KPI.
- Current backend payload.
- Connection status.
- Last update timestamp.

It shall not calculate rankings or goals.

---

# 75. Live Rotation Hook

`useRotation.js` shall:

- Read fixed slide durations.
- Advance through exactly five slides.
- Pause during remote mode.
- Reset to Revenue when returning to live mode.
- Avoid drift over long runtimes.
- Recover cleanly after browser tab suspension.

Rotation timing should use actual timestamps rather than relying only on repeated `setTimeout` calls.

---

# 76. Dashboard URL Design

Each television uses a stable URL.

Examples:

```text
http://dashboard-pc:3000/display/break-room
http://dashboard-pc:3000/display/dispatch
http://dashboard-pc:3000/display/training-room
```

The backend may serve the built dashboard application in production.

Unknown TV IDs shall show a clear setup screen rather than a blank page.

---

# 77. Remote Application Structure

```text
apps/remote/
│
├── package.json
├── vite.config.js
├── index.html
│
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    │
    ├── api/
    │   ├── remoteApi.js
    │   └── websocketClient.js
    │
    ├── screens/
    │   ├── TvSelection.jsx
    │   ├── ControlPanel.jsx
    │   └── Confirmation.jsx
    │
    ├── components/
    │   ├── TvCard.jsx
    │   ├── TechnicianPicker.jsx
    │   ├── KpiPicker.jsx
    │   ├── ApplyButton.jsx
    │   ├── ResumeButton.jsx
    │   └── OverrideTimer.jsx
    │
    └── utils/
        ├── queryParams.js
        └── validation.js
```

---

# 78. Remote URL Design

A general remote URL:

```text
/remote
```

allows the user to select a television.

A television-specific QR code shall use:

```text
/remote?tv=break-room
```

When a valid TV ID is supplied, the remote skips TV selection and opens that TV's control panel immediately.

This is the preferred QR-code experience.

---

# 79. Remote Interaction Model

The remote shall use one control screen after TV identification.

The user chooses one of two independent paths:

```text
Technician
or
KPI
```

The interface shall not force:

```text
Technician → KPI
```

The user may choose:

- Technician only.
- KPI only.
- Technician and optional KPI.

Examples:

```text
Technician only:
Show Julio's scorecard.
```

```text
KPI only:
Show the Revenue leaderboard and graph.
```

```text
Technician + KPI:
Show Julio's Revenue detail.
```

---

# 80. Remote Control Panel

The control panel shall contain:

1. Current TV name.
2. Current display status.
3. Technician selector.
4. KPI selector.
5. Apply button.
6. Resume Live Rotation button.
7. Remaining override timer when active.

Technician and KPI selections are independently optional, subject to validation.

At least one must be selected before applying.

---

# 81. Remote Override Rules

Valid combinations:

| Technician | KPI | Result |
|---|---|---|
| Selected | None | Individual technician scorecard |
| None | Selected | KPI graph and Top 3 for that KPI |
| Selected | Selected | Individual technician KPI detail |
| None | None | Invalid; Apply disabled |

The backend shall validate the same rules.

---

# 82. Remote Timeout

Each successful remote command creates or resets a 120-second override timer.

Any subsequent command for that TV restarts the timer.

When time expires:

- The TV returns to live rotation.
- The remote updates to show that live mode has resumed.
- Other televisions are unaffected.

---

# 83. QR-Code Placement

Each television shall display or have a nearby printed QR code linked to its own remote URL.

The QR code may appear as:

- A small persistent corner badge on screen.
- A printed label attached near the television.
- Both.

The QR code shall not obstruct charts.

---

# 84. Shared Visual Language

Dashboard and remote shall share:

- GRmetro logo.
- Core color palette.
- Typography.
- Rounded corners.
- Button styling.
- KPI labels.

The remote shall prioritize touch usability rather than copying the TV layout.

---

# 85. Development Workflow

Initial setup:

```bash
git clone <repository>
cd grmetro-live-performance-center
npm install
```

Development:

```bash
npm run dev
```

This starts:

- Backend.
- Dashboard Vite server.
- Remote Vite server.

Individual applications may also be started separately.

---

# 86. Production Build

The dashboard and remote shall be compiled into static assets.

Recommended production structure:

```text
apps/backend/public/dashboard/
apps/backend/public/remote/
```

The Express backend may serve both applications.

Production routes:

```text
/display/:tvId
/remote
/api/v1/*
```

This allows all televisions and phones to connect to one office computer.

---

# 87. Source Control Rules

Commits shall be small and meaningful.

Recommended sequence:

```text
chore: initialize repository structure
feat: add shared technician and KPI configuration
feat: implement Edge connection manager
feat: implement ServiceTitan client
feat: add normalization and ranking engine
feat: add dashboard REST API and cache
feat: add per-TV state manager
feat: add WebSocket broadcasting
feat: build dashboard shell
feat: build SVG metric slide engine
feat: build Top 3 slide
feat: build QR remote
feat: add production deployment scripts
```

Direct commits to `main` should be avoided once implementation begins.

---

# 88. Testing Strategy Overview

Backend business logic shall receive unit tests.

Priority test areas:

- KPI normalization.
- Goal calculations.
- Ranking ties.
- Overall Top 3 score.
- TV override validation.
- Expiration behavior.
- Request payload construction.
- Malformed ServiceTitan responses.

Visual components shall receive targeted tests where practical.

End-to-end tests shall use mock data rather than live ServiceTitan in automated environments.

---

# 89. Mock Data Requirement

The repository shall include realistic mock technician data.

Mock mode shall allow the full dashboard and remote to operate without:

- ServiceTitan access.
- Edge remote debugging.
- Office network access.

Mock mode is mandatory for frontend development and automated testing.

Production mode shall never silently fall back to mock data.

---

**End of Part 4**

# Part 5 — ServiceTitan Integration, KPI Definitions & Ranking Rules

---

# 91. Purpose of This Section

This section defines:

- The approved ServiceTitan integration method.
- The known native API endpoints.
- Required request payloads.
- The exact Version 1.0 KPI list.
- Direct ServiceTitan field mappings.
- Derived KPI rules.
- Goal configuration.
- Ranking behavior.
- Overall Top 3 scoring.
- Missing and unreliable data behavior.

This section is authoritative.

Implementation must not invent KPI mappings that are not defined here.

---

# 92. Integration Principle

The backend shall use the same authenticated JSON requests used by the ServiceTitan Technician Scorecard page.

The system shall not:

- Scrape HTML.
- Read visible KPI cards from the DOM.
- Simulate tab clicks to collect values.
- Parse screenshots.
- Export CSV files on a schedule.
- Store ServiceTitan usernames or passwords.
- Automate MFA.
- Attempt to bypass bot detection.

Playwright is used only to attach to an Edge browser that the user launched and authenticated manually.

---

# 93. Required Edge Launch Method

Microsoft Edge must be launched with a remote debugging port and a dedicated user-data directory.

Example Windows command:

```bat
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\EdgeAutomation"
```

The alternative installation path may be:

```bat
"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
```

The implementation shall document both possibilities.

The Edge window must remain open while the backend is operating.

---

# 94. Browser Connection Endpoint

Default CDP endpoint:

```text
http://127.0.0.1:9222
```

Use `127.0.0.1` rather than `localhost` to avoid IPv6 resolution issues involving `::1`.

The value shall remain configurable through:

```env
EDGE_DEBUG_URL=http://127.0.0.1:9222
```

---

# 95. ServiceTitan Base URL

```text
https://go.servicetitan.com
```

Configured through:

```env
SERVICETITAN_BASE_URL=https://go.servicetitan.com
```

All ServiceTitan endpoint paths shall be stored centrally.

---

# 96. Known Native Endpoints

## 96.1 Technician Overview

Method:

```text
POST
```

Path:

```text
/app/api/reporting/modulardashboard/GetTechnicianOverview
```

Purpose:

Returns basic technician identity and summary KPI information.

Known response shape:

```json
{
  "personalInfo": {
    "id": 134926818,
    "companyPosition": "Service",
    "technicianType": "Managed",
    "role": "Technician",
    "truck": "Truck 1",
    "phoneNumber": "7089281442",
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

This endpoint is useful for:

- Technician identity validation.
- Basic fallback values.
- Health checks.
- Comparing aggregate results with the primary technician datasource.

It is not the primary source for all Version 1.0 KPIs.

---

## 96.2 Technician Datasource

Method:

```text
POST
```

Path:

```text
/app/api/reporting/CustomReport/GetDatasourceData?datasource=Technicians&forTechScorecards=true
```

Purpose:

Returns the primary technician KPI record for a selected technician and date range.

This is the primary source for aggregate technician KPIs.

---

## 96.3 Technician Job Drilldown Datasource

Method:

```text
POST
```

Path:

```text
/app/api/reporting/CustomReport/GetDatasourceData?datasource=TechnicianJobsExtendedDrilldownDatasource&parentDatasource=Technicians&forTechScorecards=true
```

Purpose:

Returns job-level or grouped drilldown information associated with the selected technician.

This endpoint shall be used when an approved KPI requires classification by job type, business unit, or install/service category.

Examples include:

- Service Revenue.
- Install Revenue.
- Billable Service Calls.
- Number of Installs.
- Install Average Ticket.

The implementation shall confirm the exact response shape during integration and document it in `docs/SERVICETITAN.md`.

---

## 96.4 Scorecard Datasource Metadata

Method:

```text
GET
```

Paths:

```text
/app/api/reporting/CustomReport/GetDatasourceForTechScorecards?name=Technicians
```

```text
/app/api/reporting/CustomReport/GetDatasourceForTechScorecards?name=TechnicianJobsExtendedDrilldownDatasource
```

Purpose:

Returns datasource field metadata and may be used to validate available fields.

The metadata endpoints are not required for every refresh.

They may be queried at startup or during diagnostics.

---

# 97. Technician Overview Request Body

Known request body:

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

The implementation shall dynamically substitute:

- `from`
- `to`
- `technicianId`
- `timeZone`

Business unit IDs may be configured.

`reloadKey` shall not be assumed permanent.

The client should discover or centrally configure it and expose a clear error if it becomes invalid.

---

# 98. Technician Datasource Request Body

Known request body:

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

The field list shall be stored once in central configuration.

It shall not be duplicated in multiple files.

The implementation may request additional confirmed fields when required by approved KPI mappings.

---

# 99. Job Drilldown Request Body

Known request body:

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

The meaning of each `KpiType` value must be verified before implementation relies on it.

The application must not guess `KpiType` semantics.

---

# 100. Date Range

Version 1.0 displays data for:

```text
Today
```

The backend shall calculate today's date using:

```text
America/New_York
```

Default request values:

```text
From = local current date
To = local current date
```

The date format shall be:

```text
YYYY-MM-DD
```

The architecture should permit future date ranges without changing KPI models.

---

# 101. CSRF Handling

Successful browser requests include:

```text
X-CSRF-Token
```

The token must never be copied permanently into source code or configuration.

The ServiceTitan client shall use a token provider capable of retrieving the current token from the authenticated browser session.

Approved strategies, in preferred order:

1. Read the token from a stable ServiceTitan page source or application state when available.
2. Observe a successful same-origin ServiceTitan request and cache its `x-csrf-token` header.
3. Retrieve it from a confirmed cookie or browser storage entry when ServiceTitan exposes it there.

The client shall refresh the token after:

- Authentication changes.
- A 401 response.
- A 403 response.
- An explicit CSRF failure response.
- Browser reconnection.

The token shall remain in memory only.

---

# 102. Request Headers

ServiceTitan POST requests shall include:

```text
Accept: application/json
Content-Type: application/json
X-Requested-With: XMLHttpRequest
X-CSRF-Token: <current token>
```

The browser session supplies authenticated cookies.

The implementation should avoid copying unnecessary browser fingerprint headers such as:

- `sec-ch-ua`
- `traceparent`
- `tracestate`
- `user-agent`

unless ServiceTitan later proves they are required.

---

# 103. Request Execution Location

Requests should execute through the authenticated browser context.

Preferred implementation:

```javascript
page.evaluate(...)
```

or a browser-context request mechanism that demonstrably preserves:

- Authenticated cookies.
- Tenant context.
- CSRF behavior.
- Same-origin behavior.

The implementation shall verify that a JSON response was received.

An HTML response must be treated as an error.

---

# 104. HTML Response Detection

The ServiceTitan response parser shall reject a response when:

- `Content-Type` contains `text/html`.
- The response body begins with `<!doctype html`.
- The body appears to be the ServiceTitan application shell.
- The final response URL is a hash-routed scorecard page.
- JSON parsing fails after an HTTP success status.

A diagnostic error shall include:

- Endpoint.
- HTTP status.
- Final URL.
- Content type.
- A short redacted body preview.

---

# 105. Version 1.0 KPI List

The approved KPI list is exactly:

1. Revenue
2. Billable Service Calls
3. Service Revenue
4. 10+ Opportunities
5. Lead Conversion %
6. Tech Leads
7. Marketed Leads
8. Closing %
9. Number of Installs
10. Install Average Ticket
11. Install Revenue

The asterisk concept discussed during planning means each KPI supports a separately configured goal displayed beside the graph.

The asterisk is not part of the KPI's visible label unless the final UI mockup specifically includes it.

---

# 106. Internal KPI IDs

Stable internal IDs:

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

Internal IDs shall not change because labels change.

---

# 107. Direct KPI Mappings

The following mappings are approved as direct mappings.

| Internal KPI | ServiceTitan field | Conversion |
|---|---|---|
| Revenue | `CompletedRevenue` | Currency |
| Opportunities | `Opportunity` | Integer |
| Tech Leads | `TechLeadJobs` | Integer |
| Marketed Leads | `MarketingLeadJobs` | Integer |
| Closing % | `CloseRate` | Decimal ratio converted to percent |
| Lead Conversion % | `LeadConversionRate` | Decimal ratio converted to percent |

Example conversion:

```javascript
0.5 → 50
```

Raw ratio values shall remain available internally if useful, but frontend values are percentages from 0 to 100 or higher when mathematically valid.

---

# 108. Opportunity Label

The visible label shall be:

```text
10+ Opportunities
```

The underlying value is the technician's current opportunity count.

This KPI is considered achieved when the configured goal is at least ten and the current count meets or exceeds that goal.

The backend does not alter the value to a Boolean.

Example:

```text
Current: 12
Goal: 10
Reached: true
```

---

# 109. Billable Service Calls

`CompletedJobs` is not automatically equivalent to Billable Service Calls.

A completed job may be:

- A service call.
- An installation.
- A no-charge job.
- A recall.
- Another job category.

Therefore, Version 1.0 shall calculate Billable Service Calls using job-level classification whenever adequate drilldown data is available.

Approved definition:

```text
Count of completed jobs classified as billable service work
for the selected technician and date range.
```

The classification configuration shall identify:

- Included service job types.
- Excluded install job types.
- Excluded recalls when appropriate.
- Excluded warranty or no-charge work when appropriate.

If job-level classification is not yet configured, the backend may expose:

```text
Completed Jobs
```

as a temporary diagnostic metric, but must not label it “Billable Service Calls.”

Production deployment requires a validated classification.

---

# 110. Service Revenue

`CompletedRevenue` is total completed revenue and shall not be reused as Service Revenue.

Approved definition:

```text
Completed revenue from jobs classified as service work.
```

Service Revenue must be derived from job-level or grouped drilldown data using configured service job types or business units.

The implementation shall not use:

```text
serviceRevenue = CompletedRevenue
```

unless GRmetro explicitly confirms that every selected job is service work.

---

# 111. Install Revenue

`TotalSales` is not automatically equivalent to Install Revenue.

Approved definition:

```text
Completed or recognized revenue from jobs classified as installations.
```

Install Revenue must be derived from:

- Install-classified completed jobs.
- An explicitly confirmed ServiceTitan install revenue field.
- Or a confirmed replacement/install datasource.

The implementation shall not silently map:

```text
TotalSales → Install Revenue
```

without business validation.

---

# 112. Number of Installs

`ClosedOpportunities` is not automatically equivalent to completed installations.

Approved definition:

```text
Count of completed jobs classified as installations.
```

The value should be calculated from install-classified jobs in the drilldown datasource.

A sold opportunity that has not yet been installed shall not count as a completed install unless GRmetro explicitly changes the definition.

---

# 113. Install Average Ticket

Approved formula:

```text
Install Revenue ÷ Number of Installs
```

Only completed install jobs included in Install Revenue may contribute to the denominator.

When install count equals zero:

```text
Install Average Ticket = no data
```

The value shall not display as `$0` unless an actual zero-value completed installation exists.

---

# 114. Job Classification Configuration

A central configuration file shall define service and install classification.

Recommended file:

```text
shared/jobClassifications.js
```

Recommended structure:

```javascript
module.exports = {
  service: {
    includedJobTypeIds: [],
    includedJobTypeNames: [],
    excludedJobTypeIds: [],
    excludedNamePatterns: [
      "install",
      "replacement"
    ]
  },

  install: {
    includedJobTypeIds: [],
    includedJobTypeNames: [],
    includedNamePatterns: [
      "install",
      "replacement"
    ]
  }
};
```

ID-based classification is preferred over name matching.

Name matching is a fallback and shall be case-insensitive.

Ambiguous jobs shall be logged and excluded from derived service/install KPIs until classified.

---

# 115. KPI Data Quality Status

Every derived KPI shall carry a quality indicator internally.

Allowed values:

```text
confirmed
derived
fallback
unavailable
```

Definitions:

- `confirmed`: direct validated ServiceTitan field.
- `derived`: calculated from validated job-level data.
- `fallback`: temporary approximation requiring review.
- `unavailable`: insufficient data to calculate reliably.

Production UI should normally show only `confirmed` and `derived` KPIs.

Fallback values may be enabled through development configuration.

---

# 116. Normalized KPI Value Shape

Each technician KPI shall be represented as:

```javascript
{
  id: "revenue",
  value: 848,
  rawValue: 848,
  formattedValue: "$848",
  goal: 1000,
  percentComplete: 84.8,
  remaining: 152,
  reached: false,
  rank: 2,
  previousRank: 3,
  rankChange: 1,
  dataQuality: "confirmed",
  hasData: true
}
```

The backend may omit preformatted strings if formatting is exclusively handled by shared frontend formatters.

Business calculations remain backend-owned.

---

# 117. Missing Data Rules

The following are distinct:

```text
0
```

and:

```text
No Data
```

Zero means a real measurement exists and equals zero.

No Data means:

- ServiceTitan omitted the field.
- The datasource returned `null`.
- A denominator was zero.
- Job classification was unavailable.
- The KPI could not be calculated reliably.

Backend representation:

```javascript
{
  value: null,
  hasData: false
}
```

Frontend display:

```text
—
No Data
```

---

# 118. Percentage Rules

ServiceTitan commonly returns rates as decimal ratios.

Examples:

```text
0.5 → 50%
0.573684 → 57.4%
1.0 → 100%
```

The backend shall use one shared percentage conversion helper.

Do not multiply values that are already in percentage form.

Field behavior shall be covered by tests.

---

# 119. Currency Rules

Currency values shall:

- Use US dollars.
- Display no decimals for large TV views by default.
- Use compact labels only when needed for axis readability.
- Preserve full numeric precision internally.

Examples:

```text
$848
$12,420
$1.2M
```

The exact value should be available in remote or detail views when useful.

---

# 120. Integer Rules

Count KPIs shall be rounded only when the source is conceptually an integer.

Examples:

- Opportunities.
- Leads.
- Installs.
- Calls.

The backend shall not round currency or ratio values prematurely.

---

# 121. Goal Configuration

Goals shall be configured outside application components.

Recommended file:

```text
shared/goals.js
```

Recommended structure:

```javascript
module.exports = {
  defaults: {
    revenue: null,
    billableServiceCalls: null,
    serviceRevenue: null,
    opportunities: 10,
    leadConversionRate: null,
    techLeads: null,
    marketedLeads: null,
    closingRate: null,
    installs: null,
    installAverageTicket: null,
    installRevenue: null
  },

  technicians: {
    "134926818": {},
    "3841": {},
    "3853": {},
    "133469538": {},
    "127491426": {}
  }
};
```

Technician-specific goals override defaults.

`null` means no goal configured.

---

# 122. Goal Calculation

For higher-is-better KPIs:

```text
percentComplete = value ÷ goal × 100
```

Example:

```text
Value: 12
Goal: 10
Percent Complete: 120%
Reached: true
```

The result shall not be capped at 100%.

When goal is null or less than or equal to zero:

```text
percentComplete = null
reached = false
```

unless the KPI has an explicitly defined inverse goal model.

Version 1.0 KPIs are all treated as higher-is-better.

---

# 123. Ranking Scope

Every approved KPI receives a ranking across the five configured technicians.

Rankings are calculated only among technicians with valid data.

Technicians with no data appear after valid technicians and show no numeric rank.

---

# 124. KPI Ranking Rule

Default ranking:

```text
Highest valid value ranks first.
```

Tie-break order:

1. KPI value.
2. Revenue.
3. Technician name alphabetically.

Ranks shall use competition ranking or ordinal ranking consistently.

Version 1.0 shall use ordinal ranking:

```text
1, 2, 3, 4, 5
```

even when values are tied, because deterministic display order is required.

A tied-value indicator may be added later.

---

# 125. Slide Metric Groups

Exactly four KPI slides exist before Top 3.

## Revenue Slide

Primary metrics:

```text
Revenue
Service Revenue
Install Revenue
```

## Activity Slide

Primary metrics:

```text
Billable Service Calls
10+ Opportunities
Tech Leads
Marketed Leads
Number of Installs
```

## Performance Slide

Primary metrics:

```text
Lead Conversion %
Closing %
```

The chart may include supporting ServiceTitan metrics only if explicitly approved later.

Version 1.0 should not add Billable Efficiency or Revenue Per Hour to the main KPI list unless GRmetro requests them.

## Average Ticket Slide

Primary metrics:

```text
Install Average Ticket
```

Supporting values:

```text
Install Revenue
Number of Installs
```

The slide may also display a general average ticket only as a secondary reference if approved during implementation review.

---

# 126. Per-Slide Ranking

Each slide shall identify one primary ranking metric.

```javascript
{
  revenue: "revenue",
  activity: "billableServiceCalls",
  performance: "closingRate",
  averageTicket: "installAverageTicket"
}
```

The remote may request rankings for any individual KPI.

---

# 127. Top 3 Overall Score Philosophy

The dedicated Top 3 slide shall rank technicians using an overall score rather than raw revenue alone.

The score must remain understandable and configurable.

It must not reward unavailable data.

It must not allow one extreme metric to dominate the entire score unintentionally.

---

# 128. Overall Score Inputs

Version 1.0 overall score shall use approved KPIs with valid goals.

Recommended initial inputs:

| KPI | Weight |
|---|---:|
| Revenue | 30% |
| Billable Service Calls | 15% |
| Service Revenue | 10% |
| Opportunities | 10% |
| Lead Conversion % | 10% |
| Tech Leads | 5% |
| Marketed Leads | 5% |
| Closing % | 10% |
| Installs | 2.5% |
| Install Average Ticket | 1.25% |
| Install Revenue | 1.25% |

Total:

```text
100%
```

These weights are an initial configuration, not immutable business policy.

Management should review them before production launch.

---

# 129. Normalized Goal Score

For each KPI with a valid goal:

```text
normalizedScore = value ÷ goal
```

To prevent one metric from dominating due to extreme overperformance, Version 1.0 shall cap each KPI contribution at:

```text
150% of goal
```

Formula:

```text
cappedScore = min(normalizedScore, 1.5)
```

Weighted contribution:

```text
weightedContribution = cappedScore × KPI weight
```

---

# 130. Missing KPI Weight Redistribution

When a technician lacks valid data for a score input:

- Do not treat the value as zero.
- Remove that KPI's weight from the technician's available-weight denominator.
- Normalize the final score across the remaining valid weights.

Formula:

```text
overallScore =
sum(weighted valid contributions)
÷
sum(valid weights)
```

A technician must have sufficient coverage to qualify.

Recommended minimum valid weight coverage:

```text
60%
```

Technicians below the threshold shall be marked:

```text
Insufficient Data
```

and shall not appear in the overall Top 3.

---

# 131. Overall Score Display

The score is primarily an ordering mechanism.

The Top 3 slide does not need to display a confusing raw score such as:

```text
1.1842
```

The UI may display:

```text
118%
```

or omit the score entirely and show the underlying KPIs.

Version 1.0 should emphasize technician performance metrics rather than the score formula.

---

# 132. Top 3 Card Metrics

Each Top 3 card shall display:

- Technician name.
- Overall rank.
- Revenue.
- Billable Service Calls.
- Closing %.
- Lead Conversion %.
- Number of Installs.
- Install Average Ticket.

Tech Leads or Marketed Leads may replace a metric only when layout testing proves the card remains readable.

No more than six supporting KPI values should appear per card.

---

# 133. Rank History

The backend shall retain only the immediately previous successful ranking snapshot in memory.

This supports:

- Rank movement animation.
- `NEW LEADER`.
- `TOP 3` entry notifications.

No historical database is required.

Restarting the backend resets rank history.

---

# 134. Achievement Event Generation

The backend shall generate temporary presentation events when:

## New Overall Leader

Condition:

```text
Current overall rank 1 technician differs from previous rank 1.
```

Event:

```javascript
{
  type: "new-leader",
  technicianId,
  createdAt,
  expiresAt
}
```

## Entered Top 3

Condition:

```text
Previous rank > 3
and
current rank <= 3
```

Event:

```javascript
{
  type: "entered-top-three",
  technicianId,
  createdAt,
  expiresAt
}
```

## Goal Reached

Condition:

```text
Previous reached = false
and
current reached = true
```

Event:

```javascript
{
  type: "goal-reached",
  technicianId,
  kpiId,
  createdAt,
  expiresAt
}
```

Presentation events shall expire after approximately three seconds.

---

# 135. API Refresh Concurrency

The backend refresh scheduler shall prevent overlapping ServiceTitan refreshes.

If a refresh is already running:

```text
Skip the new scheduled refresh.
Log the skip.
```

The backend shall not queue unlimited refresh attempts.

---

# 136. Per-Technician Request Strategy

There are five configured technicians.

The backend may fetch them:

- Sequentially for maximum reliability.
- Or with limited concurrency.

Recommended maximum concurrency:

```text
2
```

Unbounded parallel requests are prohibited.

A failure for one technician shall not discard successful data for all technicians.

---

# 137. Partial Refresh Behavior

When one technician request fails:

- Preserve that technician's last successful cached data.
- Mark the record as stale.
- Update successful technicians.
- Record the failure in health status.
- Retry during the next scheduled refresh.

A technician record may include:

```javascript
{
  stale: true,
  lastSuccessfulUpdate: "2026-07-31T16:00:00.000Z"
}
```

---

# 138. Data Freshness

The dashboard payload shall include:

```javascript
{
  refreshStartedAt,
  refreshedAt,
  lastSuccessfulRefreshAt,
  cacheAgeSeconds,
  serviceTitanStatus
}
```

The dashboard's `Updated X sec ago` label shall use the last successful refresh timestamp.

---

# 139. ServiceTitan Diagnostics

Development diagnostics may capture:

- Endpoint.
- Request duration.
- Status.
- Response content type.
- Response shape summary.
- Technician ID.
- Error category.

Diagnostics shall not log:

- CSRF token.
- Cookies.
- Phone numbers.
- Email addresses.
- Full raw ServiceTitan records in production.

---

# 140. Configuration Validation

At startup, the backend shall validate:

- Exactly five configured technicians.
- Unique technician IDs.
- Unique TV IDs.
- Valid business unit IDs.
- Valid KPI IDs.
- Slide definitions contain exactly five slides.
- Goal IDs match known KPI IDs.
- Overall score weights sum approximately to 1.0.
- Required environment variables exist.
- Remote timeout is positive.
- Refresh interval is positive.

Invalid configuration shall stop startup with an actionable error.

---

# 141. Acceptance Criteria for ServiceTitan Integration

ServiceTitan integration is accepted when all of the following are true:

1. Backend connects to the manually authenticated Edge session.
2. No credentials are stored.
3. CSRF token is acquired dynamically.
4. A valid technician JSON response is returned.
5. HTML responses are detected and rejected.
6. All five configured technicians refresh.
7. Partial failure preserves previous data.
8. Refresh occurs every sixty seconds.
9. Raw ServiceTitan responses are not exposed publicly.
10. Direct and derived KPIs display their data-quality status internally.
11. Service/install classifications are validated before production.
12. The frontend receives only normalized application data.

---

**End of Part 5**

# Part 6 — REST API, WebSocket Protocol & Television State Management

---

# 143. Purpose of This Section

This section defines the contracts between:

- Backend
- Dashboard displays
- Remote-control application

It specifies:

- REST API routes
- Request and response schemas
- WebSocket messages
- Television state
- Remote override behavior
- Live rotation rules
- Expiration behavior
- Reconnection handling
- Multi-TV independence
- Error formats

These contracts shall remain stable throughout Version 1.0.

---

# 144. API Design Principles

The backend API shall be:

- Versioned
- JSON-only
- Predictable
- Readable
- Strictly validated
- Free of raw ServiceTitan data

All production routes shall use the prefix:

```text
/api/v1
```

The frontend shall not depend on undocumented response fields.

---

# 145. Standard API Response Envelope

Successful responses may use the following shape:

```json
{
  "ok": true,
  "data": {}
}
```

Error responses shall use:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_TV_ID",
    "message": "The requested television does not exist.",
    "details": null
  }
}
```

The backend may omit the success envelope for large read-only payloads if consistency and frontend simplicity are better served by returning the data object directly.

One style shall be selected and used consistently.

Recommended approach:

- Direct payload for successful GET routes
- Standard error envelope for failures

---

# 146. Error Codes

Version 1.0 shall define stable machine-readable error codes.

Required codes:

```text
INVALID_JSON
INVALID_TV_ID
INVALID_TECHNICIAN_ID
INVALID_KPI_ID
INVALID_OVERRIDE
NO_SELECTION
SERVICE_TITAN_UNAVAILABLE
SERVICE_TITAN_AUTH_REQUIRED
SERVICE_TITAN_INVALID_RESPONSE
BROWSER_NOT_CONNECTED
CACHE_UNAVAILABLE
REFRESH_IN_PROGRESS
INTERNAL_ERROR
NOT_FOUND
```

User-facing applications shall use `message`.

Logs shall use `code` and detailed context.

---

# 147. Dashboard Data Route

Method:

```text
GET
```

Path:

```text
/api/v1/dashboard
```

Purpose:

Returns the latest normalized dashboard payload.

Example response:

```json
{
  "version": 1,
  "refreshedAt": "2026-07-31T16:45:00.000Z",
  "lastSuccessfulRefreshAt": "2026-07-31T16:45:00.000Z",
  "cacheAgeSeconds": 12,
  "serviceTitanStatus": "connected",
  "technicians": [
    {
      "id": 134926818,
      "name": "Julio Torres",
      "shortName": "Julio",
      "initials": "JT",
      "stale": false,
      "lastSuccessfulUpdate": "2026-07-31T16:45:00.000Z",
      "kpis": {
        "revenue": {
          "value": 848,
          "goal": 1000,
          "percentComplete": 84.8,
          "reached": false,
          "rank": 2,
          "previousRank": 3,
          "rankChange": 1,
          "hasData": true,
          "dataQuality": "confirmed"
        }
      }
    }
  ],
  "slides": {
    "revenue": {},
    "activity": {},
    "performance": {},
    "average-ticket": {},
    "top-three": {}
  },
  "overallTopThree": [],
  "events": []
}
```

The exact slide payload shape may be optimized during implementation, but it shall remain backend-generated.

---

# 148. Television List Route

Method:

```text
GET
```

Path:

```text
/api/v1/tvs
```

Purpose:

Returns all configured televisions and their current state.

Example response:

```json
{
  "tvs": [
    {
      "id": "break-room",
      "name": "Break Room TV",
      "mode": "live",
      "selectedTechnicianId": null,
      "selectedKpiId": null,
      "selectedSlideId": null,
      "overrideStartedAt": null,
      "expiresAt": null,
      "remainingSeconds": null
    }
  ]
}
```

This route is used by the remote application.

---

# 149. Individual Television Route

Method:

```text
GET
```

Path:

```text
/api/v1/tvs/:tvId
```

Purpose:

Returns the current state of one television.

Example response:

```json
{
  "id": "break-room",
  "name": "Break Room TV",
  "mode": "remote",
  "selectedTechnicianId": 134926818,
  "selectedKpiId": "revenue",
  "selectedSlideId": "revenue",
  "overrideStartedAt": "2026-07-31T16:46:00.000Z",
  "expiresAt": "2026-07-31T16:48:00.000Z",
  "remainingSeconds": 87
}
```

Unknown IDs return:

```text
404
```

with error code:

```text
INVALID_TV_ID
```

---

# 150. Remote Override Route

Method:

```text
POST
```

Path:

```text
/api/v1/tvs/:tvId/override
```

Purpose:

Applies a temporary display override to one television.

Request body:

```json
{
  "technicianId": 134926818,
  "kpiId": "revenue"
}
```

Both fields are optional individually.

At least one must be present.

Valid examples:

## Technician Only

```json
{
  "technicianId": 134926818
}
```

Result:

Display technician scorecard.

## KPI Only

```json
{
  "kpiId": "revenue"
}
```

Result:

Display Revenue slide for all technicians.

## Technician and KPI

```json
{
  "technicianId": 134926818,
  "kpiId": "revenue"
}
```

Result:

Display Julio's Revenue detail.

Invalid:

```json
{}
```

Returns:

```text
400 NO_SELECTION
```

---

# 151. Override Response

Successful response:

```json
{
  "ok": true,
  "tv": {
    "id": "break-room",
    "mode": "remote",
    "selectedTechnicianId": 134926818,
    "selectedKpiId": "revenue",
    "selectedSlideId": "revenue",
    "overrideStartedAt": "2026-07-31T16:46:00.000Z",
    "expiresAt": "2026-07-31T16:48:00.000Z",
    "remainingSeconds": 120
  }
}
```

The backend shall broadcast the update immediately.

---

# 152. Resume Live Rotation Route

Method:

```text
POST
```

Path:

```text
/api/v1/tvs/:tvId/resume
```

Purpose:

Ends the override immediately.

Request body:

```json
{}
```

Successful response:

```json
{
  "ok": true,
  "tv": {
    "id": "break-room",
    "mode": "live",
    "selectedTechnicianId": null,
    "selectedKpiId": null,
    "selectedSlideId": null,
    "overrideStartedAt": null,
    "expiresAt": null,
    "remainingSeconds": null
  }
}
```

---

# 153. Health Route

Method:

```text
GET
```

Path:

```text
/api/v1/health
```

Example response:

```json
{
  "status": "ok",
  "backend": "running",
  "browser": {
    "connected": true,
    "serviceTitanPageFound": true
  },
  "serviceTitan": {
    "status": "connected",
    "lastSuccessfulRequestAt": "2026-07-31T16:45:00.000Z"
  },
  "cache": {
    "available": true,
    "lastSuccessfulRefreshAt": "2026-07-31T16:45:00.000Z",
    "ageSeconds": 14
  }
}
```

The health route shall not expose:

- CSRF token
- Browser WebSocket URL
- Cookies
- Technician phone numbers
- Raw ServiceTitan responses

---

# 154. Development Refresh Route

Development only.

Method:

```text
POST
```

Path:

```text
/api/v1/dev/refresh
```

Purpose:

Triggers an immediate refresh.

If another refresh is active:

```text
409 REFRESH_IN_PROGRESS
```

This route must be disabled in production.

---

# 155. Television State Schema

Canonical television state:

```javascript
{
  id: "break-room",
  name: "Break Room TV",

  mode: "live",

  selectedTechnicianId: null,
  selectedKpiId: null,
  selectedSlideId: null,

  overrideStartedAt: null,
  expiresAt: null,

  revision: 1,
  updatedAt: "2026-07-31T16:45:00.000Z"
}
```

---

# 156. Television Modes

Allowed modes:

```text
live
remote
returning
```

## Live

The television follows the five-slide rotation.

## Remote

The television displays a manually selected view.

## Returning

Temporary transition state used when leaving remote mode.

No additional modes shall exist in Version 1.0.

---

# 157. State Revision

Every television state shall include:

```text
revision
```

The revision increments whenever state changes.

Purpose:

- Ignore stale WebSocket messages
- Resolve rapid consecutive remote commands
- Improve reconnect behavior

Example:

```text
revision 12
```

is newer than:

```text
revision 11
```

Clients shall ignore state updates with an older revision.

---

# 158. Selected Slide Resolution

The backend shall resolve the active display as follows.

## KPI Only

```text
selectedSlideId = slide containing the KPI
```

Examples:

```text
revenue → revenue
closingRate → performance
installAverageTicket → average-ticket
```

## Technician Only

```text
selectedSlideId = technician-detail
```

This is a remote-only presentation state, not a sixth live slide.

## Technician and KPI

```text
selectedSlideId = technician-kpi-detail
```

These remote-only states shall not appear in the top navigation as additional slides.

---

# 159. Live Rotation State

The backend does not need to store the current live slide for every TV unless centralized synchronization is desired.

Version 1.0 recommendation:

Each dashboard client calculates its own live slide using:

- Fixed sequence
- Fixed durations
- Shared rotation epoch

This avoids one-second slide-control messages.

---

# 160. Rotation Epoch

The dashboard payload shall include:

```text
rotationEpoch
```

Example:

```json
{
  "rotationEpoch": "2026-07-31T00:00:00.000-04:00"
}
```

Each television determines the current slide using:

```text
elapsed time since epoch
modulo
total rotation duration
```

Benefits:

- TVs remain synchronized
- Reconnects resume at the correct slide
- Browser reloads do not restart the sequence
- No backend timer message is needed for every transition

---

# 161. Rotation Duration

Default cycle:

```text
Revenue: 15 seconds
Activity: 15 seconds
Performance: 15 seconds
Average Ticket: 15 seconds
Top 3: 25 seconds
```

Total:

```text
85 seconds
```

Slide determination:

```text
elapsed modulo 85 seconds
```

The fixed navigation active state shall derive from the same calculation.

---

# 162. Live Rotation During Remote Override

When a TV enters remote mode:

- Its local live rotation stops visually.
- Global rotation continues in the background.
- The TV does not change slides while remote mode is active.

When the override ends:

- The TV returns to whichever live slide is currently active globally.
- It does not restart at Revenue unless specifically configured.

This preserves synchronization across rooms.

---

# 163. Override Expiration

Default duration:

```text
120 seconds
```

Configured through:

```env
REMOTE_OVERRIDE_SECONDS=120
```

A new override command for the same TV resets the timer.

Formula:

```text
expiresAt = current time + override duration
```

---

# 164. Expiration Monitor

The backend shall check override expiration at least once per second.

Recommended interval:

```text
1000 ms
```

For every expired remote TV:

1. Change mode to `returning`
2. Increment revision
3. Broadcast `tv:update`
4. Wait for configured return transition duration
5. Clear selections
6. Change mode to `live`
7. Increment revision
8. Broadcast `tv:update`

Recommended transition delay:

```text
800–1200 ms
```

---

# 165. Manual Resume

Manual resume shall follow the same transition sequence as expiration.

The frontend may immediately show:

```text
Returning to Live Dashboard
```

The transition shall remain smooth.

---

# 166. Multiple Users Controlling One TV

The latest valid command wins.

Example:

1. User A selects Julio
2. User B selects Revenue five seconds later

The television displays Revenue.

The state revision increments for each command.

The remote application shall show current state before submission.

No lock is required in Version 1.0.

---

# 167. Multiple TVs

Each television has fully independent state.

A command to:

```text
break-room
```

shall not affect:

```text
dispatch
```

or any other television.

TV state shall be stored in a map keyed by stable TV ID.

Example:

```javascript
Map {
  "break-room" => state,
  "dispatch" => state,
  "training-room" => state
}
```

---

# 168. Backend Restart Behavior

TV state is memory-only.

After backend restart:

- All TVs return to live mode.
- All overrides are cleared.
- Rotation synchronization resumes from the shared epoch.
- No stale override is restored.

This is acceptable for Version 1.0.

---

# 169. WebSocket Endpoint

Path:

```text
/ws
```

The same HTTP server shall host REST and WebSocket traffic.

Recommended connection examples:

```text
ws://dashboard-pc:3000/ws?client=dashboard&tv=break-room
```

```text
ws://dashboard-pc:3000/ws?client=remote
```

Production may use:

```text
wss://
```

when HTTPS is configured.

---

# 170. WebSocket Client Types

Allowed client types:

```text
dashboard
remote
```

Unknown client types shall be rejected.

Dashboard clients must provide a valid TV ID.

Remote clients may omit TV ID because they can control multiple TVs.

---

# 171. WebSocket Message Envelope

All messages shall use:

```json
{
  "type": "dashboard:update",
  "timestamp": "2026-07-31T16:45:00.000Z",
  "payload": {}
}
```

Required fields:

- `type`
- `timestamp`
- `payload`

Optional:

```text
requestId
```

for correlating commands and acknowledgments.

---

# 172. Server-to-Client Events

Required event types:

```text
connection:ready
dashboard:update
tv:update
health:update
achievement:event
error
```

---

# 173. Connection Ready Event

Sent immediately after a valid connection.

Dashboard example:

```json
{
  "type": "connection:ready",
  "timestamp": "2026-07-31T16:45:00.000Z",
  "payload": {
    "clientType": "dashboard",
    "tv": {
      "id": "break-room",
      "mode": "live",
      "revision": 1
    },
    "dashboard": {
      "refreshedAt": "2026-07-31T16:45:00.000Z"
    }
  }
}
```

---

# 174. Dashboard Update Event

Broadcast after each successful or partial refresh.

```json
{
  "type": "dashboard:update",
  "timestamp": "2026-07-31T16:45:00.000Z",
  "payload": {
    "refreshedAt": "2026-07-31T16:45:00.000Z",
    "technicians": [],
    "slides": {},
    "overallTopThree": [],
    "events": []
  }
}
```

This event goes to all dashboard clients and may also be sent to remote clients.

---

# 175. TV Update Event

Sent when one television changes.

```json
{
  "type": "tv:update",
  "timestamp": "2026-07-31T16:46:00.000Z",
  "payload": {
    "tv": {
      "id": "break-room",
      "mode": "remote",
      "selectedTechnicianId": 134926818,
      "selectedKpiId": "revenue",
      "revision": 8,
      "expiresAt": "2026-07-31T16:48:00.000Z"
    }
  }
}
```

Dashboard routing:

- Affected dashboard TV receives it.
- Other dashboard TVs do not need it.
- Remote clients receive it to keep controls current.

---

# 176. Achievement Event

Example:

```json
{
  "type": "achievement:event",
  "timestamp": "2026-07-31T16:45:00.000Z",
  "payload": {
    "event": {
      "type": "new-leader",
      "technicianId": 134926818,
      "expiresAt": "2026-07-31T16:45:03.000Z"
    }
  }
}
```

Expired events shall not be replayed after reconnect.

---

# 177. WebSocket Error Event

```json
{
  "type": "error",
  "timestamp": "2026-07-31T16:45:00.000Z",
  "payload": {
    "code": "INVALID_TV_ID",
    "message": "The requested television does not exist."
  }
}
```

The server may close the connection after unrecoverable validation errors.

---

# 178. Client-to-Server Messages

Version 1.0 may use REST for all state-changing commands.

This is the recommended approach.

WebSockets are primarily for server-to-client updates.

Optional client messages may include:

```text
ping
subscribe
```

Remote override commands should remain REST requests for easier validation and retries.

---

# 179. Heartbeat

The WebSocket server shall implement ping/pong heartbeats.

Recommended interval:

```text
30 seconds
```

Clients failing to respond within a reasonable timeout shall be disconnected.

The frontend shall reconnect automatically.

---

# 180. Dashboard Reconnection

When WebSocket disconnects:

1. Keep displaying current cached data
2. Show subtle connection warning
3. Attempt reconnection with exponential backoff
4. Fetch current dashboard data by REST after reconnect
5. Fetch current TV state
6. Resume animations only for changed values

Recommended retry schedule:

```text
1s
2s
5s
10s
30s
```

Continue at thirty-second intervals.

---

# 181. Remote Reconnection

When remote WebSocket disconnects:

- REST controls may continue if HTTP remains available.
- Show a small live-status warning.
- Reconnect automatically.
- Refresh TV list and current state after reconnection.

The remote shall not lose the user's current selections unnecessarily.

---

# 182. Dashboard Initial Load

Initial dashboard sequence:

1. Parse TV ID from URL
2. Validate TV ID through REST
3. Fetch dashboard payload
4. Open WebSocket
5. Render current live or remote state
6. Begin synchronized rotation if live
7. Update from WebSocket thereafter

The display shall not show a blank white screen.

A branded loading state may appear briefly.

---

# 183. Cache-Unavailable Startup State

When backend has started but no successful ServiceTitan refresh exists:

```json
{
  "ok": false,
  "error": {
    "code": "CACHE_UNAVAILABLE",
    "message": "Live technician data is not available yet."
  }
}
```

Dashboard presentation:

```text
Connecting to live data…
```

Do not show fabricated zeros.

---

# 184. Stale Data State

When the previous cache is still available but ServiceTitan refresh fails:

- Keep rendering cached data
- Update status indicator
- Show `Updated X min ago`
- Avoid full-screen errors unless data becomes extremely stale

Recommended warning threshold:

```text
3 minutes
```

Recommended critical threshold:

```text
10 minutes
```

These thresholds shall be configurable.

---

# 185. Display Error Hierarchy

Priority:

1. Invalid TV configuration
2. No cached data available
3. Browser disconnected
4. ServiceTitan unavailable
5. WebSocket disconnected
6. Stale data warning

Minor issues should not obscure valid dashboard information.

---

# 186. Remote Validation

The backend shall validate:

- TV exists
- Technician exists when provided
- KPI exists when provided
- At least one selection exists
- KPI is permitted in remote mode
- Request body contains no unsupported fields

Unknown fields may be rejected in strict mode.

---

# 187. Idempotency

Submitting the same override repeatedly is allowed.

It shall:

- Keep the same requested display
- Restart the 120-second timer
- Increment revision
- Broadcast updated expiration

This behavior is intentional.

---

# 188. Request Rate Limiting

The remote API shall use a lightweight rate limit.

Recommended per-client limit:

```text
30 requests per minute
```

This prevents accidental abuse without obstructing office use.

Dashboard GET routes may have a higher limit.

The office network may be trusted, but basic protection is still recommended.

---

# 189. CORS

Development mode may allow configured Vite origins.

Production mode should use same-origin serving when possible.

Recommended production topology:

```text
http://dashboard-pc:3000/display/:tvId
http://dashboard-pc:3000/remote
http://dashboard-pc:3000/api/v1/*
http://dashboard-pc:3000/ws
```

Same-origin deployment minimizes CORS complexity.

---

# 190. Network Binding

Backend shall bind to:

```text
0.0.0.0
```

so devices on the office network can connect.

Default port:

```text
3000
```

The Windows firewall may require an inbound rule.

Deployment documentation shall include this step.

---

# 191. TV Connectivity Requirement

Every television requires a device capable of opening the dashboard URL.

A television without a browser or streaming device cannot run the web application by itself.

Version 1.0 software architecture supports any device with:

- A modern browser
- Office network access
- HDMI output to the television when external

Hardware deployment options are specified in a later section.

The application itself does not require all TVs to show the same screen.

---

# 192. Multi-TV Concurrency Acceptance Criteria

The multi-TV system is accepted when:

1. At least five TV clients can connect simultaneously.
2. Each TV uses a unique ID.
3. A remote override affects only the selected TV.
4. Two different TVs can show different technicians simultaneously.
5. Two different TVs can show different KPIs simultaneously.
6. Every override expires independently.
7. All live-mode TVs remain synchronized.
8. Backend restart returns all TVs to live mode.
9. Reconnection restores correct TV state.
10. State revisions prevent stale updates.

---

# 193. REST API Acceptance Criteria

The REST layer is accepted when:

1. All routes use `/api/v1`.
2. Invalid IDs return clear 4xx errors.
3. Override payloads are strictly validated.
4. No raw ServiceTitan data is exposed.
5. Health response omits secrets.
6. Remote commands produce immediate TV broadcasts.
7. Same override resets its timer.
8. Development routes are disabled in production.
9. API errors use stable codes.
10. Automated tests cover success and validation failures.

---

# 194. WebSocket Acceptance Criteria

The WebSocket layer is accepted when:

1. Dashboard clients identify their TV.
2. Remote clients receive TV state changes.
3. Dashboard refreshes broadcast once per refresh.
4. TV updates route only to affected displays and all remotes.
5. Heartbeats remove dead clients.
6. Clients reconnect automatically.
7. Initial state is delivered after connection.
8. Old revisions are ignored.
9. Malformed clients are rejected.
10. Valid cached data remains visible during disconnects.

---

# 195. End of Part 6

# Part 7 — Dashboard Data Contracts, Slide Payloads & Visualization Behavior

---

# 196. Purpose of This Section

This section defines the exact data the dashboard frontend receives and how that data is interpreted visually.

It specifies:

- The normalized dashboard payload
- Slide-specific contracts
- Technician row structure
- Remote technician views
- Number formatting
- SVG chart geometry
- Axis behavior
- Animation state transitions
- Top 3 presentation data

The frontend shall render these contracts without recalculating business logic.

---

# 197. Dashboard Payload Philosophy

The dashboard payload shall be optimized for presentation.

The frontend should not need to:

- Join multiple datasets
- Calculate rankings
- Select leaderboard entries
- Calculate goals
- Calculate percent complete
- Determine data quality
- Reconstruct slide groups
- Translate ServiceTitan field names
- Compute overall Top 3 scores

The backend shall prepare the data exactly as the dashboard needs it.

---

# 198. Top-Level Dashboard Contract

Recommended shape:

```javascript
{
  version: 1,

  generatedAt: "2026-07-31T17:00:00.000Z",
  refreshedAt: "2026-07-31T17:00:00.000Z",
  lastSuccessfulRefreshAt: "2026-07-31T17:00:00.000Z",

  rotationEpoch: "2026-07-31T04:00:00.000Z",

  status: {
    browser: "connected",
    serviceTitan: "connected",
    cache: "fresh",
    staleTechnicianCount: 0
  },

  slides: {
    revenue: {},
    activity: {},
    performance: {},
    averageTicket: {},
    topThree: {}
  },

  technicians: [],

  overallTopThree: [],

  events: []
}
```

The contract shall include a numeric or semantic version so future frontend changes can detect incompatible payloads.

---

# 199. Shared Metric Contract

Every metric sent to the frontend shall use a consistent shape.

```javascript
{
  id: "revenue",
  label: "Revenue",
  shortLabel: "Revenue",

  value: 848,
  hasData: true,
  dataQuality: "confirmed",

  format: "currency",
  unit: "USD",

  goal: 1000,
  percentComplete: 84.8,
  remaining: 152,
  reached: false,

  rank: 2,
  previousRank: 3,
  rankChange: 1
}
```

Allowed format values:

```text
currency
integer
percentage
decimal
duration
```

The frontend may format the raw numeric value using shared formatting utilities.

---

# 200. Shared Technician Presentation Contract

Every technician record shall include:

```javascript
{
  id: 134926818,
  name: "Julio Torres",
  shortName: "Julio",
  initials: "JT",

  stale: false,
  lastSuccessfulUpdate: "2026-07-31T17:00:00.000Z",

  kpis: {
    revenue: {},
    billableServiceCalls: {},
    serviceRevenue: {},
    opportunities: {},
    leadConversionRate: {},
    techLeads: {},
    marketedLeads: {},
    closingRate: {},
    installs: {},
    installAverageTicket: {},
    installRevenue: {}
  },

  overall: {
    score: 1.08,
    displayScore: "108%",
    rank: 1,
    previousRank: 2,
    rankChange: 1,
    qualifies: true,
    validWeightCoverage: 0.9
  }
}
```

The full technician list may be used by remote technician views.

Normal KPI slides shall use backend-prepared slide rows rather than rebuilding them from this list.

---

# 201. Generic Metric Slide Contract

Revenue, Activity, Performance, and Average Ticket shall use a shared slide contract.

```javascript
{
  id: "revenue",
  label: "Revenue",
  navigationLabel: "Revenue",
  durationSeconds: 15,

  primaryKpiId: "revenue",

  metrics: [
    {
      id: "revenue",
      label: "Revenue",
      color: "#D4AF37",
      opacity: 1
    },
    {
      id: "serviceRevenue",
      label: "Service Revenue",
      color: "#2563EB",
      opacity: 0.68
    },
    {
      id: "installRevenue",
      label: "Install Revenue",
      color: "#22C55E",
      opacity: 0.48
    }
  ],

  axis: {
    minimum: 0,
    maximum: 10000,
    tickValues: [0, 2500, 5000, 7500, 10000],
    format: "currency"
  },

  rows: [],

  summary: {},

  events: []
}
```

The frontend shall render all generic KPI slides through one reusable metric-slide engine.

---

# 202. Slide Row Contract

Each technician row shall be prepared by the backend.

```javascript
{
  technicianId: 134926818,
  name: "Julio Torres",
  shortName: "Julio",
  initials: "JT",

  primaryRank: 1,
  previousPrimaryRank: 2,
  rankChange: 1,

  stale: false,

  metrics: [
    {
      id: "revenue",
      value: 848,
      hasData: true,
      formattedValue: "$848",
      normalizedRatio: 0.848
    },
    {
      id: "serviceRevenue",
      value: 620,
      hasData: true,
      formattedValue: "$620",
      normalizedRatio: 0.62
    },
    {
      id: "installRevenue",
      value: 228,
      hasData: true,
      formattedValue: "$228",
      normalizedRatio: 0.228
    }
  ],

  goalSummary: {
    kpiId: "revenue",
    value: 848,
    formattedValue: "$848",
    goal: 1000,
    formattedGoal: "$1,000",
    percentComplete: 84.8,
    reached: false
  }
}
```

`normalizedRatio` is calculated against the slide axis maximum.

The frontend may calculate exact pixel width from this ratio but shall not recompute the axis.

---

# 203. Revenue Slide Contract

Slide ID:

```text
revenue
```

Primary ranking metric:

```text
revenue
```

Metrics:

```text
Revenue
Service Revenue
Install Revenue
```

Recommended payload:

```javascript
{
  id: "revenue",
  label: "Revenue",
  durationSeconds: 15,
  primaryKpiId: "revenue",

  metrics: [
    {
      id: "revenue",
      label: "Revenue",
      color: "#D4AF37",
      opacity: 0.9,
      zIndex: 1
    },
    {
      id: "serviceRevenue",
      label: "Service Revenue",
      color: "#2563EB",
      opacity: 0.58,
      zIndex: 2
    },
    {
      id: "installRevenue",
      label: "Install Revenue",
      color: "#22C55E",
      opacity: 0.48,
      zIndex: 3
    }
  ],

  axis: {
    minimum: 0,
    maximum: 10000,
    tickValues: [0, 2500, 5000, 7500, 10000],
    format: "currency"
  },

  rows: []
}
```

Rows shall be ordered by Revenue rank.

---

# 204. Revenue Bar Layering

All three bars for a technician occupy the same primary lane.

Recommended rendering order:

1. Revenue
2. Service Revenue
3. Install Revenue

The largest conceptual total should normally appear behind its components.

Bars may use a small vertical offset of approximately:

```text
0–4 pixels
```

to preserve visible edges.

The chart must not resemble stacked bars.

---

# 205. Revenue Consistency Validation

Where valid:

```text
Service Revenue + Install Revenue
```

may equal or approximate:

```text
Revenue
```

However, the frontend shall not assume this equality.

The backend may provide a diagnostic consistency flag.

Example:

```javascript
{
  componentsMatchTotal: false,
  difference: 120
}
```

This diagnostic shall not clutter the production UI.

---

# 206. Activity Slide Contract

Slide ID:

```text
activity
```

Primary ranking metric:

```text
billableServiceCalls
```

Metrics:

```text
Billable Service Calls
10+ Opportunities
Tech Leads
Marketed Leads
Installs
```

Recommended metric colors:

```javascript
[
  {
    id: "billableServiceCalls",
    color: "#2563EB",
    opacity: 0.88
  },
  {
    id: "opportunities",
    color: "#60A5FA",
    opacity: 0.72
  },
  {
    id: "techLeads",
    color: "#7C3AED",
    opacity: 0.62
  },
  {
    id: "marketedLeads",
    color: "#A78BFA",
    opacity: 0.52
  },
  {
    id: "installs",
    color: "#F59E0B",
    opacity: 0.72
  }
]
```

Rows shall be ordered by Billable Service Calls rank.

---

# 207. Activity Axis

Activity uses a shared count axis.

Example:

```javascript
{
  minimum: 0,
  maximum: 25,
  tickValues: [0, 5, 10, 15, 20, 25],
  format: "integer"
}
```

The longest valid count across all displayed metrics determines the rounded maximum.

The goal for 10+ Opportunities may be shown beside the chart but shall not alter the axis independently.

---

# 208. Performance Slide Contract

Slide ID:

```text
performance
```

Primary ranking metric:

```text
closingRate
```

Metrics:

```text
Lead Conversion %
Closing %
```

Version 1.0 shall not silently add unapproved metrics.

Recommended payload:

```javascript
{
  id: "performance",
  label: "Performance",
  durationSeconds: 15,
  primaryKpiId: "closingRate",

  metrics: [
    {
      id: "leadConversionRate",
      label: "Lead Conversion %",
      color: "#7C3AED",
      opacity: 0.7
    },
    {
      id: "closingRate",
      label: "Closing %",
      color: "#22C55E",
      opacity: 0.82
    }
  ],

  axis: {
    minimum: 0,
    maximum: 100,
    tickValues: [0, 20, 40, 60, 80, 100],
    format: "percentage"
  },

  rows: []
}
```

Rows shall be ordered by Closing % rank.

---

# 209. Percentage Axis

Performance uses a fixed 0–100% axis.

Values above 100% shall be visually clamped at 100% for bar width unless the business meaning requires otherwise.

The numeric label shall still show the actual value.

Example:

```text
Value: 112%
Bar width: 100% of lane
```

This avoids the axis changing unexpectedly for percentage metrics.

---

# 210. Average Ticket Slide Contract

Slide ID:

```text
average-ticket
```

Primary ranking metric:

```text
installAverageTicket
```

Primary graph metric:

```text
Install Average Ticket
```

Supporting values:

```text
Install Revenue
Number of Installs
```

Recommended payload:

```javascript
{
  id: "average-ticket",
  label: "Avg Ticket",
  durationSeconds: 15,
  primaryKpiId: "installAverageTicket",

  metrics: [
    {
      id: "installAverageTicket",
      label: "Install Average Ticket",
      color: "#F59E0B",
      opacity: 0.86
    }
  ],

  axis: {
    minimum: 0,
    maximum: 15000,
    tickValues: [0, 3000, 6000, 9000, 12000, 15000],
    format: "currency"
  },

  rows: []
}
```

Each row's summary shall also include:

```javascript
{
  installRevenue: {
    value: 12000,
    formattedValue: "$12,000"
  },

  installs: {
    value: 2,
    formattedValue: "2"
  }
}
```

---

# 211. Average Ticket Missing Data

When installs equal zero:

```text
Install Average Ticket = No Data
```

The bar shall not render as zero.

The row may still display:

```text
Installs: 0
Install Revenue: $0
```

if those are valid measurements.

---

# 212. Top 3 Slide Contract

Slide ID:

```text
top-three
```

Recommended payload:

```javascript
{
  id: "top-three",
  label: "Top 3",
  durationSeconds: 25,

  technicians: [
    {
      technicianId: 134926818,
      name: "Julio Torres",
      shortName: "Julio",
      initials: "JT",

      rank: 1,
      previousRank: 2,
      rankChange: 1,

      overallScore: 1.08,
      displayScore: "108%",

      metrics: {
        revenue: {
          value: 848,
          formattedValue: "$848",
          hasData: true
        },
        billableServiceCalls: {
          value: 2,
          formattedValue: "2",
          hasData: true
        },
        closingRate: {
          value: 50,
          formattedValue: "50%",
          hasData: true
        },
        leadConversionRate: {
          value: 50,
          formattedValue: "50%",
          hasData: true
        },
        installs: {
          value: 1,
          formattedValue: "1",
          hasData: true
        },
        installAverageTicket: {
          value: 6500,
          formattedValue: "$6,500",
          hasData: true
        }
      }
    }
  ],

  event: null
}
```

Exactly three qualified technicians shall appear when at least three qualify.

---

# 213. Fewer Than Three Qualified Technicians

When fewer than three technicians qualify:

- Show available qualified technicians.
- Use a neutral placeholder card for missing positions.
- Display:

```text
Insufficient Data
```

Do not promote an unqualified technician solely to fill the layout.

---

# 214. Top 3 Card Order

Visual order on desktop:

```text
Second Place | First Place | Third Place
```

First place is centered and largest.

Semantic data order remains:

```text
1, 2, 3
```

The frontend shall arrange cards visually without changing rank meaning.

---

# 215. Top 3 Card Sizes

Recommended relative widths:

```text
First Place: 34%
Second Place: 29%
Third Place: 29%
```

Remaining space is used for gaps.

First place card may be approximately:

```text
8–12% taller
```

than the other cards.

---

# 216. Top 3 Effects

First place may include:

- Gold border
- Soft gold glow
- Small crown icon
- Very subtle sparkle animation

Second place:

- Silver accent

Third place:

- Bronze accent

Effects must remain restrained.

No continuous confetti.

No sound.

No animated particles covering text.

---

# 217. Technician-Only Remote View

When the remote selects only a technician:

```javascript
{
  mode: "remote",
  viewType: "technician-scorecard",
  technician: {
    id: 134926818,
    name: "Julio Torres",
    initials: "JT"
  },
  sections: [
    {
      id: "revenue",
      metrics: []
    },
    {
      id: "activity",
      metrics: []
    },
    {
      id: "performance",
      metrics: []
    },
    {
      id: "average-ticket",
      metrics: []
    }
  ],
  expiresAt: "2026-07-31T17:02:00.000Z"
}
```

The technician scorecard shall display the most important metrics at once.

It shall not automatically rotate through all five live slides unless specifically enabled later.

Version 1.0 recommendation:

Use a single, full-screen individual scorecard.

---

# 218. Individual Technician Scorecard Layout

Recommended layout:

```text
----------------------------------------------------
Header and technician name
----------------------------------------------------
Revenue | Service Revenue | Install Revenue
----------------------------------------------------
Calls | Opportunities | Tech Leads | Marketed Leads
----------------------------------------------------
Lead Conversion | Closing %
----------------------------------------------------
Installs | Install Avg Ticket | Install Revenue
----------------------------------------------------
Goal and rank summaries
----------------------------------------------------
```

The view should remain readable from across the room.

No more than eleven approved KPIs shall be displayed.

---

# 219. KPI-Only Remote View

When the remote selects only a KPI:

```javascript
{
  mode: "remote",
  viewType: "kpi",
  kpiId: "revenue",
  slideId: "revenue",
  expiresAt: "2026-07-31T17:02:00.000Z"
}
```

The television shall display:

- The corresponding graph
- All five technicians
- Goal summaries
- Rankings for the selected KPI

For KPI-only views, the active navigation tab shall match the KPI's parent slide.

---

# 220. Technician-plus-KPI Remote View

When both technician and KPI are selected:

```javascript
{
  mode: "remote",
  viewType: "technician-kpi",
  technicianId: 134926818,
  kpiId: "revenue",
  expiresAt: "2026-07-31T17:02:00.000Z"
}
```

Recommended content:

- Technician name
- KPI label
- Large current value
- Goal
- Percent complete
- Current rank
- Mini comparison chart against other technicians
- Supporting related metrics

Example for Revenue:

```text
Julio Torres

Revenue
$8,420

Goal
$10,000

84%

Rank #2
```

Supporting comparison:

```text
Julio compared with team range
```

---

# 221. Remote Detail Comparison Chart

The technician-plus-KPI view may display one highlighted technician bar and muted bars for the remaining technicians.

The selected technician uses the KPI accent color.

Other technicians use light gray or reduced-opacity accent colors.

This preserves competitive context without overwhelming the technician detail.

---

# 222. Formatting Contract

The frontend shall use shared formatting utilities.

Recommended functions:

```javascript
formatCurrency(value)
formatInteger(value)
formatPercentage(value)
formatCompactNumber(value)
formatElapsedTime(timestamp)
formatGoalProgress(value)
```

Formatting shall be locale-aware using:

```text
en-US
```

---

# 223. Currency Formatting

Full values:

```text
$0
$848
$12,420
$1,245,300
```

Axis values may use:

```text
$2.5K
$10K
$1.2M
```

Large headline values should prefer full values when space allows.

---

# 224. Percentage Formatting

Default:

```text
50%
57.4%
100%
```

Rules:

- Whole number when fraction is effectively zero
- One decimal when useful
- Never display excessive precision

Example:

```text
57.368421% → 57.4%
```

---

# 225. Number Formatting

Count values:

```text
0
1
12
1,250
```

No decimals for count KPIs.

---

# 226. No-Data Formatting

Primary display:

```text
—
```

Supporting label:

```text
No Data
```

The em dash shall not animate as a number.

---

# 227. Goal Formatting

When no goal is configured:

```text
Goal
—
```

or the goal block may be visually deemphasized.

Do not display:

```text
0% complete
```

when no goal exists.

---

# 228. SVG Chart Coordinate System

Each metric slide shall use a responsive SVG with a stable internal view box.

Recommended:

```text
viewBox="0 0 1600 720"
```

The browser scales the SVG to available dimensions.

Using one consistent coordinate system simplifies animation.

---

# 229. Chart Regions

Recommended SVG regions:

```text
Left label region: 0–300
Plot region: 320–1420
Value label region: 1430–1600
```

Exact dimensions may be adjusted after visual testing.

---

# 230. Technician Row Height

For five technicians:

```text
approximately 110–125 SVG units per row
```

Rows shall remain vertically centered.

Spacing must permit multiple overlay bars and readable names.

---

# 231. Bar Height

Recommended primary bar height:

```text
46–58 SVG units
```

Overlay components may use:

```text
32–50 SVG units
```

depending on slide density.

Bars shall use rounded ends.

Recommended radius:

```text
12–18 SVG units
```

---

# 232. Axis Ticks

Axes shall use:

- Four to six visible tick values
- Light vertical grid lines
- Muted labels
- No heavy baseline

Grid line color:

```text
#E5E7EB
```

Grid opacity:

```text
0.6–0.8
```

---

# 233. Axis Maximum Calculation

Backend shall calculate a human-friendly maximum.

Suggested algorithm:

1. Find largest valid displayed value
2. Add approximately 8–15% visual headroom
3. Round upward to a pleasant interval
4. Generate evenly spaced ticks

Examples:

```text
Largest 848
→ headroom 950
→ axis maximum 1,000
```

```text
Largest 12
→ headroom 14
→ axis maximum 15
```

```text
Largest 8,420
→ headroom 9,500
→ axis maximum 10,000
```

---

# 234. Axis Animation

When axis maximum changes:

- Tick positions move smoothly
- Labels crossfade or count
- Grid lines shift
- Bars animate to their new scaled widths

The chart shall not instantly rescale.

---

# 235. Bar Width Formula

Frontend pixel or SVG width:

```text
plotWidth × normalizedRatio
```

Where:

```text
normalizedRatio = value ÷ axisMaximum
```

The backend may supply `normalizedRatio`.

The frontend shall clamp:

```text
0 to 1
```

for visual width.

---

# 236. Value Label Placement

Value labels shall normally appear:

```text
at the right end of each row
```

rather than immediately after each overlay bar.

This keeps three overlaid values aligned.

Recommended arrangement:

```text
Revenue      $8,420
Service      $6,100
Install      $2,320
```

Values may be displayed in a compact row summary panel.

---

# 237. Legend

Each metric slide shall show a compact legend.

Example:

```text
● Revenue
● Service Revenue
● Install Revenue
```

The legend remains in a fixed position.

Legend items morph between slides rather than remounting abruptly.

---

# 238. Animation Identity

Animation keys shall use stable IDs.

Examples:

```text
technician-134926818
metric-revenue
bar-134926818-revenue
rank-134926818
axis-tick-5000
```

Stable keys are mandatory for smooth morphing.

Do not key rows by array index.

---

# 239. Slide Morph Sequence

When moving from one KPI slide to another:

1. Navigation underline begins moving
2. Slide title morphs
3. Legend labels and colors transition
4. Axis rescales
5. Existing technician rows remain in place when possible
6. Bars morph to new metric widths and colors
7. Value labels count to new values
8. Goal summaries update
9. Ranking order animates

The shell does not move.

---

# 240. Ranking Reorder Animation

Rows shall use layout animation.

When order changes:

- Rows slide vertically to new positions
- Bars move with their technician row
- Rank badges count or crossfade
- Animation duration approximately 500–700 ms

The user should be able to visually follow who moved.

---

# 241. Number Animation Rules

Numbers animate only when:

- Old value is numeric
- New value is numeric
- Values differ

No-data to numeric:

```text
fade and count in
```

Numeric to no-data:

```text
fade to em dash
```

Recommended duration:

```text
700–1000 ms
```

---

# 242. Color Transition

Metric colors shall animate between slides.

Use color interpolation supported by the animation library.

Avoid flashing from one color to another.

Recommended duration:

```text
400–600 ms
```

---

# 243. Top 3 Entrance Sequence

Recommended sequence:

1. Metric chart dims and recedes
2. `TOP 3 TECHNICIANS` title appears
3. Second and third place cards enter
4. First place card rises into center
5. Gold glow activates
6. KPI values count in

Total entrance duration:

```text
900–1200 ms
```

The screen remains readable throughout.

---

# 244. Top 3 Exit Sequence

Recommended sequence:

1. Glow fades
2. Cards reduce emphasis
3. Cards morph or fade into chart rows
4. Revenue title returns
5. Axis and bars reappear
6. Navigation underline moves to Revenue or current synchronized slide

Avoid a blank intermediate frame.

---

# 245. Remote Override Entrance

When remote mode begins:

- Show a small label such as:

```text
Remote View
```

- Morph the current content into the requested view
- Do not display a modal
- Do not stop the live clock or update status

The selected TV changes independently.

---

# 246. Returning to Live Mode

When mode becomes `returning`:

Display a subtle temporary message:

```text
Returning to Live Dashboard…
```

The current remote view morphs to the globally synchronized live slide.

The message disappears after the transition.

---

# 247. Connection State Presentation

Connected:

```text
Green live dot
```

Reconnecting:

```text
Amber dot
Reconnecting…
```

Disconnected with valid cache:

```text
Amber or red indicator
Live connection interrupted
```

The chart remains visible.

---

# 248. Stale Data Presentation

After warning threshold:

```text
Updated 4 min ago
```

Status indicator becomes amber.

After critical threshold:

```text
Live data unavailable
Showing last update from 12:42 PM
```

The display shall remain usable.

---

# 249. Visual Acceptance Criteria

The dashboard visualization is accepted when:

1. Five technicians fit clearly at 1080p
2. Text is readable from twenty feet
3. Overlay bars are distinguishable
4. Slide changes do not move the whole page
5. Numbers animate smoothly
6. Axis transitions do not jump
7. Ranking changes remain visually traceable
8. Top 3 occupies the full content area
9. Top 3 never appears as a bottom strip
10. Remote views match the approved visual language
11. No-data is distinct from zero
12. Dashboard sustains smooth animation on target hardware

---

**End of Part 7**

# Part 8 — QR Remote, Mobile UX & Multi-Room Display Deployment

---

# 251. Purpose of This Section

This section defines:

- QR-code remote behavior
- Mobile user experience
- Television selection
- Technician selection
- KPI selection
- Override confirmation
- Two-minute timeout behavior
- QR-code generation
- Multi-room display deployment
- Network requirements
- Hardware limitations
- Zero-cost and low-cost connectivity options

The remote is a controller, not a second dashboard.

---

# 252. Remote Product Goal

The remote shall let an employee change one television in a few seconds without:

- Walking to the backend computer
- Touching the television
- Installing a mobile application
- Logging into ServiceTitan
- Entering a password
- Affecting other televisions

The desired flow is:

```text
Scan QR code
↓
Choose Technician or KPI
↓
Tap Apply
↓
Selected TV changes immediately
```

---

# 253. Remote Technology

The remote shall be a mobile web application.

Required characteristics:

- Runs in Safari, Chrome, and Edge mobile browsers
- Requires no installation
- Requires no app-store distribution
- Uses the same backend as the dashboard
- Uses REST for commands
- Uses WebSockets for live television state
- Uses the GRmetro visual identity

The remote shall be served from the office dashboard computer.

Example:

```text
http://dashboard-pc:3000/remote
```

---

# 254. Television-Specific QR Codes

Each television shall have its own QR code.

Example:

```text
Break Room TV
http://dashboard-pc:3000/remote?tv=break-room
```

```text
Dispatch TV
http://dashboard-pc:3000/remote?tv=dispatch
```

```text
Training Room TV
http://dashboard-pc:3000/remote?tv=training-room
```

When a user scans a television-specific QR code, the remote shall already know which TV is being controlled.

The user should not need to select the TV again.

---

# 255. General Remote URL

A general remote URL shall also exist:

```text
http://dashboard-pc:3000/remote
```

This version requires the user to select a television before controlling it.

The general remote is useful for:

- Managers
- Bookmarked access
- Testing
- Controlling a TV from another room

---

# 256. Preferred Remote Flow

For a television-specific QR code:

```text
Open remote
↓
Display TV name
↓
Choose Technician and/or KPI
↓
Apply
↓
Confirmation
```

For the general remote:

```text
Open remote
↓
Choose TV
↓
Choose Technician and/or KPI
↓
Apply
↓
Confirmation
```

---

# 257. Remote Screen Structure

The main remote control screen shall contain:

```text
GRmetro logo

Break Room TV

Currently Showing:
Live Rotation — Activity

Technician
[ None selected ]

KPI
[ None selected ]

[ Apply to Break Room TV ]

[ Resume Live Rotation ]
```

When an override is active:

```text
Currently Showing:
Julio — Revenue

Returns to live rotation in 1:42
```

---

# 258. Independent Selection Model

Technician and KPI selection are independent.

The interface shall not force this sequence:

```text
Technician
↓
KPI
```

The user may choose either selection first.

Valid combinations:

| Technician | KPI | Result |
|---|---|---|
| Selected | Not selected | Individual technician scorecard |
| Not selected | Selected | Team KPI graph and ranking |
| Selected | Selected | Individual technician KPI detail |
| Not selected | Not selected | Apply disabled |

---

# 259. Technician Picker

The technician picker shall display exactly the five configured technicians.

Example:

```text
Julio Torres
Shamon Ward
Charlie E
Alex K
Dwight
```

Each option may include:

- Initials
- Full name
- Selection indicator

Recommended mobile presentation:

```text
[ JT ] Julio Torres
[ SW ] Shamon Ward
[ CE ] Charlie E
[ AK ] Alex K
[ DW ] Dwight
```

The picker shall be easy to use with one hand.

---

# 260. KPI Picker

The KPI picker shall include exactly the approved KPIs:

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

The remote may group them visually by category:

```text
Revenue
- Revenue
- Service Revenue
- Install Revenue

Activity
- Billable Service Calls
- 10+ Opportunities
- Tech Leads
- Marketed Leads
- Number of Installs

Performance
- Lead Conversion %
- Closing %

Average Ticket
- Install Average Ticket
```

The grouping is visual only.

Internal KPI IDs remain unchanged.

---

# 261. Clearing a Selection

The user shall be able to clear:

- Technician selection
- KPI selection

Each picker shall include:

```text
None
```

or a clear button.

The remote shall prevent applying an override when both selections are empty.

---

# 262. Current Television State

Before the user submits a command, the remote shall show what the television is currently displaying.

Examples:

```text
Live Rotation — Revenue
```

```text
Julio Torres — Revenue
```

```text
Closing % — Team View
```

```text
Returning to Live Rotation
```

This reduces accidental overrides.

---

# 263. Apply Button

The Apply button label shall include the selected television name.

Example:

```text
Apply to Break Room TV
```

The button shall be disabled when:

- No television is selected
- Neither technician nor KPI is selected
- The request is being submitted
- The backend is unavailable

---

# 264. Apply Feedback

After submission, the remote shall show immediate feedback.

Success example:

```text
Break Room TV updated
```

Supporting text:

```text
Showing Julio Torres — Revenue
Returns to live rotation in 2:00
```

The remote shall not leave the user wondering whether the command worked.

---

# 265. Override Countdown

When a television is in remote mode, the remote shall show a countdown.

Example:

```text
Returns to Live Rotation in 1:37
```

The countdown shall derive from `expiresAt`.

It shall not depend solely on a local decrementing counter.

This prevents timer drift.

---

# 266. Timer Reset

Submitting another valid command to the same television shall reset the timer to:

```text
2:00
```

The remote shall update immediately from the returned television state.

---

# 267. Resume Live Rotation

The remote shall include:

```text
Resume Live Rotation
```

This button ends the override immediately.

The television shall use the approved return animation.

The remote shall confirm:

```text
Break Room TV returned to Live Rotation
```

---

# 268. Remote Concurrency

More than one phone may open the remote at the same time.

The latest valid command wins.

The remote shall update when another user changes the same television.

Example:

```text
This TV was changed by another remote.
Currently showing: Closing %
```

No user identity tracking is required in Version 1.0.

---

# 269. Remote WebSocket Behavior

The remote shall subscribe to:

- TV state changes
- Connection status
- Dashboard refresh timestamps

The remote shall not require a WebSocket connection to send REST commands.

If WebSocket is disconnected but REST works:

- Commands may still be submitted
- A reconnect warning is shown
- State is refreshed after reconnect

---

# 270. Touch Target Requirements

Interactive elements shall have a minimum touch size of:

```text
44 × 44 CSS pixels
```

Recommended primary controls:

```text
48–56 pixels high
```

Spacing between selectable rows shall prevent accidental taps.

---

# 271. Mobile Typography

Recommended sizes:

```text
Page title: 28–32 px
TV name: 22–26 px
Section labels: 16–18 px
Picker items: 17–20 px
Button labels: 17–20 px
Supporting text: 14–16 px
```

The interface shall remain usable without zooming.

---

# 272. Remote Visual Style

The remote shall use:

- Light background
- White cards
- GRmetro logo
- GRmetro teal accents
- Gold for achievements or selected premium metrics
- Rounded controls
- Soft shadows
- Clear selection states

The remote shall not copy the dense television chart layout.

---

# 273. Mobile Accessibility

The remote shall support:

- Keyboard navigation
- Screen-reader labels
- Visible focus states
- Sufficient contrast
- Semantic buttons
- Semantic form controls
- Reduced-motion preferences

Color shall not be the only indicator of selection.

---

# 274. Reduced Motion

When the user's device requests reduced motion:

```css
prefers-reduced-motion: reduce
```

The remote shall reduce:

- Sliding transitions
- Scale animations
- Decorative motion

Functional state changes must remain clear.

---

# 275. QR-Code Generation

The repository shall include a script that generates QR codes for every configured television.

Recommended script:

```text
scripts/generate-qr-codes.js
```

Input:

```javascript
shared/televisions.js
```

Output:

```text
assets/qr/break-room.png
assets/qr/dispatch.png
assets/qr/training-room.png
assets/qr/front-office.png
assets/qr/shop.png
```

The base URL shall be configurable.

Example command:

```bash
npm run generate:qr -- --base-url=http://dashboard-pc:3000
```

---

# 276. QR-Code Content

Each QR code shall point to:

```text
<base-url>/remote?tv=<tv-id>
```

Example:

```text
http://192.168.1.50:3000/remote?tv=break-room
```

A stable local IP address is preferred over a computer hostname when office-device hostname resolution is unreliable.

---

# 277. QR-Code Label

Each printed QR code shall include readable text.

Example:

```text
Control Break Room TV

Scan to choose a technician or KPI
```

A printed fallback URL may appear below the QR code.

---

# 278. On-Screen QR Badge

The dashboard may display a small QR badge in a corner.

Requirements:

- Does not cover charts
- Does not distract from live content
- Includes a short label
- Uses the TV-specific URL
- Remains large enough to scan from nearby

A printed physical QR code is still recommended for reliability.

---

# 279. Office-Network Requirement

The backend computer, televisions or display devices, and phones must be connected to the same network unless the system is later exposed securely through the internet.

Version 1.0 assumes:

```text
Local office network only
```

No cloud deployment is required.

---

# 280. Backend Computer

The recommended backend host is the existing Windows computer used to access ServiceTitan.

It shall:

- Stay powered on during business hours
- Run Edge with remote debugging
- Remain logged into ServiceTitan
- Run the backend service
- Serve the dashboard and remote
- Connect to the office network

This minimizes the number of machines that need ServiceTitan access.

---

# 281. Display Device Requirement

A television cannot open the dashboard unless it has one of the following:

- Built-in modern web browser
- Existing streaming device with a usable browser
- Connected computer
- Connected laptop
- Connected mini PC
- Connected console or device capable of kiosk web display

Software cannot add web-browser capability to a television that lacks a computing platform.

---

# 282. Zero-Cost Deployment Priority

The project shall first inventory existing hardware.

For every television, determine whether any existing device is already connected or available, such as:

- Old office laptop
- Retired desktop
- Existing mini PC
- Existing streaming stick
- Game console
- Cable-box platform with browser
- Built-in smart-TV browser

Existing hardware should be reused before purchasing anything.

---

# 283. Built-In Smart-TV Browser

When a television has a built-in browser:

1. Connect TV to office Wi-Fi or Ethernet
2. Open dashboard URL
3. Confirm modern JavaScript support
4. Confirm WebSocket support
5. Confirm full-screen or kiosk capability
6. Confirm browser does not sleep aggressively

Built-in browsers may have:

- Old rendering engines
- Limited memory
- Poor WebSocket reliability
- Automatic screen savers
- Limited full-screen controls

Compatibility must be tested per television model.

---

# 284. Existing Streaming Devices

Existing devices may be usable when they support a modern browser.

Potential examples:

- Fire TV device
- Android TV device
- Google TV device
- Xbox browser
- Existing Windows wireless display receiver with a separate source device

The project shall not assume browser support without testing.

---

# 285. Browser Installation Limitation

Most televisions do not permit installing arbitrary desktop software.

It is usually not possible to install:

- Windows
- Chrome desktop
- Edge desktop
- Node.js

directly onto a television.

The deployment plan must use capabilities already present in the TV or an attached device.

---

# 286. HDMI from One Computer

One computer can physically drive multiple independent displays only when it has enough display outputs and the operating system treats each television as a separate monitor.

Example:

```text
PC Display 1 → TV 1
PC Display 2 → TV 2
PC Display 3 → TV 3
```

Each browser window may open a different TV URL.

This is different from an HDMI splitter.

An HDMI splitter duplicates one image and cannot provide independent TV states.

---

# 287. Long-Distance HDMI Limitation

Because the televisions are in separate rooms, direct HDMI may require:

- Long cables
- In-wall cabling
- HDMI-over-Ethernet equipment
- Additional adapters
- Multiple video outputs

This may be impractical and is not the preferred deployment unless existing cabling is already available.

---

# 288. Wireless Screen Mirroring

Wireless casting or mirroring may duplicate a computer display.

Limitations:

- Often shows the same screen on each TV
- May disconnect
- May require manual reconnection
- May introduce latency
- May not support independent displays
- May interfere with computer use

Wireless mirroring is not the preferred architecture for five independent TV states.

---

# 289. Recommended Multi-Room Architecture

Preferred architecture:

```text
One backend computer
+
One browser-capable device per television
```

Each display device opens:

```text
/display/<tv-id>
```

All devices share data from one backend.

Only the display device requires browser access.

It does not require ServiceTitan access.

---

# 290. Cost-Neutral Strategy

Before purchasing devices:

1. Test each TV's built-in browser
2. Inventory unused office computers and laptops
3. Check existing streaming devices
4. Check whether employees already use room computers connected to TVs
5. Test kiosk reliability
6. Assign one available browser-capable device to each TV

The software shall not depend on a specific hardware brand.

---

# 291. Low-Cost Fallback Strategy

When a TV has no usable built-in browser and no reusable device exists, an external browser-capable device is required.

The specification does not mandate a purchase.

Suitable categories include:

- Used office mini PC
- Retired laptop
- Existing Android/Google TV device
- Existing Fire TV device with compatible browser
- Low-cost single-board computer when performance is adequate

Hardware selection occurs after testing the finished dashboard.

---

# 292. Display Kiosk Requirements

Each TV browser should:

- Launch automatically after reboot
- Open the assigned TV URL
- Enter full-screen mode
- Prevent screen sleep
- Reconnect after network interruption
- Reload after browser crash
- Hide unnecessary browser controls

Deployment scripts may be provided for Windows kiosk devices.

---

# 293. Windows Kiosk Launch

For Windows display devices, the project may provide a startup shortcut or script similar to:

```bat
start msedge.exe ^
  --kiosk ^
  --edge-kiosk-type=fullscreen ^
  http://dashboard-pc:3000/display/break-room
```

The exact executable path shall be configurable.

This script is separate from the backend Edge instance used for ServiceTitan authentication.

---

# 294. Display Device Identity

Each device shall be assigned one stable TV URL.

The URL itself identifies the television.

No local login is required.

Example:

```text
/display/break-room
```

The device shall not choose a new ID after each restart.

---

# 295. Local Network Addressing

The backend computer should use one of:

- Static IP address
- DHCP reservation
- Reliable local hostname

Preferred for reliability:

```text
DHCP reservation
```

Example:

```text
192.168.1.50
```

Dashboard URL:

```text
http://192.168.1.50:3000/display/break-room
```

---

# 296. Firewall Configuration

Windows Firewall must permit inbound TCP traffic on the configured backend port.

Default:

```text
3000
```

Access should be limited to:

- Private networks
- Office subnet where practical

The deployment guide shall include exact Windows steps.

---

# 297. Network Failure Behavior

When a display loses network access:

- Keep showing current cached data
- Show connection warning
- Attempt WebSocket reconnection
- Retry REST state fetch
- Resume normally when network returns

The display should not immediately become blank.

---

# 298. Backend Computer Failure

When the backend computer is off:

- TVs cannot receive fresh data
- Remote controls cannot send commands
- Existing browser content may remain visible temporarily
- Displays shall show disconnected or stale status

Automatic backend startup is specified in a later deployment section.

---

# 299. Security Boundary

Version 1.0 is intended for the trusted office network.

The remote URL shall not be exposed publicly without:

- HTTPS
- Authentication
- Network-access controls
- Security review

ServiceTitan session information remains only on the backend computer.

---

# 300. Remote Acceptance Criteria

The remote application is accepted when:

1. A TV-specific QR code opens the correct control panel
2. General remote allows TV selection
3. Technician and KPI selections are independent
4. Technician-only selection works
5. KPI-only selection works
6. Technician-plus-KPI selection works
7. Empty selection cannot be submitted
8. Apply confirmation is immediate
9. Countdown remains accurate
10. New commands reset the timer
11. Resume Live Rotation works
12. Other TVs remain unaffected
13. Multiple remote clients receive state updates
14. Touch targets are mobile-friendly
15. No app installation is required

---

# 301. Deployment Acceptance Criteria

Multi-room deployment is accepted when:

1. Backend is reachable from office devices
2. Every configured display has a browser-capable device
3. Each display opens a unique TV URL
4. All live TVs remain synchronized
5. Different rooms can show different overrides
6. Phones can control each TV through QR codes
7. Backend survives routine network interruptions
8. Displays reconnect automatically
9. HDMI splitters are not required
10. No TV needs direct ServiceTitan access

---

**End of Part 8**

# GRmetro Live Performance Center
## Software Requirements Specification (SRS)

# Part 8 — QR Remote, Mobile UX & Multi-Room Display Deployment

Version 1.0

Status: Design Frozen

---

# 251. Purpose of This Section

This section defines:

- QR-code remote behavior
- Mobile user experience
- Television selection
- Technician selection
- KPI selection
- Override confirmation
- Two-minute timeout behavior
- QR-code generation
- Multi-room display deployment
- Network requirements
- Hardware limitations
- Zero-cost and low-cost connectivity options

The remote is a controller, not a second dashboard.

---

# 252. Remote Product Goal

The remote shall let an employee change one television in a few seconds without:

- Walking to the backend computer
- Touching the television
- Installing a mobile application
- Logging into ServiceTitan
- Entering a password
- Affecting other televisions

The desired flow is:

```text
Scan QR code
↓
Choose Technician or KPI
↓
Tap Apply
↓
Selected TV changes immediately
```

---

# 253. Remote Technology

The remote shall be a mobile web application.

Required characteristics:

- Runs in Safari, Chrome, and Edge mobile browsers
- Requires no installation
- Requires no app-store distribution
- Uses the same backend as the dashboard
- Uses REST for commands
- Uses WebSockets for live television state
- Uses the GRmetro visual identity

The remote shall be served from the office dashboard computer.

Example:

```text
http://dashboard-pc:3000/remote
```

---

# 254. Television-Specific QR Codes

Each television shall have its own QR code.

Example:

```text
Break Room TV
http://dashboard-pc:3000/remote?tv=break-room
```

```text
Dispatch TV
http://dashboard-pc:3000/remote?tv=dispatch
```

```text
Training Room TV
http://dashboard-pc:3000/remote?tv=training-room
```

When a user scans a television-specific QR code, the remote shall already know which TV is being controlled.

The user should not need to select the TV again.

---

# 255. General Remote URL

A general remote URL shall also exist:

```text
http://dashboard-pc:3000/remote
```

This version requires the user to select a television before controlling it.

The general remote is useful for:

- Managers
- Bookmarked access
- Testing
- Controlling a TV from another room

---

# 256. Preferred Remote Flow

For a television-specific QR code:

```text
Open remote
↓
Display TV name
↓
Choose Technician and/or KPI
↓
Apply
↓
Confirmation
```

For the general remote:

```text
Open remote
↓
Choose TV
↓
Choose Technician and/or KPI
↓
Apply
↓
Confirmation
```

---

# 257. Remote Screen Structure

The main remote control screen shall contain:

```text
GRmetro logo

Break Room TV

Currently Showing:
Live Rotation — Activity

Technician
[ None selected ]

KPI
[ None selected ]

[ Apply to Break Room TV ]

[ Resume Live Rotation ]
```

When an override is active:

```text
Currently Showing:
Julio — Revenue

Returns to live rotation in 1:42
```

---

# 258. Independent Selection Model

Technician and KPI selection are independent.

The interface shall not force this sequence:

```text
Technician
↓
KPI
```

The user may choose either selection first.

Valid combinations:

| Technician | KPI | Result |
|---|---|---|
| Selected | Not selected | Individual technician scorecard |
| Not selected | Selected | Team KPI graph and ranking |
| Selected | Selected | Individual technician KPI detail |
| Not selected | Not selected | Apply disabled |

---

# 259. Technician Picker

The technician picker shall display exactly the five configured technicians.

Example:

```text
Julio Torres
Shamon Ward
Charlie E
Alex K
Dwight
```

Each option may include:

- Initials
- Full name
- Selection indicator

Recommended mobile presentation:

```text
[ JT ] Julio Torres
[ SW ] Shamon Ward
[ CE ] Charlie E
[ AK ] Alex K
[ DW ] Dwight
```

The picker shall be easy to use with one hand.

---

# 260. KPI Picker

The KPI picker shall include exactly the approved KPIs:

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

The remote may group them visually by category:

```text
Revenue
- Revenue
- Service Revenue
- Install Revenue

Activity
- Billable Service Calls
- 10+ Opportunities
- Tech Leads
- Marketed Leads
- Number of Installs

Performance
- Lead Conversion %
- Closing %

Average Ticket
- Install Average Ticket
```

The grouping is visual only.

Internal KPI IDs remain unchanged.

---

# 261. Clearing a Selection

The user shall be able to clear:

- Technician selection
- KPI selection

Each picker shall include:

```text
None
```

or a clear button.

The remote shall prevent applying an override when both selections are empty.

---

# 262. Current Television State

Before the user submits a command, the remote shall show what the television is currently displaying.

Examples:

```text
Live Rotation — Revenue
```

```text
Julio Torres — Revenue
```

```text
Closing % — Team View
```

```text
Returning to Live Rotation
```

This reduces accidental overrides.

---

# 263. Apply Button

The Apply button label shall include the selected television name.

Example:

```text
Apply to Break Room TV
```

The button shall be disabled when:

- No television is selected
- Neither technician nor KPI is selected
- The request is being submitted
- The backend is unavailable

---

# 264. Apply Feedback

After submission, the remote shall show immediate feedback.

Success example:

```text
Break Room TV updated
```

Supporting text:

```text
Showing Julio Torres — Revenue
Returns to live rotation in 2:00
```

The remote shall not leave the user wondering whether the command worked.

---

# 265. Override Countdown

When a television is in remote mode, the remote shall show a countdown.

Example:

```text
Returns to Live Rotation in 1:37
```

The countdown shall derive from `expiresAt`.

It shall not depend solely on a local decrementing counter.

This prevents timer drift.

---

# 266. Timer Reset

Submitting another valid command to the same television shall reset the timer to:

```text
2:00
```

The remote shall update immediately from the returned television state.

---

# 267. Resume Live Rotation

The remote shall include:

```text
Resume Live Rotation
```

This button ends the override immediately.

The television shall use the approved return animation.

The remote shall confirm:

```text
Break Room TV returned to Live Rotation
```

---

# 268. Remote Concurrency

More than one phone may open the remote at the same time.

The latest valid command wins.

The remote shall update when another user changes the same television.

Example:

```text
This TV was changed by another remote.
Currently showing: Closing %
```

No user identity tracking is required in Version 1.0.

---

# 269. Remote WebSocket Behavior

The remote shall subscribe to:

- TV state changes
- Connection status
- Dashboard refresh timestamps

The remote shall not require a WebSocket connection to send REST commands.

If WebSocket is disconnected but REST works:

- Commands may still be submitted
- A reconnect warning is shown
- State is refreshed after reconnect

---

# 270. Touch Target Requirements

Interactive elements shall have a minimum touch size of:

```text
44 × 44 CSS pixels
```

Recommended primary controls:

```text
48–56 pixels high
```

Spacing between selectable rows shall prevent accidental taps.

---

# 271. Mobile Typography

Recommended sizes:

```text
Page title: 28–32 px
TV name: 22–26 px
Section labels: 16–18 px
Picker items: 17–20 px
Button labels: 17–20 px
Supporting text: 14–16 px
```

The interface shall remain usable without zooming.

---

# 272. Remote Visual Style

The remote shall use:

- Light background
- White cards
- GRmetro logo
- GRmetro teal accents
- Gold for achievements or selected premium metrics
- Rounded controls
- Soft shadows
- Clear selection states

The remote shall not copy the dense television chart layout.

---

# 273. Mobile Accessibility

The remote shall support:

- Keyboard navigation
- Screen-reader labels
- Visible focus states
- Sufficient contrast
- Semantic buttons
- Semantic form controls
- Reduced-motion preferences

Color shall not be the only indicator of selection.

---

# 274. Reduced Motion

When the user's device requests reduced motion:

```css
prefers-reduced-motion: reduce
```

The remote shall reduce:

- Sliding transitions
- Scale animations
- Decorative motion

Functional state changes must remain clear.

---

# 275. QR-Code Generation

The repository shall include a script that generates QR codes for every configured television.

Recommended script:

```text
scripts/generate-qr-codes.js
```

Input:

```javascript
shared/televisions.js
```

Output:

```text
assets/qr/break-room.png
assets/qr/dispatch.png
assets/qr/training-room.png
assets/qr/front-office.png
assets/qr/shop.png
```

The base URL shall be configurable.

Example command:

```bash
npm run generate:qr -- --base-url=http://dashboard-pc:3000
```

---

# 276. QR-Code Content

Each QR code shall point to:

```text
<base-url>/remote?tv=<tv-id>
```

Example:

```text
http://192.168.1.50:3000/remote?tv=break-room
```

A stable local IP address is preferred over a computer hostname when office-device hostname resolution is unreliable.

---

# 277. QR-Code Label

Each printed QR code shall include readable text.

Example:

```text
Control Break Room TV

Scan to choose a technician or KPI
```

A printed fallback URL may appear below the QR code.

---

# 278. On-Screen QR Badge

The dashboard may display a small QR badge in a corner.

Requirements:

- Does not cover charts
- Does not distract from live content
- Includes a short label
- Uses the TV-specific URL
- Remains large enough to scan from nearby

A printed physical QR code is still recommended for reliability.

---

# 279. Office-Network Requirement

The backend computer, televisions or display devices, and phones must be connected to the same network unless the system is later exposed securely through the internet.

Version 1.0 assumes:

```text
Local office network only
```

No cloud deployment is required.

---

# 280. Backend Computer

The recommended backend host is the existing Windows computer used to access ServiceTitan.

It shall:

- Stay powered on during business hours
- Run Edge with remote debugging
- Remain logged into ServiceTitan
- Run the backend service
- Serve the dashboard and remote
- Connect to the office network

This minimizes the number of machines that need ServiceTitan access.

---

# 281. Display Device Requirement

A television cannot open the dashboard unless it has one of the following:

- Built-in modern web browser
- Existing streaming device with a usable browser
- Connected computer
- Connected laptop
- Connected mini PC
- Connected console or device capable of kiosk web display

Software cannot add web-browser capability to a television that lacks a computing platform.

---

# 282. Zero-Cost Deployment Priority

The project shall first inventory existing hardware.

For every television, determine whether any existing device is already connected or available, such as:

- Old office laptop
- Retired desktop
- Existing mini PC
- Existing streaming stick
- Game console
- Cable-box platform with browser
- Built-in smart-TV browser

Existing hardware should be reused before purchasing anything.

---

# 283. Built-In Smart-TV Browser

When a television has a built-in browser:

1. Connect TV to office Wi-Fi or Ethernet
2. Open dashboard URL
3. Confirm modern JavaScript support
4. Confirm WebSocket support
5. Confirm full-screen or kiosk capability
6. Confirm browser does not sleep aggressively

Built-in browsers may have:

- Old rendering engines
- Limited memory
- Poor WebSocket reliability
- Automatic screen savers
- Limited full-screen controls

Compatibility must be tested per television model.

---

# 284. Existing Streaming Devices

Existing devices may be usable when they support a modern browser.

Potential examples:

- Fire TV device
- Android TV device
- Google TV device
- Xbox browser
- Existing Windows wireless display receiver with a separate source device

The project shall not assume browser support without testing.

---

# 285. Browser Installation Limitation

Most televisions do not permit installing arbitrary desktop software.

It is usually not possible to install:

- Windows
- Chrome desktop
- Edge desktop
- Node.js

directly onto a television.

The deployment plan must use capabilities already present in the TV or an attached device.

---

# 286. HDMI from One Computer

One computer can physically drive multiple independent displays only when it has enough display outputs and the operating system treats each television as a separate monitor.

Example:

```text
PC Display 1 → TV 1
PC Display 2 → TV 2
PC Display 3 → TV 3
```

Each browser window may open a different TV URL.

This is different from an HDMI splitter.

An HDMI splitter duplicates one image and cannot provide independent TV states.

---

# 287. Long-Distance HDMI Limitation

Because the televisions are in separate rooms, direct HDMI may require:

- Long cables
- In-wall cabling
- HDMI-over-Ethernet equipment
- Additional adapters
- Multiple video outputs

This may be impractical and is not the preferred deployment unless existing cabling is already available.

---

# 288. Wireless Screen Mirroring

Wireless casting or mirroring may duplicate a computer display.

Limitations:

- Often shows the same screen on each TV
- May disconnect
- May require manual reconnection
- May introduce latency
- May not support independent displays
- May interfere with computer use

Wireless mirroring is not the preferred architecture for five independent TV states.

---

# 289. Recommended Multi-Room Architecture

Preferred architecture:

```text
One backend computer
+
One browser-capable device per television
```

Each display device opens:

```text
/display/<tv-id>
```

All devices share data from one backend.

Only the display device requires browser access.

It does not require ServiceTitan access.

---

# 290. Cost-Neutral Strategy

Before purchasing devices:

1. Test each TV's built-in browser
2. Inventory unused office computers and laptops
3. Check existing streaming devices
4. Check whether employees already use room computers connected to TVs
5. Test kiosk reliability
6. Assign one available browser-capable device to each TV

The software shall not depend on a specific hardware brand.

---

# 291. Low-Cost Fallback Strategy

When a TV has no usable built-in browser and no reusable device exists, an external browser-capable device is required.

The specification does not mandate a purchase.

Suitable categories include:

- Used office mini PC
- Retired laptop
- Existing Android/Google TV device
- Existing Fire TV device with compatible browser
- Low-cost single-board computer when performance is adequate

Hardware selection occurs after testing the finished dashboard.

---

# 292. Display Kiosk Requirements

Each TV browser should:

- Launch automatically after reboot
- Open the assigned TV URL
- Enter full-screen mode
- Prevent screen sleep
- Reconnect after network interruption
- Reload after browser crash
- Hide unnecessary browser controls

Deployment scripts may be provided for Windows kiosk devices.

---

# 293. Windows Kiosk Launch

For Windows display devices, the project may provide a startup shortcut or script similar to:

```bat
start msedge.exe ^
  --kiosk ^
  --edge-kiosk-type=fullscreen ^
  http://dashboard-pc:3000/display/break-room
```

The exact executable path shall be configurable.

This script is separate from the backend Edge instance used for ServiceTitan authentication.

---

# 294. Display Device Identity

Each device shall be assigned one stable TV URL.

The URL itself identifies the television.

No local login is required.

Example:

```text
/display/break-room
```

The device shall not choose a new ID after each restart.

---

# 295. Local Network Addressing

The backend computer should use one of:

- Static IP address
- DHCP reservation
- Reliable local hostname

Preferred for reliability:

```text
DHCP reservation
```

Example:

```text
192.168.1.50
```

Dashboard URL:

```text
http://192.168.1.50:3000/display/break-room
```

---

# 296. Firewall Configuration

Windows Firewall must permit inbound TCP traffic on the configured backend port.

Default:

```text
3000
```

Access should be limited to:

- Private networks
- Office subnet where practical

The deployment guide shall include exact Windows steps.

---

# 297. Network Failure Behavior

When a display loses network access:

- Keep showing current cached data
- Show connection warning
- Attempt WebSocket reconnection
- Retry REST state fetch
- Resume normally when network returns

The display should not immediately become blank.

---

# 298. Backend Computer Failure

When the backend computer is off:

- TVs cannot receive fresh data
- Remote controls cannot send commands
- Existing browser content may remain visible temporarily
- Displays shall show disconnected or stale status

Automatic backend startup is specified in a later deployment section.

---

# 299. Security Boundary

Version 1.0 is intended for the trusted office network.

The remote URL shall not be exposed publicly without:

- HTTPS
- Authentication
- Network-access controls
- Security review

ServiceTitan session information remains only on the backend computer.

---

# 300. Remote Acceptance Criteria

The remote application is accepted when:

1. A TV-specific QR code opens the correct control panel
2. General remote allows TV selection
3. Technician and KPI selections are independent
4. Technician-only selection works
5. KPI-only selection works
6. Technician-plus-KPI selection works
7. Empty selection cannot be submitted
8. Apply confirmation is immediate
9. Countdown remains accurate
10. New commands reset the timer
11. Resume Live Rotation works
12. Other TVs remain unaffected
13. Multiple remote clients receive state updates
14. Touch targets are mobile-friendly
15. No app installation is required

---

# 301. Deployment Acceptance Criteria

Multi-room deployment is accepted when:

1. Backend is reachable from office devices
2. Every configured display has a browser-capable device
3. Each display opens a unique TV URL
4. All live TVs remain synchronized
5. Different rooms can show different overrides
6. Phones can control each TV through QR codes
7. Backend survives routine network interruptions
8. Displays reconnect automatically
9. HDMI splitters are not required
10. No TV needs direct ServiceTitan access

---

# 302. End of Part 8

# Part 9 — Windows Deployment, Startup Automation & Operations

---

# 303. Purpose of This Section

This section defines how the completed application shall run in the GRmetro office.

It specifies:

- Production deployment on Windows
- Backend host requirements
- Microsoft Edge remote-debugging startup
- Manual ServiceTitan authentication
- Automatic application startup
- Process supervision
- Production builds
- Network configuration
- Television kiosk startup
- Logging
- Daily operating procedures
- Recovery after failures
- Troubleshooting expectations

The preferred Version 1.0 deployment uses one Windows computer as the backend host.

---

# 304. Production Topology

Recommended topology:

```text
ServiceTitan
    │
    │ Authenticated Edge session
    ▼
Backend Windows Computer
    │
    ├── Node.js backend
    ├── Dashboard static files
    ├── Remote static files
    ├── WebSocket server
    └── Memory cache
         │
         ├── Break Room Display
         ├── Dispatch Display
         ├── Training Room Display
         ├── Front Office Display
         └── Shop Display
```

Only the backend computer requires an authenticated ServiceTitan session.

Display devices require only:

- Office-network access
- A modern web browser
- The correct display URL

---

# 305. Backend Host Selection

The backend shall run on a Windows computer that:

- Can remain powered on during operating hours
- Has reliable office-network access
- Can run Microsoft Edge
- Can remain signed into ServiceTitan
- Can run Node.js
- Is not routinely carried away or shut down
- Has enough memory for Edge, Node.js, and the dashboard server

Recommended minimum:

```text
Windows 10 or Windows 11
4 CPU cores
8 GB RAM
2 GB free disk space
Reliable Ethernet or Wi-Fi
```

Ethernet is preferred when available.

---

# 306. Backend Host Responsibilities

The backend computer shall run:

1. A dedicated Edge instance for ServiceTitan
2. The GRmetro backend
3. The built dashboard application
4. The built remote application
5. The WebSocket server
6. Log files
7. Optional health-monitoring scripts

The backend host does not need to display a dashboard TV view unless one television is connected directly by HDMI.

---

# 307. Software Prerequisites

Required software:

```text
Node.js LTS
npm
Microsoft Edge
Git
```

Recommended:

```text
Visual Studio Code
```

The implementation shall not depend on globally installed npm packages.

All JavaScript dependencies shall be declared in repository package files.

---

# 308. Node.js Version

Production shall use a supported Node.js LTS release.

The repository shall include:

```text
.nvmrc
```

or:

```text
.node-version
```

when practical.

The README shall state the tested Node.js version.

Do not require an experimental Node.js release unless explicitly validated.

---

# 309. Production Installation

Recommended installation directory:

```text
C:\GRmetro\live-performance-center
```

Alternative user-directory location:

```text
C:\Users\<user>\grmetro-live-performance-center
```

A stable non-temporary path is preferred.

Installation workflow:

```powershell
git clone <repository-url> C:\GRmetro\live-performance-center
cd C:\GRmetro\live-performance-center
npm install
npm run build
```

---

# 310. Environment Configuration

Production environment file:

```text
.env
```

Example:

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

The `.env` file shall not be committed.

---

# 311. Production Build

The dashboard and remote shall be compiled before production startup.

Command:

```powershell
npm run build
```

The build process shall produce static assets for:

```text
Dashboard
Remote
```

The Express backend shall serve these files.

Recommended routes:

```text
/display/:tvId
/remote
/assets/*
```

No Vite development server shall be required in production.

---

# 312. Production Server Command

Primary production command:

```powershell
npm start
```

The command shall:

- Start the Express server
- Attach the WebSocket server
- Connect to Edge
- Run the first ServiceTitan refresh
- Start the refresh scheduler
- Start TV-expiration monitoring
- Serve dashboard and remote assets

---

# 313. Dedicated Edge Profile

The ServiceTitan Edge instance shall use a dedicated profile directory.

Recommended path:

```text
C:\GRmetro\EdgeAutomation
```

This avoids conflicts with the user's normal Edge profile.

Benefits:

- Stable ServiceTitan session
- Fewer unrelated tabs
- Easier troubleshooting
- Reduced risk of closing the wrong browser
- Separate cookies from ordinary browsing

---

# 314. Edge Remote-Debugging Command

Preferred startup command:

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

The deployment script shall detect or document both paths.

---

# 315. Edge Startup Script

Recommended file:

```text
scripts\start-servicetitan-edge.cmd
```

Example behavior:

1. Check whether port 9222 is already active
2. Avoid launching duplicate debug instances
3. Launch Edge with the dedicated profile
4. Open ServiceTitan
5. Keep the command window minimal or hidden where practical

The script shall not contain ServiceTitan credentials.

---

# 316. ServiceTitan Login Workflow

Initial setup:

1. Run the dedicated Edge startup script
2. Enter ServiceTitan username
3. Submit username
4. Enter password
5. Submit password
6. Complete phone or MFA confirmation
7. Navigate to any authenticated ServiceTitan page
8. Leave the Edge window open
9. Start the backend

The backend shall not automate these login steps in Version 1.0.

---

# 317. Session Expiration

When the ServiceTitan session expires:

- Backend requests will fail
- Health status shall report authentication required
- Existing cached data remains visible
- Dashboard status becomes stale
- Logs shall clearly request manual login

Recommended dashboard warning:

```text
Live data login required
Showing last successful update
```

Recovery:

1. Open the dedicated Edge window
2. Sign into ServiceTitan
3. Leave the authenticated page open
4. Backend retries automatically during the next refresh

A backend restart should not be required unless the browser connection itself failed.

---

# 318. ServiceTitan Page Selection

The dedicated Edge instance should normally contain one ServiceTitan tab.

Preferred page:

```text
Technician Scorecard
```

Fallback:

```text
Any authenticated go.servicetitan.com page
```

The backend shall locate the valid page automatically.

The user shall not need to keep a specific technician selected after startup unless ServiceTitan later requires it.

---

# 319. Backend Startup Order

Recommended startup order:

```text
1. Start dedicated Edge
2. Confirm ServiceTitan authentication
3. Start backend
4. Start or wake display devices
```

The backend shall tolerate Edge being unavailable at first and retry with clear logging.

It should not crash permanently solely because Edge started several seconds later.

---

# 320. Automatic Startup Strategy

Version 1.0 shall support automatic startup after Windows login.

Recommended methods:

1. Windows Task Scheduler
2. Startup-folder shortcut
3. Optional Windows service wrapper

Task Scheduler is preferred because it supports:

- Delayed startup
- Restart after failure
- Running with a selected user account
- Startup ordering

---

# 321. Task Scheduler — Edge Task

Create a task:

```text
GRmetro ServiceTitan Edge
```

Trigger:

```text
At user logon
```

Optional delay:

```text
15 seconds
```

Action:

```text
scripts\start-servicetitan-edge.cmd
```

Run only when the designated account is logged in, because the user may need to interact with ServiceTitan authentication.

---

# 322. Task Scheduler — Backend Task

Create a task:

```text
GRmetro Live Performance Backend
```

Trigger:

```text
At user logon
```

Recommended delay:

```text
30–45 seconds
```

Action:

```text
scripts\start-backend.cmd
```

The delay allows:

- Network startup
- Edge startup
- ServiceTitan profile initialization

The backend must still implement retries rather than relying only on the delay.

---

# 323. Backend Startup Script

Recommended file:

```text
scripts\start-backend.cmd
```

Expected behavior:

```bat
@echo off
cd /d C:\GRmetro\live-performance-center
npm start >> logs\backend-console.log 2>&1
```

The final implementation may use a more reliable process supervisor.

The script shall create the log directory if missing.

---

# 324. Process Supervision

The backend should restart automatically after an unexpected crash.

Approved options:

- Windows Task Scheduler restart-on-failure
- A lightweight Node.js process manager
- A Windows service wrapper

Version 1.0 preference:

```text
Task Scheduler restart-on-failure
```

This avoids adding unnecessary infrastructure.

Recommended settings:

```text
Restart every 1 minute
Attempt restart 3 or more times
Do not stop task after an arbitrary runtime
```

---

# 325. Graceful Shutdown

The backend shall respond to:

```text
SIGINT
SIGTERM
```

On shutdown it shall:

- Stop the refresh scheduler
- Stop expiration monitoring
- Close WebSocket connections
- Close the HTTP server
- Detach from Playwright without closing the user's Edge session
- Flush logs where applicable

The backend shall not call:

```javascript
browser.close()
```

when connected to the user's manually launched Edge instance unless explicitly safe.

---

# 326. Windows User Account

A dedicated Windows account may be used for the dashboard host.

Benefits:

- Predictable startup
- Dedicated Edge profile
- Reduced interference from personal browsing
- Easier permission management

This is recommended but not mandatory.

The account shall have access to:

- Repository folder
- Node.js
- Edge
- Network
- Log directory

---

# 327. Local Network Address

The backend host should receive a stable address.

Preferred:

```text
DHCP reservation
```

Example:

```text
192.168.1.50
```

This is configured through the office router or network controller.

A manually configured static IP may be used when managed correctly.

---

# 328. Hostname Option

A local hostname may be used:

```text
grmetro-dashboard
```

URLs:

```text
http://grmetro-dashboard:3000/display/break-room
http://grmetro-dashboard:3000/remote
```

Because local hostname resolution varies across devices, QR codes should prefer a stable IP address unless hostname reliability is confirmed.

---

# 329. Windows Firewall

The backend port must be reachable from the office network.

Default port:

```text
3000
```

Firewall rule requirements:

- Inbound TCP
- Port 3000
- Private network profile
- Limited to local subnet where practical

The deployment documentation shall include a PowerShell command or graphical instructions.

Example administrative PowerShell:

```powershell
New-NetFirewallRule `
  -DisplayName "GRmetro Live Performance Center" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3000 `
  -Action Allow `
  -Profile Private
```

---

# 330. Network Test

From another office device, verify:

```text
http://192.168.1.50:3000/api/v1/health
```

Then verify:

```text
http://192.168.1.50:3000/remote
```

Then verify a display:

```text
http://192.168.1.50:3000/display/break-room
```

All three must load before QR codes are printed.

---

# 331. QR-Code Production

After the backend URL is stable:

```powershell
npm run generate:qr -- --base-url=http://192.168.1.50:3000
```

Generated codes shall be reviewed with multiple phones before printing.

Do not generate final QR codes using:

```text
localhost
127.0.0.1
```

because those addresses point to the phone itself.

---

# 332. Dashboard Display Startup

Each browser-capable display device shall open one stable URL.

Example:

```text
http://192.168.1.50:3000/display/break-room
```

No TV credentials are required.

The display ID is encoded in the URL.

---

# 333. Windows Display Device Kiosk Script

Recommended file template:

```text
scripts\display-kiosk-template.cmd
```

Example:

```bat
@echo off
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --kiosk ^
  --edge-kiosk-type=fullscreen ^
  --no-first-run ^
  --disable-session-crashed-bubble ^
  http://192.168.1.50:3000/display/break-room
```

Each Windows display device receives a room-specific copy.

---

# 334. Kiosk Browser Requirements

The display browser shall:

- Open full screen
- Hide browser controls
- Disable sleep where possible
- Reopen after reboot
- Restore after network interruption
- Avoid unrelated tabs
- Keep JavaScript enabled
- Permit WebSockets

The operating system shall be configured not to sleep during business hours.

---

# 335. Smart-TV Browser Operation

For smart TVs using a built-in browser:

- Save the display URL as a favorite where supported
- Disable automatic sleep
- Disable screen saver where allowed
- Test browser memory over a full workday
- Test WebSocket reconnect after Wi-Fi interruption
- Confirm full-screen behavior

If a built-in browser reloads or crashes regularly, it is not considered production-ready.

---

# 336. Direct HDMI Television

One TV may connect directly to the backend computer by HDMI.

That TV shall still use its own display URL.

The browser window may run full-screen on the extended desktop.

Windows display mode must be:

```text
Extend these displays
```

not:

```text
Duplicate
```

This permits the directly connected TV to maintain independent state.

---

# 337. Daily Startup Procedure

Normal daily process:

1. Backend computer starts or wakes
2. Dedicated Edge launches
3. ServiceTitan session is checked
4. Backend starts automatically
5. First refresh completes
6. Displays reconnect
7. Live rotation begins

When ServiceTitan remains signed in, no manual action should be required.

---

# 338. Daily Login Check

At the beginning of the workday, designated staff should verify:

```text
ServiceTitan Edge window is authenticated
Dashboard health status is connected
Data was refreshed recently
```

This check should take less than one minute.

---

# 339. Daily Shutdown

The system may remain running overnight.

When office policy requires shutdown:

1. Stop backend gracefully
2. Close display browsers if needed
3. Close dedicated Edge
4. Shut down Windows computer

No database backup is required because Version 1.0 stores no historical data.

---

# 340. Automatic Data Recovery

After backend restart:

- Cache begins empty
- TVs display connecting state
- First successful refresh rebuilds data
- Live rotation resumes
- All remote overrides are cleared

No manual cache restoration is needed.

---

# 341. Logging Directory

Recommended:

```text
logs/
```

Files may include:

```text
backend.log
errors.log
refresh.log
backend-console.log
```

Logs shall be excluded from Git.

---

# 342. Log Rotation

Logs must not grow indefinitely.

Recommended behavior:

- Rotate daily or by size
- Keep approximately 7–14 days
- Compress older logs where practical
- Delete expired logs automatically

Recommended maximum total log storage:

```text
250 MB
```

Sensitive ServiceTitan values shall not be logged.

---

# 343. Log Levels

Supported levels:

```text
debug
info
warn
error
```

Production default:

```text
info
```

Examples:

```text
INFO Refresh started
INFO Technician refresh complete
WARN Technician data stale
ERROR ServiceTitan authentication required
```

---

# 344. Operational Health Page

An optional human-readable page may exist:

```text
/status
```

It may show:

- Backend status
- Browser connection
- ServiceTitan status
- Last successful refresh
- Connected display count
- Active overrides
- Application version

It shall not expose secrets.

This page is useful for office troubleshooting.

---

# 345. Health Monitoring

The application shall internally track:

- Backend uptime
- Browser connected state
- ServiceTitan request success
- Last successful refresh
- Cache age
- Connected WebSocket clients
- Stale technician count
- Last error summary

External monitoring is not required in Version 1.0.

---

# 346. Browser Disconnect Recovery

When Playwright loses the CDP connection:

1. Mark browser disconnected
2. Preserve cache
3. Log warning
4. Retry connection with backoff
5. Locate ServiceTitan page again
6. Refresh CSRF token
7. Resume normal refresh cycle

Recommended retry pattern:

```text
1 second
2 seconds
5 seconds
10 seconds
30 seconds
```

Continue at thirty-second intervals.

---

# 347. Edge Restart Recovery

When the dedicated Edge instance closes:

- Dashboard retains cached data
- Status becomes disconnected
- Backend continues attempting reconnection

After Edge relaunch:

- Backend reconnects
- Finds authenticated page
- Refreshes token
- Executes next refresh
- Clears stale warning after success

---

# 348. Backend Crash Recovery

Task Scheduler or process supervision shall restart the backend.

After restart:

- Edge remains open
- Backend reconnects
- Cache rebuilds
- Displays reconnect automatically

The user should not need to reload every TV manually.

---

# 349. Display Browser Crash Recovery

On Windows display devices:

- Kiosk process should restart at login
- Optional watchdog may relaunch Edge if closed

On smart TVs:

- Manual relaunch may be necessary
- Reliability shall be evaluated during hardware testing

---

# 350. Network Interruption Recovery

When office network connectivity returns:

- Backend continues listening
- Displays reconnect
- Remote becomes available
- Current TV state is fetched
- Live synchronization resumes

No manual reset should be necessary.

---

# 351. Application Updates

Recommended update procedure:

```powershell
cd C:\GRmetro\live-performance-center
git pull
npm install
npm run build
```

Then restart backend.

Updates should be performed outside critical display periods.

---

# 352. Version Identification

The application shall expose its version through:

```text
/api/v1/health
```

Example:

```json
{
  "version": "1.0.0"
}
```

The version may also appear discreetly on the status page.

---

# 353. Rollback

Before production updates, preserve the previously working Git commit.

Rollback:

```powershell
git checkout <previous-commit>
npm install
npm run build
```

Then restart backend.

No database migration rollback is required in Version 1.0.

---

# 354. Configuration Backup

Although no technician history is stored, configuration files matter.

Back up:

```text
.env
shared/goals.js
shared/technicians.js
shared/televisions.js
shared/jobClassifications.js
```

The Git repository already preserves committed non-secret configuration.

The `.env` file requires a separate secure backup.

---

# 355. ServiceTitan Change Procedure

When ServiceTitan changes an internal endpoint:

1. Capture the new request through browser DevTools
2. Confirm method
3. Confirm URL
4. Confirm headers
5. Confirm request body
6. Confirm response shape
7. Update `docs/SERVICETITAN.md`
8. Update centralized client configuration
9. Add or update tests
10. Validate all five technicians

Do not patch multiple unrelated files with duplicated endpoint logic.

---

# 356. Common Troubleshooting — Backend Not Reachable

Check:

```text
Backend process running
Correct IP address
Correct port
Windows Firewall
Office network profile is Private
Device is on same network
```

Test locally:

```text
http://127.0.0.1:3000/api/v1/health
```

Test remotely:

```text
http://<backend-ip>:3000/api/v1/health
```

---

# 357. Common Troubleshooting — Edge Connection Failure

Check:

```text
Dedicated Edge is running
Remote-debugging port is 9222
Correct profile was launched
Another process is not blocking port
EDGE_DEBUG_URL uses 127.0.0.1
```

Diagnostic URL:

```text
http://127.0.0.1:9222/json/version
```

A valid response should include a browser description and WebSocket debugger URL.

---

# 358. Common Troubleshooting — ServiceTitan Authentication Required

Symptoms:

- HTML response instead of JSON
- 401 or 403 response
- Scorecard data stops refreshing
- Health page reports authentication required

Resolution:

1. Open dedicated Edge
2. Sign into ServiceTitan
3. Complete MFA
4. Confirm authenticated page loads
5. Wait for next refresh or use development refresh route

---

# 359. Common Troubleshooting — Data Is Stale

Check:

- Last successful refresh
- ServiceTitan browser login
- Network access
- CSRF token errors
- Partial technician failures
- Refresh logs
- Health route

Cached data should remain visible while troubleshooting.

---

# 360. Common Troubleshooting — One Technician Missing

Check:

- Technician ID in configuration
- Technician access permissions
- ServiceTitan response for that ID
- Date range
- Business units
- Per-technician error logs
- Job classification data

A single failure should not remove all other technicians.

---

# 361. Common Troubleshooting — QR Code Opens Nothing

Check:

- QR URL does not use localhost
- Phone is on office Wi-Fi
- Backend IP has not changed
- Firewall permits port 3000
- Remote URL loads manually
- QR code corresponds to valid TV ID

---

# 362. Common Troubleshooting — TV Shows Invalid ID

Check display URL.

Expected:

```text
/display/break-room
```

The ID must match `shared/televisions.js` exactly.

TV IDs are case-sensitive unless the implementation normalizes them.

Lowercase IDs are required.

---

# 363. Common Troubleshooting — TVs Not Synchronized

Check:

- Device clocks
- Backend-provided rotation epoch
- Slide-duration configuration
- Dashboard build versions
- Browser tab suspension
- WebSocket connection

Clients shall calculate rotation using backend timestamps rather than local startup time.

---

# 364. Common Troubleshooting — Remote Changes Every TV

This indicates incorrect TV-state scoping.

Expected behavior:

```text
One override
→ One TV ID
→ One affected dashboard client
```

Check:

- API route TV ID
- WebSocket subscriptions
- Broadcaster filtering
- Frontend URL IDs

This is a release-blocking defect.

---

# 365. Common Troubleshooting — Dashboard Performance

Check:

- Built-in smart-TV browser limitations
- Excessive DOM elements
- SVG complexity
- Continuous decorative animations
- Browser memory
- Screen resolution
- Hardware acceleration

The finished dashboard shall be tested on each intended device before production rollout.

---

# 366. Production Security Rules

Production shall not:

- Expose port 3000 directly to the public internet
- Store ServiceTitan credentials
- Log cookies or CSRF tokens
- Enable development routes
- Enable mock mode silently
- Allow arbitrary TV IDs
- Accept unvalidated override values
- Serve repository source files

---

# 367. Operational Acceptance Criteria

Production operations are accepted when:

1. Backend starts automatically after Windows login
2. Dedicated Edge launches automatically
3. Staff can manually restore ServiceTitan login
4. Backend reconnects after Edge restart
5. Displays reconnect after backend restart
6. First refresh completes automatically
7. Firewall allows office-network clients
8. QR remote works from office phones
9. Logs rotate automatically
10. Health information is available
11. Configuration is backed up
12. Deployment instructions are documented
13. No credentials are stored in source control
14. All five display URLs remain stable
15. A routine restart does not require rebuilding the project

---

# 368. End of Part 9

# Part 10 — Testing, Quality Assurance & Version 1.0 Release Criteria

---

# 369. Purpose of This Section

This section defines how the application shall be verified before production deployment.

It specifies:

- Unit testing
- Integration testing
- Mock ServiceTitan fixtures
- REST API testing
- WebSocket testing
- Dashboard visual testing
- QR remote testing
- Multi-TV testing
- Performance testing
- Reliability testing
- Security validation
- User acceptance testing
- Release-blocking defects
- Version 1.0 definition of done

The application shall not be considered production-ready merely because it runs on the developer's computer.

---

# 370. Testing Philosophy

Testing shall focus on the parts most likely to cause incorrect or misleading performance information.

Highest-priority areas:

1. ServiceTitan response parsing
2. KPI normalization
3. Service/install job classification
4. Goal calculations
5. Rankings
6. Overall Top 3 score
7. Independent TV state
8. Override expiration
9. Stale-data handling
10. Multi-device reconnection

A visually polished dashboard with incorrect metrics is a failed product.

---

# 371. Test Categories

Version 1.0 shall include:

```text
Unit Tests
Integration Tests
API Contract Tests
WebSocket Tests
Frontend Component Tests
Visual Regression Tests
End-to-End Tests
Performance Tests
Manual User Acceptance Tests
```

Not every file requires an individual test.

Business-critical logic does.

---

# 372. Test Environment Modes

The backend shall support at least two explicit modes.

## Production Mode

Uses:

- Real Edge session
- Real ServiceTitan data
- Real configured technicians

## Mock Mode

Uses:

- Local JSON fixtures
- No Edge
- No ServiceTitan
- Deterministic technician data

Mock mode shall be enabled explicitly.

Example:

```env
MOCK_MODE=true
```

Production shall never silently fall back to mock mode.

---

# 373. Mock Data Requirements

The repository shall include realistic fixtures for all five technicians.

Recommended folder:

```text
apps/backend/test/fixtures/
```

Files:

```text
technician-overview.json
technician-datasource.json
technician-job-drilldown.json
dashboard-normalized.json
partial-failure.json
missing-data.json
ranking-change.json
```

Fixtures shall be sanitized.

They shall not contain:

- Real phone numbers
- Real email addresses
- CSRF tokens
- Cookies
- Session IDs
- Private customer information

---

# 374. Fixture Coverage

Mock data shall cover:

- Normal successful day
- All-zero day
- Missing fields
- Null fields
- No installs
- No leads
- One technician unavailable
- HTML response instead of JSON
- 401 response
- 403 response
- 500 response
- Ranking changes
- Goal reached
- New overall leader
- Entered Top 3
- Stale technician data
- Service/install classification ambiguity

---

# 375. Test Framework

Recommended backend test framework:

```text
Vitest
```

or:

```text
Node.js built-in test runner
```

Recommended frontend test tools:

```text
Vitest
React Testing Library
Playwright
```

The final implementation may choose equivalent tools, but dependencies should remain minimal.

---

# 376. Unit Test Scope

Unit tests shall cover pure functions and isolated modules.

Required unit-test targets:

```text
normalizer
metricDerivations
goalEngine
rankingEngine
dashboardBuilder
axisCalculation
formatters
validation
tvManager
expirationMonitor
rotationCalculation
```

Browser and network dependencies shall be mocked.

---

# 377. Normalizer Tests

Normalizer tests shall verify:

- Correct ServiceTitan field mapping
- Decimal ratios convert to percentages
- Currency remains numeric
- Count fields remain integers
- `null` becomes no data
- Missing fields become no data
- Raw records are not mutated
- Unrelated ServiceTitan fields are discarded
- Technician ID is preserved
- Configured technician name overrides null ServiceTitan name

Example:

```text
OpportunityConversionRate = 0.5
→
leadConversionRate.value = 50
```

---

# 378. HTML Response Detection Tests

The response parser shall reject:

```html
<!doctype html>
```

It shall also reject:

- `text/html` content type
- Login pages
- ServiceTitan app-shell responses
- Hash-route redirects
- Invalid JSON with HTTP 200

The error shall identify:

- Endpoint
- Status
- Final URL
- Content type

Sensitive headers shall not appear.

---

# 379. Goal Engine Tests

Tests shall cover:

```text
value below goal
value equal to goal
value above goal
missing value
missing goal
zero goal
negative goal
percentage KPI
currency KPI
integer KPI
```

Example:

```text
Value = 12
Goal = 10
Percent Complete = 120
Reached = true
```

Percent complete shall not be capped.

---

# 380. Ranking Engine Tests

Ranking tests shall cover:

- Five unique values
- Tied values
- Missing values
- Stale values
- Previous rank comparison
- Alphabetical tie-breaking
- Revenue tie-breaking
- Deterministic ordering across repeated runs

Expected ordinal output:

```text
1, 2, 3, 4, 5
```

---

# 381. Overall Score Tests

Tests shall verify:

- Configured weights
- Weight sum validation
- Goal normalization
- 150% contribution cap
- Missing-weight redistribution
- Minimum valid coverage threshold
- Insufficient-data disqualification
- Stable ordering
- Previous-rank movement
- Exactly three qualified technicians when possible

No invalid KPI shall contribute to the score.

---

# 382. Job Classification Tests

Service/install classification is release-critical.

Tests shall cover:

- Explicit service job type ID
- Explicit install job type ID
- Excluded no-charge work
- Excluded recall work
- Name-pattern fallback
- Case-insensitive matching
- Conflicting classification rules
- Unknown job types
- Ambiguous job types
- Correct revenue aggregation
- Correct install count
- Correct install average ticket

Unknown and ambiguous jobs shall not be silently assigned.

---

# 383. Install Average Ticket Tests

Formula:

```text
Install Revenue ÷ Completed Install Count
```

Tests:

```text
Revenue 12,000 / 2 installs = 6,000
Revenue 0 / 0 installs = No Data
Revenue 0 / 1 install = 0
Missing revenue = No Data
Missing install count = No Data
```

A zero-install day shall not display `$0` as the average ticket.

---

# 384. Axis Calculation Tests

Tests shall verify human-friendly maxima.

Examples:

```text
848 → 1,000
8,420 → 10,000
12 → 15
43 → 50
0 valid values → safe default
100% slide → fixed 100
```

Tick values shall:

- Begin at zero
- Increase monotonically
- End at axis maximum
- Use four to six ticks where practical

---

# 385. Rotation Calculation Tests

The live rotation algorithm shall be deterministic.

Tests shall cover:

- Exact rotation epoch
- Revenue boundary
- Activity boundary
- Performance boundary
- Average Ticket boundary
- Top 3 boundary
- Full-cycle rollover
- Long runtime
- Reconnection
- Client clock difference

The same backend timestamp shall produce the same active slide on all clients.

---

# 386. TV Manager Tests

Required scenarios:

- Initial live state
- Valid technician-only override
- Valid KPI-only override
- Valid technician-plus-KPI override
- Empty override rejection
- Invalid TV rejection
- Invalid technician rejection
- Invalid KPI rejection
- Timer reset
- Manual resume
- Revision increment
- Latest command wins
- Other TVs unchanged
- Backend restart resets state

---

# 387. Expiration Monitor Tests

Use fake timers.

Verify:

1. Override begins
2. State becomes remote
3. Expiration time is correct
4. Before expiration, state remains remote
5. At expiration, state becomes returning
6. Return event broadcasts
7. After transition delay, state becomes live
8. Selections clear
9. Revision increments twice
10. Other TVs remain unchanged

---

# 388. Cache Tests

Tests shall verify:

- First successful payload is stored
- Failed refresh preserves previous payload
- Successful technicians update during partial refresh
- Failed technician retains last known data
- Stale flag is set
- Last successful refresh remains accurate
- Cache age is calculated correctly
- Empty cache returns `CACHE_UNAVAILABLE`

---

# 389. Refresh Scheduler Tests

Tests shall verify:

- Immediate startup refresh
- Sixty-second scheduling
- No overlapping refreshes
- Active refresh causes next attempt to skip
- Failure does not stop future scheduling
- Graceful shutdown stops timers
- Manual development refresh obeys concurrency guard

---

# 390. ServiceTitan Client Integration Tests

Using mocked browser execution, verify:

- Correct endpoint
- Correct POST method
- Correct content type
- Correct `X-Requested-With`
- Dynamic CSRF token
- JSON body
- Current date
- Technician ID substitution
- Business-unit configuration
- Time zone
- Successful JSON parsing
- Auth-error classification
- HTML rejection
- Request timeout behavior

---

# 391. Live ServiceTitan Verification

Automated tests shall not depend on live ServiceTitan.

Before production, perform a controlled manual integration test against the authenticated office account.

Verify:

- All five technician IDs return data
- Current date is correct
- Business units are correct
- Direct KPI values match ServiceTitan UI
- Derived service/install values match manually reviewed jobs
- No unexpected records are included
- Refresh duration is acceptable

---

# 392. API Contract Tests

Every REST route shall receive contract tests.

Required routes:

```text
GET /api/v1/dashboard
GET /api/v1/tvs
GET /api/v1/tvs/:tvId
POST /api/v1/tvs/:tvId/override
POST /api/v1/tvs/:tvId/resume
GET /api/v1/health
```

Development routes shall be tested only when enabled.

---

# 393. API Validation Tests

Tests shall include:

- Malformed JSON
- Empty body
- Unknown fields
- Invalid technician type
- Invalid KPI type
- Invalid TV ID
- Missing selection
- Oversized request body
- Rate-limit response
- Valid idempotent request

Error codes shall remain stable.

---

# 394. API Security Tests

Verify that responses never expose:

- CSRF token
- Cookies
- ServiceTitan session identifiers
- Debugger WebSocket URL
- Raw phone number
- Raw email address
- Unfiltered raw ServiceTitan objects
- Local filesystem paths in production errors
- Stack traces in production responses

---

# 395. WebSocket Tests

Required test cases:

- Valid dashboard connection
- Dashboard missing TV ID
- Dashboard invalid TV ID
- Valid remote connection
- Unknown client type
- Initial `connection:ready`
- Dashboard refresh broadcast
- TV-specific update routing
- Remote receives all TV updates
- Old revision ignored by client logic
- Heartbeat disconnects dead client
- Reconnect receives current state
- Malformed message rejected

---

# 396. Multi-TV WebSocket Test

Create at least five simulated dashboard clients.

Verify:

- All connect successfully
- Each receives initial state
- Dashboard update reaches all
- TV override reaches only selected TV
- Other display clients do not change
- Remote client sees the update
- Independent override expiration works

---

# 397. Dashboard Component Tests

Required component behavior:

- Header shows logo
- Navigation contains exactly five tabs
- Active underline follows current slide
- Updated counter resets
- No-data displays em dash
- Zero displays zero
- Goal block handles null goal
- Top 3 renders no more than three cards
- Invalid TV shows setup error
- Connection warning does not hide cached chart

---

# 398. Slide Engine Tests

Verify:

- Revenue contract renders generic metric slide
- Activity contract renders generic metric slide
- Performance contract uses fixed 0–100 axis
- Average Ticket handles no installs
- Top 3 uses dedicated layout
- Remote KPI view selects parent slide
- Technician-only view renders scorecard
- Technician-plus-KPI view renders comparison
- Returning mode renders transition state
- Live rotation pauses during remote override

---

# 399. SVG Chart Tests

Verify:

- Five technician rows fit
- Stable SVG keys use technician IDs
- Bar width follows normalized ratio
- Negative widths never occur
- Values above maximum clamp visually
- Missing data has no numeric animation
- Overlay bars share one lane
- Axis ticks match backend contract
- Labels remain within the view box

---

# 400. Animation Tests

Automated tests shall focus on state and final output rather than exact intermediate frames.

Verify:

- Old and new values produce number animation
- Equal values do not animate unnecessarily
- Row reordering preserves technician identity
- Slide shell remains mounted
- Top 3 enters without blank frame
- Reduced-motion mode disables nonessential movement
- Returning mode resolves to current synchronized live slide

---

# 401. Visual Regression Tests

Capture screenshots at:

```text
1920×1080
1280×720
3840×2160
```

Required snapshots:

- Revenue
- Activity
- Performance
- Average Ticket
- Top 3
- Technician scorecard
- Technician KPI detail
- No-data state
- Stale-data warning
- Reconnecting state
- Invalid TV screen

Snapshots shall use deterministic mock data and fixed timestamps.

---

# 402. Design Reference Validation

The final dashboard shall be compared against the approved light-theme mockup.

Review:

- Logo placement
- White cards
- Soft gray background
- Gold visual prominence
- Rounded corners
- Navigation position
- Bar density
- Typography scale
- Whitespace
- Top 3 full-screen behavior

The bottom Top 3 strip shown in an earlier mockup shall not appear on normal KPI slides.

---

# 403. Remote Component Tests

Verify:

- TV-specific URL skips TV selection
- General URL shows TV selection
- Technician and KPI can be selected independently
- Clear selection works
- Apply disabled when both are empty
- Apply includes correct TV ID
- Confirmation displays requested view
- Countdown derives from expiration timestamp
- Resume button works
- Another remote's update appears
- Disconnected state remains usable when REST works

---

# 404. Remote Mobile Browser Tests

Manual or automated testing shall cover:

```text
iPhone Safari
Android Chrome
Microsoft Edge mobile
```

Verify:

- QR opens correct URL
- No horizontal scrolling
- Touch targets are large enough
- Buttons are not hidden by browser chrome
- Selectors work
- Countdown updates
- Orientation change does not break layout
- Accessibility labels exist

---

# 405. End-to-End Test Environment

End-to-end tests shall launch:

- Backend in mock mode
- Built or development dashboard
- Remote application
- Simulated WebSocket clients

They shall not require:

- Live ServiceTitan
- Edge remote debugging
- Office network
- Real TV hardware

---

# 406. Core End-to-End Scenarios

## Scenario A — Live Rotation

1. Open `/display/break-room`
2. Verify current slide from shared epoch
3. Advance simulated time
4. Verify sequence:
   - Revenue
   - Activity
   - Performance
   - Average Ticket
   - Top 3
5. Verify cycle repeats

## Scenario B — Technician Override

1. Open TV and remote
2. Select Julio
3. Submit
4. TV shows technician scorecard
5. Other TV remains live
6. Timer expires
7. TV returns to synchronized live slide

## Scenario C — KPI Override

1. Select Revenue
2. Submit to Dispatch
3. Dispatch shows team Revenue view
4. Navigation highlights Revenue
5. Timer resets after repeat command

## Scenario D — Technician and KPI

1. Select Dwight
2. Select Closing %
3. Submit
4. TV shows Dwight Closing detail
5. Team comparison remains visible

## Scenario E — Backend Refresh

1. Start with mock payload A
2. Send payload B
3. Values animate
4. Rank order changes
5. New-leader event appears
6. No full page reload occurs

---

# 407. Partial Failure End-to-End Scenario

1. Cache valid data for all technicians
2. Next refresh fails for Charlie only
3. Charlie retains previous data
4. Charlie shows stale state internally or subtly
5. Other technicians update
6. Dashboard remains visible
7. Health route reports one stale technician

---

# 408. Authentication Failure Scenario

1. Mock ServiceTitan HTML login response
2. Backend rejects it
3. Previous cache remains
4. Health reports authentication required
5. TV shows stale warning
6. No HTML is exposed through API
7. Next successful refresh clears warning

---

# 409. Performance Testing

Target system:

```text
Five connected TVs
Several remote phones
One backend
Five technicians
Sixty-second refresh
```

Performance tests shall measure:

- Initial page load
- REST response time
- WebSocket broadcast time
- Refresh duration
- Memory usage
- CPU usage
- Animation frame rate
- Long-running browser stability

---

# 410. Backend Performance Targets

Under normal office load:

```text
Health route: under 100 ms
Cached dashboard route: under 200 ms
TV override route: under 250 ms
WebSocket TV update: under 100 ms
Refresh: target under 5 seconds
```

The earlier two-second refresh target is desirable but not release-blocking if ServiceTitan latency is higher.

Refresh must complete comfortably within the sixty-second interval.

---

# 411. Frontend Performance Targets

On target display hardware:

```text
Initial usable render: under 3 seconds
Normal animation: approximately 60 FPS
No sustained memory growth
No full-page reloads
No repeated layout thrashing
```

Built-in TV browsers may require reduced decorative effects.

---

# 412. Long-Run Stability Test

Run the complete mock system continuously for at least:

```text
8 hours
```

Preferably:

```text
24 hours
```

Verify:

- Memory remains stable
- WebSocket remains connected
- Rotation remains synchronized
- No timer drift
- No duplicate listeners
- No growing DOM node count
- Remote overrides still work
- Logs remain bounded

---

# 413. Smart-TV Compatibility Test

Each intended smart-TV browser shall be tested for a full workday.

Record:

- Browser version
- Resolution
- WebSocket reliability
- SVG animation performance
- Memory behavior
- Full-screen behavior
- Screen-saver behavior
- Automatic reload behavior

A TV browser that regularly crashes is not approved.

---

# 414. Network Failure Test

Test:

1. Disconnect one display from Wi-Fi
2. Keep backend running
3. Reconnect display
4. Verify automatic recovery

Then:

1. Disconnect backend network
2. Restore network
3. Verify all displays reconnect

No manual page reload should be required on approved devices.

---

# 415. Backend Restart Test

1. Run five TV clients
2. Apply two independent overrides
3. Restart backend
4. Verify:
   - TVs reconnect
   - Overrides clear
   - Live rotation resumes
   - Cache rebuilds
   - Remote sees live state
   - No TV adopts another TV's ID

---

# 416. Edge Restart Test

1. Run live system
2. Close dedicated Edge
3. Verify cached dashboard remains
4. Relaunch Edge
5. Reauthenticate if needed
6. Verify backend reconnects
7. Verify refresh resumes

---

# 417. Security Review Checklist

Before production:

- `.env` not committed
- No hardcoded CSRF token
- No hardcoded password
- No raw cookie logs
- Development routes disabled
- Mock mode disabled
- Backend not exposed publicly
- Firewall limited to private network
- API validation enabled
- Rate limiting enabled
- Production errors hide stack traces
- Dependencies audited
- QR codes use local production URL
- Status page exposes no secrets

---

# 418. Dependency Audit

Before release:

```bash
npm audit
```

High-severity findings shall be reviewed.

Dependencies shall be updated when safe.

The project shall avoid adding large packages for simple utility tasks.

---

# 419. User Acceptance Testing Participants

Recommended participants:

- One manager
- One office staff member
- At least two technicians
- The person maintaining the dashboard

Testing should occur in the actual office environment.

---

# 420. User Acceptance Questions

Ask users:

- Can you identify the current KPI quickly?
- Can you read technician names from across the room?
- Can you distinguish the overlaid bars?
- Is the goal visible without clutter?
- Does Top 3 feel special but professional?
- Can you scan the QR code quickly?
- Can you control the correct TV?
- Is the remote obvious without training?
- Is two minutes an appropriate duration?
- Are any metrics confusing?
- Does the display feel encouraging rather than embarrassing?

Feedback shall be documented.

---

# 421. Business Validation

Before launch, GRmetro management shall confirm:

- Final technician list
- Business units
- Service job classifications
- Install job classifications
- Goal values
- Overall score weights
- Metric labels
- Meaning of Billable Service Calls
- Meaning of Install Revenue
- Meaning of Number of Installs
- Top 3 scoring fairness

These decisions cannot be delegated solely to software.

---

# 422. Release-Blocking Defects

The following defects block Version 1.0 release:

- Incorrect KPI calculation
- Misclassified service/install jobs
- One TV override affects another
- Raw ServiceTitan credentials exposed
- Dashboard regularly crashes
- Remote selects wrong TV
- Top 3 appears on normal KPI slides
- Data zero and no-data are confused
- Stale data appears as live without warning
- Backend cannot recover after Edge restart
- Five televisions cannot connect simultaneously
- Live rotation order differs from specification
- Timer does not return TV to live mode
- HTML response is accepted as JSON
- Production silently uses mock data

---

# 423. Non-Blocking Defects

Examples that may be deferred when documented:

- Minor spacing differences
- Slight animation timing differences
- Decorative sparkle not implemented
- Built-in TV browser lacks perfect 60 FPS but remains readable
- Noncritical status-page styling issue
- Minor mobile-browser visual inconsistency

No deferred issue may affect data correctness or TV independence.

---

# 424. Version 1.0 Release Checklist

## Repository

- [ ] All required folders exist
- [ ] `AGENTS.md` exists
- [ ] Documentation is current
- [ ] `.env.example` is complete
- [ ] `.gitignore` is correct
- [ ] No secrets committed

## ServiceTitan

- [ ] Edge connection works
- [ ] CSRF token dynamic
- [ ] All five technicians refresh
- [ ] HTML responses rejected
- [ ] Direct KPI mappings verified
- [ ] Service/install classifications approved
- [ ] Partial failures preserve cache

## Backend

- [ ] REST API complete
- [ ] WebSocket complete
- [ ] Cache complete
- [ ] Rankings complete
- [ ] Goals complete
- [ ] Top 3 complete
- [ ] TV manager complete
- [ ] Expiration complete
- [ ] Health route complete
- [ ] Logs rotate

## Dashboard

- [ ] Revenue slide
- [ ] Activity slide
- [ ] Performance slide
- [ ] Average Ticket slide
- [ ] Top 3 slide
- [ ] Individual scorecard
- [ ] Technician KPI detail
- [ ] Morph transitions
- [ ] Updated timestamp
- [ ] Stale-data state
- [ ] Reconnect state
- [ ] GRmetro logo

## Remote

- [ ] TV-specific QR links
- [ ] General TV selection
- [ ] Technician-only control
- [ ] KPI-only control
- [ ] Technician-plus-KPI control
- [ ] Countdown
- [ ] Resume button
- [ ] Confirmation
- [ ] Multi-user updates

## Deployment

- [ ] Production build
- [ ] Automatic Edge startup
- [ ] Automatic backend startup
- [ ] Stable backend IP
- [ ] Firewall rule
- [ ] Five unique TV URLs
- [ ] Kiosk startup
- [ ] QR codes printed
- [ ] Restart recovery tested

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] End-to-end tests pass
- [ ] Visual review complete
- [ ] Eight-hour stability test complete
- [ ] Security checklist complete
- [ ] User acceptance complete

---

# 425. Definition of Done

Version 1.0 is complete when:

1. One Windows backend computer connects to the authenticated ServiceTitan session.
2. Five configured technicians refresh every sixty seconds.
3. Approved KPIs are normalized accurately.
4. Five independent TV displays can connect.
5. Live TVs rotate through exactly five slides.
6. KPI slides match the approved light-theme visual direction.
7. Top 3 appears only as its own dedicated slide.
8. A phone can control one selected TV through QR code.
9. Technician and KPI selections are independent.
10. Every override returns to live mode after two minutes.
11. Other TVs remain unaffected.
12. Cached data remains visible during temporary failures.
13. The system recovers from backend, browser, and network interruptions.
14. Production contains no stored ServiceTitan credentials.
15. Documentation enables another maintainer to operate and troubleshoot the system.
16. GRmetro management approves KPI definitions, goals, and rankings.
17. All release-blocking defects are resolved.

---

**End of Part 10**

# Part 11 — Implementation Plan, Codex Instructions, Repository Governance & Future Roadmap

---

# 427. Purpose of This Section

This section defines how Codex or a software engineer shall implement the approved specification.

It specifies:

- Required implementation order
- Milestones
- Commit strategy
- Branching strategy
- Coding-agent instructions
- Required repository documents
- Task tracking
- Review gates
- Handoff requirements
- Maintenance boundaries
- Version 1.1 backlog
- Specification authority

The purpose is to prevent the implementation from drifting away from the approved design.

---

# 428. Implementation Principle

The project shall be built in complete vertical stages.

Implementation shall not begin with isolated visual experiments or disposable scripts.

Every completed stage should leave the repository in a working state.

The approved order is:

```text
Repository Foundation
↓
Shared Configuration
↓
Mock Data Mode
↓
Backend Core
↓
ServiceTitan Integration
↓
Dashboard Shell
↓
Metric Slide Engine
↓
Top 3 Slide
↓
Remote Control
↓
Realtime Synchronization
↓
Animations and Polish
↓
Production Deployment
↓
Testing and Release
```

This order is binding unless a documented technical blocker requires a change.

---

# 429. Prohibited Implementation Behavior

Codex and human contributors shall not:

- Redesign the architecture without approval
- Add a sixth live slide
- Reintroduce a Top 3 strip beneath KPI slides
- Scrape ServiceTitan HTML
- Automate ServiceTitan credentials or MFA
- Introduce a database in Version 1.0
- Move ranking calculations into the frontend
- Let each TV call ServiceTitan independently
- Hardcode a CSRF token
- Use an HDMI splitter as the software architecture
- Replace independent TV states with one global state
- Silently substitute approximate KPI mappings
- Treat `CompletedJobs` as Billable Service Calls without validation
- Treat `CompletedRevenue` as Service Revenue without classification
- Treat `TotalSales` as Install Revenue without validation
- Treat zero as missing data
- Use mock data silently in production
- Add dependencies merely for convenience
- Replace morphing content with whole-screen slide transitions

---

# 430. Implementation Phases

Version 1.0 shall be implemented through the phases below.

Each phase has:

- Required deliverables
- Acceptance conditions
- Recommended commits
- A review gate

No phase shall be considered complete solely because files exist.

---

# 431. Phase 0 — Repository Foundation

## Deliverables

Create:

```text
apps/backend
apps/dashboard
apps/remote
shared
assets
docs
scripts
```

Create root files:

```text
package.json
package-lock.json
README.md
AGENTS.md
.env.example
.gitignore
.nvmrc or .node-version
```

Configure:

- npm workspaces
- Root development commands
- Root build command
- Root test command
- Consistent linting and formatting where used

## Acceptance Conditions

- `npm install` completes
- Workspace scripts resolve correctly
- No runtime application is required yet
- Repository documentation identifies the project
- No unnecessary monorepo framework is installed

## Recommended Commit

```text
chore: initialize repository and workspace structure
```

---

# 432. Phase 1 — Shared Configuration

## Deliverables

Implement:

```text
shared/technicians.js
shared/goals.js
shared/kpis.js
shared/slides.js
shared/televisions.js
shared/jobClassifications.js
shared/constants.js
shared/validation.js
```

Include exactly five configured technicians:

```text
Julio Torres — 134926818
Shamon Ward — 3841
Charlie E — 3853
Alex K — 133469538
Dwight — 127491426
```

Include exactly five live slides:

```text
Revenue
Activity
Performance
Average Ticket
Top 3
```

## Acceptance Conditions

- IDs are unique
- TV IDs are URL-safe
- KPI IDs match the specification
- Goal structure supports defaults and overrides
- Validation rejects unknown values
- Slide order and durations match the specification

## Recommended Commit

```text
feat: add shared technician KPI slide and TV configuration
```

---

# 433. Phase 2 — Mock Data Foundation

## Purpose

Frontend development shall not wait for a live ServiceTitan session.

## Deliverables

Create sanitized fixtures for:

- Normal data
- Missing data
- Zero values
- Partial technician failure
- Rank changes
- Goal achievement
- New leader
- No installations
- Stale cache

Implement explicit mock mode:

```env
MOCK_MODE=true
```

## Acceptance Conditions

- Backend starts without Edge in mock mode
- All five technicians appear
- All five slides receive valid payloads
- Remote override behavior works in mock mode
- Production mode never automatically enables mock data

## Recommended Commit

```text
feat: add deterministic mock dashboard data mode
```

---

# 434. Phase 3 — Backend Core

## Deliverables

Implement:

- Express application
- Environment validation
- Error middleware
- Request logging
- Dashboard cache
- TV state manager
- Expiration monitor
- Health route
- Mock refresh scheduler

## Acceptance Conditions

The following routes work in mock mode:

```text
GET /api/v1/health
GET /api/v1/dashboard
GET /api/v1/tvs
GET /api/v1/tvs/:tvId
POST /api/v1/tvs/:tvId/override
POST /api/v1/tvs/:tvId/resume
```

TV overrides remain independent.

## Recommended Commits

```text
feat: add backend application and configuration
feat: implement dashboard cache and TV manager
feat: add REST API routes and validation
```

---

# 435. Phase 4 — Business Logic

## Deliverables

Implement:

- Normalizer
- Goal engine
- KPI ranking engine
- Overall score engine
- Axis calculation
- Dashboard payload builder
- Achievement event generator
- Previous-rank snapshot

## Acceptance Conditions

- Rankings are deterministic
- Missing values do not rank as zero
- Goal progress may exceed 100%
- Overall score honors weight coverage
- Axis maxima are human-friendly
- Events trigger only on state transitions
- Unit tests pass

## Recommended Commits

```text
feat: normalize technician KPI data
feat: add goal ranking and overall score engines
feat: build presentation-ready dashboard payloads
```

---

# 436. Phase 5 — Browser and ServiceTitan Integration

## Deliverables

Implement:

- Persistent CDP browser manager
- ServiceTitan page discovery
- Reconnection behavior
- CSRF-token provider
- Endpoint registry
- Request builders
- Authenticated POST client
- HTML-response detection
- Technician refresh orchestration
- Limited concurrency
- Partial-failure preservation

## Acceptance Conditions

- Backend connects to manually launched Edge
- Backend does not launch or close the user's browser
- No credentials are stored
- CSRF token is dynamic
- JSON is returned for all five technicians
- HTML app-shell responses are rejected
- One technician failure does not discard all data
- Live refresh runs every sixty seconds

## Recommended Commits

```text
feat: connect to authenticated ServiceTitan Edge session
feat: implement native ServiceTitan API client
feat: add resilient technician refresh pipeline
```

---

# 437. Phase 6 — Service and Install Classification

## Purpose

This phase is required before production KPI accuracy can be approved.

## Deliverables

- Inspect technician job drilldown response
- Document the exact response shape
- Configure known service job types
- Configure known installation job types
- Exclude recalls, warranty, and no-charge work as approved
- Derive:
  - Billable Service Calls
  - Service Revenue
  - Install Revenue
  - Number of Installs
  - Install Average Ticket
- Log unknown classifications

## Acceptance Conditions

GRmetro management validates sample calculations against ServiceTitan.

No approximation may be labeled as confirmed.

## Recommended Commit

```text
feat: derive validated service and installation KPIs
```

---

# 438. Phase 7 — WebSocket Realtime Layer

## Deliverables

Implement:

- WebSocket endpoint
- Client-type validation
- TV subscriptions
- Remote subscriptions
- Initial state event
- Dashboard update broadcast
- TV-specific update broadcast
- Achievement event broadcast
- Ping/pong heartbeat
- Dead-client cleanup

## Acceptance Conditions

- Five dashboard clients connect simultaneously
- Refresh reaches all displays
- One TV override reaches only that TV
- All remotes receive relevant TV state
- Reconnection restores current state
- Dead sockets are removed

## Recommended Commit

```text
feat: add realtime dashboard and TV state broadcasting
```

---

# 439. Phase 8 — Dashboard Shell

## Deliverables

Implement:

- React and Vite application
- Display route
- TV-ID validation
- Initial REST data load
- WebSocket client
- Fixed dashboard shell
- Header
- GRmetro logo
- Navigation
- Current time
- Updated timestamp
- Connection status
- Rotation epoch logic

## Acceptance Conditions

- A valid TV URL loads
- Unknown TV ID shows setup guidance
- Navigation contains exactly five tabs
- Current live slide is synchronized across displays
- Remote mode pauses local rotation
- Header remains fixed

## Recommended Commits

```text
feat: build GRmetro dashboard shell
feat: add synchronized five-slide rotation
```

---

# 440. Phase 9 — Metric Slide Engine

## Deliverables

Implement reusable:

```text
SlideEngine
MetricSlide
OverlayBarChart
TechnicianBars
AnimatedAxis
GoalSummary
AnimatedNumber
RankBadge
MetricLegend
```

Use the same engine for:

- Revenue
- Activity
- Performance
- Average Ticket

## Acceptance Conditions

- Five technicians fit at 1080p
- Bars overlap rather than stack or group
- Axis values come from backend
- Slide shell does not remount
- Titles, bars, numbers, axes, and rankings morph
- Missing data is distinct from zero
- KPI slide configuration contains no duplicated business rules

## Recommended Commits

```text
feat: implement reusable SVG metric slide engine
feat: add Revenue Activity Performance and Avg Ticket views
```

---

# 441. Phase 10 — Dedicated Top 3 Slide

## Deliverables

Implement:

- Dedicated Top 3 content view
- Second–first–third visual arrangement
- Gold, silver, and bronze cards
- First-place size emphasis
- Subtle glow and sparkle
- Rank-change animations
- Achievement banner integration

## Acceptance Conditions

- Top 3 occupies the full content region
- No Top 3 strip appears on KPI slides
- Only qualified technicians appear
- Missing positions show neutral placeholders
- Effects do not obscure text
- Exit returns smoothly to the synchronized live slide

## Recommended Commit

```text
feat: add dedicated animated Top 3 slide
```

---

# 442. Phase 11 — Remote Detail Views

## Deliverables

Dashboard-side views:

- Technician scorecard
- KPI-only team view
- Technician-plus-KPI detail view
- Returning-to-live transition

## Acceptance Conditions

- Technician-only view displays approved scorecard
- KPI-only view displays team graph and ranking
- Technician-plus-KPI view highlights one technician and preserves comparison
- Remote-only views do not become extra live slides
- Navigation highlights the correct parent category where relevant

## Recommended Commit

```text
feat: add technician and KPI remote display views
```

---

# 443. Phase 12 — Mobile QR Remote

## Phase 12A — Local Presentation Control Foundation

The first Phase 12 increment introduces a frontend presentation controller and a `/remote` route. The controller separates active-slide navigation and local paused/running rotation state from the slide components. The dashboard and remote consume the same controller contract, which is designed so a later synchronized state adapter can replace local dispatch without changing presentation slides.

Phase 12A provides pause, resume, next, previous, direct Slide 1–5 selection, current-slide status, and automatic-rotation status. State is local to one browser runtime. This increment does not add WebSockets, backend endpoints, shared synchronization, or multiple-display behavior.

## Deliverables

Implement:

- General TV selection
- TV-specific query-string selection
- Current TV state
- Technician picker
- KPI picker
- Independent selection behavior
- Apply command
- Confirmation state
- Override countdown
- Resume Live Rotation
- WebSocket state updates
- Mobile accessibility

## Acceptance Conditions

- Technician only works
- KPI only works
- Technician plus KPI works
- Empty submission is blocked
- Timer resets after a new command
- Another user's change appears
- Only selected TV changes
- QR-specific URL skips unnecessary TV selection

## Recommended Commits

```text
feat: build mobile QR remote
feat: add override countdown and live TV state
```

---

# 444. Phase 13 — QR-Code Generation

## Deliverables

Implement:

```text
scripts/generate-qr-codes.js
```

Generate one code for each configured TV.

Include printable labels or templates.

## Acceptance Conditions

- Codes use production base URL
- Codes do not use localhost
- Each code opens the correct TV control panel
- Codes scan successfully on iPhone and Android

## Recommended Commit

```text
feat: generate television-specific QR codes
```

---

# 445. Phase 14 — Animation and Visual Polish

## Deliverables

Finalize:

- Number counting
- Row reordering
- Bar-width morphing
- Axis rescaling
- Color interpolation
- Navigation underline
- Top 3 entrance and exit
- Achievement banners
- Returning-to-live transition
- Reduced-motion behavior

## Acceptance Conditions

- No whole-screen horizontal slide animation
- No blank transition frame
- Stable keys preserve element identity
- Normal animation remains smooth on target hardware
- Reduced-motion mode remains fully usable

## Recommended Commit

```text
feat: polish morph transitions and achievement animations
```

---

# 446. Phase 15 — Production Deployment

## Deliverables

Implement and document:

- Production build
- Static file serving
- Edge startup script
- Backend startup script
- Windows Task Scheduler instructions
- Firewall setup
- Stable-IP setup
- Display kiosk scripts
- Log rotation
- Status page
- Health checks

## Acceptance Conditions

- Backend starts after Windows login
- Edge starts with correct profile
- Displays reconnect after restart
- QR remote works over office network
- Five stable display URLs exist
- Development routes and mock mode are disabled

## Recommended Commits

```text
feat: add Windows production deployment scripts
docs: add office deployment and recovery guide
```

---

# 447. Phase 16 — Verification and Release

## Deliverables

Complete:

- Unit tests
- API tests
- WebSocket tests
- End-to-end tests
- Visual screenshots
- Eight-hour stability run
- Multi-TV test
- Security review
- User acceptance review
- KPI business validation
- Release checklist

## Acceptance Conditions

All Definition of Done requirements from Part 10 are satisfied.

## Recommended Commits

```text
test: add full Version 1.0 verification suite
chore: prepare Version 1.0 release
```

Release tag:

```text
v1.0.0
```

---

# 448. Branching Strategy

Recommended permanent branches:

```text
main
develop
```

Feature branches shall be short-lived.

Examples:

```text
feature/backend-core
feature/servicetitan-client
feature/dashboard-shell
feature/metric-slide-engine
feature/top-three
feature/remote
feature/deployment
```

For a single-maintainer workflow, direct work from small feature branches into `main` is also acceptable.

The repository should not accumulate many long-lived branches.

---

# 449. Main Branch Rules

The `main` branch shall remain:

- Installable
- Buildable
- Testable
- Free of known release-blocking defects

Before merging:

```text
npm test
npm run build
```

shall pass.

---

# 450. Commit Standards

Use clear imperative commit messages.

Recommended conventional prefixes:

```text
feat:
fix:
test:
docs:
refactor:
chore:
style:
perf:
```

Examples:

```text
feat: implement independent TV overrides
fix: preserve cached technician data after partial refresh
docs: document ServiceTitan drilldown response
test: cover remote override expiration
```

Avoid messages such as:

```text
update
changes
stuff
fix code
```

---

# 451. Pull Request Requirements

Each pull request or review unit should include:

- Purpose
- Files changed
- User-visible impact
- Tests performed
- Screenshots for visual changes
- Known limitations
- Documentation updates

Architecture changes require explicit justification.

---

# 452. Codex Working Method

Codex shall work in repository context.

Before coding, Codex must read:

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/UI_SPEC.md
docs/SERVICETITAN.md
docs/TASKS.md
```

Codex shall inspect existing files before creating replacements.

It shall prefer editing the repository directly rather than printing large code blocks into chat.

---

# 453. Codex Task Prompt

Recommended initial Codex instruction:

```text
Read AGENTS.md and every file in docs before making changes.

Treat docs/PROJECT_SPEC.md as the authoritative product and engineering specification.

Begin with the earliest incomplete task in docs/TASKS.md.

Work in small, coherent commits. Keep the repository installable and testable after each task.

Do not redesign the architecture, add features, or alter KPI mappings without documenting the conflict and asking for approval.

Never scrape ServiceTitan HTML. Use only the approved native JSON endpoint strategy.

After completing a task:
1. run relevant tests,
2. run the build,
3. update docs/TASKS.md,
4. summarize changed files and any remaining blockers.
```

---

# 454. Conflict-Handling Rule

When Codex encounters a contradiction:

1. Do not guess silently
2. Identify the conflicting sections
3. Prefer the later and more specific requirement
4. Record the issue
5. Ask for a decision when it changes business meaning

Priority order:

```text
1. Explicit latest user decision
2. PROJECT_SPEC.md
3. SERVICETITAN.md
4. UI_SPEC.md
5. TASKS.md
6. Existing implementation
```

A working implementation does not override an approved specification by itself.

---

# 455. AGENTS.md Required Content

The repository root shall contain:

```text
AGENTS.md
```

It shall include at least the rules below.

```markdown
# GRmetro Live Performance Center — Agent Rules

1. Read all files in `docs/` before making architectural changes.
2. `docs/PROJECT_SPEC.md` is the authoritative specification.
3. The system has exactly five live slides:
   Revenue, Activity, Performance, Average Ticket, and Top 3.
4. Top 3 is a dedicated full-screen slide and must not appear beneath KPI slides.
5. Never scrape ServiceTitan HTML or parse DOM KPI values.
6. Use ServiceTitan native JSON requests through the authenticated Edge session.
7. Never store ServiceTitan passwords, cookies, or CSRF tokens in source control.
8. The backend owns rankings, goals, score calculations, KPI derivations, and slide payloads.
9. The frontend renders backend-prepared data and must not reimplement business logic.
10. Each television has independent state.
11. Technician and KPI remote selections are independent.
12. Remote overrides expire after two minutes and return to synchronized live rotation.
13. Version 1.0 uses memory only; do not introduce a database.
14. Do not label approximations as confirmed KPIs.
15. Zero and no-data are different states.
16. Preserve the light GRmetro visual design and morph-only transition behavior.
17. Avoid unnecessary dependencies.
18. Keep mock mode explicit and disabled in production.
19. Add tests for business-critical changes.
20. Update documentation when behavior changes.
```

---

# 456. TASKS.md Structure

The repository shall contain a living checklist:

```text
docs/TASKS.md
```

Recommended structure:

```markdown
# GRmetro Live Performance Center — Implementation Tasks

## Phase 0 — Foundation
- [ ] Initialize npm workspaces
- [ ] Create application folders
- [ ] Add root scripts
- [ ] Add environment template
- [ ] Add AGENTS.md

## Phase 1 — Shared Configuration
- [ ] Add technicians
- [ ] Add KPI definitions
- [ ] Add slides
- [ ] Add TV definitions
- [ ] Add goals
- [ ] Add validation

## Phase 2 — Mock Mode
- [ ] Add sanitized fixtures
- [ ] Add mock refresh provider
- [ ] Add mock events

...
```

Each completed task should include its commit or pull-request reference where practical.

---

# 457. SERVICETITAN.md Purpose

The file:

```text
docs/SERVICETITAN.md
```

shall contain integration-specific knowledge that may change independently of product requirements.

It shall include:

- Edge launch command
- CDP URL
- Endpoint paths
- HTTP methods
- Required headers
- Request payload examples
- Response examples
- CSRF discovery behavior
- Business unit IDs
- Technician IDs
- Known field definitions
- Drilldown response shape
- Job classification rules
- Troubleshooting
- Date last verified

Sensitive tokens and credentials shall never be included.

---

# 458. UI_SPEC.md Purpose

The file:

```text
docs/UI_SPEC.md
```

shall include:

- Approved screenshots
- GRmetro logo reference
- Color palette
- Typography
- Spacing
- Layout dimensions
- SVG chart examples
- Top 3 arrangement
- Remote screen wireframes
- Animation timings
- No-data states
- Stale-data states
- Responsive screenshots

It should reference the approved light dashboard image.

---

# 459. README.md Purpose

The README is operational, not exhaustive.

It shall provide:

- One-paragraph product description
- Screenshots
- Requirements
- Quick start
- Development startup
- Production startup
- Edge launch
- Environment configuration
- URLs
- QR generation
- Testing commands
- Troubleshooting links

Detailed design belongs in `docs/`.

---

# 460. Documentation Update Rule

When implementation changes a contract, the related document must be updated in the same commit.

Examples:

- API route change → update Project Spec and README
- ServiceTitan payload change → update SERVICETITAN.md
- Visual spacing change → update UI_SPEC.md
- Completed feature → update TASKS.md

Documentation drift is considered a defect.

---

# 461. Review Gates

Implementation shall pause for review at the gates below.

## Gate 1 — Shared Configuration

Confirm:

- Five technicians
- Five TVs or final room names
- KPI labels
- Goals structure

## Gate 2 — Live ServiceTitan Data

Confirm:

- Direct fields
- Job drilldown
- Business units
- Service/install classification

## Gate 3 — Dashboard Visual Prototype

Confirm:

- Revenue slide
- Light theme
- Logo
- Bar overlay
- Readability at 1080p

## Gate 4 — Top 3

Confirm:

- Card content
- Score fairness
- Visual celebration level

## Gate 5 — Remote

Confirm:

- Selection model
- TV identification
- Two-minute timeout

## Gate 6 — Office Deployment

Confirm:

- Hardware per TV
- Network URL
- Kiosk reliability
- QR placement

## Gate 7 — Release

Confirm Definition of Done.

---

# 462. Handoff Requirements

A new maintainer shall be able to operate the system using repository documentation alone.

Handoff package shall include:

- Repository access
- Production installation path
- Backend computer identity
- Node.js version
- Environment-variable backup
- Edge profile path
- Business unit configuration
- Technician configuration
- TV URLs
- QR-code files
- Windows Task Scheduler setup
- Firewall rule
- Troubleshooting guide
- Current known limitations

Passwords shall not appear in handoff documents.

---

# 463. Maintainer Routine

Routine maintenance should require only:

- Reauthenticate ServiceTitan when needed
- Update technician configuration
- Adjust goals
- Update job classifications
- Install tested application updates
- Review logs when stale warnings occur
- Replace failed display hardware

Routine operation should not require changing React components or API internals.

---

# 464. Configuration Change Boundaries

The following should be editable without architectural changes:

- Technician names and IDs
- KPI goals
- TV names and IDs
- Slide durations
- Refresh interval
- Override timeout
- Business unit IDs
- Service/install job-type classifications
- Overall Top 3 weights
- Network base URL

---

# 465. Code Change Boundaries

Code changes are expected when:

- ServiceTitan changes endpoints
- ServiceTitan changes response fields
- A new KPI requires a new datasource
- A new view is approved for a future version
- Browser compatibility requires optimization
- Security requirements change

Such changes must include tests and documentation.

---

# 466. Version 1.1 Backlog

The following features are explicitly deferred and must not delay Version 1.0.

Potential Version 1.1 items:

- Yesterday, week, and month date ranges
- Historical trend charts
- Administrative goal editor
- Administrative TV manager
- Automatic technician discovery
- Division or business-unit filters
- Manager authentication
- HTTPS for wider network access
- Persistent TV state
- Persistent ranking history
- Scheduled reports
- Additional KPI categories
- Customer satisfaction when reliable
- Membership sales
- Recall-focused metrics
- Revenue-per-hour metric
- Billable-efficiency metric
- Automatic application updater
- Display-device watchdog
- Branded public lobby mode

---

# 467. Features Requiring Separate Approval

The following require privacy, legal, or business review before implementation:

- Facial recognition
- Camera-based employee identification
- Biometric presence detection
- Employee phone tracking
- Wi-Fi location tracking
- Public internet remote access
- Individual user activity logging
- Sound or public alerts tied to employee performance

These are not part of Version 1.0.

---

# 468. Version 2.0 Possibilities

Possible long-term directions:

- Cloud-hosted service
- Multi-location support
- ServiceTitan public API integration
- Authentication and permissions
- Historical database
- Mobile technician dashboard
- Goal planning
- Coaching notes
- Scheduled contests
- Seasonal themes
- Automated insights
- Additional business departments

None of these shall influence Version 1.0 architecture beyond reasonable extensibility.

---

# 469. Specification Change Process

After design freeze, changes shall be documented.

A proposed change should state:

- Requested behavior
- Business reason
- Affected sections
- Technical impact
- Testing impact
- Whether it belongs in Version 1.0 or later

Do not alter the specification casually during implementation.

---

# 470. Final Specification Authority

This document is the authoritative Version 1.0 specification for:

```text
GRmetro Live Performance Center
```

When implementation and specification differ, the specification governs unless:

- The requirement is technically impossible
- The requirement creates a security problem
- GRmetro explicitly approves a change
- A later approved specification revision supersedes it

All approved changes shall update the document version.

---

# 471. Specification Versioning

Initial approved version:

```text
1.0
```

Minor clarification:

```text
1.0.1
```

Approved behavior change:

```text
1.1
```

Major architecture change:

```text
2.0
```

The document header shall record:

- Version
- Date
- Status
- Approver where applicable

---

# 472. Final Codex Handoff Prompt

After all documents and assets are committed, use this prompt in Codex:

```text
You are implementing the GRmetro Live Performance Center.

Before changing any files, read:
- AGENTS.md
- docs/PROJECT_SPEC.md
- docs/UI_SPEC.md
- docs/SERVICETITAN.md
- docs/TASKS.md

Treat these files as authoritative.

Inspect the existing repository and begin with the earliest incomplete task in TASKS.md.

Build the project incrementally in the approved phase order. Work directly in the repository, keep commits small and coherent, and keep the project installable and testable.

Do not redesign the product. Do not add features outside Version 1.0. Never scrape ServiceTitan HTML. Never store credentials or tokens. Preserve independent per-TV state, the exact five-slide rotation, the dedicated Top 3 slide, the two-minute remote timeout, the one-minute refresh interval, and the approved light GRmetro design.

Use explicit mock mode for development until live integration is required. Add tests for business-critical logic. After each task, run relevant tests and builds, update TASKS.md, and summarize the work and blockers.

When a requirement is ambiguous or conflicts with another requirement, identify the conflict rather than silently choosing a new design.
```

---

# 473. Final Project Deliverables

Version 1.0 deliverables are:

```text
1. Complete GitHub repository
2. Backend application
3. Dashboard application
4. QR remote application
5. Shared configuration
6. Mock data environment
7. ServiceTitan native integration
8. Five synchronized live slides
9. Independent multi-TV state
10. Two-minute remote override behavior
11. Production Windows scripts
12. TV kiosk instructions
13. QR-code assets
14. Automated test suite
15. Complete documentation
16. Version 1.0 release tag
```

---

# 474. Final Approval Checklist

Before implementation begins, confirm:

- [ ] Company name is GRmetro Heating & Cooling
- [ ] Approved logo is committed
- [ ] Approved light-theme reference image is committed
- [ ] Exactly five technicians are configured
- [ ] Exactly five live slides are configured
- [ ] Top 3 is dedicated and full-screen
- [ ] KPI list contains exactly eleven approved KPIs
- [ ] ServiceTitan endpoints and captured payloads are documented
- [ ] Remote selections are Technician and/or KPI
- [ ] Every TV has independent state
- [ ] Overrides expire after two minutes
- [ ] ServiceTitan refresh occurs every sixty seconds
- [ ] Backend uses memory only
- [ ] Live mode is synchronized through a rotation epoch
- [ ] No HTML scraping is permitted
- [ ] Deployment is local-office-network first
- [ ] Hardware for each TV will be inventoried before purchases
- [ ] Codex will follow AGENTS.md and TASKS.md

---

# 475. End of Part 11

This concludes the primary GRmetro Live Performance Center Version 1.0 Software Requirements Specification.

Separate companion documents shall now be created:

```text
docs/UI_SPEC.md
docs/SERVICETITAN.md
docs/TASKS.md
AGENTS.md
README.md
```

The complete `PROJECT_SPEC.md` consists of Parts 1 through 11 in numerical order.

---

# 476. Phase 13 Historical Metrics Addendum

Dashboard history is maintained as a bounded, in-memory sequence of immutable, timestamped snapshots created only after successful dashboard refreshes. The default retention is 1,440 snapshots and is configurable through `SNAPSHOT_RETENTION_LIMIT`; no database or persistence is introduced.

`GET /api/v1/dashboard` retains its existing fields and adds `historicalComparison`. The comparison is calculated against the immediately previous successful snapshot and contains presentation-neutral KPI value, KPI rank, overall rank, and goal-progress deltas. First-snapshot, unavailable KPI, missing technician, stale technician, and zero-value states remain explicit. Failed refresh attempts do not create snapshots or replace the previous successful response.

The snapshot store is isolated behind an append/read interface so later persistence, time-window selection, aggregation, trends, exports, management insights, and AI summaries can reuse the snapshot schema without changing ServiceTitan integration or dashboard calculations. The complete contract and lifecycle are defined in `docs/HISTORICAL_METRICS.md`.

The existing dashboard response also adds `historicalTrends`. The reusable backend engine consumes ordered snapshots through adjacent comparison-engine results and analyzes existing KPI values, KPI ranks, goal progress, and overall rank. It requires configurable minimum history, suppresses inconsistent one-refresh movement, and reports trends, momentum, consistency, streak counts, and explicit unknown states without a new endpoint or business calculation.
