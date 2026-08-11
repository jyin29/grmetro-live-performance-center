# Dashboard Content Audit and KPI Strategy

Date: 2026-08-11  
Scope: presentation content using the existing dashboard payload only

## Executive assessment

The dashboard framework was visually capable but content-first prioritization was weak. It repeated technician revenue and closing data across several slides, treated a collection of charts as a business story, and spent an entire rotation slot on implementation health. The owner could see numbers, but could not consistently answer **pace, performance, revenue source, recognition, and management attention** within a few seconds.

The redesigned rotation retains exactly five slides and uses no new endpoint or fabricated calculation:

1. **Are we on pace?**
2. **Who is performing?**
3. **Where is revenue coming from?**
4. **Who deserves recognition?**
5. **What needs attention?**

## Complete audit of the previous presentation

### Slide 1 — Revenue Overview

**Business question:** What are today’s leading KPI values, technician revenue, overall standings, and conversion results?

**Useful:** Revenue by technician exposed backend-prepared values without inventing totals.

**Duplicated:** Its leaderboard duplicated Technician Performance; closing duplicated Business Performance; revenue duplicated Business Performance.

**Weak:** Summary cards showed the leading *individual technician*, not company totals, and could be misread as business-wide results. Four competing regions did not state whether the team was on pace.

**Decision:** Remove the leader-summary cards, embedded leaderboard, and conversion comparison. Use backend-provided technician revenue, goals, percent complete, remaining amounts, and ranks in one daily-pace view. Retain a smaller revenue comparison for context.

### Slide 2 — Technician Performance

**Business question:** How is each technician performing?

**Useful:** It placed all technicians and backend rankings together and preserved unavailable data correctly.

**Duplicated:** Revenue, closing, and rank appeared elsewhere, but belong together here because the unit of analysis is the technician.

**Weak:** The topic-style title lacked urgency. Five equally dense metrics and badges weakened hierarchy; frequently unavailable install metrics consumed valuable space.

**Decision:** Retain the reusable cards and frame the slide as “Who is performing?” Keep unavailable values honest, with rank, revenue, closing, and activity as its central story.

### Slide 3 — Business Performance

**Business question:** How do revenue and closing compare by technician?

**Useful:** Both charts were individually useful.

**Duplicated:** Revenue repeated Slide 1; closing repeated Slide 1 and the technician cards.

**Weak:** Two unrelated questions shared one screen. “Revenue breakdown” implied a source mix even when service/install classifications were unavailable.

**Decision:** Ask “Where is revenue coming from?” Use technician revenue as the confirmed answer. Show Service and Install only as provided, with a no-estimates statement. Remove closing here.

### Slide 4 — Recognition & Achievements

**Business question:** Who is today’s best performer and who leads selected categories?

**Useful:** Recognition supports culture and technician engagement.

**Duplicated:** Highest Revenue, Highest Closing, and Top Overall frequently repeated the featured technician and other slides.

**Weak:** A full-screen hero recognized one person while smaller cards could recognize the same person again; it did not deliver the dedicated Top 3 concept.

**Decision:** Replace the hero and duplicate badges with a dedicated second–first–third podium using backend overall ranks. Keep revenue and closing as concise context.

### Slide 5 — Operations Health

**Business question:** Is the dashboard software healthy?

**Useful:** Refresh and cache status matter during a fault.

**Duplicated:** Refresh, freshness, live state, and slide position already appeared in the stationary shell.

**Weak:** A healthy system spent 20% of the rotation announcing it was healthy. Cache and rotation are implementation metrics, not HVAC operating KPIs.

**Decision:** Replace it with “What needs attention?” showing the lowest backend-prepared overall ranks, revenue goal remaining, and closing. Retain feed health compactly and surface unavailable mappings rather than pretending they are results.

## KPI strategy

1. **Daily business outcome — Are we on pace?** Use Revenue, goal, percent complete, remaining, and rank. Show the target relationship rather than only raw dollars.
2. **Technician productivity — Who is performing?** Use overall rank, revenue, closing, approved activity values, and rank movement. Keep one card per technician.
3. **Revenue source — Where is revenue coming from?** Use Revenue by technician, plus Service and Install Revenue only when their backend metrics have data. Never infer a split.
4. **Recognition — Who deserves recognition?** Use backend overall Top 3, revenue, and closing. Use a dedicated podium and no duplicate award strip.
5. **Management exceptions — What needs attention?** Use backend bottom ranks, revenue goal remaining, closing, refresh health, and unavailable mappings. Do not invent performance thresholds.

## Existing-data boundary

The presentation consumes only `technicians`, `technicians[].kpis`, `technicians[].overall`, prepared slide records, and refresh metadata already returned by `GET /api/v1/dashboard`. It does not sum team revenue, create a company goal, infer time-of-day pace, calculate a score, or call another endpoint.

## Future KPI opportunities — not implemented

- Company revenue vs. company daily goal and time-adjusted revenue pace.
- Revenue per truck, labor hour, and business unit.
- Open, dispatched, completed, late, and unassigned calls.
- Callback and warranty-call rate.
- Labor utilization and drive-time efficiency.
- Maintenance-agreement membership sales and renewals.
- Accessory and indoor-air-quality sales.
- Call-to-opportunity and opportunity-to-sale funnel efficiency.
- Install ratio, backlog, sold-to-installed cycle time, and capacity.
- Revenue split by call type and demand source.
- Biggest improvement based on historical comparison.
- Company-wide exception thresholds and operational alerts.

Each requires validated source fields, business definitions, and backend-owned calculations before presentation work.

## Visualization inventory

**Removed:** leading-individual KPI summary strip; duplicate Slide 1 leaderboard and closing comparison; closing chart from Business Performance; single-winner hero and repetitive badges; full-slide cache, slide-number, rotation, and refresh cards.

**Added:** revenue-to-goal pace lanes; validated Service/Install source list; dedicated Top 3 podium; management-attention cards; compact feed-health and mapping watch.

**Reused:** stationary shell, header, slide deck, transitions, `AnimatedMetric`, `TechnicianMetric`, `RevenueChart`, technician cards, and all backend-prepared rankings, goals, normalized values, and data-quality behavior.
