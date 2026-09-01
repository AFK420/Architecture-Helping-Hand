# Architecture Helping Hand — Dimension Workspace

> **Phase 2.5: Daily Architect Toolkit — Part 2: Dimension Workspace**
> High-Precision Multi-Dimension Scratchpad, Batch Scaling Engine & Dynamic Architectural Schedule

---

## 1. Overview

The **Dimension Workspace** is a dedicated architectural scratchpad designed for rapid dimension entry, simultaneous scale conversion, batch measurement management, and cumulative site/drawing totals calculation.

Architects, draftspersons, and estimators frequently need to work with multiple site measurements at once, testing how an entire sequence of dimensions converts to a chosen drawing scale without manually re-calculating every single measurement individually.

The Dimension Workspace bridges this gap with an architectural schedule table, live totals computation, instant unit conversions, row-level controls, and multi-format clipboard exports.

---

## 2. Architecture & Design Principles

```mermaid
flowchart LR
    RawInput["User Input\n(e.g. 2.4m, 900, 7' 10\", 3 1/2\")"] --> Parser["Unified Parser\n(src/core/parser.js)"]
    Parser --> EntryModel["Dimension Entry Model\n(src/core/dimension-workspace.js)"]
    EntryModel --> Canonical["Canonical Real Meters\n(realMeters)"]
    
    subgraph ScaleEngine["Live Scaling & Formatting Engine"]
        Canonical --> RealFormatted["Real Display Value\n(mm / cm / m / in / ft / ft-in)"]
        Canonical --> ScaleCalc["Scale Math: Drawing = Real / Scale"]
        ScaleCalc --> DrawingFormatted["Drawing Display Value\n(@ 1:50, 1:100, 1:20, etc.)"]
    end
    
    RealFormatted --> UI["Drafting Schedule Table\n(src/ui/app.js)"]
    DrawingFormatted --> UI
    
    UI --> Totals["Live Workspace Totals\n(Enabled Rows Only)"]
    UI --> Storage["LocalStorage Service\n(archiscale_dimension_workspace)"]
    UI --> Clipboard["Clipboard & TSV Export\n(Schedule / Drawing / TSV)"]
```

### Core Architecture Constraints
- **Zero Runtime Dependencies**: 100% native ES6 modules, CSS custom properties, and standard browser APIs.
- **Three-Tier Architecture**:
  - `src/core/dimension-workspace.js`: Headless mathematical model, normalization, scaling, totals, serialization.
  - `src/services/storage.js` & `src/services/history.js`: Isolated storage persistence and journal logging.
  - `src/ui/app.js` & `css/main.css`: Responsive drafting schedule table, mobile card layout, tactile audio triggers.
- **Offline & `file:///` Compatibility**: Standalone compiled bundle via `js/app.js` works in offline environments.
- **Storage Isolation**: Dedicated key `archiscale_dimension_workspace`, completely independent from calculation history.

---

## 3. Data Model & Schema

Each dimension row in the workspace is stored as a normalized `DimensionEntry` object:

```typescript
interface DimensionEntry {
  id: string;             // Unique ID (e.g. "dim_1730000000000_1_a1b2c")
  name: string;           // Architectural member name (e.g. "Wall A", "Door Opening")
  rawInput: string;       // User input string (e.g. "2.4m", "900", "7' 10\"", "3 1/2\"")
  defaultUnit: string;    // Fallback unit if no suffix was provided ("mm", "cm", "m", "in", "ft")
  parsedUnit: string;     // Recognized unit key
  realMeters: number|null;// Canonical real-world dimension in meters
  isValid: boolean;       // True if input successfully resolved to a positive number
  errorMessage: string|null; // Contextual error text if invalid
  notes: string;          // Optional user notes (e.g. "Verify on site", "Structural")
  enabled: boolean;       // Toggle inclusion in totals calculation
  groupId: string|null;   // Reserved for future grouping / dimension strings
}

interface WorkspaceState {
  scaleRatio: number;     // Active drawing scale denominator (e.g. 50 for 1:50)
  displayUnit: string;    // Target unit for formatting ("mm", "cm", "m", "in", "ft", "ft_in")
  entries: DimensionEntry[];
}
```

---

## 4. Mathematical Conversions & Precision

### 4.1 Canonical Base Unit
All dimensions are immediately normalized to **canonical meters** ($m$):
$$\text{realMeters} = \text{parsedValue} \times \text{UNITS}[\text{unitKey}].\text{toMeters}$$

### 4.2 Drawing Scale Calculation
Drawing length on paper ($D$) at scale $1:S$ is calculated directly from real-world meters ($R$):
$$D = \frac{R}{S}$$

- **Example**: A wall measuring $2,400\text{ mm}$ ($2.4\text{ m}$) at scale $1:50$:
  $$D = \frac{2.4\text{ m}}{50} = 0.048\text{ m} = 48\text{ mm}$$
- **Example**: The same wall at scale $1:100$:
  $$D = \frac{2.4\text{ m}}{100} = 0.024\text{ m} = 24\text{ mm}$$

### 4.3 Workspace Totals
Totals are calculated over all **enabled** and **valid** rows:
$$\text{totalRealMeters} = \sum_{i \in \text{Enabled}} \text{realMeters}_i$$
$$\text{totalDrawingMeters} = \frac{\text{totalRealMeters}}{S}$$

Disabled or invalid rows are excluded from totals immediately without deleting the row.

---

## 5. Key Features

| Feature | Description |
| :--- | :--- |
| **Multi-Row Drafting Schedule** | Enter multiple dimensions with names, raw input, notes, and instant real/drawing results. |
| **Live Dynamic Scaling** | Switch drawing scale ($1:20, 1:50, 1:100, 1:200$, custom) to update all drawing dimensions simultaneously. |
| **Independent Display Unit** | Switch display formatting between metric ($mm, cm, m$) and imperial ($in, ft$, Architectural $ft\text{-}in$). |
| **Live Totals Hero Panel** | Displays real-world total and scaled drawing total for all active rows. |
| **Enable/Disable Toggles** | Checkbox on each row allows taking measurements in and out of cumulative totals. |
| **Non-Destructive Validation** | Invalid inputs display an inline warning indicator without wiping user input or crashing totals. |
| **Row Management** | Quick row duplication, moving rows up/down ($\uparrow / \downarrow$), individual row copy, and deletion. |
| **Multi-Format Export** | Copy all dimensions as formatted schedule, copy drawing measurements only, or export TSV spreadsheet. |
| **Journal Integration** | One-click logging of complete workspace schedule summary into Calculation Journal. |
| **Resilient LocalStorage** | Auto-saves workspace state; automatically recovers default state if corrupted data is encountered. |

---

## 6. Global Navigation & Keyboard Shortcuts

- **Hotkey `7`**: Switch to Dimension Workspace mode.
- **Command Palette (`Ctrl+K` / `⌘K`)**: Type `workspace`, `dimension`, or `schedule` to jump directly into the tool.
- **Navigation Tab**: Located in top navigation bar (`Dimension Workspace [7]`).

---

## 7. Verification & Test Coverage

The Dimension Workspace is fully covered by automated unit tests in `tests/dimension-workspace.test.js`:
- Unit parsing for metric, imperial, fractions, and architectural notations.
- Scale conversions across standard and custom denominators.
- Totals calculation and disabled entry exclusion.
- Multi-mode clipboard formatting (Schedule, Drawing only, TSV spreadsheet).
- Serialization and corrupted storage recovery.
- DOM and UI contracts validation in `tests/ui-contracts.test.js`.
