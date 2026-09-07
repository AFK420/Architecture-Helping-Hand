# Icon System

**Module:** `src/core/icons.js` · **Status:** Implemented; emoji removed from all functional UI chrome (verified by DOM scan + `tests/icon-system.test.js`).

## Principles

1. **Original work** — every glyph is a simple 24×24 stroke drawing designed for this application's semantics (selection geometry, wall sections, hinge swings, witness lines, cut planes). No emoji, no third-party sets, no proprietary copies.
2. **Theme-aware** — paths draw with `stroke="currentColor"`, so themes and active states work; decorative glyphs are `aria-hidden="true"`.
3. **One registry, many consumers** — the palette, ribbon, sidebar, menu bar, document tabs, new-tab menu, command palette, layer toggles and the plan tool palette all resolve through this module.

## API

| Function | Resolves | Fallback |
|---|---|---|
| `icon(name, {size})` | registry glyph | `generic` |
| `toolIcon(tool, {size})` | `tool.iconName` → `tool.id` → `TOOL_ALIASES[tool.id]` | `generic` |
| `categoryIcon(id)` | `CATEGORY` map | `generic` |
| `personaIcon(id)` | `PERSONA` map (studio/autocad/rhino/photoshop/sketchup) | `generic` |
| `docTypeIcon(type)` | `DOC_TYPES` (plan/3d/elevation/section/detail/sheet/4view) | `sheet` |
| `navIcon(id)` | sidebar navigation ids | `generic` |
| `commandIcon(id)` | command palette ids | `generic` |

Rendered markup is cached per `name@size`.

## Where emoji were removed

- **Tool palette + ribbon** — all `STUDIO_TOOL_CATALOG` icons now render via `toolIcon` (catalog `icon:` emoji fields remain as inert legacy data and are ignored by every renderer).
- **Persona pills** (Studio/AutoCAD/Rhino/Photoshop/SketchUp) — original line-art glyphs.
- **Document tabs + new-tab menu** — `docTypeIcon`, hydrated from `data-doc-icon` attributes.
- **Sidebar navigation + menu bar** — `navIcon` (25 entries).
- **Command palette (Ctrl+K)** — `commandIcon`.
- **Plan tool palette (static HTML)** — hydrated from `TOOL_ICON_BY_TOOL`.
- **Layer visibility/lock toggles** — dedicated `visible/hidden/lock/unlock` glyphs **with `aria-label`s**.
- **4-view quadrant pills, massing story chips** — typographic labels (no glyph needed).
- **Command bar** — history button, suggestion rows.

## Bundle-scope rule

The build concatenates all modules into ONE IIFE scope with imports stripped: **import aliases (`import { a as b }`) do not survive the bundle** — always import by the source export name. The icon function is exported as `icon` (not `svg as icon`) for exactly this reason. `tests/build-integrity.test.js` catches violations (this bit us once during development; the runtime smoke test flagged it immediately).

## Coverage

`tests/icon-system.test.js` (19 assertions): ≥80 glyphs, zero emoji in the registry, distinct semantics for unrelated tools, correct resolution order, aria-hidden, caching, and **every catalog tool id resolves** (no generic-fallback leaks).
