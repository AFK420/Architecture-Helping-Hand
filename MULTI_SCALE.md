# Architecture Helping Hand — Multi-Scale Comparison Workspace

> **Phase 2.5: Daily Architect Toolkit — Part 4: Multi-Scale Comparison**  
> Simultaneous Multi-Scale Evaluation, Proportional Visual Drafting Bars, Paper Context Heuristics & CAD Preparation

---

## 1. Overview & Purpose

Architects constantly need to know:
> *"How large will this dimension be at different drawing scales? Which scale makes this detail readable? Does this building fit onto an A3 sheet?"*

Instead of performing separate calculations for each scale, the **Multi-Scale Comparison Workspace (Mode 9)** evaluates a single real-world dimension or mathematical expression across multiple architectural drawing scales simultaneously.

```mermaid
flowchart TD
    Input["Input Dimension or Expression\n(e.g. 2400 mm, 2.4m, 7' 6\", or 2400 + 900 + 1200)"] --> Parser["Input & Expression Parser\n(src/core/multi-scale.js)"]
    Parser --> Canonical["Canonical Real Meters ($m$)\n(Preserves full float precision)"]
    
    subgraph MultiScaleEngine["Multi-Scale Comparison Engine"]
        Canonical --> S1["1:10 ➔ 240 mm (100% bar)"]
        Canonical --> S2["1:20 ➔ 120 mm (50% bar)"]
        Canonical --> S3["1:50 ➔ 48 mm (20% bar, ★ CURRENT)"]
        Canonical --> S4["1:100 ➔ 24 mm (10% bar)"]
        Canonical --> S5["1:200 ➔ 12 mm (5% bar)"]
        Canonical --> Custom["Custom 1:33 ➔ 72.7 mm"]
    end

    MultiScaleEngine --> Visual["Proportional Visual Drafting Bars\n(Exact Physical Length Ratios)"]
    MultiScaleEngine --> Paper["Sheet Paper Usable Width Check\n(A4, A3, A2, A1, A0)"]
    MultiScaleEngine --> Heuristic["Suggested Fit Heuristic\n(Target Drawing Range in mm)"]
    
    MultiScaleEngine --> Workspace["Send to Dimension Workspace\n(+ WS Button ➔ REF default)"]
    MultiScaleEngine --> Exports["Multi-Format Exports\n(Table / Formatted List / Current / Raw CAD)"]
```

---

## 2. Core Architecture & Mathematical Principles

1. **Single Source of Truth**: All scale calculations share the unified canonical meters pipeline (`src/core/units.js`, `src/core/calculator.js`, `src/core/presets.js`).
2. **True Proportional Visual Bars**: The bar lengths correspond to exact physical drawing dimensions relative to the largest drawing length in the set (`barPercent = (drawingMeters / maxDrawingMeters) * 100`).
3. **No Premature Rounding**: All calculations preserve floating-point accuracy internally; formatting and unit conversions only occur at the display boundary.
4. **Strict Safety Guards**: Validates that all scale ratios are finite numbers $> 0$. Rejects `0`, negative numbers, `NaN`, and `Infinity`.

---

## 3. Input Formats Supported

| Input Type | Example | Evaluation |
| :--- | :--- | :--- |
| **Direct Metric Dimension** | `2400 mm`, `2.4 m`, `150 cm` | Evaluated directly to canonical meters |
| **Bare Number** | `2400` | Uses selected Default Input Unit (`mm` default $\rightarrow 2.4\text{ m}$) |
| **Architectural Notation** | `7' 6"`, `12'-6 1/2"`, `3 1/2"` | Parsed via imperial architectural fractional parser |
| **Mathematical Expression** | `2400 + 900 + 1200`, `5.4m - 1200mm`, `(2.4m + 900mm) / 3` | Evaluated via the Dimension Expression Engine before multi-scale comparison |

---

## 4. Scale Groups & Preset Sets

The interface organizes scales into standard drafting categories:

- **All Standard**: `1:1`, `1:2`, `1:5`, `1:10`, `1:20`, `1:25`, `1:50`, `1:75`, `1:100`, `1:150`, `1:200`, `1:250`, `1:500`, `1:1000`
- **Architecture**: `1:20`, `1:25`, `1:50`, `1:75`, `1:100`, `1:200`
- **Detail**: `1:1`, `1:2`, `1:5`, `1:10`, `1:20`
- **Site / Urban**: `1:100`, `1:200`, `1:250`, `1:500`, `1:1000`, `1:1250`, `1:2500`, `1:5000`
- **Imperial**: `1/16"=1'` (1:192), `1/8"=1'` (1:96), `1/4"=1'` (1:48), `1/2"=1'` (1:24), `1"=1'` (1:12), `3"=1'` (1:4)
- **★ Favorites**: User-selected favorite scales (persisted in local storage)
- **Custom Scales**: Add any arbitrary ratio (e.g. `1:33`, `1:17`, `1:64`).

---

## 5. Sheet Paper Context & Fit Heuristics

### Standard Sheet Usable Widths (with standard margins):
- **A4**: $297 \times 210\text{ mm}$ (Usable width: $277\text{ mm}$)
- **A3**: $420 \times 297\text{ mm}$ (Usable width: $387\text{ mm}$)
- **A2**: $594 \times 420\text{ mm}$ (Usable width: $554\text{ mm}$)
- **A1**: $841 \times 594\text{ mm}$ (Usable width: $801\text{ mm}$)
- **A0**: $1189 \times 841\text{ mm}$ (Usable width: $1139\text{ mm}$)

When a paper size is selected, drawing dimensions exceeding the sheet's usable width display a `⚠️ EXCEEDS` badge.

### Suggested Fit Range:
Enter an optional target drawing range (e.g. $80\text{ mm}$ to $150\text{ mm}$). Rows matching this range are tagged with `✓ FIT`.

---

## 6. Interoperability & Handoffs

1. **Send to Dimension Workspace**: Each comparison row provides a **`[ + WS ]`** action that inserts the drawing dimension into the active Dimension Workspace schedule with `Reference` (`REF`) role.
2. **From Dimension Expression (Mode 8)**: The **`[ Compare Scales ]`** button transfers calculated composite math expressions directly into Mode 9.
3. **Command Palette Live Preview**: Typing `compare 2400mm` or `2400mm` inside <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd> displays an instant 3-scale preview (`1:20 ➔ 120mm | 1:50 ➔ 48mm | 1:100 ➔ 24mm`).

---

## 7. Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| <kbd>9</kbd> | Global | Switch to **Multi-Scale Comparison** (Mode 9) |
| <kbd>Enter ↵</kbd> | Input Field | Run calculation / Refresh comparison |
| <kbd>Esc</kbd> | Input Field | Clear current input |
| <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd> | Global | Open Command Palette with live scale preview |

---

## 8. Multi-Format Clipboard Export

- **Copy Table**: Formatted Markdown table with Scale, Drawing Size, and Status columns.
- **Copy All**: Formatted list of all scale ratios and drawing sizes.
- **Copy Current Scale**: One-line summary for the active application scale.
- **Copy Raw CAD**: Space-separated raw numbers (`120 96 48 32 24 12`) for direct CAD drafting input.

---

## 9. Verification & Test Suite

The feature is verified by:
- **`tests/multi-scale.test.js`**: 55 automated assertions covering scale math, mixed units, expressions, custom ratios, paper contexts, target fit heuristics, sorting, favorites, and exports.
- **`tests/ui-contracts.test.js`**: Contract tests ensuring Mode 9 DOM elements and button wiring.
- **`npm test`**: Verified clean 100% pass rate across all 12 test suites.
