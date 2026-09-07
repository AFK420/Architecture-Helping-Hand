# AI Contextual Copilot

**Modules:** `src/core/ai-bridge.js` (selection evidence), `src/core/suggestions.js` (deterministic suggestions), `src/ai/context/project-context.js` (facts-pack injection), plan workspace wiring.
**Status:** Implemented and verified (21 unit tests + live QA). The AI remains a workstation assistant — it answers about *what is selected*, recommends *real tools*, and never mutates geometry silently.

## Design

```
User selects entity → serializeSelection() builds an evidence packet
        ↓
AI Query / Ask-AI → packets ride the facts pack → provider answers with verified numbers
        ↓
SUGGEST command → deterministic findings (no AI) → ranked panel → "Ask AI about these"
```

## Selection evidence (`serializeSelection`)

For each selected entity the packet carries type-specific deterministic facts:

- **wall** — length, thickness, assembly, angle, endpoints, openings, touching dimensions
- **line** — length, angle, endpoints
- **room** — width/depth/area/perimeter/aspect ratio, contained furniture, doors, nearby dimensions
- **dimension** — measured value, endpoints, unit, **verification against actual geometry** (`matchesGeometry` + the matching entities)
- **stair** — risers, riser height, tread, Blondel 2R+T, pitch
- **ramp** — slope %, ratio, width, length
- **door/window** — width, host wall, swing · **furniture** — footprint, catalog id, host room

Nothing selected → empty packets → **no selection context is sent** (the document pack only). One line selected → one small packet, never the whole project.

## Injection path

`buildScopedFactsPack(..., selectionPackets)` renders a `SELECTED ENTITIES` block into the facts pack:

> `Answer specifically about the selected entity/entities. Distinguish fact (from this pack) from inference. Do not invent dimensions.`

The plan workspace sets `state.aiSelectionContext` (consumed by the facts-pack builder in `app.js`) when invoking AI from the canvas, so **AI Studio answers concern the exact selection**.

## Commands

| Command | Behavior |
|---|---|
| `AI <question…>` | routes to AI Studio with the selection packets + evidence-aware question |
| `SUGGEST` | deterministic ranked findings for the selection (or document); panel in the inspector; no AI needed |
| `INFO` | inspector readout: measurements, relationships, dimension-verification (MATCH / NO MATCH) with `Ask AI` + `Suggestions` actions |
| `ANALYZE` | project-wide critique with deterministic evidence |

## Deterministic suggestion engine (`suggestions.js`)

Findings carry `{severity, problem, evidence, recommendation, toolId}` — severities `critical > high > medium > low > informational`, every `toolId` validated against the live catalog (no ghost tools). Examples:

- wall undimensioned / disconnected / opening wider than the segment / sub-100 mm thickness
- room extreme aspect ratio (>2.5:1), furniture density >32% (>45% = high), bedroom <7.5 m², undimensioned
- stair Blondel outside 600–660 mm, flight >16 risers
- ramp steeper than 1:12
- dimension not matching any geometry (with evidence)
- document: overlapping rooms (with shared m²), mostly-undimensioned walls, orphan furniture, zero dimensions

## Test coverage

`tests/ai-context.test.js` (21 assertions): packet shape per kind, dimension verification both ways, no-selection sends nothing, tool catalog exposure, suggestion evidence/ghost-tool check, document overlaps.
