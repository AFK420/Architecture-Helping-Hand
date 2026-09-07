# Production Hardening Changelog

## 2026-09-07 (pass 3) — Plan workstation, CAD command engine, icon system, contextual AI

| File / module | Change | Verification |
|---|---|---|
| `src/core/cad-commands.js` (NEW) | Interactive CAD command engine: registry from live catalog, multi-step prompts, coordinate/length parsing via the shared parser, autocomplete, persistent history | `tests/cad-commands.test.js` (41) + live QA |
| `src/core/icons.js` (NEW) | Original 90+-glyph SVG registry (tools/categories/personas/doc types/nav/commands); replaces all functional emoji icons | `tests/icon-system.test.js` (19) + DOM emoji scan |
| `src/core/suggestions.js` (NEW) | Deterministic, evidence-backed suggestion engine (per-entity + document scope) | `tests/ai-context.test.js` |
| `src/core/entities.js` | `createLineEntity` factory (pure 2-point line primitive — the `L`/LINE tool previously had no entity) | Unit + live |
| `src/core/ai-bridge.js` | `serializeSelection()` per-entity evidence packets; tool-catalog exposure | `tests/ai-context.test.js` |
| `src/ai/context/project-context.js` | `selectionPackets` parameter → SELECTED ENTITIES block in the facts pack with do-not-invent instruction | unit via ai-context |
| `src/ui/components/commandbar.js` | Full rewrite: prompt state, upward autocomplete, options chips, result log, history arrows, canvas point bridge | live QA |
| `src/ui/components/palette.js` / `ribbon.js` | SVG icons via registry (incl. persona pills); palette search/category jump fix | live + suites |
| `src/ui/views/plan.js` | Command executor + session wiring; canvas click → prompt point; compass; tab/menu icon hydration; layer toggle aria-labels; INFO/SUGGEST/AI inspector panels | live QA |
| `src/ui/app.js` | nav/menu/command-palette SVG icons; `aiSelectionContext` facts-pack bridge | ui-contracts suite |
| `index.html` | Compass widget markup; new-tab emoji → hydration slots; cache-bust 2.3.0 | live |
| `css/main.css` | Section 22: command bar UI, compass, suggestions/info panels, icon alignment; palette scroll fix (flex region + themed scrollbar); dropdown opens upward, width-capped | live geometry checks |
| `sw.js` / `package.json` | Cache 2.3.0 (name + precache list); version sync | build-integrity |
| `tests/run-all.js` | Registered cad-commands, icon-system, ai-context suites | 53/53 |

Migration/deployment: SW cache bump forces one fresh fetch; no persisted-data changes (command history key is new and additive).

## 2026-09-07 — Full-scale audit hardening pass
## 2026-09-07 — Full-scale audit hardening pass

### Correctness

| File / module | Change | Reason | Verification |
|---|---|---|---|
| `src/core/building-codes.js` | `inspectStairCompliance()` now reads `risers.heightMeters` / `treads.depthMeters` / `proportion.twoRPlusTMeters` (legacy flat aliases accepted) and returns an explicit `warn` scorecard when riser/tread are non-finite | The inspector read fields `calculateStair()` never produces → NaN made every check pass; an illegal 250 mm riser reported "Full Compliance" | `tests/audit-regressions.test.js` A1; live browser: violation renders correctly |
| `src/core/building-codes.js` | `inspectRampCompliance()` reads `geometry.ratioValue` (legacy `ratio` alias accepted); `warn` on non-finite slope | `geom.ratio` never existed → slope check rendered `1 : NaN` | A2; ramps view NaN-free |
| `src/core/parser.js` | New `normalizeDecimalCommas()`: decimal commas (`"1,5"` → 1.5), thousands (`"1,234"` → 1234), European mixed (`"1.234,5"` → 1234.5) | Old blanket comma-strip turned `"1,5"` into 15 — a silent 10× error for decimal-comma locales | A4 (8 assertions); existing parser suite unchanged |
| `src/core/ramps.js` | `calculateMultiSegmentRamp()` validates rise/slope (finite, > 0) with typed `RAMP_ERROR_CODES` throws | Zero slope produced `Infinity` footprints | A7 |
| `src/core/multi-scale.js` | `calculateAtScale` falls back to `UNITS.in` (not `UNITS.mm`) when `drawingUnit` is a display format like `ft_in` | `drawingValue` was mm while labeled `ft_in` — 25.4× consumer error in raw export | A6 |
| `src/core/zoning-schedule.js` | Floor totals / circulation / zoning breakdown sum raw `roomArea()`; IBC standing-space factor corrected to 0.46 m²/person | Rounded-entry summation accumulated display error; 0.65 matched no IBC 1004.5 factor | A5; space-planning suite unchanged |

### Reliability / data

| File | Change | Reason | Verification |
|---|---|---|---|
| `src/services/storage.js` | `setItem` returns `true`/`false` (false only when localStorage exists but the write fails) | Quota errors were swallowed → store reported false-positive saves (silent data loss) | A3 |
| `src/services/store.js` | `writeEnvelope` treats adapter `false` as failure | Contract mismatch with the storage adapter | A3 |
| `src/ui/views/plan.js` | `history.clear()` on document switch | Undo after switching documents mutated the hidden document | Code review of command closures |
| `src/ui/views/ramps.js` | Multi-segment layout reads real code fields; calculation wrapped with graceful fallback | Jurisdiction limits were silently ignored; future validation throw would break render | Manual path review; ramps suite unchanged |

### Security

| File | Change | Reason | Verification |
|---|---|---|---|
| `src/services/ai/transports/gemini.js` | API key moved from URL query string to `x-goog-api-key` header (4 request sites) | Keys in URLs leak into logs/history/telemetry | `tests/ai-providers.test.js` updated + passing |
| `src/ui/app.js` | Context-strip pills escape keys and values | Defense-in-depth XSS hardening | Escape helper is the app-wide convention |
| `src/ui/components/palette.js` | Empty-result search hint escapes the query | Self-XSS sink | — |
| `src/ui/views/projects.js` | Library row escapes project `id` | Stored-data XSS hardening | — |

### UX / Accessibility

| File | Change | Reason | Verification |
|---|---|---|---|
| `index.html`, `css/main.css` | Skip link to `#tool-surface` (+ Section 21 styles); `aria-label` on quick-dim pin/close buttons | Keyboard users had to tab through all chrome; icon buttons were title-only | Live DOM verified |
| `src/core/shortcuts-manager.js` | `Shift+<uppercase letter>` keeps its Shift modifier; `bindShortcut` rejects duplicate combos across all categories | Shift+M collapsed onto `m` (key hijack); cross-category duplicates fired two actions per keypress (defaults verified collision-free first) | A8, A9; custom-shortcuts suite unchanged |
| `src/ui/app.js` | Esc performs exactly one action (drawer close returns); dead null-dereferencing else-branch removed from `populateUnitSelects()` | Double-action keypress; latent boot crash | — |
| `src/ui/components/ai-dropdown.js` | Ctrl+Space ignored while typing (input/textarea/select/contenteditable) | IME-toggle chord conflict | — |

### Infrastructure

| File | Change | Reason | Verification |
|---|---|---|---|
| `.github/workflows/ci.yml` | NEW — runs `npm test`, `npm run build`, `node scripts/build.js --check` on push/PR (Node 20) | No CI existed; 49 test suites ran only on demand | Workflow YAML present; commands verified locally |
| `sw.js` | Precache failure now aborts installation | Partial offline cache advertised as working | — |
| `package.json` | Version 2.0.0 → 2.2.0 | Version drift vs sw/index/README cache-bust | — |
| `js/audio.js`, `js/converter.js`, `js/history.js`, `js/presets.js`, `js/visualization.js` | DELETED | Legacy pre-modular files, unreferenced by `index.html` and the SW precache, superseded by bundled modules | Reference check + full suite + build |
| `tests/audit-regressions.test.js` | NEW suite (30 assertions), registered in `tests/run-all.js` | Pin every audit fix | 30/30 pass |
| `js/app.js` | Rebuilt from `src/` | Bundle must track source | `build --check`: in sync |

### Migration / deployment considerations

- **Gemini transport** now sends the key via `x-goog-api-key` header — supported by the official Gemini REST API; no endpoint change. Any user-supplied *proxy* that only parsed the query parameter would need updating (official endpoints unaffected).
- **Custom shortcuts recorded before this fix:** previously collapsed Shift+letter bindings persist until the user rebinds or hits "reset all".
- **Occupant-load outputs** for assembly standing spaces increase ~30% (0.65 → 0.46 m²/person) — re-check any saved schedules.
- **Service worker:** one-time behavior change — a failed precache now leaves the previous SW in control instead of activating with a broken offline cache.
- **CI:** first push after this change will run the new GitHub Actions workflow; expect green if `npm test` passes locally.
