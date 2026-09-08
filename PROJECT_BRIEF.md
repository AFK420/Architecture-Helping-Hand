# Project Brief

**Containers:** `project.brief` (schema v2 field on the project document,
normalized on every load — legacy projects get an empty brief automatically).
**UI:** Brief & Requirements view (Project section) · **Command:** `BRIEF`
(alias `REQ`, `REQUIREMENTS`).

## What the brief captures

| Field | Contents |
|---|---|
| `buildingType` | free text (e.g. "Residential", "Clinic") |
| `site` | location, notes, areaM2, orientation |
| `floors` | integer 1–200 |
| `areaTargets` | `grossM2`, `netM2` targets |
| `circulation` | strategy + target % of net |
| `accessibility` | target (e.g. "ADA 2010") + notes |
| `orientation` | primary orientation + notes |
| `specialConstraints[]` | free-form special conditions |
| `userRules[]` | user-defined rules |
| `roomRequirements[]` | typed room requirements (see REQUIREMENTS_ENGINE.md) |
| `requirements[]` | generic metric requirements |
| `adjacencies[]` | adjacency expectations |

The brief is plain data on the project document: versioned, migrated, saved,
undoable through the standard project commands. AI context reads it through
`project-context.js` (the brief is part of the normalized project, so facts
packs already surface it).

## Editor

The Brief & Requirements view provides the brief fields (building type,
floors, net-area target, accessibility target) plus requirement/adjacency
entry. Saving persists through `projectStore.saveProject()`.

## Validation

`validateBrief(brief)` returns `{ok, errors[]}` — buildingType must be a
string, floors an integer 1–200, area targets positive numbers. The view
guides entry; the engine never invents values.
