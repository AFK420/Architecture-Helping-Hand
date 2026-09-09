# Production Hardening Changelog

## 2026-09-09 (pass 4) — Honesty pass: 15 live defects fixed, fake UI removed

Full 200-item capability audit (four subsystem audits + fresh test run) found
real engines in good shape but nine live bugs, four fake/ghost UI surfaces,
and five latent engine defects. All fixed in one pass and pinned by the new
`tests/honesty-pass.test.js` (51 assertions) + factory-entity section in
`tests/issue-engine.test.js` (5 new). Full suite: 61 files, 5,016 assertions, 0 failures.

### Data integrity (worst-first)

| Defect | Fix | Verification |
|---|---|---|
| Ctrl+D duplicate passed an object where a numeric meter offset is required → coords became `"1[object Object]"` strings → NaN geometry that PERSISTED into saved projects (test masked it by calling the correct signature) | `plan.js:1128` numeric offset + `duplicateEntity` now guards non-finite offsets (numeric, `{x,y}` object, or 0) | honesty-pass §1 |
| NL furniture placement wrote into `draft.plan.furniture` (never loaded back) and `state.plan.document` (nonexistent) | New `addEntity` controller on the plan view; placement now goes through the live canvas with identity + undo + render | honesty-pass §10 |
| Scratchpad "save to project" called `updateProject(id, obj)` (signature: mutator fn) inside `try/catch{}` → silent no-op | Correct mutator call; failure now surfaces as a warning toast | source pin |
| `wallOpenings(entities, e)` args swapped → every wall serialized its openings as `[]` to the AI | `(e, entities)` + guard | honesty-pass §2 |
| `removeEntityRelationships` purge condition always true → dangling back-references survived entity deletion | purge by target id | honesty-pass §4 |
| Dimension filter precedence: `kind==='dimension' && A < 0.02 \|\| B < 0.02` matched any entity near room depth | parenthesized OR | review |

### QA honesty (issue engine)

| Defect | Fix | Verification |
|---|---|---|
| `pointNearSegment` called with 6 args through a 4-param closure → NaN → always false (door/window host proximity never worked) | Real point-to-segment distance with clamped t | honesty-pass §2 |
| `room.missing_door` / `room.missing_window` required `d.x/d.y` — factory doors/windows carry NO x/y (hosted: wallId + position). A perfectly hosted door+window bedroom was flagged missing both. Tests passed only because fixtures hand-added x/y | New `openingWorldPoint` resolves hosted openings through the host wall; rules use it. Factory-entity regression tests added (no false positives AND no false negatives) | issue-engine §9 |
| `geo.duplicate` required `e.x/e.y` → walls were never duplicate-checked | position key generalized to segment entities | honesty-pass §3 |
| `door.clearance` used `d.x ?? 0` (meaningless for hosted doors) | resolves through host wall | review |

### Fake/ghost UI removed or made real

| Surface | Was | Now |
|---|---|---|
| Ctrl+Space AI dropdown | keyword-matched canned HTML + 400 ms `setTimeout` pretending to be latency; "Apply" inserted the same hardcoded 3-bed layout regardless of prompt | Thin client of the real job router (`runAIJob`); honest **AI UNAVAILABLE** state listing what works without AI; answers labeled with provider/model; actions only from real model responses via `parseAiActions`, applied on user click |
| Inspector "IBC CODE" checklist | 3 hard-coded ✅ pass badges | Computed from document entities: ramp slope ≤ 8.33%, egress corridor ≥ 1.10 m, stair Blondel/riser band — pass/fail/unknown with detail text |
| ORTHO toggle (F8) | flipped state; nothing ever read it | `applyOrtho` constrains drafting drags and moves to H/V from the reference point; F8 shortcut wired; default OFF |
| "PERSPECTIVE" 3D label | orthographic projection mislabeled as perspective | Real one-point perspective divide in `projectPoint3D` (`camera.perspective`), toggle chip in the 3D toolbar, PERSP command enables it; 4-split quadrant honestly relabeled AXONOMETRIC |
| Push/Pull toast | claimed "Extruded (3.0m height)!" — only switched documents | Honest message: opens the massing view, points at the H control |

### Other UI defects

- Polyline contextual toolbar wrote to undefined `toolbar` (var is `bar`) → ReferenceError, Finish/Cancel buttons never rendered (plan.js:1556) — fixed.
- Measure release toast read `m.formatted` (never returned; is `formattedM`) → "Measured: undefined" — fixed, includes angle.
- Polyroom snap call used `{threshold, gridSize}` (real options: `snapDistance, gridMeters, osnaps`) → polygon rooms ignored both grid and object snaps — fixed.

### Latent engine defects

- `joinCollinearSegments` gap check was dead code — disjoint collinear segments were silently bridged into one segment; now interval-based, gaps > tolerance return null (honesty-pass §5).
- `multi-scale` read `parsed.errorMessage`; parser returns `error` → real error text never surfaced (§8).
- `camera3d.worldToScreen3D` ignored `camera.target` while `screenToWorldRay` honored it → picking inverse broken for any non-zero target; now exact inverse (§7, cross-magnitude 9e-17).
- Massing 3D stairs read `st.riserCount` (never set by factories → always 10 risers) and ignored `st.rise`; now `risers` + real rise; steps stack from their own base, not z=0.
- Multi-story gross volume used average story height (`GFA × currentZ/docs`) — wrong for mixed heights; now Σ(area × own height) (§6).
- NURBS surface tessellation emitted `[x,y,z]` arrays where every consumer expects `{x,y,z}`; fixed. Duplicate `CAMERA_PRESETS` aliases (iso_ne… doubled toolbar chips) removed.
- Requirements engine: `room_area` and `corridor_width` scopes were declared but returned null → NOT_APPLICABLE; both implemented. `roomAreaOf` now honors polygonal boundaries via the factory `roomArea` (audit found two engines disagreeing on the same room).
- `ROOM_MIN_AREA` constraint rescaled width/depth but left the polygon boundary stale (`scaleY` computed then void-discarded) → mixed geometry; boundary now rescaled consistently.


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
