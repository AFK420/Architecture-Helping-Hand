# Current information architecture

Updated October 6, 2026. This replaces the obsolete nine-workspace proposal. Earlier implementation history remains available in Git.

`src/core/workspaces.js` is the source of truth for sidebar, landing pages, discovery, breadcrumbs, navigation commands and workspace shortcuts.

| Workspace | Purpose |
| --- | --- |
| 01 Project | Research, references, site analysis, sun path, concepts, projects and requirements |
| 02 Design Tools | Scale Converter, consolidated Dimensions, Object Library and architectural calculators |
| 03 CAD Tools | CAD clipboard, handoff, batch workflows and imports |
| 04 Documents | Reports & Boards and export |
| 05 AI Assistant | Project-aware assistance and reviewed drafts |
| 06 Settings | Simple defaults and optional advanced AI configuration |

Home remains the project and workflow entry point. Digits 1–6 open workspaces; 0 opens Home. Shortcuts remain configurable. Favorites and recents use the existing command registry.

Dimensions contains Calculator, Schedule, Chains and Multi-scale. These remain available without four separate primary navigation entries. The top bar keeps the project, navigation and More menu. More retains File, AI, search, quick dimensions, journal, scratchpad, themes, sound and help.

## Runtime contract

The app remains a vanilla JavaScript PWA. Views use the existing registry lifecycle. Changes belong in `src/`; `scripts/build.js` regenerates `js/app.js`. Its manifest lists modules once in dependency order. Build integrity and lint enforce this contract.

Projects use the existing versioned store and migration boundary. Removed editor fields in older projects are retained and safely ignored by the current UI. Shared geometry, constraints, export utilities and calculators remain available.

## Current tools and help

The registry exposes 28 live tools, plus Home. Every major tool has workflow guidance. A plain introduction explains purpose; How to use reveals Overview, Example, CAD workflow and technical notes.

Converter uses one direction UI projection and live calculations. Object Library supports editable physical sizes, CAD previews and real-size DXF/SVG. See [UX_OBJECT_LIBRARY_STATUS.md](UX_OBJECT_LIBRARY_STATUS.md) for the follow-up implementation and limitations.

## Validation

`scripts/qa-config.mjs` derives modes from the current registry. `scripts/qa-responsive.mjs` checks all live modes at seven phone, tablet and desktop sizes and regenerates `qa-report.json`. It also exercises the four Dimensions tabs, object resize/download, converter handoff and a modal.

Validation commands: `npm test`, `npm run build`, `npm run lint`, `npm run test:browser`, `npm run test:reports`, `npm run qa:responsive`.
