# Architecture Map

**Phase:** Forensic audit (verified against runtime + code, September 7, 2026)
**Bundle:** `js/app.js` v2.3.3, deterministic build from `src/` via `scripts/build.js`

## 1. Bootstrap chain

```
index.html (4,953 lines: full static shell, all mode-view sections inline)
  └─ <script src="js/app.js?v=…">            (IIFE bundle, 2,080 KB)
       └─ initializeApp()                     (src/ui/app.js)
            ├─ dom map assembled (400+ getElementById)
            ├─ validateViewContext()          (fails loudly at boot)
            ├─ createViewRegistry() → views/*.mount() (26 views)
            ├─ AI services graph              (src/services/ai/*)
            │    createAiHttp → createTransports{gemini, openai-compat}
            │    → createProviderManager → createModelCatalog → createJobRouter
            │    (jobRouter = ONLY execution path; facts pack bound here)
            ├─ projectStore = createProjectStore()   (persistence)
            ├─ CommandRegistry (Ctrl+K palette, src/services/commands.js)
            └─ CAD engine session            (src/core/cad-commands.js)
```

**Bootstrap guard:** `tests/build-integrity.test.js` enforces manifest coverage,
byte-identical bundle, and a runtime smoke test against mocked DOM.

## 2. Module dependency direction

```
core/* (pure, zero DOM)
   ↑
services/* (storage, store, commands, audio, ai/*)
   ↑
ui/components/* (palette, ribbon, cpanels, commandbar, palette, ai-dropdown)
   ↑
ui/views/* (26 controllers; views never import each other — registry contract)
   ↑
ui/app.js (bootstrap, navigation, global keydown, command palette)
```

Violations to watch: none found — views receive a frozen `context` object.
**Bundle-scope rule:** imports are stripped by the build; every cross-module
name must match the source export exactly (aliased imports break the bundle —
caught historically by the smoke test).

## 3. State

| Store | Location | Persistence |
|---|---|---|
| App state | `state` (app.js closure) | none (session) |
| Project | `createProjectStore` → envelope `{version, project}` | localStorage `archiscale_project` |
| Library | separate key `archiscale_project_library` | localStorage |
| Tool prefs | `archiscale_plan_prefs` (tool/grid/snap/zoom) | localStorage |
| Shortcuts | `archiscale_custom_shortcuts` | localStorage (migrated, defaults-win dedupe) |
| AI keys | providerManager keyStore | session-only default; opt-in persistent |
| Command history | `ahh_command_history` / `ahh_command_recents` | localStorage (100 cap) |

Quota/private-mode: `StorageService.setItem` returns `false`; `writeEnvelope`
surfaces it — save failures are reported, never silent (fixed this pass).

## 4. Plan Canvas (primary workstation)

`src/ui/views/plan.js` (~7,200 lines) + `src/core/plan-canvas.js` + `entities.js`.

- Documents: `state.plan.documents[]` (2d_plan / 3d_massing / elevation /
  section / detail / sheet / view_4split), per-doc viewport, tabs with
  create/rename/close.
- Rendering: single-SVG, `renderScene()` (canvas only) vs `renderPanels()`
  (entity list, layers, schedule, inspector, contextual toolbar);
  `scheduleSceneRender()` coalesces via rAF + 60 ms fallback.
- Interaction: pointerdown→drag-create chains per tool; marquee box-select
  (overlay div, sync-updated); snap/alignment guides.
- Undo/redo: command objects with closure-stored before/after, 100-deep,
  cleared on document switch.

## 5. Commands

`src/core/cad-commands.js`: registry = 24 built-ins + 53 catalog aliases
(77 total). Interactive state machine (LINE/WALL/RECTANGLE/DIST/DIMLIN) with
options (`Width=`), coordinates via the shared parser (`10,20`, `@5,0`,
`@5<90`, `2400mm`, `8'`), autocomplete (prefix/alias/fuzzy + recents),
persistent history, did-you-mean errors. Legacy one-liners (`REC 6 4`,
`WALL 5`, `STAIR`, `HATCH`, `INSERT`) via `parseStudioCommand` fallback.
UI: `commandbar.js` (prompt state, upward suggestions, option chips, log).

## 6. Tools

65 catalog entries → palette (39 visible in Studio persona) + ribbon tabs +
flyouts. 21 declared `PLANNED_TOOLS` (dimmed, honest toast). Runtime health:
see `TOOL_HEALTH_MATRIX.md`.

## 7. Selection → Inspector → AI

`state.plan.selectedIds` → properties inspector (cpanels.js + plan.js info
panel) → `serializeSelection()` evidence packets (ai-bridge.js) → facts pack
(`project-context.js` `selectionPackets`) → AI Studio prompt. SUGGEST/INFO/
AI/ANALYZE commands + Ask-AI buttons bridge canvas → copilot.

## 8. AI / Providers

ProviderManager (keys, session/persistent, endpoint confirm on host change)
→ ModelCatalog → JobRouter (capability-based assignment; failures surface
`{ok:false, errorCode, message}`). Transports: Gemini (`x-goog-api-key`
header), OpenAI-compatible. Visual/image jobs return `{available:false}`
honestly when unconfigured. **No request verification possible without a
user key** — provider READY is untested by design in this audit.

## 9. Testing

56 test files, 54 registered in `run-all.js`, 4,749 assertions, all passing
at audit time. Coverage layers: unit (core math/engines), integration,
build-integrity (manifest/byte-identity/smoke), ui-contracts (static HTML/
CSS contracts), ghost-tool contract, custom-shortcuts migration, regression
(audit), command engine, icons, AI context. Browser QA: manual harness via
browser automation this pass + `scripts/qa_*.py` (Playwright).

## 10. Export / Import

Export Center (exportPlan → SVG/DXF/JSON/report via `src/core/export/`).
Import: DXF(2D ASCII)/SVG/CSV/TSV/native JSON with structured pre-import
report (`src/core/import/import-model.js`).

## 11. Known layout constraints (baseline, unfixed)

- `.tool-surface { max-width: 1480px; margin: 0 auto }` (main.css:728, :6310)
  → 23% flank waste at 1920×1080, 42% at 2560×1440.
- `.plan-svg-wrap { height: calc(100vh - 340px) }` → fixed-height guess;
  canvas does not flex-fill (115 px bottom gap measured at 1080p).
