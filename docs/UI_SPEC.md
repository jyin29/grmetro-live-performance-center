# GRmetro Live Performance Center
## UI Specification

Version 1.0  
Status: Design Frozen  
Companion to: `docs/PROJECT_SPEC.md`

---

# 1. Purpose

This document defines the visual design and interaction behavior of the GRmetro Live Performance Center.

It is intended to remove ambiguity during frontend implementation.

This document specifies:

- Branding
- Colors
- Typography
- Screen layout
- Chart appearance
- Slide composition
- Top 3 presentation
- Individual technician views
- QR remote appearance
- Animation behavior
- Loading, stale-data, and error states
- Display scaling
- Visual acceptance criteria

Where this document conflicts with a general requirement in `PROJECT_SPEC.md`, the more specific UI requirement in this document governs unless the product behavior itself would change.

---

# 2. Approved Visual Direction

The application shall follow the approved light-theme dashboard mockup.

The overall appearance shall include:

- Light gray page background
- White content cards
- Rounded corners
- Soft shadows
- Large, dark typography
- Gold, blue, green, purple, and orange metric accents
- GRmetro Heating & Cooling branding
- Spacious television-friendly composition
- Animated overlaid horizontal bars
- Minimal visible controls
- No traditional desktop-dashboard clutter

The visual target is a polished internal product that could plausibly have been created by ServiceTitan itself.

---

# 3. Required Assets

The repository shall contain:

```text
assets/
├── branding/
│   └── grmetro-logo.png
└── references/
    └── dashboard-reference.png
```

## 3.1 GRmetro Logo

Source:

The official GRmetro Heating & Cooling logo supplied by the user.

Requirements:

- Preserve original aspect ratio
- Do not stretch
- Do not crop important content
- Do not recolor without approval
- Use a transparent-background asset where available
- Keep sufficient whitespace around the logo
- Use high-resolution PNG or SVG

Recommended repository destination:

```text
assets/branding/grmetro-logo.png
```

## 3.2 Dashboard Reference

The approved dashboard reference image shall be committed as:

```text
assets/references/dashboard-reference.png
```

The reference establishes:

- Light visual theme
- Header placement
- Tab placement
- White rounded cards
- Gold emphasis
- Horizontal technician layout
- General visual density
- Premium presentation style

The earlier mockup's bottom Top 3 section is not part of the final normal KPI-slide design.

Top 3 shall appear only as its dedicated slide.

---

# 4. Design Tokens

The frontend shall centralize visual constants.

Recommended file:

```text
apps/dashboard/src/theme/tokens.js
```

Equivalent CSS custom properties shall be defined in the global stylesheet.

Example:

```css
:root {
  --color-background: #f7f9fc;
  --color-surface: #ffffff;
  --color-surface-muted: #f2f5f8;

  --color-text-primary: #111827;
  --color-text-secondary: #667085;
  --color-text-muted: #98a2b3;

  --color-border: #e4e7ec;
  --color-grid: #e9edf2;

  --color-grmetro-teal: #0d8588;
  --color-grmetro-teal-dark: #086b6e;

  --color-gold: #d4af37;
  --color-gold-soft: #f4e6a6;

  --color-blue: #2563eb;
  --color-blue-soft: #60a5fa;

  --color-green: #22c55e;
  --color-green-soft: #86efac;

  --color-purple: #7c3aed;
  --color-purple-soft: #a78bfa;

  --color-orange: #f59e0b;
  --color-orange-soft: #fbbf24;

  --color-silver: #a7afb9;
  --color-bronze: #b87333;

  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;

  --radius-small: 10px;
  --radius-medium: 16px;
  --radius-large: 22px;
  --radius-pill: 999px;

  --shadow-card:
    0 8px 30px rgba(16, 24, 40, 0.07);

  --shadow-elevated:
    0 18px 50px rgba(16, 24, 40, 0.12);
}
```

Implementation may refine exact values while preserving the approved visual direction.

---

# 5. Color Usage

## 5.1 GRmetro Teal

Use for:

- Branding accents
- Live-status elements
- Primary remote buttons
- Secondary navigation accents
- Neutral company UI elements

Do not use teal as the dominant chart color on every slide.

## 5.2 Gold

Use for:

- Revenue
- Goal stars
- First place
- Premium emphasis
- Top 3 accents
- Important achievements

Gold must remain visible against the light background.

Preferred gold:

```text
#D4AF37
```

Avoid pale yellow that lacks contrast.

## 5.3 Blue

Use for:

- Service Revenue
- Billable Service Calls
- Primary activity metrics
- Informational states

## 5.4 Green

Use for:

- Install Revenue where approved
- Closing %
- Successful goal completion
- Live connection status

## 5.5 Purple

Use for:

- Lead Conversion %
- Tech Leads
- Marketed Leads
- Supporting performance metrics

## 5.6 Orange

Use for:

- Install Average Ticket
- Number of Installs
- Average-ticket slide accents
- Warning states when not confused with errors

---

# 6. Contrast

All normal text shall meet WCAG AA contrast where practical.

Minimum requirements:

- Primary text against white: at least 4.5:1
- Secondary text against white: at least 4.5:1 for small text
- Large labels may use slightly lower contrast only when still highly readable
- Chart colors must remain identifiable at reduced opacity

Do not place white text over light gold without a dark backing or sufficient contrast.

---

# 7. Typography

Primary typeface:

```text
Inter
```

Fallback stack:

```css
font-family:
  Inter,
  "Segoe UI",
  Roboto,
  Helvetica,
  Arial,
  sans-serif;
```

Font files shall not be committed unless licensing permits and they are necessary.

Using a system or web-loaded Inter font is acceptable.

---

# 8. Typography Scale

Recommended 1080p dashboard values:

| Element | Size | Weight |
|---|---:|---:|
| Company/app title | 28–34 px | 650 |
| Current time | 26–32 px | 650 |
| Navigation tab | 18–22 px | 600 |
| Slide title | 44–56 px | 700 |
| Technician name | 25–32 px | 650 |
| Large KPI value | 40–52 px | 700 |
| Summary value | 30–42 px | 700 |
| Goal value | 22–30 px | 650 |
| Axis label | 16–19 px | 500 |
| Legend label | 16–20 px | 600 |
| Small status text | 14–17 px | 500 |

At 4K, the layout shall scale proportionally rather than simply doubling every value without review.

---

# 9. Number Style

Use tabular numerals where supported:

```css
font-variant-numeric: tabular-nums;
```

This reduces visible shifting while values animate.

Currency and percentages shall use strong weight.

Large values shall not use thin typography.

---

# 10. Page Background

Dashboard background:

```text
#F7F9FC
```

The background shall remain visually quiet.

Do not use:

- Gradients across the whole page
- Decorative patterns
- Large background illustrations
- Dark mode in Version 1.0

A faint radial or linear tint may be used only if nearly imperceptible.

---

# 11. Dashboard Safe Area

For a 1920×1080 display, recommended outer spacing:

```text
Left/right: 42–64 px
Top: 24–38 px
Bottom: 24–38 px
```

Content must not approach the physical edge of the screen.

Some televisions apply overscan.

The layout shall tolerate approximately 2–3% cropping without losing critical information.

---

# 12. Main Dashboard Grid

Recommended structure:

```text
┌──────────────────────────────────────────────────────┐
│ Header                                               │
├──────────────────────────────────────────────────────┤
│ Slide title and legend                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Main technician chart                                │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Optional compact summary/status region               │
└──────────────────────────────────────────────────────┘
```

The KPI slides shall not contain a permanent Top 3 strip.

The chart shall receive the majority of the screen.

---

# 13. Header Dimensions

Recommended height:

```text
90–112 px
```

Header columns:

```text
Logo / title
Navigation
Time / update status
```

Recommended proportional widths:

```text
Left: 26%
Center: 48%
Right: 26%
```

The header shall remain stable during all transitions.

---

# 14. Header Left Region

Contents:

- GRmetro logo
- Optional text: `Live Performance Center`

Recommended logo height:

```text
52–68 px
```

The logo may be slightly larger if its internal text remains readable.

The app title should not compete visually with the logo.

If the official logo already contains the full company name, the title may appear as a smaller supporting label.

---

# 15. Header Navigation

Navigation order:

```text
Revenue
Activity
Performance
Avg Ticket
Top 3
```

Requirements:

- Horizontally centered
- Single row at 1080p
- No wrapping
- Equal or optically balanced spacing
- No clickable hover styling on TV displays
- Active tab uses dark text and animated underline
- Inactive tabs use medium gray text

Recommended gap:

```text
28–44 px
```

---

# 16. Navigation Underline

Underline appearance:

- Rounded ends
- Height: 3–5 px
- Uses slide accent color or GRmetro teal
- Moves smoothly between tabs
- Width follows the active label
- Does not blink or disappear during transition

Recommended motion:

```text
Duration: 450–650 ms
Easing: smooth spring or cubic-bezier
```

---

# 17. Header Right Region

Contents:

```text
Weekday and date
Current local time with seconds
Last Refresh exact time and relative age
Freshness status ●
```

Recommended alignment:

```text
Right aligned
```

Current time shall be larger.

Update status shall appear beneath or beside it depending on available width.

The live dot shall:

- Be green and read `Live` while the last successful refresh is less than two minutes old
- Be yellow and read `Refreshing` while a dashboard REST request is active
- Turn orange and read `Stale` when the last successful refresh is at least two minutes old
- Turn red and read `Offline` when the last successful refresh is at least five minutes old or unavailable
- Pulse briefly after successful refresh
- Avoid continuous distracting pulsing

The browser-owned clock updates every second and remains independent from both the
dashboard REST polling interval and the backend refresh timestamp. The Last Refresh
section uses `lastSuccessfulRefreshAt` when available, falls back to `refreshedAt`, and
shows both the exact local time (including seconds) and relative age such as `Just now`,
`12 seconds ago`, or `2 minutes ago`.

---

# 18. Slide Header

Below the main header, each KPI slide shall show:

- Slide title
- Optional short explanatory label
- Legend
- Optional countdown until next slide

The countdown is optional and should not clutter the layout.

Recommended structure:

```text
Revenue                              Legend
Technician revenue performance       ● Total ● Service ● Install
```

The explanatory label may be omitted if the title is self-explanatory.

---

# 19. Slide Title Morphing

The title element remains mounted.

When changing slides:

```text
Revenue → Activity
```

preferred behavior:

- Text cross-morph or crossfade
- Slight width interpolation
- No horizontal full-screen motion
- No large zoom
- No abrupt disappearance

Duration:

```text
350–550 ms
```

---

# 20. Main Chart Card

The primary chart area may be either:

1. One large white card, or
2. A white chart region integrated directly into the page

Preferred:

```text
One large white rounded card
```

Recommended card properties:

```text
Border radius: 20–24 px
Shadow: soft and wide
Internal padding: 28–42 px
```

The card shall occupy approximately:

```text
72–82% of the content area height
```

on KPI slides.

---

# 21. Technician Rows

Exactly five rows shall appear.

Each row includes:

- Rank
- Technician initials or small badge
- Technician name
- Overlaid bars
- Metric values
- Goal summary

Recommended row order:

```text
Sorted by slide primary KPI
```

Recommended row spacing:

```text
16–26 px between rows
```

Rows should appear visually substantial, not compressed.

---

# 22. Technician Identity Region

Recommended layout:

```text
#1   JT   Julio Torres
```

Rank:

- Strong but compact
- Gold for rank 1 only where appropriate
- Neutral dark text for other positions

Initial badge:

- Circular or softly rounded
- 40–50 px
- Light neutral fill
- Dark initials
- May use slide accent tint

Technician name:

- Full name where space permits
- Never truncate at 1080p for the configured five names
- Use configured name, not null ServiceTitan name

---

# 23. Overlay Bar Lane

Each technician row uses one visual lane.

The bars overlap one another.

Example:

```text
████████████████████████  Revenue
████████████████          Service Revenue
████████                  Install Revenue
```

The bars shall appear over one another, not in three separate row groups.

Possible techniques:

- Same Y coordinate with varied heights
- Small vertical offsets
- Different opacity
- Different internal stroke or highlight
- Rounded bar ends

The total bar should remain visually identifiable behind component bars.

---

# 24. Overlay Bar Opacity

Recommended Revenue slide values:

```text
Revenue: 0.85–0.95
Service Revenue: 0.55–0.70
Install Revenue: 0.40–0.58
```

Activity and other slides may use comparable opacity separation.

Opacity must not make labels or boundaries ambiguous.

---

# 25. Bar Height

Recommended:

```text
Primary bar: 42–52 px
Secondary bars: 30–44 px
```

Bars may share a center line.

The implementation should visually test:

- Complete overlap
- 3 px offset
- 5 px offset

Choose the approach closest to the approved mockup and easiest to read from across the room.

---

# 26. Bar Shape

Bars shall use:

- Rounded ends
- Smooth rectangular body
- No sharp arrow tips
- No patterned fills
- No 3D bevels
- No heavy border

Optional:

- Very subtle inner highlight
- Very subtle gradient within one color family

Gradients must not reduce clarity.

---

# 27. Bar Labels

Metric values shall not be placed directly inside narrow bars when they may become unreadable.

Preferred:

```text
Right-aligned value group at end of row
```

Example:

```text
$12,420
$9,210
$3,210
```

The legend indicates which value corresponds to each bar.

An alternative compact metric stack beside the row is acceptable.

---

# 28. Axis

Axis shall be visually understated.

Use:

- Light vertical grid lines
- Four to six tick labels
- No heavy horizontal baseline
- No thick outer border
- Short compact values

Examples:

```text
$0
$2.5K
$5K
$7.5K
$10K
```

Tick labels shall not dominate technician names or values.

---

# 29. Axis Morphing

When scale changes:

- Existing grid lines move
- New tick labels crossfade or count
- Old labels fade only as their replacements appear
- Bars rescale at the same time
- No instant snap

Duration:

```text
600–900 ms
```

---

# 30. Goal Summary

Each technician row or side summary includes:

```text
Goal ★
$10,000
84%
```

The goal shall remain outside the graph.

Do not draw a goal line through every technician bar in Version 1.0.

Goal display options:

- Compact block at row right
- Compact column aligned with rows
- Small goal badge near the value

Preferred:

```text
Dedicated aligned goal column
```

---

# 31. Goal Star

Use a simple star:

```text
★
```

or a restrained icon.

Color:

```text
Gold
```

The star shall not animate continuously.

When the goal is reached, it may:

- Brighten
- Scale slightly
- Emit a brief glow
- Return to normal

---

# 32. Revenue Slide Layout

Recommended composition:

```text
┌──────────────────────────────────────────────────────────────┐
│ Revenue                                  Legend              │
│                                                              │
│ #1 Julio       ███████████████████████     $12,420  Goal... │
│ #2 Dwight      ███████████████████         $10,880  Goal... │
│ #3 Alex        ██████████████               $8,940  Goal... │
│ #4 Charlie     ███████████                  $7,250  Goal... │
│ #5 Shamon      ████████                     $5,900  Goal... │
│                                                              │
│ $0          $2.5K          $5K          $7.5K        $10K   │
└──────────────────────────────────────────────────────────────┘
```

Overlaid bars show:

- Revenue
- Service Revenue
- Install Revenue

Rows sort by Revenue.

---

# 33. Activity Slide Layout

Use the same technician-row layout.

Metrics:

- Billable Service Calls
- 10+ Opportunities
- Tech Leads
- Marketed Leads
- Installs

Because five overlays are denser, the Activity slide may use:

- Slightly thinner bars
- More opacity separation
- A two-row legend
- A compact metric-value stack

Do not split into five separate charts.

---

# 34. Activity Slide Colors

Recommended:

| Metric | Color |
|---|---|
| Billable Service Calls | `#2563EB` |
| Opportunities | `#60A5FA` |
| Tech Leads | `#7C3AED` |
| Marketed Leads | `#A78BFA` |
| Installs | `#F59E0B` |

The color set should remain distinguishable on a white background.

---

# 35. Performance Slide Layout

Metrics:

- Lead Conversion %
- Closing %

Use a fixed axis:

```text
0–100%
```

Bars shall be visually thicker because only two metrics exist.

The slide may use a clearer two-tone comparison per technician.

Rows sort by Closing %.

Goals appear outside the graph.

---

# 36. Performance Slide Colors

Recommended:

```text
Lead Conversion: Purple
Closing: Green
```

Closing % may use the stronger color because it determines row rank.

---

# 37. Average Ticket Slide Layout

Primary metric:

```text
Install Average Ticket
```

Supporting values:

```text
Install Revenue
Number of Installs
```

Recommended row:

```text
Julio
██████████████████  $8,400
Install Revenue $16,800
2 Installs
Goal $9,000
```

The supporting values shall not be rendered as overlapping chart bars unless later explicitly approved.

This slide may be visually simpler and more spacious than Activity.

---

# 38. KPI Slide Footer

A small footer may display:

```text
Today • America/New_York
```

or:

```text
Live ServiceTitan data
```

This footer shall remain subtle.

Do not place large legal or explanatory text on the TV dashboard.

---

# 39. Top 3 Slide Principle

Top 3 is a dedicated slide.

It shall not appear:

- Beneath Revenue
- Beneath Activity
- Beneath Performance
- Beneath Average Ticket
- As a persistent footer
- As a sidebar on normal slides

The full chart region transforms into the Top 3 presentation.

---

# 40. Top 3 Slide Layout

Preferred visual order:

```text
Second Place | First Place | Third Place
```

The page title:

```text
TOP 3 TECHNICIANS
```

shall be centered or strongly aligned above the cards.

First place is:

- Centered
- Larger
- Slightly taller
- Gold accented
- Visually dominant

---

# 41. Top 3 Card Dimensions

At 1920×1080:

Recommended card widths:

```text
Second: 420–470 px
First: 490–560 px
Third: 420–470 px
```

Recommended heights:

```text
Second/Third: 560–630 px
First: 620–700 px
```

Exact dimensions depend on final safe area.

---

# 42. Top 3 Card Styling

All cards:

- White background
- Rounded corners
- Soft elevated shadow
- Generous padding
- Large technician name
- Large rank
- KPI grid
- Clear medal accent

First:

```text
Gold border or top accent
Soft gold glow
Small crown
```

Second:

```text
Silver accent
```

Third:

```text
Bronze accent
```

---

# 43. Top 3 Rank Marks

Recommended:

```text
#1
#2
#3
```

Medal emoji may be used only when they render consistently.

Preferred production approach:

- Custom simple medal/rank icon
- Text rank
- No platform-dependent oversized emoji

A restrained crown may appear on first place.

---

# 44. Top 3 Card Content

Maximum six supporting metrics:

- Revenue
- Billable Service Calls
- Closing %
- Lead Conversion %
- Number of Installs
- Install Average Ticket

Recommended two-column KPI grid:

```text
Revenue           Calls
$12,420           18

Closing           Lead Conversion
72%               64%

Installs          Install Avg Ticket
2                 $8,900
```

The card must remain readable from twenty feet.

---

# 45. Top 3 Sparkle

A subtle first-place decorative effect is permitted.

Requirements:

- Very small number of particles
- Low opacity
- Slow movement
- Does not cross text
- Pauses under reduced motion
- Does not resemble confetti
- Does not continue at high intensity

Preferred:

```text
Occasional 1–3 small gold glints
```

---

# 46. Top 3 Entrance

Sequence:

1. Current metric content reduces emphasis
2. Title changes to Top 3
3. Second and third cards enter
4. First card rises into the center
5. Values animate in
6. Gold glow appears softly

Avoid:

- Screen wipe
- Horizontal page slide
- Explosion
- Loud confetti effect
- Excessive bouncing

---

# 47. Top 3 Duration

Default:

```text
25 seconds
```

The slide should remain mostly still after entrance.

Do not keep every value moving during the entire 25 seconds.

---

# 48. Individual Technician Scorecard

Triggered by remote technician-only selection.

The view shall show one technician's approved KPIs at a glance.

Recommended composition:

```text
┌────────────────────────────────────────────────────┐
│ Julio Torres                          Rank #2       │
├────────────────────────────────────────────────────┤
│ Revenue          Service Rev      Install Rev      │
│ $12,420          $8,200           $4,220           │
├────────────────────────────────────────────────────┤
│ Calls            Opportunities    Tech Leads       │
│ 18               12               4                │
├────────────────────────────────────────────────────┤
│ Marketed Leads   Lead Conversion  Closing          │
│ 6                64%              72%              │
├────────────────────────────────────────────────────┤
│ Installs         Install Ticket   Install Revenue  │
│ 2                $8,900           $17,800          │
└────────────────────────────────────────────────────┘
```

Use larger cards or metric groups rather than a tiny spreadsheet.

---

# 49. Technician Scorecard Rank

The individual scorecard may display:

- Overall rank
- Revenue rank
- Selected KPI rank where applicable

Do not display many competing rank badges.

Preferred:

```text
Overall Rank #2
```

with optional smaller slide-specific ranks.

---

# 50. Technician-plus-KPI View

Triggered when technician and KPI are selected.

Recommended composition:

```text
Technician name
KPI title

Large value
Goal
Percent complete
Rank

Team comparison bars
Supporting related values
```

The selected technician uses the full KPI accent color.

Other technicians use muted versions.

---

# 51. KPI-only Remote View

Triggered when only a KPI is selected.

Use the appropriate parent slide's normal graph.

Changes:

- Highlight the selected metric
- Deemphasize related overlay metrics where applicable
- Sort by the selected KPI
- Show selected KPI values prominently
- Maintain normal header and navigation

---

# 52. Remote View Label

Remote override displays a small indicator:

```text
REMOTE VIEW
```

or:

```text
Selected from QR Remote
```

This label shall be subtle.

It must not cover values.

Recommended location:

```text
Upper edge of content card
```

---

# 53. Return-to-Live State

During `returning` mode, show:

```text
Returning to Live Dashboard…
```

Appearance:

- Small centered status pill
- Brief
- GRmetro teal or neutral gray
- No modal covering the screen

The live slide morphs into view behind or immediately after the message.

---

# 54. Loading State

Initial dashboard loading state shall use the GRmetro brand.

Recommended:

```text
GRmetro logo

Connecting to Live Performance Center…
```

Optional subtle loading bar or indicator.

Do not show:

- Raw spinner on blank white page
- Technical error details
- React/Vite default assets

---

# 55. Invalid TV State

When URL contains an unknown TV ID:

```text
Display Not Configured

This screen is using an unknown TV ID:
breakroom2

Use one of the configured display URLs.
```

Include configured TV names only if appropriate.

The page shall remain branded and readable.

---

# 56. No Cache State

When no dashboard payload exists:

```text
Connecting to live data…
```

Supporting text:

```text
Waiting for the first ServiceTitan update.
```

Do not show zero-filled technician rows.

---

# 57. Stale Data State

Warning threshold:

```text
3 minutes
```

UI:

- Updated label becomes amber
- Small warning appears
- Existing values remain fully visible

Example:

```text
Updated 4 min ago
```

Critical threshold:

```text
10 minutes
```

UI:

```text
Live data unavailable
Showing last update from 12:42 PM
```

The display shall not go blank.

---

# 58. Disconnected State

WebSocket disconnected with valid cache:

```text
Reconnecting…
```

Use:

- Amber live dot
- Small status message
- No full-screen blocking overlay

The dashboard remains visible.

---

# 59. Authentication Required State

When ServiceTitan requires login:

```text
ServiceTitan login required
Showing the last successful update
```

Do not display credentials or technical details.

This warning may be more prominent than a normal disconnect warning.

---

# 60. Achievement Banner

Approved banners:

```text
★ GOAL REACHED
♛ NEW LEADER
↑ ENTERED TOP 3
```

Prefer custom icons or text symbols over platform-dependent emoji when possible.

Appearance:

- Small pill or banner
- High contrast
- 3-second duration
- Does not cover the header or key chart values
- Animates in and out gently

---

# 61. Goal Reached Styling

Suggested colors:

```text
Gold background tint
Dark gold text
Gold icon
```

Do not use bright green confetti.

---

# 62. New Leader Styling

Suggested:

```text
Dark charcoal or gold-tinted pill
Small crown icon
```

The event should feel special but not dominate the whole slide.

---

# 63. Top 3 Entry Styling

Suggested:

```text
Teal or blue-tinted pill
Upward arrow
```

Avoid aggressive red/green trading-dashboard visuals.

---

# 64. Animation Tokens

Recommended:

```javascript
module.exports = {
  durations: {
    instant: 0,
    fast: 220,
    standard: 450,
    bar: 750,
    number: 900,
    rowReorder: 600,
    axis: 700,
    topThreeEntrance: 1050,
    returnToLive: 1000
  },

  easing: {
    standard: [0.22, 1, 0.36, 1],
    gentle: [0.16, 1, 0.3, 1]
  }
};
```

Exact values may be tuned after testing.

---

# 65. Motion Rules

Allowed:

- Width interpolation
- Color interpolation
- Number counting
- Row layout movement
- Small opacity transitions
- Small Y movement
- Underline movement
- Card emphasis scaling

Avoid:

- Full-screen lateral slides
- Continuous bouncing
- Fast zooms
- Rotating cards
- Flipping panels
- Large parallax
- Continuous glowing on every element

---

# 66. Reduced Motion

Under:

```css
@media (prefers-reduced-motion: reduce)
```

the dashboard shall:

- Disable decorative sparkle
- Disable large movement
- Use short fades
- Retain state clarity
- Keep number updates understandable
- Avoid long animated counts where unnecessary

The TV deployment may not request reduced motion, but support is still required.

---

# 67. Responsive Scaling

Primary:

```text
1920×1080
```

Minimum:

```text
1280×720
```

Maximum target:

```text
3840×2160
```

The layout shall scale through:

- CSS clamp values
- Responsive SVG
- Consistent aspect ratio
- Minimum text thresholds
- Controlled spacing adjustments

Do not create a general mobile dashboard layout.

---

# 68. 720p Adjustments

At 1280×720:

- Reduce header height
- Reduce logo size
- Reduce outer margins
- Reduce card padding
- Reduce technician row height
- Preserve all five rows
- Keep metric values readable
- Avoid hiding important fields where possible

The Top 3 cards may reduce supporting KPI text size slightly.

---

# 69. 4K Adjustments

At 3840×2160:

- Increase text and spacing proportionally
- Avoid a small 1080p panel floating in the center
- Preserve maximum readable line lengths
- Keep card shadows subtle
- Increase SVG rendering dimensions without adding more information

---

# 70. Overscan Safety

Critical elements shall remain at least:

```text
36–48 px
```

inside the 1080p design boundary.

Do not place:

- Logo
- Time
- Updated status
- QR badge
- Technician names
- Values

directly against screen edges.

---

# 71. QR Badge on Dashboard

Optional on-screen badge:

```text
Scan to control this TV
[QR]
```

Recommended:

- Bottom-right or lower header region
- Approximately 100–135 px QR size at 1080p
- White card or subtle outline
- Does not overlap chart
- TV-specific link

A physical printed QR code remains preferred.

---

# 72. Remote UI Theme

The remote shall use the same:

- Logo
- Teal
- Gold accents
- Typography
- Rounded cards
- Light background

But the mobile layout shall prioritize:

- Large touch targets
- Simple choices
- Clear current-TV state
- Minimal visual density

---

# 73. Remote Page Layout

Recommended:

```text
GRmetro logo

Break Room TV

Currently Showing
Live Rotation — Revenue

Technician
[ picker ]

KPI
[ picker ]

[ Apply to Break Room TV ]

[ Resume Live Rotation ]

Returns to live mode in 1:42
```

Use one primary scrollable page after TV selection.

---

# 74. Remote TV Selection

General remote displays TV cards.

Each card includes:

- Friendly room name
- Current state
- Live or Remote status
- Small status dot

Example:

```text
Break Room TV
Live Rotation — Activity
● Connected
```

Cards shall be large enough to tap easily.

---

# 75. Remote Technician Picker

Preferred mobile interaction:

- Full-width selectable list
- Initial badge
- Technician name
- Single-selection indicator

The picker may be a modal sheet or inline expandable card.

Avoid native tiny `<select>` elements when a clearer custom control is practical.

---

# 76. Remote KPI Picker

Use grouped categories.

Recommended section headings:

```text
Revenue
Activity
Performance
Average Ticket
```

Each KPI appears once.

Selected KPI uses:

- Accent border
- Checkmark
- Light tinted background

---

# 77. Remote Apply Button

Primary button color:

```text
GRmetro teal
```

Button:

- Full width
- 52–58 px tall
- Rounded
- Strong readable label
- Disabled state clearly visible

Example:

```text
Apply to Break Room TV
```

---

# 78. Remote Resume Button

Secondary or outline button.

Example:

```text
Resume Live Rotation
```

Do not style it like a destructive red action.

---

# 79. Remote Confirmation

After success:

```text
Break Room TV updated
```

Supporting:

```text
Showing Julio Torres — Revenue
Returns to live rotation in 2:00
```

Use a green or teal success mark.

Do not require dismissing a modal.

---

# 80. Remote Error State

Example:

```text
Could not update Break Room TV

Check that you are connected to the office network and try again.
```

Include:

```text
Try Again
```

Do not expose stack traces or API error details.

---

# 81. UI Component Naming

Recommended component names:

```text
DashboardShell
DashboardHeader
SlideNavigation
LiveStatus
MetricSlide
OverlayBarChart
TechnicianRow
GoalSummary
AnimatedNumber
TopThreeSlide
TopThreeCard
AchievementBanner
TechnicianScorecard
TechnicianKpiView
RemoteControlPanel
TechnicianPicker
KpiPicker
TvPicker
OverrideCountdown
```

Names should describe behavior rather than visual implementation alone.

---

# 82. CSS Strategy

Approved approaches:

- Plain global CSS with component classes
- CSS modules
- A small combination of both

Avoid:

- Large utility-class strings throughout JSX
- Inline style duplication
- Dynamic style objects for every render
- Excessive global selectors

CSS custom properties shall provide theme consistency.

---

# 83. Screenshot Requirements

Before visual approval, capture:

```text
Revenue — 1920×1080
Activity — 1920×1080
Performance — 1920×1080
Average Ticket — 1920×1080
Top 3 — 1920×1080
Technician scorecard — 1920×1080
Technician KPI detail — 1920×1080
Remote control — mobile
No-data state
Stale-data state
```

Compare against the approved dashboard reference.

---

# 84. Visual Review Questions

Reviewers shall answer:

- Is the logo clearly GRmetro?
- Does gold stand out?
- Are technician names readable?
- Are overlay bars distinguishable?
- Is there enough whitespace?
- Does the page remain stable during transitions?
- Is Top 3 clearly a dedicated slide?
- Are goals visible without clutter?
- Can the current slide be identified immediately?
- Does the interface feel professional rather than playful?
- Does the remote require little or no instruction?

---

# 85. UI Release-Blocking Defects

The following block release:

- Dark theme used instead of approved light theme
- Wrong company branding
- Top 3 strip appears beneath KPI slides
- Whole screen slides horizontally between slides
- Technician names unreadable at 1080p
- Overlay bars cannot be distinguished
- Values overlap or leave card boundaries
- Mobile remote buttons are difficult to tap
- QR control changes the wrong TV
- Zero and no-data look identical
- Stale data appears current
- Top 3 effects obscure KPI text
- Dashboard cannot fit five technicians

---

# 86. UI Acceptance Criteria

The UI is accepted when:

1. The approved GRmetro logo is used
2. Light gray and white visual system matches the reference
3. Gold remains prominent and readable
4. Exactly five tabs appear
5. KPI slides show no bottom Top 3 section
6. All five technician rows fit
7. Bars visibly overlap with transparency
8. Titles, bars, axis, and numbers morph
9. The dashboard shell remains stationary
10. Top 3 uses a full dedicated slide
11. First place receives restrained gold emphasis
12. Individual technician views remain TV-readable
13. Remote UI is usable on common phones
14. Loading and error states remain branded
15. 1080p screenshots receive stakeholder approval

---

# 87. Phase 11 Dashboard Foundation State

The initial production dashboard shell uses the approved light theme and exposes these stable regions:

```text
Branded header and last-refresh status
Four KPI summary cards
Reserved primary visualization region
Five-technician overall leaderboard
Footer and live-data status
```

The KPI summaries display the technician with backend rank `1` for selected approved KPIs. The dashboard does not calculate team totals, KPI rankings, overall scores, or other business meaning. Missing values display as `No data`, and data-quality labels remain visible.

The primary visualization region is deliberately a foundation placeholder. It does not implement charts, slide rotation, remote control, WebSockets, or AI insights. Those features remain assigned to their dedicated implementation tasks.

Initial loading preserves the complete shell with skeleton regions. A failed initial request shows a branded friendly error and retry action. A background request failure preserves the last successful payload and adds a nonblocking warning.

---

# End of UI_SPEC.md

The next companion document is:

```text
docs/SERVICETITAN.md
```

It shall consolidate:

- Technician IDs
- Business unit IDs
- Exact native endpoint paths
- Captured request headers
- Captured POST bodies
- Known response samples
- Field definitions
- CSRF requirements
- Browser launch instructions
- Data mapping warnings
- Drilldown research tasks
- Troubleshooting
