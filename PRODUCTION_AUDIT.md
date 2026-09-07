# Production Audit — Architecture Helping Hand

**Date:** September 7, 2026
**Scope:** Full-repository audit — correctness, security, runtime behavior, data/API, performance, UI/UX, accessibility, infrastructure, and production readiness.
**Method:** Four independent deep-audit passes (security, core-math correctness, runtime behavior, infrastructure) followed by verification of every finding against source, targeted fixes, a new 30-assertion regression suite, a full test run, and a live in-browser smoke test.

---

## Executive Summary

The codebase is in unusually good shape for a zero-dependency vanilla-JS SPA: a disciplined `src/` → `scripts/build.js` → `js/app.js` bundle pipeline guarded by integrity tests, no `eval`/`new Function`, no external CDN dependencies, consistent HTML-escaping conventions, and a 49-suite test harness (now 50).

However, the audit found **four confirmed P1 defects** — including a building-code compliance inspector that could never fail (NaN silently reported "Full Compliance") and silent data loss on localStorage quota errors — plus a set of P2/P3 defects in parsing, shortcuts, zoning math, and infrastructure. All P0/P1 findings and most P2s were fixed and pinned by regression tests. The full suite now stands at **50 suites / 4,613 assertions, all passing**, and the two compliance-inspector fixes were verified live in the browser.

**Production-readiness assessment: Conditionally ready** — appropriate to ship for its stated educational/design-assistance purpose; see the caveats in `PRODUCTION_READINESS.md`.

---

## Repository Overview

- **Stack:** Vanilla JavaScript (ES modules), single-page app. No backend. AI features are BYOK (bring-your-own-key) calls from the browser to Gemini / OpenAI-compatible providers.
- **Architecture:** `src/core` (pure math/engines), `src/services` (storage, store, history, commands, AI transports), `src/ui` (views/components), `src/ai` (orchestrator, providers, context). Deterministic zero-dependency build concatenates `src/` into `js/app.js`; `tests/build-integrity.test.js` enforces manifest coverage, byte-identity, and a runtime smoke test.
- **Verification:** `npm test` (50 suites), `npm run build`, `node scripts/build.js --check`, plus Python Playwright QA scripts under `scripts/`.

---

## Bugs Found and Fixed

### P1 — Critical

| ID | File | Problem | Root cause | Fix | Verification |
|----|------|---------|-----------|-----|--------------|
| A1 | `src/core/building-codes.js:329` | `inspectStairCompliance()` read `geom.riserHeightMeters` / `treadDepthMeters` / `blondelMeters`, which `calculateStair()` never produces → `NaN`; every `NaN > max` comparison is false, so **an illegal 250 mm riser reported "Full Compliance"** | Inspector written against a hand-fabricated fixture shape; tests used the same fabricated shape, so the mismatch was invisible | Read `risers.heightMeters` / `treads.depthMeters` / `proportion.twoRPlusTMeters` (legacy flat aliases still accepted); return an explicit `warn` scorecard when riser/tread are non-finite | New regression tests A1 + **live browser check**: 250 mm riser now renders "VIOLATION" with `250 mm` |
| A2 | `src/core/building-codes.js:480` | `inspectRampCompliance()` read `geom.ratio`; the engine produces `ratioValue` → slope check rendered `1 : NaN` | Same fixture-drift pattern as A1 | Read `ratioValue` (legacy alias accepted); `warn` when slope is non-finite | Regression tests A2; ramps view renders no NaN |
| A3 | `src/services/storage.js` / `src/services/store.js` | `StorageService.setItem` swallowed quota/private-mode errors into the in-memory fallback; `writeEnvelope()` relies on exceptions to detect failure → **"Project saved" reported while nothing persisted; all edits lost on reload** | Contract mismatch: adapter signals failure by returning, not throwing | `setItem` returns `false` only when localStorage exists but the write failed; `writeEnvelope` treats `=== false` as failure | Regression tests A3 (mock non-persisting adapter → `saveProject` reports failure) |
| A4 | `src/ui/views/plan.js` | Undo history is module-level and shared across plan documents; `switchDocument()` never cleared it → Ctrl+Z after a document switch mutated the **hidden** document's entities | Commands close over entity objects of the previous document | `history.clear()` on document switch (conservative root-cause fix; per-document stacks would be a larger refactor) | Code-verified against command closures; manual path review |

### P2 — High/Medium

| ID | File | Problem | Fix |
|----|------|---------|-----|
| A5 | `src/core/parser.js:41` | Comma stripping destroyed decimal-comma input: `"1,5"` parsed as **15** (silent 10× error) with `isValid: true` | `normalizeDecimalCommas()`: `"1,5"`/`"2,40 m"` → decimal; `"1,234"`/`"1,234 mm"` → thousands; `"1.234,5"` → European mixed. Ambiguous exactly-3-digit groups follow the English convention (documented) |
| A6 | `src/ui/views/ramps.js:261` | Jurisdiction ramp limits read nonexistent code fields (`maxRisePerRunMm` etc.), so **every jurisdiction silently used the same generic 750/1200/1500 defaults** (e.g. Dubai's 1800 mm landing never applied) | Read the real `BUILDING_CODES` fields (`maxRunRiseMeters`, `minLandingWidthMm`, `minLandingLengthMm`) |
| A7 | `src/core/ramps.js:532` | `calculateMultiSegmentRamp()` had zero validation; `slopePercent = 0` propagated `Infinity` through all footprints | Typed `INVALID_RISE` / `INVALID_SLOPE` throws matching the module's error-code convention; view degrades gracefully |
| A8 | `src/core/zoning-schedule.js` | Floor totals summed **display-rounded** per-room areas (60 rooms × 3.33 m² → 199.98 m² instead of 200 m²) | Sum raw `roomArea()` for net area, circulation area, and zoning breakdown; round only for display |
| A9 | `src/core/multi-scale.js:184` | `calculateAtScale(..., drawingUnit:'ft_in')`: `UNITS.ft_in` doesn't exist, so `drawingValue` silently fell back to **millimeters** while `drawingUnit` claimed `'ft_in'` — a 25.4× consumer error in the raw-export path | Fall back to `UNITS.in` (the base of ft-in formatting) |
| A10 | `src/core/shortcuts-manager.js:63` | `Shift+M` normalized to bare `m` (uppercase letter loses its modifier) → recorded shortcut hijacked the plain key | Include `shift` for uppercase single letters; shifted punctuation unchanged |
| A11 | `src/core/shortcuts-manager.js:217` | Conflict check only rejected same-category duplicates; no handler stops propagation, so a cross-category duplicate fired **two actions on one keypress** | Reject duplicates against any binding (defaults verified unique first; `forceBindShortcut` takeover path already compatible) |
| A12 | `src/ui/app.js:1885` | `populateUnitSelects()` else-branch dereferenced the null element that selected it — latent boot crash if the `#areavol-input-unit` id ever disappeared | Dead branch removed; output select guarded |
| A13 | `src/ui/app.js:6108` | Esc closed the history drawer and then fell through to clear the workspace selection / blur focus — two actions per keypress | Early return after closing the drawer |
| A14 | `src/ui/components/ai-dropdown.js:193` | Ctrl+Space toggled the AI drawer with no input-focus guard (Ctrl+Space is an IME toggle on Windows) | Skip while focus is in an input/textarea/select/contenteditable |
| A15 | `src/services/ai/transports/gemini.js` | Gemini API key transmitted in the URL query string (leaks into logs/history/telemetry) | Moved to the `x-goog-api-key` header on all four request sites; test updated to assert the key never appears in the URL |

### Security hardening (P3, defense-in-depth)

| ID | File | Issue | Fix |
|----|------|-------|-----|
| S1 | `src/ui/app.js:1250` | Context-strip pills interpolated `k`/`v` unescaped (all current callers pass internal numbers, but any future user-derived caller becomes an XSS sink) | `escapeHtml()` applied |
| S2 | `src/ui/components/palette.js:102` | User-typed search query echoed unescaped into `innerHTML` (self-XSS) | Escaped |
| S3 | `src/ui/views/projects.js:72` | Project `id` from localStorage interpolated raw into attributes/text | Escaped (attribute values decode correctly for `dataset` lookups) |

### Accessibility & UX

| ID | File | Issue | Fix |
|----|------|-------|-----|
| A16 | `index.html` | No skip link — keyboard users tab through the whole quick-dim strip and sidebar chrome before `<main>` | `<a class="skip-link" href="#tool-surface">` + CSS (Section 21 of `main.css`); verified present in the live DOM |
| A17 | `index.html:65` | Emoji icon buttons relied on `title` only (unreliably announced) | `aria-label` added to pin/close buttons; verified in the live DOM |

### Infrastructure

| ID | File | Issue | Fix |
|----|------|-------|-----|
| I1 | `package.json` | Version 2.0.0 vs sw/index/README 2.2.0 (cache-bust discipline depends on version awareness) | Bumped to 2.2.0 |
| I2 | *(none)* | **No CI at all** — 49 test suites existed but nothing ran them on push/PR | Added `.github/workflows/ci.yml` (npm test + build + `--check` on Node 20) |
| I3 | `sw.js:34` | Install swallowed precache failure and skipped waiting anyway → partial offline cache advertised as working | Precache failure now aborts install so the previous good SW/cache keeps serving |
| I4 | `js/audio.js` + 4 siblings | 32 KB of legacy pre-modular files, referenced by neither `index.html` nor the SW precache, shipped in the deploy directory | Deleted (superseded by bundle modules `Presets`, `Audio`, `History`, `ViewConverter`, `ViewHistory` — verified unreferenced) |
| I5 | `css/main.css` | Skip-link styles (companion to A16) | Appended Section 21 |

---

## Security Assessment

- **Clean:** no `eval`/`new Function` anywhere in `src/`; no external/CDN scripts; no committed secrets (grep-verified across `server.log`, `qa-*.json`, `scratch/`, docs); import pipelines (CSV/DXF/SVG) escape all untrusted text at render; AI responses are escaped at every render site; `store.js` validates envelope shape and skips corrupted entries; no unguarded recursive assignment of parsed JSON (prototype-pollution surface clean); service worker restricts cache writes to same-origin 200s and bypasses AI hosts.
- **By-design, documented:** persistent BYOK keys in localStorage (opt-in, default is session-only); editable AI endpoints mean a social-engineered endpoint could receive the stored key (https-only enforced; host allowlisting recommended as future work).
- **Fixed this pass:** key-in-URL (A15), three escaping sinks (S1–S3).

---

## Tests Added

`tests/audit-regressions.test.js` (registered in `tests/run-all.js`) — 30 assertions pinning A1–A11:

- A1/A2: compliance inspectors run against **real** `calculateStair()`/`calculateRamp()` output; illegal riser fails, legal stair passes, no NaN in rendered values.
- A3: non-persisting storage adapter → `saveProject` returns failure.
- A4: decimal-comma, thousands, European-mixed, feet-inches, numeric passthrough.
- A5: 60-room floor totals exact.
- A6: `ft_in` drawingValue is inches.
- A7: multi-segment ramp rejects zero rise/slope with typed errors; valid inputs finite.
- A8: Shift+letter normalization; punctuation unchanged.
- A9: cross-category conflict rejected; `resetAllShortcuts` restores defaults.

**Existing suite updated:** `tests/ai-providers.test.js` now asserts the Gemini key is sent via header and never appears in the URL.

---

## Verification (actual commands and results)

| Command | Result |
|---------|--------|
| `npm test` (baseline, before changes) | 49/49 suites, 4,583 assertions — all pass |
| `npm test` (after changes) | **50/50 suites, 4,613 assertions — all pass** |
| `npm run build` | Bundle rebuilt (1,976.8 KB) |
| `node scripts/build.js --check` | Bundle in sync with `src/` |
| `node tests/audit-regressions.test.js` | 30 passed, 0 failed |
| Live browser (in-app browser against `npx serve`) | App boots; skip link, `aria-label`s, unit-select population verified in DOM; **illegal 250 mm riser now renders "VIOLATION · Non-Compliant" with real values** (previously "NaN mm / Full Compliance"); no `NaN` in stairs or ramps views |
| Diff review | Full `git diff` of `src/` reviewed line-by-line post-fix (hostile-review pass); one introduced-then-caught issue (bare `return` skipping three later render blocks in `ramps.js`) restructured to if/else before commit |

---

## Remaining Issues (not fixed, documented honestly)

1. **Plan canvas re-renders on every pointermove** (`src/ui/views/plan.js` `onPointerMove` → full `render()` rebuilding the SVG plus four side panels; no rAF batching). Real jank risk with hundreds of entities on weak hardware. Fix is a meaningful refactor (separate scene redraw from panel renders, rAF throttle) — too broad for a safe audit pass.
2. **Property-inspector scrubber destroys its own input mid-drag** (`render()` replaces the inspector DOM during active scrubbing). Mechanics confirmed; visible symptom is janky scrubbing. Proper fix needs a scrub-aware render guard across many call sites.
3. **Cross-category double-fire is prevented at binding time (A11), but existing persisted custom shortcuts recorded before this fix are not retroactively validated** — a user who previously recorded Shift+X as `x` still has the collapsed binding until they reset/rebind.
4. **`view-registry` `onModeEnter`/`onModeLeave` hooks are dead code** — `switchMode` hand-duplicates per-mode refresh calls; a future view relying on the documented hook contract will silently never fire.
5. **`createSnapshot` registers a payload-less snapshot before attaching the project** (`store.js`), and the snapshots array is unbounded.
6. **IBC assembly-standing factor set to 0.46 m²/person (IBC 1004.5)** — the previous 0.65 matched no IBC factor, but the module self-describes as educational heuristics; a code-certification review should confirm all factors.
7. **Committed QA artifacts** (`qa-baseline.json`, `qa-report.json`, `scratch/*.py`) — left in place intentionally; recommend moving to `scripts/` or ignoring.
8. **`Start Server.bat`** opens the browser before the server starts and prefers Python's `http.server` (no clean-URL redirects) over `npx serve` — behavior differs between fallback paths.
9. **P3 parser gaps** (documented, low risk): `.5` and scientific notation rejected; `formatFeetInches` fraction reduction only handles power-of-2 denominators (default 16 is safe); the formatter's epsilon "stabilization" is mathematically ineffective (harmless).

---

## Recommended Future Improvements

1. Plan-canvas render pipeline: rAF-batched scene redraw decoupled from panel renders (highest user-visible value).
2. Per-document undo stacks instead of clear-on-switch.
3. Retroactive validation/migration of persisted custom shortcut bindings.
4. Host allowlist (or explicit confirmation UX) for editable AI endpoints.
5. Wire `view-registry` mode hooks into `switchMode` and delete the duplicated refresh calls.
6. Cap snapshots array; attach snapshot payload atomically before persisting.
7. Version single-sourcing: generate `sw.js`/`index.html` cache-bust from `package.json` during build.
