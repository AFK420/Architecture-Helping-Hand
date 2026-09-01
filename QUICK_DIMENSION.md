# Architecture Helping Hand — Quick Dimension Strip

> **Phase 2.5: Daily Architect Toolkit — Part 8: Quick Dimension Strip**  
> Compact Glanceable Architectural Dimension Inspector, Multi-Scale Drawing Size Matrix, Verified Standard Heuristics & Instant CAD Copy

---

## 1. Overview & Purpose

The **Quick Dimension Strip** is a compact, always-accessible architectural drafting instrument designed for rapid dimension inspections without navigating away from the current workspace or mode.

```mermaid
flowchart TD
    subgraph Input["1. Glance Input"]
        Raw["Type or Paste Dimension\n(2400, 2400mm, 2.4m, 7' 6\", 3 1/2in)"]
        Math["Arithmetic Expressions\n(2400 + 900, 5.4m - 1200mm, (2.4m + 900mm) / 3)"]
        Dir["Direction: Real ➔ Draw vs Draw ➔ Real"]
    end

    Input --> Engine["2. Pure Core Quick Dimension Engine\n(src/core/quick-dimension.js)"]

    subgraph Output["3. Instant Architectural Interpretations"]
        Engine --> Hero["Real-World Primary & Selected Scale Hero Readout\n(e.g., 2.400 m | 1:50 ➔ 48 mm)"]
        Engine --> Equiv["Common Unit Equivalents\n(MM • CM • M • IN • FT-IN)"]
        Engine --> Matrix["Compact Multi-Scale Matrix\n(1:10, 1:20, 1:25, 1:50, 1:75, 1:100, 1:125, 1:200, 1:250, 1:500, Custom)"]
        Engine --> Context["Architectural Context Readouts\n(Verified Standard Heuristics or Explicit Fallback)"]
    end

    subgraph Actions["4. 1-Click Copy & Tool Handoffs"]
        Output --> Copy["Copy Real • Copy Draw • Copy CAD • Copy All Scales • TSV Row"]
        Output --> H1["📐 Add to Dimension Workspace (Mode 7)"]
        Output --> H2["📊 Open in Multi-Scale Comparison (Mode 9)"]
        Output --> H3["🔗 Add to Dimension Chain (Mode 10)"]
        Output --> H4["📋 Transmit to CAD Clipboard (Mode 11)"]
        Output --> H5["📜 Save to Calculation Journal"]
    end
```

---

## 2. Core Design Principles

> [!NOTE]
> **Headless Micro-Tool Architecture**  
> Quick Dimension Strip acts as a lightweight orchestration instrument above existing core libraries (`parser.js`, `units.js`, `dimension-expression.js`, `calculator.js`, `formatter.js`, `cad-clipboard.js`, `dimension-workspace.js`, `dimension-chains.js`). Zero duplicated math formulas or parallel unit definitions.

* **Keyboard-First Interaction**: Accessible anywhere via <kbd>Q</kbd>, recalculates on keystroke or <kbd>Enter</kbd>, dismissible via <kbd>Esc</kbd>.
* **Tactile Drafting Instrument**: Compact, high-contrast monospace displays with Plus Jakarta Sans labels and dark blueprint accents.
* **Non-Destructive & Isolated**: Typing invalid input displays clean inline feedback without crashing or overwriting user data.
* **Verified Architectural Context**: Matches dimensions against verified physical ranges (doors, stairs, counters, corridors, ceilings) and explicitly outputs *"No stored reference for this dimension."* when unmatched to prevent false standard claims.

---

## 3. Supported Input Formats & Expressions

| Input Style | Example Input | Real-World Value | 1:50 Drawing Size | Common Equivalents |
| :--- | :--- | :---: | :---: | :--- |
| **Bare Number** | `2400` | 2400.00 mm | 48.00 mm | 240 cm • 2.4 m • 7'-10 7/16" |
| **Explicit Unit** | `2.4m` | 2.400 m | 48.00 mm | 2400 mm • 240 cm • 94.49 in |
| **Feet & Inches** | `7' 6"` | 2286.00 mm | 45.72 mm | 2.286 m • 90 in • 7'-6" |
| **Fractional Inches**| `3 1/2in` | 88.90 mm | 1.78 mm | 8.89 cm • 3.5 in • 0'-3 1/2" |
| **Inline Addition** | `2400 + 900 + 1200` | 4500.00 mm | 90.00 mm | 4.5 m • 450 cm • 14'-9 3/16" |
| **Mixed-Unit Math** | `5.4m - 1200mm` | 4200.00 mm | 84.00 mm | 4.2 m • 420 cm • 13'-9 3/8" |
| **Division / Groups**| `(2.4m + 900mm) / 3` | 1100.00 mm | 22.00 mm | 1.1 m • 110 cm • 3'-7 5/16" |

---

## 4. Multi-Scale Drawing Size Matrix

For any evaluated dimension, the strip generates a live drawing size matrix across 10 standard architectural scale denominators:

$$\text{Drawing Length} = \frac{\text{Real Length}}{\text{Scale Denominator}}$$

| Architectural Scale | Ratio | Drawing Size (for 2400 mm) | Typical Use |
| :--- | :---: | :---: | :--- |
| **1:10** | 10 | 240.00 mm | Construction details & joinery |
| **1:20** | 20 | 120.00 mm | Interior elevations & stairs |
| **1:25** | 25 | 96.00 mm | Kitchen layouts & millwork |
| **1:50** | 50 | 48.00 mm | General arrangement floor plans |
| **1:75** | 75 | 32.00 mm | Intermediate scale schemes |
| **1:100** | 100 | 24.00 mm | Standard architectural building plans |
| **1:125** | 125 | 19.20 mm | Compact institutional plans |
| **1:200** | 200 | 12.00 mm | Site plans & broad sections |
| **1:250** | 250 | 9.60 mm | Massing & site layout |
| **1:500** | 500 | 4.80 mm | Campus & urban masterplans |
| **Custom (1:X)** | $X$ | Calculated dynamically | User-defined ratios |

---

## 5. Architectural Contextual Heuristics

The context engine checks real-world dimensions against verified architectural standards:

* **75–100 mm**: Standard interior drywall / metal stud partition thickness.
* **150–180 mm**: Architectural stair riser height.
* **250–300 mm**: Architectural stair tread depth (going).
* **600 mm**: Standard kitchen countertop / base cabinet depth.
* **700–800 mm**: Standard interior passage door width or desk work height.
* **850–900 mm**: Main entry door / ADA accessible doorway width or kitchen counter height.
* **1000–1100 mm**: Commercial door width or stair guardrail/balustrade height.
* **1200–1500 mm**: Comfortable 2-person circulation corridor width.
* **1500–1524 mm**: Standard ADA wheelchair 360° turning diameter clearance.
* **1800 mm**: King size bed width or double French door opening.
* **2100 mm**: Standard door rough opening frame height.
* **2400 mm**: Standard residential ceiling height.
* **2700 mm**: Generous / high residential ceiling height.
* **3000 mm**: Commercial office / luxury residential ceiling height.
* **Unmatched Dimensions**: Explicitly returns `"No stored reference for this dimension."`

---

## 6. Keyboard Shortcuts & Controls

| Shortcut | Context | Action |
| :---: | :--- | :--- |
| <kbd>Q</kbd> | Anywhere (not in input) | **Toggle / Focus Quick Dimension Strip** |
| <kbd>Enter</kbd> | Inside Quick Dim Input | **Calculate & Commit Evaluation** |
| <kbd>Esc</kbd> | Inside Strip | **Close Strip (if unpinned)** |
| 📌 Button | Top Right | **Pin Strip Open Across All Navigation** |
| Mode Pills | Top Right | **Switch Real ➔ Drawing vs Drawing ➔ Real** |

---

## 7. Downstream Tool Handoffs

* **📐 Add to Workspace (Mode 7)**: Appends dimension as an entry with notes and drawing size.
* **📊 Compare in Multi-Scale (Mode 9)**: Opens Multi-Scale Comparison with the dimension loaded.
* **🔗 Add to Dimension Chain (Mode 10)**: Appends dimension as an active chain segment.
* **📋 Transmit to CAD Clipboard (Mode 11)**: Sends clean space-separated CAD numbers.
* **📜 Save to Journal**: Commits timestamped snapshot to Calculation History.
