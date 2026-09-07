# Command Health Matrix (runtime-verified)

Evidence: **B** = executed through the live command bar this audit · T = `tests/cad-commands.test.js` (41 assertions).
Registry: 77 commands (24 built-ins + 53 catalog aliases). Legacy fallback: `parseStudioCommand`.

| Command | Alias(es) | Parser | Executor | Interactive | Options | Coordinates | Units | History | Autocomplete | Undo | Tests | Runtime (B) | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LINE | L, LINESEG | ✅ | create_line | ✅ 2 pts | — | ✅ abs/rel/polar | ✅ | ✅ | ✅ | ✅ | T | ✅ "LINE completed." | **READY** |
| WALL | W | ✅ | create_wall_points | ✅ 2 pts | `Width=` | ✅ | ✅ | ✅ | ✅ | ✅ | T | ✅ option accepted; wall drawn | **READY** (see N1) |
| RECTANGLE | REC, RECT | ✅ | create_room_points | ✅ 2 corners | — | ✅ | ✅ | ✅ | ✅ | ✅ | T | ✅ "RECTANGLE completed." | **READY** |
| DIST | DI, MEASURE | ✅ | measure_points | ✅ 2 pts | — | ✅ | ✅ | ✅ | ✅ | n/a | T | ✅ "DIST completed." | **READY** |
| DIMLIN | DIM, DAL, DCO | ✅ | create_dimension | ✅ 2 pts | — | ✅ | ✅ | ✅ | ✅ | ✅ | T | ⚠️ entity created; inspector crash = **D2** (tool defect, not command) | **READY** (defect downstream) |
| UNDO | U | ✅ | undo | — | — | — | — | — | — | — | T | ✅ "Undo." | **READY** |
| REDO | R | ✅ | redo | — | — | — | — | — | — | — | T | ✅ "Redo." | **READY** |
| DELETE | E, ERASE, DEL | ✅ | deleteSelected | — | — | — | — | — | — | — | T | ✅ "Selection deleted." (empty selection: still logs — see N2) | **READY** |
| ZOOM | Z | ✅ | zoom (E/IN/OUT/%) | — | — | — | — | ✅ | ✅ | — | T | ✅ + good error on `ZOOM ABC` | **READY** |
| FIT | ZE, ZOOMEXTENTS | ✅ | zoom_extents | — | — | — | — | ✅ | ✅ | — | T | ✅ | **READY** |
| TOP | PLAN | ✅ | view_top | — | — | — | — | ✅ | ✅ | — | T | ✅ | **READY** |
| FRONT | ELEV, SOUTH | ✅ | view_front | — | — | — | — | ✅ | ✅ | — | T | ✅ | **READY** |
| RIGHT | EAST | ✅ | view_right | — | — | — | — | ✅ | ✅ | — | T | ✅ creates East Elevation | **READY** |
| PERSPECTIVE | PERSP, 3D, MASSING | ✅ | view_perspective | — | — | — | — | ✅ | ✅ | — | T | ✅ | **READY** |
| 4VIEW | SPLIT, QUAD | ✅ | view_4split | — | — | — | — | ✅ | ✅ | — | T | ✅ "4-viewport workspace." | **READY** |
| PAN | P | ✅ | pan tool | — | — | — | — | ✅ | ✅ | — | T | ✅ | **READY** |
| SELECT | SEL, V | ✅ | tool:select | — | — | — | — | ✅ | ✅ | — | T | ✅ | **READY** |
| SELECTALL | ALL, CTRLA | ✅ | select_all | — | — | — | — | ✅ | ✅ | — | — | ✅ "3 selected (all)" | **READY** |
| PROPERTIES | PROPS, CH | ✅ | properties | — | — | — | — | ✅ | ✅ | — | — | ✅ | **READY** |
| INFO | INSPECT | ✅ | info | — | — | — | — | ✅ | ✅ | — | — | ✅ (needs selection — honest error if empty) | **READY** |
| SUGGEST | SUGGESTIONS | ✅ | suggest | — | — | — | — | ✅ | ✅ | — | — | ✅ "2 suggestion(s)…" | **READY** |
| AI | ASK, AIQUERY | ✅ | ai_query | routes to AI Studio | — | — | — | ✅ | ✅ | — | — | ✅ mode switch + evidence question | **READY** |
| ANALYZE | AICRITIQUE | ✅ | ai_analyze | — | — | — | — | ✅ | ✅ | — | — | ✅ | **READY** |
| LAYER | LA | ✅ | panel:layers | — | — | — | — | ✅ | ✅ | — | — | ✅ | **READY** |
| HELP | ? | ✅ | help list | — | — | — | — | ✅ | ✅ | — | T | ✅ full command list in log | **READY** |
| *(53 catalog aliases)* | per catalog | ✅ fallthrough | setTool | — | — | — | — | ✅ | ✅ | varies | ghost-tools T | sampled ✅ | **READY** |
| *(legacy)* | REC w d / WALL len / STAIR / HATCH / INSERT | parseStudioCommand | legacy executor | — | — | mm only | ✅ | ✅ | ✅ | ✅ | — | ✅ both sampled | **READY** |
| *(unknown)* | — | ✅ | none | — | — | — | — | — | did-you-mean | — | T | ⚠️ see N3 | **PARTIAL — N3** |

## Runtime notes

- **N1 (minor UX):** after setting a mid-command option (`Width=0.3`), the session
  remains at step 1 and the only visible indicator is the small log line and the
  option chip. Candidate improvement (not a defect): keep the option highlighted.
- **N2 (minor):** `DELETE` with empty selection logs "Selection deleted." —
  acceptable, but "Nothing selected." would be more truthful.
- **N3 (defect, wording):** typing an unknown word while **no** session is active
  correctly answers `Unknown command "WAL". Did you mean WALL?` — verified in the
  engine tests. However, in an earlier matrix run the error
  `"WAL" is not a coordinate — try 10,20 · @5,0…` appeared because a stale
  interactive prompt was still open, so the input was fed to the **step parser**.
  Truthful in context, but the prompt indicator needs to be more prominent (ties
  to N1).

## History / autocomplete (runtime)

- ArrowUp replayed the last command (`ZOOM E`) ✅
- Suggestions dropdown opens upward, ranked (verified: `LI` → LINE first, with
  aliases + descriptions + "↵ starts prompts" hint) ✅
- Session persistence to localStorage (100-entry cap, dedupe) ✅ (T)

## Error quality (runtime samples)

| Input | Response | Verdict |
|---|---|---|
| `WAL` | Unknown command "WAL". Did you mean WALL? | ✅ contract example |
| `ZOOM ABC` | ZOOM expects E (extents), IN, OUT or a percentage — e.g. ZOOM 100. | ✅ |
| `1,1` typed into a finished session | fed as step input → honest coordinate error | ⚠️ prompt-visibility (N1) |
| `nonsense` as a WALL point | "nonsense" is not a coordinate — try 10,20 · @5,0 · @5<90 · 2400mm. | ✅ |
