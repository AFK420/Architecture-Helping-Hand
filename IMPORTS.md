# IMPORTS — Architecture Helping Hand

**Status**: Implemented (Phase 15, foundation) · **Date**: September 2026

---

## 1. Strategy

Bring material **in** without pretending to reconstruct proprietary CAD
semantics. A normalized ingestion architecture:

```
INPUT (paste or file) → IMPORTER (core/import) → REPORT → user review →
accepted entities → Plan Canvas / project measurements → AI context
```

Every importer returns the same report shape (rule 37):

```
sourceType · entities[] · warnings[] · stats { found, imported, units, scale, confidence }
```

Native proprietary formats (`.dwg`, `.3dm`, `.skp`, `.psd`) are **not**
parsed. Documented workflows: AutoCAD/Rhino/SketchUp → export DXF or SVG →
Importer; Photoshop → export PNG/JPG/SVG.

## 2. Supported Formats

| Format | Scope | Units | Confidence |
|---|---|---|---|
| **CSV / TSV** | Dimension schedules: `label,width,depth[,unit]` → footprint candidates; `label,length[,unit]` → measurements. Header optional; unit column (`Unit`) or per-cell suffixes (`2400mm`) honored. | inferred (mm/cm/m/in/ft), normalized to meters | high when clean |
| **DXF** | ASCII 2D subset: `LINE`, `LWPOLYLINE`/`POLYLINE`, `TEXT`/`MTEXT`, `CIRCLE`. Honors `$INSUNITS` (1=in, 2=ft, 4=mm, 5=cm, 6=m). | from header; meters assumed (warned) otherwise | medium |
| **SVG** | Flat geometry: `line`, `rect`, `polyline`, `polygon`, `circle`, `text`. Transform matrices are NOT applied. | pixels imported 1:1 as meters — scale disclosure always shown | low |
| **JSON** | Native project exchange — already handled by Project Workspace / Export Center. | — | — |
| **PDF / images** | Attach as vision inputs (AI Studio → Image Analysis), not geometry. | — | — |

## 3. Safety Semantics

- Imported geometry is **candidate data**: coordinates are meters flagged
  NEEDS VERIFICATION until the user confirms scale.
- Measurements land in the project with `source: Imported`,
  `status: Needs Verification`.
- The Importer never mutates the project directly — sending to the Plan
  Canvas uses the same entity path as drawing, and the report is shown
  before anything is applied.
- Unsupported/binary content fails controlled with warnings; a partial
  import reports exactly what was skipped and why.

## 4. Vision Path (images)

AI Studio → Image Analysis with a vision-capable model returns structured
observations with per-observation confidence. Image interpretation is
approximate by contract: never treated as measured geometry, never converted
to plan entities automatically.

## 5. Future (documented, not built)

OBJ (massing only), multi-page PDF page extraction, DXF INSERT/blocks,
coordinate-space alignment tools, design-board reference collection
(AI_CONTROL_CENTER.md §42 in the phase directive).
