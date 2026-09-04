# SURVEY — Architecture Helping Hand

**Status**: Implemented (Phase 16, M1) · **Date**: September 2026

---

## 1. What It Is

The **Survey Notebook (Mode 23)** surfaces the tested pure cores
`src/core/survey.js` + `src/core/annotations.js` as a measurement notebook
with provenance. Field notes, imported schedules, and calibrated-image
measurements all land in one place — and **uncertain records stay records**
until the student explicitly verifies them. Recording never forces geometry.

```
Record (label + length + source)  →  project document (measurements[])
                                        │
                 ┌──────────────────────┼───────────────────────┐
                 ▼                      ▼                       ▼
          verify / needs review    room PROPOSAL          calibrated image
          (status transitions)     (verified W/D only)    (two-point calibration)
                                          │
                                          ▼ (explicit user click)
                                   Plan Canvas entity → Export Center
```

## 2. Provenance Model

Every measurement carries:

| Field | Values / Meaning |
|---|---|
| `source` | `Measured` · `Estimated` · `Imported` · `AI Interpreted` · `User Entered` |
| `status` | `Verified` · `Unverified` · `Needs Review` |
| `meters` | Canonical meters (computed by the caller from the entered unit) |
| `location`, `note` | Optional free-text context |
| `timestamp` | ISO timestamp at creation |

Status transitions are immutable updates (`setMeasurementStatus` returns a
new record); the notebook replaces the record in the store. Imported
measurements (from the Importer, marked `source: 'Imported'`,
`status: 'Needs Verification'`) are first-class records the notebook can
verify with the same transition.

## 3. Room Proposal — Never Applied Silently

`proposeRoomFromMeasurements` proposes a room from labels matching the
`"Room W"` / `"Room D"` convention (or the first verified pair). Rules:

- **Only verified records become geometry.** Unverified measurements stay
  records; the proposal box explains what is missing.
- The proposal names its sources (`basedOn: [measurementId, …]`).
- Accepting the proposal is an explicit click that creates a real room
  entity through the same plan-entity path as drawing on the Plan Canvas —
  the student can then move/resize/delete it like any drawn room.
- The plan change is disclosed: `Proposal accepted: room "X" W × D added to
  the Plan Canvas (edit it there)`.

## 4. Image Calibration (Two-Point Known Distance)

Pure math in `src/core/survey.js`; the notebook is only the entry surface:

- Two image pixel points + one known real distance → `metersPerPixel` and
  `pixelsPerMeter` (scale = real / pixels).
- Calibrated operations: point-to-point distance, chained point walk
  (summed segments), polygon area (shoelace, m²).
- Every calibrated result is recorded as an **Unverified** measurement with
  the calibration noted (`Calibrated <n>-point walk`) — verify it like any
  other record. Areas are labelled `m²`.
- **Image bytes never persist.** Only the calibration numbers live in the
  session; there is no image storage (IndexedDB image blobs remain future
  work — see `IMAGE_LIMITS.storageNote`).

### Image constraints (weak-laptop conservative limits)

| Limit | Value | Behavior |
|---|---|---|
| Max file size | 10 MB | Rejected with a human-readable message |
| Longest pixel side | 2000 px | Disclosed downscale warning |

## 5. Data Flow Contract

- Measurements live in the project document (`project.measurements[]`) and
  persist through the versioned project store — no survey-specific
  localStorage silo. (Survey prefs such as the default source use a
  labelled preferences key, `archiscale_survey_prefs`.)
- The notebook renders from the store on every change; delete/verify run
  through `projectStore.updateProject` so undo snapshots and the JSON
  round-trip keep provenance.
- The AI facts pack (`src/ai/context/project-context.js`) already consumes
  `project.measurements` (capped at 20) — verified survey records
  automatically inform AI jobs with their verification status.

## 6. Testing

`tests/survey.test.js` (registered in `tests/run-all.js`) pins the data
flow through **real implementations only**: the real survey core, the real
project store, the real plan/export pipeline. Covered:

1. Measurement lifecycle — create → store → status transitions → summary →
   JSON round-trip provenance; validation contract (labels, values,
   sources, statuses); delete path.
2. Imported-record interop — the Importer's exact record shape verifies
   fine in the notebook.
3. Room proposal → plan entity → SVG export; unverified records produce no
   proposal.
4. Calibration → chained distance / polygon area → measurement record;
   calibration validation contract.
5. Image constraint gating with human-readable problems.

UI wiring is pinned by `tests/ui-contracts.test.js` (mode tab, view
container, all element IDs).
