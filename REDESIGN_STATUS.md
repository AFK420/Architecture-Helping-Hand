# Architecture companion redesign — implementation status

The modular JavaScript application now has six primary sections plus Home: Project, Design Tools, CAD Tools, Documents, AI Assistant and Settings. Source remains in `src/`; `js/app.js` is regenerated. Existing worktree changes were preserved and extended.

## Removed

The Plan Canvas view, navigation, ribbon/palette containers, app state, shortcuts, drawing-tab actions, stairs/ramps placement, AI geometry-apply UI and Canvas-specific export sources are removed. `src/ui/views/plan.js` and `src/core/plan-canvas.js` are deleted. The retired `ghost-tools.test.js` and assertions depending solely on the removed view are retired. Generic geometry, entities, constraints, CAD serializers and their regression tests remain.

Old drawing documents and unknown project fields are preserved safely. Migration works on a clone of the saved snapshot, so opening old projects does not mutate the caller's original object. Drawing data is retained for compatibility and is not presented as a current editor.

## Changed

- One Dimensions navigation entry contains Quick, Schedule, Chain and Compare Scales. Safe expressions work in schedule inputs as well as existing expression/chain engines.
- All 215 original furniture records retain their IDs and dimensions. Existing domain packs are merged into a deduplicated 638-entry visible catalog with 11 categories, subcategories, tags and explicit unverified planning provenance.
- Furniture cards show recognizable simplified geometry and download actual 1:1 DXF/SVG in millimeters. Optional reference clearance uses a separate layer. No DWG claim is made.
- Normal AI settings use provider/key/default model, optional vision/image choices, automatic routing, model refresh and connection testing. Detailed capability, model, job and fallback controls remain in collapsed Advanced settings.
- Natural prompts select ideation, studio critic, brutal critic, jury, vision and project analysis deterministically. Manual routes override defaults; no silent retry or provider switching occurs.
- Imports are saved as project references; Survey copies verified room dimensions for external CAD. Brief/requirements remain editable; geometry-based compliance checks need external drawing evidence and are not represented as verified compliance.

## Added

Research has 17 optional sections, metadata, findings with evidence types, source links, images with attribution, reviewed AI drafts, source editing and bibliography projection. Site Analysis has 25 optional records with data, visuals, interpretation, design implications and sources. Concept links findings and site implications to drivers, statements, goals, constraints, relationships and narrative.

SVG helpers include north arrows, directional access/wind/noise relationships, SWOT, bubbles, recorded-value charts, timelines and view corridors, plus reusable legend/verified-scale helpers. The existing deterministic Sun Path remains available. Schematics disclose what they encode; charts use user-supplied values and units.

The report engine separates project data from document structure and layout. It provides a report and board template, five physical sizes, section/block composition, text/caption/image editing, physical preview, references, HTML download, real Chromium PDF export and an optional Vivliostyle adapter. See [REPORT_ENGINE.md](REPORT_ENGINE.md).

## Files added

| Area | Source files |
| --- | --- |
| Geometry and assets | `src/core/geometry-tools.js`, `furniture-taxonomy.js`, `furniture-assets.js`, `analysis-diagrams.js` |
| Project workflows | `src/core/research-workspace.js`, `site-analysis.js`, `concept.js`, `ai-intent.js` |
| Report layers | `src/core/reports/document-model.js`, `templates.js`, `pagination.js`, `src/services/report-renderer.js`, `scripts/report-server.js`, `tools/report-runtime/package.json` |
| UI and assistance | `src/ui/views/dimensions.js`, `research-sections.js`, `site-analyses.js`, `concept.js`, `reports.js`, `src/ui/components/workspace-ui.js`, `tool-help.js`, `src/services/research-assistant.js`, `css/companion.css` |
| Tests and docs | `tests/redesign.test.js`, `redesign.browser.test.js`, `report-pagination.browser.test.js`, `helpers/report-browser-runtime.js`, `REDESIGN_IMPLEMENTATION.md`, `REPORT_ENGINE.md`, this status report |

The previously untracked Phase A Research/Site/navigation modules are retained and integrated. They are not claimed as newly invented subsystems.

Important modified files: `index.html`, `src/ui/app.js`, `src/core/workspaces.js`, `project.js`, `dimension-workspace.js`, `furniture.js`, `tool-guides.js`, `shortcuts-manager.js`, `icons.js`, `src/services/store.js`, `commands.js`, `ai/job-router.js`, existing AI/Research/Site/import/survey/export/stair/ramp views, `scripts/build.js`, `package.json`, `sw.js`, UI/data/navigation tests and `README.md`.

## Validation

Baseline: 67 suites and 6,243 counted assertions passed. Final unit/regression verification: **67 of 67 suites, 6,063 counted assertions passed**. Build: **successful, 2,271.5 KB generated bundle**. Lint: **138 source files, zero errors and zero warnings**. Tests ran via the equivalent direct Node script entry points because npm is not on PATH in this environment. Obsolete Canvas UI assertions were removed; reusable math, geometry, parser, AI, storage and export suites were retained.

Real browser QA exercises all 28 navigation tools, four Dimensions tabs, saved research/source/site/concept data, furniture DXF download and natural lookup, simple AI defaults, preview, PDF download and reload. The report matrix covers both templates at all five sizes. A separate PDF-reader check confirmed actual page dimensions and the final table row in every exported document.

## Limitations and deferred features

- Live web/image research and map/GIS ingestion are not connected. Users supply references, excerpts, observations and images. AI does not fetch or verify sources.
- No provider API key was supplied for live AI inference testing. Routing, capability validation and failure behavior are tested; live provider/model availability still needs a user's connection test.
- Concept image generation is a routed integration point. Existing transports do not implement a working image-generation provider; failures are reported honestly. Manual image upload and attribution work in Research.
- Vivliostyle's real CLI path is not tested here. Chromium PDF output is tested. Direct PDF export requires the optional local renderer; static/file use keeps preview and HTML export.
- Furniture is simplified planning geometry with reference dimensions, not manufacturer models or jurisdictional certification.
- Very large images are bounded for local storage; save/quota errors are surfaced. No remote asset storage or collaborative editing is added.
- A1/A0, richer themes, arbitrary block dragging, GIS-derived overlays, internet image search, commercial print preflight and a TypeScript migration are intentionally deferred.

Recommended next phase: connect one real source-fetching provider and one image-generation transport, then validate their provenance and failure behavior with real project data. Expand GIS-derived diagrams and report typography only after that evidence flow is stable.

## Goal checklist

- [x] Plan Canvas removal and legacy compatibility
- [x] Dimensions consolidation
- [x] Tool guidance
- [x] Furniture restructuring
- [x] Furniture CAD download
- [x] AI simplification
- [x] Automatic AI routing
- [x] Research workspace
- [x] Research sources/citations
- [x] Site Analysis
- [~] SVG diagrams: working reusable foundation; GIS-derived overlays and richer solar diagrams remain deferred
- [x] Professional report engine with working Chromium adapter
- [x] Report and board PDF templates
- [x] Physical PDF preview/composer
- [x] Concept workspace foundation
- [x] Final navigation redesign
- [~] Real Vivliostyle deployment validation
- [~] Concept image-generation integration
- [ ] Live web/image/GIS providers
