# Architecture companion redesign

## Audit and implementation map

The starting working tree already contains Phase A navigation, Research and Site edits. Preserve and extend them. Baseline: 67 suites / 6,243 assertions pass using `node tests/run-all.js` (npm is absent from PATH).

Source is `src/`, static shell is `index.html`, styles are `css/main.css`. `scripts/build.js` orders all modules into the generated `js/app.js`; manifest coverage, dependency order, bundle identity and boot are tested. All module names share one bundle scope.

| Area | Existing foundation | Change boundary |
|---|---|---|
| Navigation | `core/workspaces.js`, app sidebar/landing/palette | Fewer visible workspaces; Dimensions sub-workflows |
| Canvas | `ui/views/plan.js`, `core/plan-canvas.js`, app state/listeners, shortcuts, AI proposal actions | Remove interaction/UI; retain geometry serializers separately |
| Dimensions | workspace, expression, chains, multi-scale, quick-dimension | Reuse safe parser and calculation engines |
| Furniture | 215 records in `core/furniture.js`; richer object-library metadata; app card renderer | Preserve IDs/values; taxonomy/tags; honest source types; reusable CAD geometry |
| AI | provider manager → model catalog → job router; AI Studio/Control Center/drawer | Simple defaults + deterministic intent routing; Advanced retains manual routes |
| Storage | project v3, store migration chain, unknown-field preservation | Additive research/site/concept/document fields; legacy drawing data remains unused |
| Research/site | existing references/notes and site.study plus solar engine | Extend existing containers with structured evidence and analysis sections |
| Reports | reusable SVG/DXF export model, shared download service, legacy text printing | Separate document model, templates, physical page preview, renderer adapter |
| Help | `core/tool-guides.js`, tooltip component | Contextual collapsed workflow guides |
| Tests | 67 registered suites + UI/build contracts | Remove only obsolete interaction assertions; keep generic math/geometry/export/storage tests |

Implement serially: remove canvas → consolidate navigation/dimensions/help → furniture → AI → structured workspaces → diagrams/documents → validate. Professional CAD remains external. Research evidence and presentation stay separate. Server PDF rendering is optional; file:// calculations and downloads remain supported.
