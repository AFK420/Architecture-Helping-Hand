# Architecture Helping Hand

A personal architecture research, site-analysis, calculation, CAD-assistance and presentation companion. It complements AutoCAD, Rhino, SketchUp, QGIS and Google Earth.

## Start

Open `index.html` for offline calculations, project work, furniture downloads and report preview. Work is stored in the current browser; export project JSON to back it up. Use a local web server when browser restrictions prevent a feature.

For direct PDF export, follow [REPORT_ENGINE.md](REPORT_ENGINE.md) and run `npm run reports`. Open the local URL printed by the server. The optional report runtime is isolated from the dependency-free frontend.

## Workspaces

| Section | Workflow |
| --- | --- |
| Home | Project snapshot, recent tools and next steps |
| Project | Research, sources, Site Analysis, context, Sun Path, Survey, Concept, Brief & Requirements and saved projects |
| Design Tools | Scale, Dimensions, Furniture, stairs/ramps/slopes, references, scale detection/rescaling and area/volume |
| CAD Tools | CAD Clipboard, target-specific handoff, batch conversion and import review |
| Documents | Reports & Boards and utility exports |
| AI Assistant | Ask naturally; inspect the selected task, provider and model |
| Settings | AI provider/key/default models, with detailed routing in Advanced |

The internal drawing editor has been removed. Legacy drawing data is safely retained when loading old projects; professional drawing and modeling stay in external design applications.

## Dimensions

One Dimensions workspace contains Quick, Schedule, Chain and Compare Scales. The existing calculation engines and deterministic safe parser remain.

Schedule measurements accept expressions such as `2400 + 900`, `2.4m + 600mm`, `7' 6" + 2' 3"` and `(2.4m + 900mm) / 3`. Bare numbers use the selected input unit. Chain quick-add treats separate additions as sequential segments; expressions inside one segment evaluate as one measurement. CAD values stay at real size; print scale belongs in drawing layouts/viewports.

## Architectural Object Library

The catalog preserves the original records and domain packs, with 677 reference entries across 15 browsable collections. It presents 623 distinct plan symbols built from 97 reusable compositions; identical legacy footprints are grouped with their other names in More information. Search name, collection, use-case or tags: hospital bed, fire station locker, police interview, palm tree, luxury sofa or mall checkout.

Open **Edit Size** to change width, depth and height in millimeters, optionally preserving proportions. The preview updates live; **Reset Original** restores the reference dimensions. Resized DXF and SVG use those edited physical dimensions at 1:1. Drawing scale changes only the paper readout under More information. Sizes are temporary session instances and never modify catalog records. Optional reference clearance stays on its own layer. Published/manufacturer/local-standard verification remains necessary; new schematic defaults are labeled illustrative.

## Scale Converter

Choose **Real size → Drawing size** or **Drawing size → Real size**, enter a measurement and choose a scale. Results update live. A 5 m measurement at 1:50 becomes 100 mm on paper. The dropdown and four favorites cover everyday work; Advanced retains all presets, custom ratios, equivalents, formulas, graphic scale, history and scratchpad actions. Secondary global controls are under **More** in the top bar.

## Research → Site → Concept → Documents

1. Create a named project. Enable relevant Research sections.
2. Add sources with URLs, author/publisher, dates, excerpts, notes and verification status. Sources can be edited without breaking their IDs.
3. Write findings, distinguish sourced facts from user notes, AI interpretations and recommendations, and link source IDs.
4. Record site data, a visual, interpretation and design implication. Optional analyses cover access, solar context, wind, climate, noise, views, topography, SWOT and more.
5. Link findings and site implications to Concept drivers, then develop statements, goals, relationships and narrative.
6. Choose a report or board, select/reorder sections and blocks, edit document-specific text/captions/images, choose physical paper size, preview and export.

Research AI uses supplied evidence and returns drafts for review. It cannot fetch or verify websites. Images carry attribution and an explicit generated-image label where applicable. Maps and other external material can be supplied as images; live GIS and internet image search are not connected.

## AI setup

Choose a provider, save a key and a default model, then test the connection. Refresh models queries the chosen provider when supported. Keys are session-only by default; optional browser persistence and manual declarations remain in Advanced.

Natural requests route deterministically: concept ideas → ideation, design critique → studio critic, extremely critical → brutal critic, jury preparation → jury, image analysis → vision, whole-project analysis → project analysis. Explicit manual task/model assignments take precedence. Unsupported capability or provider errors are reported without silently switching providers.

Concept-image generation is an integration point; current transports do not provide working image generation. Ordinary deterministic tools work without AI.

## Help and shortcuts

Every registered tool has a plain opening explanation and a collapsed “How to use” guide grouped into Overview, Example, CAD workflow and technical notes. Press Ctrl+K for search/commands. Digits 1–6 open the six sections; 0 opens Home. C opens CAD Clipboard, B batch conversion, Q Quick Dimension, H the journal. Shortcuts remain editable.

Run `npm run qa:responsive` with the optional report/browser runtime configured to regenerate `qa-report.json` across the current navigation at seven viewport sizes. See [UX_OBJECT_LIBRARY_STATUS.md](UX_OBJECT_LIBRARY_STATUS.md) for the follow-up implementation details, geometry counts, validation and limitations.

## Develop and verify

Edit modules under `src/`, the HTML shell and CSS. Regenerate `js/app.js`; do not edit the bundle as source.

`npm test` — full dependency-free regression suite.

`npm run build` — regenerate the standalone bundle.

`npm run lint` — source lint.

`npm run test:browser` and `npm run test:reports` — optional Chromium/Edge workflow and pagination QA after installing/configuring the isolated runtime.

The equivalent direct Node commands are `node tests/run-all.js`, `node scripts/build.js` and `node scripts/lint.js`. Browser tests write ignored artifacts to `.report-test-artifacts/`.

See [REDESIGN_STATUS.md](REDESIGN_STATUS.md) for implementation coverage, file inventory, validation and deferred features, [REDESIGN_IMPLEMENTATION.md](REDESIGN_IMPLEMENTATION.md) for the initial audit map, and [REPORT_ENGINE.md](REPORT_ENGINE.md) for rendering architecture and setup. Older Canvas-era design documents are marked historical.
