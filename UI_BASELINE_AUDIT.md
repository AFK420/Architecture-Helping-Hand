# UI Baseline Audit (Phase 1 — no fixes applied)

Reference: user screenshot showing the app as a centered island with unused
flanking viewport (blue-marked) at 100% browser zoom.
Bundle audited: `app.js?v=2.3.3`. Measurements taken live at four viewports.

## 1. Viewport utilization (measured)

| Viewport | Tool-surface width | Flank waste | Canvas size | Canvas bottom gap | Page overflow-x |
|---|---|---|---|---|---|
| 1280×720 | 1064 px | ~0% | 619×288 | — | none |
| 1440×900 | 1192 px | ~0% | 723×393 | — | none |
| 1920×1080 | **1480 px (capped)** | **23%** (344 px left + 96 px right) | 1011×617 | **115 px** | none |
| 2560×1440 | **1480 px (capped)** | **42%** (664 px left) | 1011×977 | — | none |

## 2. Root causes (exact)

| # | Cause | Location | Effect |
|---|---|---|---|
| C1 | `.tool-surface { max-width: 1480px; margin: 0 auto; }` | main.css:728 (base) and :6310 (≥1281px media) | app centers and stops growing at 1480 px; the screenshot's empty flanks |
| C2 | `.plan-svg-wrap { height: calc(100vh − 340px) }` | main.css:907 | canvas height is a magic-number guess, not a flex fill → 115 px dead band under the canvas at 1080p; wrong on any chrome-height change |
| C3 | grid columns `92px minmax(0,1fr) 290px` | main.css:9647 | columns do stretch, but only inside the capped surface — canvas width is capped by C1 |

Everything else holds: no horizontal page scroll at any measured size, tool
rail scrolls internally (verified 444/1203 px at 720p through 1099/1203 at
1440p), inspector fixed 290 px, tabs/command bar/status bar all reachable.

## 3. Component sizes (1920×1080)

| Region | Measured | Note |
|---|---|---|
| App shell | 1920 px | shell itself is full-width |
| Tool surface | 1480 px | capped (C1) |
| Tool rail | 79–92 px | inside internal scroll; visible themed scrollbar |
| Canvas | 1011×617 px | should receive C1/C2 reclaimed space |
| Right inspector | 290 px | fixed; internal scroll works |
| Ribbon | full surface width | persona pills + tool groups render at full width |
| Command bar | full canvas column width | prompt + aids + coords + log |

## 4. Text size audit (plan mode, 1,700 DOM nodes)

Sub-10 px font sizes in use: 7.68 px ×38 nodes, 8 px ×23, 9.28 px ×29,
9.6 px ×6, 9.92 px ×41 — **137 nodes below 10 px**, concentrated in ribbon
labels, status chips, badges, HUD tips. Legible on the tested display but a
density/accessibility consideration; the worst (7.68 px) are ribbon group
labels and shortcut kbd chips.

## 5. Icon consistency

SVG registry icons render across palette/ribbon/nav/tabs/commands
(verified: 65 palette icons, ribbon groups, 26 sidebar icons). Emoji remain
only in: inert catalog data fields (never rendered), toasts (informational
glyphs), and two layer-panel decorative spots — no functional emoji icons in
chrome.

## 6. Interaction findings (visual-adjacent)

- Command suggestion dropdown opens upward in-viewport, width-capped (no
  horizontal overflow) — verified with the dropdown open at 1280.
- 4-view pills and maximize toolbar render; mode label desync observed once
  under stale-prompt conditions (see COMMAND_HEALTH_MATRIX N1/N3).
- Compass overlays canvas top-right; does not intercept drawing (pointer-events
  only on its buttons).

## 7. Verdict (baseline)

The workstation is structurally sound and overflow-free, but at >1480 px the
layout deliberately stops growing: the screenshot's wasted flanks (C1) and the
canvas's guessed height (C2) are the two remaining full-viewport defects. Both
have straightforward, contained fixes (remove the cap for the plan workstation
shell; make the canvas column a bounded flex region) — documented for the fix
phase, not applied.


---

# Phase 5 After-State (viewport transformation — measured 2026-09-08)

Changes applied: `.tool-surface` max-width cap removed for `body.mode-active-plan`
(full width, fixed viewport height, flex column); canvas wrap switched from
`calc(100vh − 340px)` guess to flex-fill; ribbon capped at 108–132px; 720p chrome
trims (tab bar, gaps, command log, result header). Cache v2.3.6.

| Viewport | Surface width | Canvas width | Canvas height | Fits vertically | Overflow-x |
|---|---|---|---|---|---|
| 1280×720 | 83% | 50% | 346 px | ✅ command bar bottom 712 ≤ 720 | none |
| 1366×768 | 82% | 50% | 360 px | ✅ | none |
| 1440×900 | 83% | 53% | 492 px | ✅ | none |
| 1920×1080 | 87% (was 77%) | 65% | 678 px | ✅ | none |
| 2560×1440 | **90% (was 58%)** | 74% | 1038 px | ✅ | none |

Canvas is now the majority surface at ≥1920; the tool rail scrolls internally
with the last tool reachable at every size; command bar, status bar, compass
verified in-viewport at all five sizes. Remaining: rail stays at 79–92 px
fixed; at 2560 the center column could theoretically grow further but the
drawing area already dominates.
