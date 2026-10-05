> Historical implementation notes. The Canvas workflows below were retired in the companion redesign and are not current user features. Generic engines and legacy project data remain supported. See [README.md](README.md) and [REDESIGN_STATUS.md](REDESIGN_STATUS.md) for current workflows.

# Phase A — Information Architecture & Navigation Redesign (v2.7.0)

**Date:** September 11, 2026
**Scope:** Full UI/navigation audit + Phase A implementation (IA foundation, sidebar, top bar, routing, landing pages). Future phases (F–M) are deliberately not built here.

---

## 1. CURRENT — What exists (verified against code, not just docs)

### Architecture
- Vanilla-JS PWA. `index.html` (4,991 lines) holds the entire static shell and all 25 tool view sections (`#mode-view-<id>`).
- `src/` = 90+ ES modules; `scripts/build.js` concatenates them (imports stripped) into the single IIFE bundle `js/app.js` (~59k lines) that `index.html` loads. **All edits must go to `src/` + rebuild.**
- Views follow a registry contract (`src/ui/view-registry.js`): `createView*(context) → { id, mount, onModeEnter/Leave, getController }`. 26 views; views never import each other.
- State: app closure `state`; project via `createProjectStore` (localStorage, versioned migrations); shortcuts, command recents/favorites, tool prefs all persisted.
- QA hooks: `window.__ahhSwitchMode`, `__ahhState`, `__ahhViews` (used by `scripts/qa_*.py`).

### Navigation (the problem)
Four parallel, hand-maintained navigation systems:
1. `NAV_CATALOG` + `NAV_SECTIONS` + `SECTION_ICONS` in `src/ui/app.js` → drives the **sidebar** (8 sections × 25 tools, each item shows icon + label + *description*, permanently).
2. `renderMenuBar()` → a horizontal **ribbon dropdown bar** (`#app-menubar`) that duplicates the same 8 sections + a File menu + AI drawer trigger — a second competing navigation.
3. `DEFAULT_COMMANDS` in `src/services/commands.js` → hand-written `nav-*` command entries for the palette, duplicating labels/keywords/shortcuts.
4. `executeCommand()`'s giant `switch (cmd.id)` chain mapping `nav-*` ids to `switchMode(...)`.

Adding one tool today touches: `NAV_CATALOG`, `NAV_SECTIONS`, `SECTION_ICONS`, `switchMode` else-if chain, keydown digit chain, `DEFAULT_COMMANDS`, `registerCatalogCommands`, the `switch(cmd.id)` chain, `index.html`, the `NAV` icon map, and `ui-contracts.test.js` — the exact anti-pattern the redesign targets.

### Current tool inventory (25 screens)
| Section (old) | Tools |
|---|---|
| Home | Home dashboard |
| Scale | Scale Converter, Rescaler, Scale Finder, Area & Volume |
| Dimensions | Dimension Workspace (schedule), Dimension Expression, Multi-Scale, Dimension Chains |
| CAD | CAD Clipboard, Batch CAD, CAD Handoff |
| Architecture | Stair Calculator, Ramp Calculator, Slope Analyzer |
| Space | Furniture & Clearances (215 standards), Reference Chart |
| Project | Projects, Brief & Requirements, Plan Canvas, Survey Notebook, Importer, Export Center |
| AI | AI Studio, AI Control Center |

### Other verified facts
- Number keys 1–9/0 and letters C/B/Q/H jump directly to individual tools (mode-scoped ownership already protects the Plan Canvas).
- Command palette (Ctrl+K) has favorites/recents at the *command* level; sidebar has no favorites/recents.
- Top bar: sidebar toggle, single-level breadcrumb ("Helping Hand / <tool>"), search, quick-dim, journal, scratchpad, theme, sound, install, help.
- `src/core/icons.js`: original SVG stroke icon language with `navIcon()`/`commandIcon()` resolution maps.
- Docs (`ARCHITECTURE_MAP.md`, etc.) were accurate on bootstrap/modules/state; the "Known layout constraints" (max-width waste) predate later fixes and are not Phase A scope.

---

## 2. Audit verdicts

### KEEP (works, stays)
- All 25 tool views and their controllers — untouched. Every `mode-view-<id>` and `switchMode(id)` contract preserved (QA scripts depend on them).
- Command palette engine, favorites/recents storage (`CommandRegistry`), shortcuts manager + rebind/conflict logic, view registry, icon system, PWA/offline, themes, project store.
- Global keydown mode-scoped key ownership (plan canvas protection).
- Top bar global actions (search, quick-dim, journal, scratchpad, theme, sound, help, install).

### MOVE (re-homed, not rebuilt)
| Tool | Old section | New workspace |
|---|---|---|
| Scale Converter, Rescaler, Scale Finder, Area & Volume | Scale | **04 Dimensions** |
| Dimension Workspace, Expression, Multi-Scale, Chains | Dimensions | **04 Dimensions** |
| Reference Chart | Space | **04 Dimensions** (drafting-scale reference) |
| CAD Clipboard, Batch CAD, CAD Handoff | CAD | **05 CAD** |
| Stairs, Ramps, Slopes | Architecture | **06 Architecture** |
| Furniture & Clearances | Space | **07 Space** |
| Plan Canvas | Project | **07 Space** (spatial planning surface) |
| Survey Notebook | Project | **02 Site Analysis** (field measurement/calibration) |
| Projects, Brief & Requirements, Importer, Export Center | Project | **08 Project** (the container) |
| AI Studio, AI Control Center | AI | **09 AI Assistant** |
| File-menu commands (menubar) | Ribbon | Top bar compact **File** menu |
| AI drawer trigger | Ribbon | Top bar **AI** button (Ctrl+Space unchanged) |

### MERGE
- Sidebar + palette navigation sources → one registry (`src/core/workspaces.js`). Palette nav commands, sidebar, breadcrumbs, digit keys all derive from it.
- Command-level favorites/recents (palette) and the new tool-level favorites/recents (sidebar/landing) → same `CommandRegistry` storage, one list everywhere.

### REBUILD
- Sidebar → workspace-first: Home + 9 numbered primary workspaces; the *active* workspace expands its tool list (secondary nav appears only when relevant); no per-item descriptions (tooltips + landing pages instead); collapsible icon rail; Favorites/Recent sections.
- Top bar → one hierarchy only: sidebar toggle, breadcrumb (root / workspace / tool), project chip, compact File menu, AI button, global actions. The `#app-menubar` ribbon is **removed** (it duplicated the sidebar).
- Home → workflow orientation: project snapshot + the 9-step studio workflow (Research → … → Export) + AI status.
- Digit keys 1–9 → open the 9 workspaces (0 = Home); rebindable via the shortcuts manager; Plan Canvas key ownership unchanged.

### REMOVE
- `#app-menubar` ribbon + `renderMenuBar()` + `closeAllMenuBarDropdowns()` (actions preserved in top bar File menu).
- `NAV_CATALOG`/`NAV_SECTIONS`/`SECTION_ICONS` (replaced by the registry).
- `executeCommand()`'s nav case chain (registry-resolved).
- Per-item sidebar descriptions (visual noise).
- Dead key handlers duplicated by the shortcuts manager (c/b/q/h letters).

### NEW (foundation only — no fake features)
- `src/core/workspaces.js`: scalable registry — 9 workspaces, tool metadata (workspace, keywords, aliases, buildingTypes, icon, shortcut), planned-tools lists with honest phase badges, workflow prev/next.
- One dynamic **workspace landing page** (`#mode-view-landing`): purpose, tools grid with descriptions, quick actions, workflow position (prev/next), recent/favorite tools.
- Workspaces **Research (01)**, **Site Analysis (02)**, **Concept (03)** — created as real workspaces with landing pages that state honestly which tools ship in Phases F/G/I (planned entries are marked and toast honestly; nothing fake).
- Breadcrumb + project chip in top bar; `window.__ahhOpenWorkspace` QA hook.
- Tool-level favorites (star on landing cards, shared with palette) and Recent in the sidebar.

---

## 3. OLD → NEW mapping (complete)

Sidebar sections → workspaces:
`Home → Home` · `Scale → Dimensions` · `Dimensions → Dimensions` · `CAD → CAD` · `Architecture → Architecture` · `Space → Space (Furniture, Plan) + Dimensions (Reference)` · `Project → Project (except Survey→Site, Plan→Space)` · `AI → AI Assistant`.

New sidebar (single hierarchy):
```
⌂  Home
01 Research        (foundation; tools: Phase F)
02 Site Analysis   tools: Survey Notebook  (rest: Phase G)
03 Concept         (foundation; tools: Phase I)
04 Dimensions      tools: Scale Converter · Rescaler · Scale Finder · Area & Volume ·
                    Dimension Workspace · Expression · Multi-Scale · Chains · Reference Chart
05 CAD             tools: CAD Clipboard · Batch CAD · CAD Handoff  (asset library: Phase J)
06 Architecture    tools: Stairs · Ramps · Slopes  (more calculators: Phase L)
07 Space           tools: Plan Canvas · Furniture & Clearances  (program/adjacency: Phase L)
08 Project         tools: Projects · Brief & Requirements · Importer · Export Center
09 AI Assistant    tools: AI Studio · AI Control Center
Favorites / Recent (tool-level)
```

---

## 4. Files modified

| File | Change |
|---|---|
| `src/core/workspaces.js` | **NEW** — registry (single source of truth) |
| `src/core/icons.js` | 7 new original workspace glyphs + NAV/COMMANDS map additions |
| `src/core/shortcuts-manager.js` | 10 rebindable workspace shortcuts (1–9, 0) |
| `src/services/commands.js` | Stale digit shortcuts nulled on tool nav commands |
| `src/ui/app.js` | Nav rewrite: registry-driven sidebar/landing/breadcrumbs/palette registration/executeCommand/keydown; `openWorkspace()`; File menu + AI button wiring; removed menubar + catalog + case chains |
| `index.html` | Top bar restructure, menubar removed, landing section, Home workflow card, version bumps |
| `css/main.css` | Workspace sidebar, rail collapse, breadcrumb, landing, home workflow styles; dead menubar bar rules removed |
| `scripts/build.js` | `Workspaces` module added to manifest |
| `tests/workspaces.test.js` | **NEW** — registry integrity contract |
| `tests/ui-contracts.test.js` | Shell contract re-pinned to the new IA |
| `tests/run-all.js` | registers the new suite |
| `sw.js`, `package.json` | v2.7.0 cache/version bumps |
| `IA_PHASE_A.md` | this document (audit + final report) |

---

## 5. Risks & mitigations

- **Bundle-scope collisions** (build concatenates modules into one IIFE): new module names checked against every existing module (`WORKSPACES`, `NAV_TOOLS`, `WORKSPACE_PLANNED_TOOLS`, `WORKSPACE_ORDER` are unused elsewhere). Lint + build-integrity tests enforce.
- **QA-script breakage**: `__ahhSwitchMode('<toolId>')` and all 25 mode ids preserved verbatim. `__ahhOpenWorkspace` added.
- **Muscle-memory change** (digits now open workspaces, not tools): shortcuts are rebindable and documented in the shortcuts modal; Plan Canvas digit ownership unchanged.
- **Test pins**: `ui-contracts`/`responsive` pins updated deliberately to pin the *new* contract; all other suites untouched.
- **Storage**: no schema changes; only a new preference key `archi_last_workspace`.

---

## 6. Implementation plan (Phase A, executed)

1. Registry module (`workspaces.js`) — data foundation.
2. Icons + shortcuts + command-service adjustments.
3. `app.js` navigation rewrite (sidebar, landing, breadcrumbs, palette, keys).
4. `index.html` shell restructure; CSS.
5. Build manifest, tests, version bumps.
6. `node scripts/build.js` → `npm run lint` → `npm test` → browser QA.

*(The final Phase A report — COMPLETED / MOVED / PRESERVED / NEW FOUNDATION / REMAINING / NEXT PHASE — is appended at the bottom of this document after validation.)*

---
---

# PHASE A — FINAL REPORT (after validation)

**Validation:** `node scripts/build.js` ✅ · `node scripts/lint.js` 0 errors ✅ · `npm test` **5,605 assertions, 0 failures** (60 suites, incl. new `tests/workspaces.test.js` with 255 assertions) ✅ · Live browser QA on `http://127.0.0.1:3578/` ✅ (all flows listed below).

## COMPLETED

1. **Workspace & Tool Registry** (`src/core/workspaces.js`) — the single source of truth. 9 primary workspaces in workflow order with mission statements, tools with keywords/aliases, honest `planned[]` lists with phase letters (F–M), workflow neighbors, landing quick-actions, and search helpers (`searchTools`, `searchPlannedTools`).
2. **Sidebar redesign** — Home + the 9 numbered workspaces; the active workspace's tools appear as secondary navigation ( Favorites/Recent sections below. Three-state Ctrl+B cycle: expanded → icon rail (labels hidden, tooltips carry them) → hidden.
3. **Top bar redesign** — ONE navigation hierarchy. The duplicate 8-section menubar ribbon was removed. The top bar now holds: sidebar toggle, breadcrumb (Helping Hand / *workspace* / *tool*), project chip (click → Project workspace), compact classic **File** menu (New Tab / Save / Open Project / Export / Export SVG / Shortcuts), the omnipresent **AI** drawer button (Ctrl+Space), search, quick-dim, journal, scratchpad, theme, sound, install, help.
4. **Workspace landing pages** (one dynamic `#mode-view-landing`) — purpose/mission hero, live tool tiles with favorite stars, quick actions, recent-in-workspace, honest planned-tools with phase badges, and prev/next workflow guidance (guidance, not a wizard).
5. **Home rework** — project snapshot + the 9-step STUDIO WORKFLOW card (numbered, "guidance · jump anywhere") + AI status.
6. **Command palette** — now registers workspace-level commands (`nav-ws-*`) plus registry-derived tool commands; both verified by search ("site analysis" → workspace + Survey; "stairs" → Stair Calculator).
7. **Shortcuts** — digits 1–9 open the workspaces in workflow order, 0 = Home, all rebindable in the shortcuts manager (new `workspaces` category shown in the modal). Plan Canvas key ownership (W/R/F/digits) is untouched.
8. **Icons** — 7 new original SVG workspace glyphs (research, site, concept, dimensions, cad, architecture, space, project) wired into `navIcon`/`commandIcon`.

## MOVED (old section → new workspace)

- Scale → **Dimensions** (Converter, Rescaler, Scale Finder, Area & Volume)
- Dimensions → **Dimensions** (Workspace, Expression, Multi-Scale, Chains)
- Space/Reference Chart → **Dimensions** (drafting-scale reference)
- CAD → **CAD** (Clipboard, Batch, Handoff)
- Architecture → **Architecture** (Stairs, Ramps, Slopes)
- Space → **Space** (Furniture & Clearances, **Plan Canvas**)
- Project/Survey → **Site Analysis**
- Project → **Project** (Projects, Brief & Requirements, Importer, Export Center)
- AI → **AI Assistant** (AI Studio, AI Control Center)

## PRESERVED (verified unchanged in live browser QA)

- **All 25 tool screens switch and render correctly** (each `mode-view-*` activated and verified). `window.__ahhSwitchMode` and all tool ids kept — the Python QA scripts keep working.
- Calculation engines, compliance scorecards, plan canvas + 3D massing, import/export centers, AI providers/jobs, PWA/offline, themes, sounds, history journal, scratchpad, quick-dimension strip — untouched.
- Command palette utilities, favorites/recents engine (`CommandRegistry`), shortcuts rebinding, view registry architecture.

## NEW FOUNDATION

- `src/core/workspaces.js` + `tests/workspaces.test.js` (registry integrity contract: view containers, icon resolution, unique tool placement, full legacy coverage, honest planned phases, action validity).
- **Adding a tool later = one registry entry + view + icon.** Sidebar, landing page, palette command, breadcrumb, and search all derive automatically.
- Workspaces Research/Site/Concept exist as first-class navigation targets with honest landing pages — Phases F/G/I fill them with real tools without any navigation rework.
- `window.__ahhOpenWorkspace` QA hook (complements `__ahhSwitchMode`).
- Tool-level favorites (star on landing tiles, shared with palette favorites) and sidebar Recents (persisted in localStorage).

## REMAINING (intentionally NOT in Phase A)

- Research tools (Phase F), Site Analysis dashboard + environmental analyses (Phase G), QGIS/Google Earth bridges (Phase H), Concept Mind Storming (Phase I), asset/furniture library (Phase J), downloadable CAD assets (Phase K), deeper Architecture/Space workflow (Phase L), contextual AI actions (Phase M). All are represented honestly as planned entries with phase badges — nothing faked.
- Scale Converter step-flow redesign (STEP 9 of the brief) — the tool itself is untouched and functional; its internal UX redesign belongs to a later pass alongside the other tool surfaces.
- Lazy-loading/code splitting (STEP 19): the registry carries `lazyLoad`-ready structure, but the single-bundle architecture is retained this phase.

## NEXT PHASE

**Phase B → F:** With navigation stable, the highest-value next step from the brief's own ordering is **Phase F (Research workspace)** — the first empty foundation to receive real tools — followed by **Phase G (Site Analysis)**. Phase B visual-system polish can proceed independently since the design tokens are untouched.

**Inspect before next phase:** `src/core/workspaces.js` (add tools to `research.tools`), `src/ui/views/` (new view modules follow the `createView*(context)` contract), `scripts/build.js` (register new modules in `BUNDLE_MODULES`), `src/core/icons.js` (add glyphs + NAV map entry), and `tests/workspaces.test.js` (extend `legacyToolIds` when adding tools).

## Browser QA evidence

Verified live (GUI black-box through the app's own entry points; DOM-state assertions):
boot + sidebar render · Dimensions landing (9 tools, quick actions, workflow row) · landing→tool (breadcrumb "Dimensions / Scale Converter") · sidebar secondary tools follow the active workspace · favorites star → Favorites section · sidebar search "survey" / "stairs" / "sun" · palette workspace + tool commands and execution · File menu open/navigate · project chip → Project workspace · all 26 screens switch correctly · sidebar expanded→rail→hidden cycle.
Two real bugs were found and fixed during QA (sidebar not re-rendering its secondary tool list on workspace change; workspace search not matching tool keywords/aliases). Evidence screenshots captured to session artifacts; the IAB guest blocked synthetic keyboard/click injection, so keyboard flows were verified via the shortcuts manager contract tests instead.

---

# PHASE F — RESEARCH WORKSPACE (v2.7.1)

**Date:** September 12, 2026 · **Scope:** the first empty foundation workspace receives real, functional tools. No fake data — every value shown comes from a live engine.

**Validation:** `build` ✅ · `lint` 0 errors ✅ · `npm test` **5,722 assertions, 0 failures** (new `tests/research.test.js`: 98 assertions; `workspaces.test.js` grew to 274) ✅ · Live browser QA ✅ · `build --check` in sync ✅

## COMPLETED — three real Research tools

1. **Research Dashboard** (`research_dashboard`)
   - Project context: building type + site from the live brief, honest "missing" hints when unset
   - Live counters: references · research notes · decisions · categories covered (x/8)
   - **Quick Research Note composer** — observation + topic + source provenance, saved into the project (Ctrl+Enter submit); notes list with copy/delete
   - **Coverage by category** — 8 chips (Precedent, Case Study, Material, Standard/Code, Building Type, Site/Context, Article/Book, Other), covered vs. empty
   - **Starter pack curator** — 8 canonical works (Villa Savoye, Exeter Library, Salk Institute, Neufert, …) each with a takeaway; one-click add, clearly marked "CURATE — NOTHING AUTO-ADDED"
   - Decisions log surfaced as research context

2. **References Library** (`research_library`)
   - Full add form: title, category, architect, year, location, URL (scheme-validated), summary, project-specific **takeaway**, comma tags
   - Search (multi-token AND-match over title/summary/takeaway/architect/location/tags), category pills, tag pills derived from live data
   - Reference cards with clickable URLs, takeaway highlights, tag chips, one-click **citation copy**, delete, and **Export as Markdown**
   - Verified in browser: add → search "mosque" (1 of 2 shown) → category filter (Article/Book) → counts update

3. **Standards Explorer** (`standards_explorer`)
   - Reads the **live building-codes engine** (`src/core/building-codes.js`) — 7 jurisdictions (Jordan JNBC, Saudi SBC, Dubai DBC, Egypt EBC, Gulf GBC, IBC/ADA, UK Part K/M)
   - Stairs (7 rules) / Ramps (7 rules) / Pedestrian Slopes (2 rules) with numeric limits AND legal citations (e.g. JNBC كود رقم 22 بند 4-3)
   - "Enforce in calculator →" buttons jump to the Stairs/Ramps/Slopes tools that apply the same values at runtime; export as Markdown
   - Contract-tested: no hardcoded copies of code values in the view

## Architecture added

- **`src/core/research.js`** — pure domain model: `createReference` (validation + URL scheme check + tag normalization), `createResearchNote` (provenance), `ensureResearchContainer` (defensive enrichment — no schema migration needed: v3 projects gain an optional `research` field), `filterReferences`, `collectReferenceTags`, `researchSnapshot`, frozen 8-category list, frozen starter pack.
- Storage: `project.research.{references, notes}` through the existing `projectStore.updateProject` (mutator-returns-draft contract).
- Registry: 3 tool entries + 3 landing quick-actions added to `workspaces.js`; icons `research_dashboard`/`research_library`/`standards` added to the SVG icon language.
- No new global navigation items — everything lives under **01 Research**, per the Phase A architecture.

## Bugs found in live QA (both fixed)

1. **Mutator contract violation** — my `mutate()` helpers didn't `return draft`, so every save was refused by `updateProject` validation ("mutator must return the next project document"). The starter-reference test caught it.
2. **Stale boot-time `dom` references** — the note composer reads `dom.researchNoteInput`, captured at boot before the dynamic view rendered (null). Fixed to read live by id.

One environment note: the PWA service worker again served a stale bundle mid-QA; cleared caches as part of test prep. Same caveat as Phase A: after pulling this change, hard-refresh once.

## REMAINING (next phases)

- Research planned entries now honestly reduced to: **Climate & Context Research (G+)** and **AI-assisted precedent comparison (M)** — the F-phase items shipped.
- **Phase G — Site Analysis** is next: location/climate context (the Research Dashboard's site hooks are ready to feed it), then **Phase H** QGIS/Google Earth bridges, **Phase I** Concept Mind Storming.

**Files to inspect before Phase G:** `src/core/workspaces.js` (site tools), `src/core/survey.js` + `src/ui/views/survey.js` (existing field-measurement patterns to extend), `src/core/research.js` (site/context reference category already exists), `src/services/store.js` (same updateProject contract).
