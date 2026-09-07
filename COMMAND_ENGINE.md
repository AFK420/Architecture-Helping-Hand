# Command Engine

**Module:** `src/core/cad-commands.js` · **UI:** `src/ui/components/commandbar.js` · **Wiring:** `src/ui/views/plan.js`
**Status:** Implemented and verified (41 unit tests + live browser QA). This document describes the actual shipped system.

## What it is

A real, interactive CAD command line for the Plan workspace in the spirit of professional drafting CLIs — built entirely on the project's own deterministic engines. One registry feeds the command line, the AI tool-recommendation layer, and the palette.

## Command registry

`buildCommandRegistry(STUDIO_TOOL_CATALOG)` produces the full command set:

- **Interactive drafting commands** (multi-step prompts):
  - `LINE` (aliases `L`, `LINESEG`) — two points → `create_line`
  - `WALL` (`W`) — two points, option `Width=` (default 0.2 m, clamped 0.05–2) → `create_wall_points`
  - `RECTANGLE` (`REC`, `RECT`) — two corners → `create_room_points`
  - `DIST` (`DI`, `MEASURE`) — two points → distance/angle/Δ readout
  - `DIMLIN` (`DIM`, `DAL`, `DCO`) — two points → dimension entity
- **System/view/edit commands (one-shot):** `UNDO U`, `REDO R`, `DELETE E/ERASE/DEL`, `ZOOM Z (E|IN|OUT|%)`, `PAN P`, `FIT ZE`, `TOP PLAN`, `FRONT ELEV/SOUTH`, `RIGHT EAST`, `PERSPECTIVE PERSP/3D`, `4VIEW SPLIT/QUAD`, `SELECT`, `PROPERTIES`, `INFO`, `SUGGEST`, `AI`, `ANALYZE`, `LAYER LA`, `HELP ?`.
- **Catalog tools:** every `STUDIO_TOOL_CATALOG` entry with a `commandAlias` becomes a tool-activation command (65+ aliases such as `MARQUEE`, `HATCH`, `STAIR`, `PUSHPULL`…). Built-ins shadow catalog aliases on collision.

## Interactive prompt state machine

- `run(line)` starts a command; each subsequent `Enter` feeds the **current step** (the prompt label shows `WALL [1/2]`).
- Each step accepts: a **canvas click** (routed through `submitPoint`), a **coordinate string**, a **unit-bearing length**, or a named **option** (`Width=0.3` — also clickable as chips beside the prompt).
- `Esc` cancels with an explicit message; options chips include `[Cancel Esc]`.

## Coordinate input (one unit engine)

`parsePointToken` / `parseLengthToken` reuse `src/core/parser.js` + `src/core/units.js`; there is no second conversion engine:

| Input | Meaning |
|---|---|
| `10,20` | absolute world meters (a third `z` token is tolerated and ignored) |
| `@5,0` | relative to the last point |
| `@5<90` | relative polar (distance<angle in degrees) |
| `2400mm`, `2.4m`, `8'`, `12'6"` | lengths converted to meters via the shared parser |
| bare `2400` after a point pick | guided length along the current direction |

## Autocomplete

Typing opens a ranked dropdown **above** the prompt (in-viewport by construction): exact name > exact alias > name prefix > alias prefix > substring > fuzzy subsequence, boosted for recently used commands. Results show name, aliases, shortcut and description; `↑/↓` + `Tab`/`Enter` select; `Esc` closes.

## History

- `↑`/`↓` replay (newest first, stops at the ends).
- Session-persisted (`ahh_command_history` / `ahh_command_recents` in localStorage; 100 entries, consecutive duplicates collapse).
- The history button lists the last 8 entries; `clearHistory()` in the API wipes it.

## Integration contract

- The executor in `plan.js` (`executeCadCommand`) maps engine results (`create_line`, `create_wall_points`, `zoom`, `view_top`, …) to the deterministic core and returns `{ ok, message | error }` — that message is what the command log shows.
- Canvas pointer-down checks `__commandbar.isActive()` first: while a prompt is active, a click **is** the point input (mixed mouse/keyboard workflow: `WALL` → click → type `@2.4<0` → `Enter`).
- Legacy parametric one-liners (`REC 6 4`, `WALL 5`, `STAIR 16 1.1`, `HATCH brick`, `INSERT key`, `4VIEW`, …) still work: unknown-to-engine lines fall back to `parseStudioCommand`.

## Errors (quality bar)

- Unknown command: ``Unknown command "WAL". Did you mean WALL?``
- Bad point: explains the accepted formats.
- Bad length: ``"abc" is not a valid length — try 2400mm, 2.4m or 8'.``

## Test coverage

`tests/cad-commands.test.js` (41 assertions): registry/aliases, coordinate math (absolute/relative/polar/feet/mm), step-by-step + option + guided entry, one-shot inline points, did-you-mean, history replay/search/persistence/clear, autocomplete ranking.
