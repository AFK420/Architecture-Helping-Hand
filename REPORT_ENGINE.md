# Research documents and PDF rendering

Project evidence, document structure and page layout are separate layers:

`project.research / site.study / concept` → `core/reports/document-model.js` → semantic HTML and CSS → shared physical-page pagination → renderer adapter → PDF.

The frontend remains dependency-free. `js/app.js` is generated from `src/` by `scripts/build.js`. Report preferences live in `project.reportComposer`; changing a report block does not overwrite its original research finding. Source IDs project into inline citations and an automatically collected bibliography.

## Templates and page sizes

The Minimal Architecture Report uses section pages, a cover, restrained typography, figures, evidence labels and references. The Architecture Analysis Board uses a 12-column grid with paired content and diagram areas. Both support A4 portrait/landscape, A3 portrait/landscape and A2 landscape using explicit millimeters.

The composer offers document type, template, paper size, section order and inclusion, block inclusion, text/caption/attribution editing, image replacement, added text blocks and page breaks. Its sandboxed HTML preview uses the same pagination function as Chromium PDF export. It is a controlled composer, with no freeform drawing surface.

Long text and quotes split across measured pages; table headers repeat while rows remain together. Figures retain SVG vectors. A block or table row that cannot fit returns an actionable error rather than silently clipping. Very long titles and captions should be reviewed in preview. Text split across pages keeps its content; rich inline typography is intentionally minimal.

## Run direct PDF export

Install the isolated optional runtime with Node/npm available:

```sh
npm install --prefix tools/report-runtime
node tools/report-runtime/node_modules/playwright/cli.js install chromium
npm run reports
```

Open `http://127.0.0.1:3510` and use Documents → Reports & Boards → Export PDF. An installed Microsoft Edge is also a supported Chromium launch fallback. Root application dependencies are unchanged.

Configuration:

| Environment variable | Purpose |
| --- | --- |
| `AHH_REPORT_PORT` | Local server port; default 3510 |
| `AHH_PLAYWRIGHT_MODULE` | Absolute path to an existing Playwright `index.mjs` |
| `AHH_CHROMIUM_PATH` | Absolute path to a Chromium executable |
| `AHH_PDF_RENDERER` | `chromium` by default; `vivliostyle` attempts that adapter first |
| `AHH_VIVLIOSTYLE_CLI_JS` | Optional absolute path to the Vivliostyle CLI JavaScript entry point |

The Vivliostyle adapter first measures and paginates the document with the shared Chromium layout, then serializes the finished pages without scripts or hidden source content. It invokes `build document.html -o document.pdf`; the official [CLI guide](https://docs.vivliostyle.org/en/cli/getting-started/) documents HTML input and PDF output. The current CLI guide requires Node 22.12 or newer. This implementation retains a separate CLI adapter and falls back to Chromium if it is unavailable. Actual Vivliostyle rendering has not been validated in this environment; Chromium rendering and the static-page handoff have.

Direct `file://` use supports preview and Download HTML. It reports that a renderer is required for PDF export. Static hosts can serve the calculations and workspaces but need a compatible `/api/reports/pdf` service for direct PDFs. The old utility Print action remains separate.

## Renderer boundary

`services/report-renderer.js` posts a validated document to `/api/reports/pdf` and verifies its content type and PDF signature. `scripts/report-server.js` binds to loopback, checks host/origin, bounds request size and concurrency, validates document structure, and disables network loads during Chromium rendering. Embedded PNG/JPEG/WebP images and generated SVG diagrams are supported; executable links and imported SVG image payloads are rejected.

No Python runtime is part of report generation. A bundled PDF reader was used only for QA of physical page dimensions and extracted text.

## Verification

```sh
npm test
npm run build
npm run lint
npm run test:browser
npm run test:reports
```

The first three commands need only Node. The two browser suites need the isolated runtime or `AHH_PLAYWRIGHT_MODULE` and Chromium/Edge. Browser QA starts and closes its own local server on port 3511; `AHH_REPORT_TEST_PORT` changes that test port. Screenshots, PDFs and the pagination matrix are written to ignored `.report-test-artifacts/`.

`tests/report-pagination.browser.test.js` checks both templates at all five sizes with long text, quotes, SVGs, sources and 95 table rows. It checks measured overflow, content preservation and PDF output. Future work includes image crop controls, typography themes, richer figure-ground/GIS diagrams, A1/A0, PDF accessibility and commercial print profiles.
