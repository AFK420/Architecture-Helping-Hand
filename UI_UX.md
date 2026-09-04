# UI_UX — Information Architecture & Interface Contract

This document is the contract for the application's user interface: how navigation
is structured, how every tool page is laid out, and how quality is verified. When
a view is added or restructured, this document and the tests that pin it
(`tests/ui-contracts.test.js`, `tests/responsive.test.js`) must move together.

---

## 1. Application Shell

```text
┌──────────────┬─────────────────────────────────────────────────┐
│              │ TOP BAR  (global controls only)                 │
│  SIDEBAR     ├─────────────────────────────────────────────────┤
│  (sections + │                                                 │
│   search)    │  TOOL SURFACE  (one mode-view at a time)        │
│              │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
```

### Sidebar (`#app-sidebar`)
- Rendered at boot from a **single source of truth**: `NAV_CATALOG` in
  `src/ui/app.js`. The command palette registers its Navigation commands from the
  same catalog — the two can never drift apart.
- Sections (collapsible): **Home · Scale · Dimensions · CAD · Architecture ·
  Space · Project · AI**.
- Every implemented screen has exactly one entry with a one-line purpose
  (`desc`), used as tooltip, search text, and palette description.
- **Sidebar search** (`#sidebar-search`): live token filter over label, purpose,
  section, and keywords. Esc clears, then blurs.

### Top bar (`#app-topbar`)
Global controls only — never per-tool buttons: sidebar toggle, breadcrumb
(`Helping Hand / <current tool>` — clicking the crumb returns Home), global
search trigger (Ctrl+K), Quick Dim strip toggle, Journal drawer, theme select,
sound toggle, shortcuts help.

### Home (`#mode-view-home`)
The app **opens on Home**. It shows an honest snapshot of the current project
(name, description, counts of rooms / plan entities / measurements / decisions /
snapshots / journal notes straight from the project store) plus quick tool links
and the live AI readiness status. An empty project shows an honest empty state —
never fake data.

---

## 2. Navigation Rules

1. **Single catalog.** To add a screen: add one entry to `NAV_CATALOG` and one
   `<section id="mode-view-<id>">`. `switchMode(id)` handles the rest. The
   contract test asserts every catalog id has a view container and vice versa.
2. **Unknown ids fall back to Home** — a stale link never dead-ends.
3. **Command palette = global search.** <kbd>Ctrl</kbd>+<kbd>K</kbd> searches
   tools (from the catalog), utility actions, AI actions, and live content:
   typing `2400mm` previews a multi-scale comparison, `chain 1200 1800 900`
   previews a chain. There is exactly one search system.
4. **Legacy keyboard shortcuts** (`1`–`9`, `0`, `C`, `B`, `Q`, `H`, `S`, `?`)
   still work alongside the sidebar.

---

## 3. Responsive Breakpoints

| Range | Sidebar | Top bar | Notes |
|---|---|---|---|
| ≥ 1281px (desktop) | Persistent, toggleable (`body.sidebar-hidden`) | Full | 2-column `tool-layout` |
| 1025–1280px | Persistent, narrower (216px) | Full | 2-column, tighter gutters |
| ≤ 1024px (tablet) | **Off-canvas drawer** (`body.sidebar-open` + backdrop) | Full | 1-column `tool-layout` |
| ≤ 768px (mobile) | Drawer | Compact: icon-only controls, crumb root hidden | 1-column, 16px inputs (iOS zoom guard) |
| ≤ 380px | Drawer | Icon-only, text labels hidden | — |

**Hard rule — no page-level horizontal overflow at any viewport, at 100% zoom.**
Internal scroll regions (tables, the catalog list) are fine; the page scrolling
sideways is not. Mechanically this means:

- `html, body { overflow-x: clip }` so the intentionally off-canvas drawer never
  creates page scroll.
- **Every multi-track grid uses `minmax(0, Nfr)`, never bare `Nfr`** — a bare
  `1fr` track defaults to `min-content` minimums and lets a wide input push the
  grid past its container. `tests/responsive.test.js` statically pins this.
- `.archi-card` clamps `min-width: 0; max-width: 100%; overflow-x: hidden`.
- Wide tables live inside `.table-scroll-container` / `.workspace-table-container`
  and scroll internally.

---

## 4. Tool Page Contract

Every major tool view follows the same visual grammar:

```text
CARD TAG (mode label)          [status badge]
TOOL NAME (h2)
One-line purpose paragraph (.tool-description)   ← every tool has one

INPUT   (visible label · unit · helper text · placeholder example)
RESULT  (primary value visually dominant, secondary data subordinate)
VISUAL / TABLE  (diagram or schedule, scrolling internally)
ACTIONS (primary action first; copy/CAD/workspace/journal as secondary)
ADVANCED (progressive disclosure via <details> or advanced sections)
```

Rules:
- **Every input has a visible `<label for>`** or, where layout makes that
  impractical (icon inputs, the palette field), an `aria-label`. Unit-bearing
  inputs state their unit and accept typed units (`2400mm`, `7' 6"`).
- **Never wipe a result to blank on an invalid keystroke** — the stale-result
  banner (`*-result-stale-tag`) shows the last valid result instead.
- **Primary result is one big number**; supporting numbers (equivalents,
  percentages, drawing-scale variants) are smaller and labeled.
- **Errors say WHAT, WHY, WHAT TO DO** (e.g. "No API key for deepseek — add one
  in the AI Control Center. The app works fully without AI.").
- **Honest empty states** — no fake data, no placeholder-as-content.

---

## 5. AI Interface Contract

### AI Control Center (`mode-view-ai_settings`)
- **Providers**: one card per provider with live status (Enabled / Configured /
  No key), masked key, enable toggle, key save/clear, session-vs-persistent
  choice, Test (explicit live request), and Models (discovery). Key fields carry
  a per-provider format hint (`aria-describedby`).
- **Jobs**: one row per AI job with description, required capabilities, current
  assignment, and status (`READY` / `NO KEY` / `NOT CONFIGURED` /
  `MODEL UNAVAILABLE` / …). Assign/clear is explicit — the router's default
  fallback policy is NEVER, so nothing ever switches silently.
- **Model catalog**: search + provider filter + capability filters; manual model
  entry is available and marked "user declared".
- **Activity**: local metadata only (job, provider, outcome, tokens) — never
  prompts, project data, or keys.

### AI Studio (`mode-view-ai`)
- **One job, one question, one validated answer** — not a chat.
- The job selector shows a **plain-language hint** (`#ai-job-hint`): what the job
  does and what capabilities it needs; vision jobs reveal the image upload.
- Context inclusion is an explicit checkbox; the context summary strip reports
  what was sent (rooms · furniture · conflicts · measurements · decisions) and
  any reductions.
- Responses render **escaped**; structured responses render as finding cards
  (severity, evidence, recommendation). A consistency strip verifies AI numeric
  claims against core calculations.
- All failure modes resolve to human-readable messages with a next action. No
  stack traces. No automatic retries, no paid fallback.

---

## 6. Accessibility Contract

- All visible form controls have programmatic names (label or `aria-label`).
  Verified by the browser QA harness.
- `:focus-visible` outlines are defined globally; tab order follows the shell
  (sidebar → top bar → tool surface).
- Status badges and drawer states use `aria-live`/`polite` where they update
  dynamically.
- Touch targets ≥ 42px, primary run buttons ≥ 46px on mobile.

---

## 7. Visual / Browser QA

Two Playwright harnesses run against a local server (they require
`pip install playwright` + the Chromium cache):

1. **`scripts/qa_browser_check.py`** — visits **every screen × six viewports**
   (390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080), asserting:
   page-level horizontal overflow, off-viewport interactive controls
   (closed drawers and intentional internal scroll containers excluded),
   console/page errors. Captures a full-page screenshot per screen/viewport
   into `qa-shots/`.
2. **`scripts/qa_operability.py`** — sixteen real click-through workflows
   (quick dimension, stairs, ramps, chains, furniture search, project save
   reflected on Home, plan-canvas room drawing, CSV import, export preview,
   AI control center render, vision upload, sidebar search, palette, history
   drawer, keyboard shortcuts, empty states).

A screen that only becomes usable when the browser is zoomed out is **broken**;
fix the layout, never the zoom. `qa-shots/` outputs are working artifacts for
visual regression reference, not proof of usability on their own — the
operability pass is the functional gate.

---

## 8. Where Things Live

| Concern | Location |
|---|---|
| Navigation catalog + sidebar + home logic | `src/ui/app.js` (`NAV_CATALOG`, `renderSidebar`, `renderHome`, `switchMode`) |
| Shell markup | `index.html` (`#app-shell`, `#app-sidebar`, `#app-topbar`, `#tool-surface`, `#mode-view-home`) |
| Shell + responsive CSS | `css/main.css` (§2 Application Shell, §17 Responsive Layout Engine) |
| Command palette commands | `src/services/commands.js` + catalog registration in `app.js` |
| Tool view controllers | `src/ui/views/*.js` |
| Contract tests | `tests/ui-contracts.test.js`, `tests/responsive.test.js` |
| Browser QA harnesses | `scripts/qa_browser_check.py`, `scripts/qa_operability.py` |
