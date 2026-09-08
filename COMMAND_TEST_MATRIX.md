# Command Test Matrix

Evidence: **T** = `tests/cad-commands.test.js` (62 assertions) · **B** = operated live in-browser this phase · suite count 57/57, 4,952 assertions.

## Built-in commands

| Command | Aliases | Interactive | Steps | Options | Coordinates | Units | Preview | Undo | History | Autocomplete | Tests | Browser | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LINE | L, LINESEG | ✅ 2 pts | point,point | — | ✅ abs/rel/polar | ✅ | line | ✅ | ✅ | ✅ | T | B | **READY** |
| WALL | W | ✅ 2 pts | point,point | Width, Align (Center/Left/Right), Reverse | ✅ | ✅ | wall | ✅ | ✅ | ✅ | T | **B** (Align=Left + `@3.5m+200mm<0`) | **READY** |
| RECTANGLE | REC, RECT | ✅ 2 corners | point,point | — | ✅ | ✅ | rect | ✅ | ✅ | ✅ | T | B | **READY** |
| DIST | DI, MEASURE | ✅ 2 pts | point,point | — | ✅ | ✅ | — | n/a | ✅ | ✅ | T | B | **READY** |
| DIMLIN | DIM, DAL, DCO | ✅ 2 pts | point,point | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | T | B | **READY** |
| UNDO / REDO | U / R | — | — | — | — | — | — | — | ✅ | ✅ | T | B | **READY** |
| DELETE | E, ERASE, DEL | — | — | — | — | — | — | — | ✅ | ✅ | T | B | **READY** |
| ZOOM | Z | args E/IN/OUT/% | — | — | — | — | — | — | ✅ | ✅ | T | B (incl. error quality) | **READY** |
| FIT | ZE, ZOOMEXTENTS | — | — | — | — | — | — | — | ✅ | ✅ | T | B | **READY** |
| TOP / FRONT / RIGHT / PERSPECTIVE / 4VIEW | PLAN, ELEV/SOUTH, EAST, PERSP/3D, SPLIT/QUAD | — | — | — | — | — | — | — | ✅ | ✅ | T | B | **READY** |
| PAN | P | — | — | — | — | — | — | — | ✅ | ✅ | T | B | **READY** |
| SELECT / SELECTALL | SEL,V / ALL,CTRLA | — | — | — | — | — | — | — | ✅ | ✅ | — | B | **READY** |
| PROPERTIES / INFO / SUGGEST / AI / ANALYZE / LAYER / HELP | … | — | — | — | — | — | — | — | ✅ | ✅ | — | B | **READY** |

## Legacy fallback (verified)

| Form | Behavior | Status |
|---|---|---|
| `REC 6 4` | parametric room at cursor | ✅ B (also negative case: too-small room explained) |
| `WALL 5` | wall of length 5 from cursor | ✅ B (interactive takeover) |
| `STAIR`/`HATCH`/`INSERT` | tool/parametric | ✅ T |

## Cross-cutting

| Capability | Evidence | Status |
|---|---|---|
| History: Up/Down replay, search, clear, session persistence (100 cap, dedupe) | T (8 assertions) + B ArrowUp replay | **READY** |
| Autocomplete: exact > alias > prefix > substring > fuzzy + recents boost, upward dropdown, ↑↓/Tab/Enter, availability/description/shortcut shown | T (4) + B screenshot | **READY** |
| Coordinates: `10,20` `10,20,0` `@5,0` `@5<90` `2400mm` `2.4m` `8'` guided length | T (6) + B | **READY** |
| Option kinds: length (validated/clamped), option (cycle or explicit, allowed-values error), boolean (toggle) | T (7) + B chips | **READY** |
| Cancellation: Esc explicit message; `[Cancel Esc]` chip | T + B | **READY** |
| Error quality: did-you-mean, expected-format examples, allowed-values list | T (3) + B | **READY** |
| Command/UI unification: tool aliases → same dispatch as buttons | ghost-tools suite (39) | **READY** |
| AI integration: `aiDescription` on every command + registry serialization | ai-context suite | **READY** |

## Known minor notes (documented, not defects)

- Option chips for text options (`Width=`) prefill the input rather than
  cycling — values are typed/clamped (AutoCAD-style).
- `DELETE` with empty selection still logs "Selection deleted." (candidate
  wording improvement).
- Comparisons are terminal expressions (no boolean combinators yet).
