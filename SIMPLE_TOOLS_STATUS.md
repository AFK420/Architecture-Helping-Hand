# Simple tools UX pass — 6 October 2026

The remaining calculators now use the same input → result → optional detail flow as the Scale Converter. This pass started from the latest pushed `main` (`f5c4e3`); the previous converter, object-library, resize and export work was preserved.

1. **Tools redesigned:** Change Drawing Scale, Find Drawing Scale, Area & Volume, Dimensions Quick/Schedule/Chain/Compare Scales, Stairs, Ramps, Slopes, CAD Clipboard, Send to CAD and Batch CAD. Reference Chart and Standards Explorer received search and wording cleanup.
2. **Intentionally preserved:** Scale Converter, Object Library and its 677 official objects/623 distinct geometries, Plan Canvas cleanup, Research, Sources, Site Analysis, Sun Path, Concept, Reports, AI routing and project persistence. Existing Project/Import/Survey/Export controls retain their behavior and receive the shared title/help cleanup.
3. **Shared patterns:** Compact title and one-sentence introduction, collapsed keyboard-accessible help, responsive input groups, calm result surface, consistent primary actions and native Advanced disclosure. Secondary formulas, history, diagrams, reference ranges, precision and handoff options remain available. No framework migration or new calculation subsystem.
4. **Terminology:** Rescaler → Change Drawing Scale; Detector → Find Drawing Scale; CAD Handoff → Send to CAD; payload → dimensions/preview; compliance-style verdicts → recorded reference comparisons. User-facing mode numbers are hidden. Area/volume input and result labels track direction.
5. **Engines touched:** None. Unit, scale, stair, ramp, slope, expression, geometry, DXF/SVG, report and research/site engines are unchanged. View/controller fixes clear invalid answers and dependent results, correct the ramp's run+slope answer to show solved rise, reconnect CAD Handoff change callbacks, avoid rounding small nonzero area results to zero, and invalidate an edited batch preview.
6. **Regression coverage:** `tests/simple-tools.browser.test.js` adds 90 browser checks covering known values, exact clipboard text, invalid inputs, Advanced toggles, schedule and chain exports, alternate slope/ramp inputs, all batch directions, CAD source/target/unit/format/precision controls and reference transfer. Run with `npm run test:simple-tools`; it uses the existing optional Playwright/Edge harness.
7. **Responsive QA:** `qa-report.json` records 336 layout checks, including 203 main mode/viewport checks and 91 Advanced checks, at 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080. Zero overflow/cut-off findings and zero browser errors. Nested reference options, four Dimensions tabs, object resize controls and the shortcuts dialog are included. Captures allow finite animations to settle, with a bounded wait for paused animations.
8. **Build:** Pass. The standalone `js/app.js` bundle was rebuilt, and the service-worker cache version was refreshed.
9. **Lint:** Pass across 150 source files: zero errors and zero warnings.
10. **Tests:** All 68 existing suites pass with 6,101 counted assertions. The tool browser suite passes 90 checks; the existing navigation/research/site/persistence/PDF browser suite passes; report pagination passes ten physical-size/template combinations with 95 table rows and long content. Existing resized DXF/SVG downloads remain verified by responsive QA.
11. **Limits:** CAD outputs were checked as clipboard text/downloads, not inside installed CAD applications. Recorded jurisdiction values are references requiring project verification. Batch preserves explicit list conversion and its existing modes; CAD application profiles are available through Send to CAD. Named batch tables support the existing TSV/name-value syntax; this pass does not add a new CSV import engine. Schedule references remain excluded from additive totals. Very wide tables scroll within their containers.
12. **Next step:** Validate the simplified workflows with a real project drawing/schedule and verify one known dimension after pasting into CAD.

## Requested checklist

- [x] Rescaler simplified
- [x] Scale Finder simplified
- [x] Area & Volume simplified
- [x] Dimensions Quick simplified
- [x] Dimensions Schedule simplified
- [x] Dimensions Chain simplified
- [x] Dimensions Compare Scales simplified
- [x] Stairs simplified
- [x] Ramps simplified
- [x] Slopes simplified
- [x] CAD Clipboard simplified
- [x] CAD Handoff simplified
- [x] Batch CAD simplified
- [x] Reference/Standards cleaned up
- [x] Technical jargon reduced
- [x] Default results standardized
- [x] Advanced disclosure used consistently
- [x] Live-calculation UX made consistent; explicit batch conversion retained
- [x] Responsive QA updated
- [x] Existing calculation tests still pass
- [x] Build passes
- [x] Lint passes
