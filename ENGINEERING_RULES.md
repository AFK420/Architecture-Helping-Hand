# Architecture Helping Hand — Engineering Rules & Architecture Freeze

**Version**: 1.0 (Foundation Freeze)  
**Status**: ACTIVE & ENFORCED  
**Applies To**: All future feature development in Architecture Helping Hand

---

## 1. Architectural Layers & Separation of Responsibilities

The codebase is organized into three strictly decoupled layers:

```text
src/
├── core/         # Domain math, units, parser, formatter, presets, furniture
├── services/     # Persistence, history, browser APIs, audio synthesis, side effects
└── ui/           # DOM rendering, user events, UI state, visual components
```

### 1.1 Core Layer (`src/core/`)
* **Role**: Pure calculation engine, input parsing, formatting, and domain data.
* **Rules**:
  - MUST NOT import or reference DOM objects (`window`, `document`, `HTMLElement`, `localStorage`, `AudioContext`).
  - MUST be 100% testable in headless Node.js.
  - MUST contain all mathematical formulas and scaling algorithms.
  - MUST NOT perform ad-hoc rounding on intermediate calculations.

### 1.2 Services Layer (`src/services/`)
* **Role**: Side-effect management, client storage, audio feedback, history export.
* **Rules**:
  - MUST be resilient: gracefully handle disabled `localStorage`, sandboxed iframe restrictions, and unavailable browser audio.
  - MUST isolate external state mutations.

### 1.3 UI Layer (`src/ui/`)
* **Role**: Presentation, visual components, user interaction, DOM event binding.
* **Rules**:
  - MUST NOT contain direct mathematical calculations.
  - MUST delegate all math, conversions, and parsing to `src/core/`.
  - MUST call `src/services/` for persistence and logging.

### 1.4 Feature View Contract (`src/ui/views/`, added Stabilization 1)
Feature controllers live in one module per mode/tool under `src/ui/views/`:
`converter.js`, `rescaler.js`, `detector.js`, `area-volume.js`,
`expression-multiscale.js`, `dimension-chains.js`, `cad-clipboard-handoff.js`,
`batch-cad.js`, `quick-dimension.js`, `history.js`.

* **Contract**: each view exports `createXView(context)` returning
  `{ id, mount(), getController() }` (optional `onModeEnter`/`onModeLeave`).
* **Context**: one frozen object assembled by `app.js` (`state`, `dom`, shared
  helpers, services, `views`). Views MUST NOT import other views — cross-feature
  calls go through `context.views.callController(viewId, fnName, ...args)`,
  which fails loudly if the target view/function is missing.
* **Registration**: every view is registered in `app.js` via the registry from
  `src/ui/view-registry.js` (unique ids, required `mount`, validated context).
* **Global responsibilities stay in `app.js`**: startup, mode navigation,
  command palette, global keyboard handling, furniture/reference rendering,
  and the workspace controller (registered inline so other views can reach
  `saveWorkspace`/`renderWorkspace`).

### 1.5 Project Data vs User Preferences (added Stabilization 3)
* **Project data** (dimensions, chains, notes, snapshots, decisions, exports,
  future rooms/walls/furniture) MUST flow through the versioned project store
  (`src/services/store.js`), never through raw feature localStorage keys.
* **User preferences** (theme, sound, default precision, quick-dim prefs,
  favorites) remain in their existing per-feature keys.
* The two MUST NOT be mixed in one key. Legacy per-feature keys holding
  project-like data are migrated non-destructively via
  `ProjectStore.importLegacy()` — the store reads legacy keys, never deletes
  them.

---

## 2. Input Parser Contract

The input parser (`src/core/parser.js`) evaluates user inputs and returns a structured object:

```javascript
{
  value: number,          // Parsed numeric value in detected or caller unit
  detectedUnit: string|null, // Explicit unit key if present (e.g. 'cm', 'm', 'in', 'ft')
  isValid: boolean,       // True if parsed into a finite valid number
  error: string|null      // Diagnostic error message if invalid
}
```

### Supported Formats
* **Decimals & Integers**: `12`, `12.5`, `0.75`, `-5` (when `allowNegative: true`).
* **Fractions**: `3 1/2`, `5/8`, `1/4`, `15 3/16`.
* **Attached Units**: `12cm`, `2.5m`, `100mm`, `12in`, `6ft`.
* **Architectural Feet & Inches**: `12'`, `12' 6"`, `12'-6"`, `12'-6 1/2"`, `6 1/2"`, `5/8"`.

### Rejected Inputs (`isValid: false`)
* Empty or whitespace-only strings (`""`, `"   "`).
* Non-numeric strings and invalid suffixes (`"abc"`, `"12abc"`, `"15.5foobar"`).
* Malformed fractions or multiple slashes (`"3/0"`, `"1/0"`, `"1/2/3"`, `"/5"`, `"3/"`).
* Non-finite values (`NaN`, `Infinity`).
* Negative dimensions when `allowNegative` is false.

---

## 3. Mathematical Contracts

All calculations normalize inputs to base SI units (**Meters**, **Square Meters**, **Cubic Meters**) before scaling.

### 3.1 Linear Scaling
* **Drawing $\rightarrow$ Real**:
  $$\text{Real Meters} = (\text{Drawing Value} \times \text{Input Unit Factor}) \times S$$
  $$\text{Output Value} = \frac{\text{Real Meters}}{\text{Target Unit Factor}}$$
* **Real $\rightarrow$ Drawing**:
  $$\text{Drawing Meters} = \frac{\text{Real Value} \times \text{Input Unit Factor}}{S}$$
  $$\text{Output Value} = \frac{\text{Drawing Meters}}{\text{Target Unit Factor}}$$

### 3.2 Rescaling ($A \rightarrow B$)
$$\text{Target Value} = \text{Original Value} \times \left(\frac{S_A}{S_B}\right) \times \left(\frac{\text{UnitFactor}_A}{\text{UnitFactor}_B}\right)$$

### 3.3 Area Scaling ($S^2$)
* Drawing $\rightarrow$ Real: $\text{Real Area} = \text{Drawing Area} \times S^2$
* Real $\rightarrow$ Drawing: $\text{Drawing Area} = \frac{\text{Real Area}}{S^2}$

### 3.4 Volume Scaling ($S^3$)
* Drawing $\rightarrow$ Real: $\text{Real Volume} = \text{Drawing Volume} \times S^3$
* Real $\rightarrow$ Drawing: $\text{Drawing Volume} = \frac{\text{Real Volume}}{S^3}$

### 3.5 Scale Ratio Detection
$$\text{Scale Ratio} = \frac{\text{Real Measurement (Meters)}}{\text{Paper Measurement (Meters)}}$$

---

## 4. Unit Validation & Dimension Compatibility

* **Strict Lookup**: All unit lookups MUST use `requireUnit(unitKey, expectedDimension)`.
* **No Silent Coercion**: An unknown unit string (e.g. `'xyz'`, `'foobar'`, `null`) MUST throw an explicit `Error`.
* **Dimension Cross-Checking**:
  - Length functions accept only `length` units (`mm`, `cm`, `dm`, `m`, `km`, `in`, `ft`, `yd`, `mi`).
  - Area functions accept only `area` units (`mm2`, `cm2`, `m2`, `km2`, `ha`, `sq_in`, `sq_ft`, `sq_yd`, `acre`).
  - Volume functions accept only `volume` units (`mm3`, `cm3`, `m3`, `liters`, `cu_in`, `cu_ft`, `cu_yd`).

### 4.1 Consistent Error Handling Policy
* **Invalid Programmer / API Input**: Core functions must throw an explicit `TypeError` or `Error` (e.g. `requireFiniteNumber` throws `TypeError` for non-numbers/NaN/strings, `requireUnit` throws `Error` for unknown unit strings). Never silently coerce invalid types or return fake success values.
* **Invalid User-Entered Text**: The parser (`parseInput`) must return `{ isValid: false, error: '...' }` so the UI can gracefully show validation feedback without throwing unhandled exceptions.

---

## 5. Precision & Rounding Policy

1. **Internal Arithmetic**: Calculations run in native IEEE 754 64-bit floating point. Do NOT round intermediate results.
2. **Output Display Rounding**: Formatting is applied exclusively at the presentation layer using `formatNumber(val, decimals)` with epsilon stabilization (`(val + Number.EPSILON)`).
3. **Architectural Fractions**: Formatted to the nearest $1/16$ inch and reduced to lowest terms (e.g. `6.5"` $\rightarrow$ `6 1/2"`, `0.75"` $\rightarrow$ `3/4"`).
4. **Test Equality Tolerance**: Automated equality assertions use $\varepsilon = 10^{-6}$ (`Math.abs(a - b) < 0.000001`).

---

## 6. Build System & Standalone Deployment

* **Source of Truth**: `src/` is the authoritative source for all code.
* **Build Manifest**: `scripts/build.js` exports `BUNDLE_MODULES` — the single, ordered source of truth for bundle composition. Every runtime module must be registered there exactly once, in dependency-first order (a module's relative imports must all be bundled before it).
* **Runtime Module Rule**: every `*.js` file under `src/` is a runtime module by definition. Test helpers and support code live exclusively in `tests/`. If a support-only file must ever live under `src/`, it must be added to `NON_RUNTIME_MODULES` in `scripts/build.js` with a documented reason. This rule is enforced by `tests/build-integrity.test.js`.
* **Deterministic Bundler**: `node scripts/build.js` concatenates `src/` modules in manifest order into `js/app.js`.
* **Bundle Check**: `node scripts/build.js --check` verifies that `js/app.js` is identical to the compiled `src/`.
* **Bundle Verification (automatic, part of `npm test`)**: `tests/build-integrity.test.js` enforces three layers — (1) manifest coverage: every `src/**/*.js` file is registered, exactly once, dependency-first; (2) bundle content: the generated bundle contains the distinctive definitions of every module and is byte-identical to a fresh regeneration; (3) runtime smoke: the bundle boots end-to-end against a minimal mocked browser environment without unresolved references.
* **Bundler Strip Contract**: `stripImportsAndExports` handles named imports/exports, default exports, and re-exports (`export { A } from './m.js'`). Modules using exotic syntax that the stripper cannot transform must not be added; keep src modules in the supported subset. Verified per-module by the build-integrity suite.
* **Rule**: NEVER edit `js/app.js` manually.

### 6.1 How to Add a New Source Module Safely
1. Create `src/core/<module>.js` (or `src/services/`, `src/ui/`).
2. Register it in `BUNDLE_MODULES` in `scripts/build.js` **after** every module it imports.
3. Run `npm test` — `build-integrity.test.js` fails loudly if the module is missing from the manifest, misordered, duplicated, or absent from the generated bundle.
4. Run `npm run build && node scripts/build.js --check` before committing.

---

## 7. Testing & Regression Workflow

Every bug fix or feature addition must follow this test-driven cycle:

```text
Bug Reported or Feature Planned
               │
               ▼
Write Failing Automated Test Case in tests/
               │
               ▼
Implement Code in src/
               │
               ▼
Run Test Runner (npm test) ➔ Verify 100% Passing
               │
               ▼
Rebuild Bundle (node scripts/build.js)
```

The master runner (`tests/run-all.js`) emits the authoritative total assertion count on completion — quote that number in documentation instead of maintaining hard-coded counts by hand. New test suites must emit a parseable `Summary: N passed, M failed.` line so they are counted.

---

## 8. Feature Development Checklist

Before writing code for a new feature, answer:
1. **Does it introduce new mathematical logic?** $\rightarrow$ Put in `src/core/`.
2. **Does it need persistence or browser APIs?** $\rightarrow$ Put in `src/services/`.
3. **Is it purely visual presentation or DOM events?** $\rightarrow$ Put in `src/ui/`.
4. **Does it introduce new architectural reference data?** $\rightarrow$ Put in structured constants in `src/core/presets.js` or `src/core/furniture.js`.
5. **Are all unit tests passing?** $\rightarrow$ `npm test` must report 0 failures.

---

## 9. Simplicity Directive

To preserve lightweight, zero-dependency, and offline compatibility:
* Do NOT introduce UI frameworks (React, Vue, Angular).
* Do NOT add runtime NPM dependencies unless technically unavoidable.
* Keep the application directly runnable via double-clicking `index.html` (`file:///`) and local servers (`http://`).
