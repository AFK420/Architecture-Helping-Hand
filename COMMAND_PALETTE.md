# Architecture Helping Hand — Global Command Palette
## Architect's Command Center (`Ctrl + K` / `Cmd + K`)

The **Global Command Palette** is a keyboard-first command center designed specifically for architects, engineers, and CAD professionals. It allows instant tool switching, rapid calculation retrieval, workspace configuration, and journal export without needing to navigate via manual mouse clicks.

---

## 1. Key Features & Workflow

- **Global Hotkey (`Ctrl + K` / `Cmd + K`)**: Accessible anywhere within the application, including while typing inside inputs and selects.
- **Top Header Quick Trigger**: One-click button (`#command-palette-btn`) displaying search icon, label, and keyboard shortcut badge.
- **Multi-Token Technical Search**: Matches queries across command title, description, category, ID, and keyword aliases (e.g. `scale sheet`, `ada ramp`, `m2 sqft`, `history csv`).
- **Dynamic Recent Commands**: Automatically captures the 10 most recently executed commands, deduplicated, newest first.
- **Favorites System**: One-click star (`★`) toggle pinning up to 10 frequently used actions to the top of the palette.
- **Full Keyboard Navigation**: Arrow keys (`↑`/`↓`), `Enter` to execute, `Esc` to dismiss and restore prior DOM focus.
- **Drafting Aesthetic & Responsive Layout**: Styled with technical studio borders, backdrop blur, monospace shortcut badges, and bottom-sheet touch optimization for mobile.
- **Zero Runtime Dependencies**: Pure vanilla JavaScript module with strict three-tier architecture isolation (`src/services/commands.js`).

---

## 2. Keyboard & Mouse Navigation

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> | Toggle Command Palette open / closed | Global (Workstation-wide) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Navigate up/down through command list | Palette active |
| <kbd>Enter ↵</kbd> | Execute selected command | Palette active |
| <kbd>Esc</kbd> | Close Command Palette & restore focus | Palette active |
| Click <kbd>★</kbd> | Toggle command in Favorites list | Palette active |
| Click outside / overlay | Close Command Palette | Palette active |

---

## 3. Built-In Command Registry

### Navigation Commands
| Icon | Command | Shortcut | Description | Target Action |
| :--- | :--- | :--- | :--- | :--- |
| 📐 | **Scale Converter** | `1` | Convert dimensions between paper drawing and real site | `switchMode('converter')` |
| 🔄 | **Rescaler** | `2` | Convert drawing measurements between different scales | `switchMode('rescale')` |
| 🔍 | **Scale Detector** | `3` | Detect unknown scale ratio from paper & real measurements | `switchMode('detector')` |
| 📦 | **Area & Volume Scaler** | `4` | Scale 2D surface areas ($m^2$, $sq\text{ }ft$) and 3D volumes | `switchMode('area_volume')` |
| 🛋️ | **Furniture & Space Planning** | `5` | Browse 179 standard architectural fixtures and blueprints | `switchMode('furniture')` |
| 📚 | **Drafting Reference Sheet** | `6` | Scale ruler, benchmark lengths, and 100mm print calibration | `switchMode('reference')` |
| 📜 | **Calculation Journal** | `H` | Open calculation history drawer and restore past records | `toggleHistoryDrawer()` |
| ⌨️ | **Keyboard Shortcuts & Guide** | `?` | View all workstation hotkeys and drafting tips | Open shortcuts modal |

### Utility Actions
| Icon | Action | Description |
| :--- | :--- | :--- |
| 📋 | **Copy Active Result** | Copy the latest calculation result to system clipboard |
| 🎨 | **Cycle Studio Theme** | Switch themes (Studio Dark ➔ Drafting Paper ➔ Blueprint Cyan) |
| 🔊 | **Toggle Tactile Audio** | Enable or mute tactile synthesized audio clicks |
| 📥 | **Export Journal as CSV** | Download all journal entries as a CSV spreadsheet |
| 📝 | **Export Journal as Markdown** | Copy journal formatted as GitHub Markdown table |
| 🗑️ | **Clear Calculation Journal** | Wipe all saved calculations from storage |

### Upcoming Phase 2.5 Tool Placeholders (`available: false`)
| Icon | Tool | Status | Description |
| :--- | :--- | :--- | :--- |
| 📐 | **Dimension Workspace** | `Phase 2.5` | Multi-measurement workspace for simultaneous scaling |
| 🧮 | **Dimension Expression Calculator** | `Phase 2.5` | Mixed-unit architectural math (`2.4m + 180mm - 2'-6"`) |
| 🔗 | **Dimension Chains** | `Phase 2.5` | Cumulative structural grid and partition dimension strings |
| 📋 | **CAD Clipboard & Formats** | `Phase 2.5` | Instant copy formatting for AutoCAD, Rhino, Revit & SketchUp |
| ⚡ | **Batch CAD Dimension Converter** | `Phase 2.5` | Bulk scale conversion for schedules and raw CAD lists |
| 🪜 | **Stair & Riser Calculator** | `Phase 2.5` | Riser counts, tread depths, slope angles, and IBC code compliance |
| ♿ | **ADA Ramp Slope Calculator** | `Phase 2.5` | Ramp run, total rise, landing lengths, and 1:12 ADA slope |
| 🏢 | **Interactive Space Planner** | `Phase 2.5` | 2D canvas for room layout and blueprint fixture arrangement |

---

## 4. Storage Persistence & Safety Contracts

The command palette uses safe, isolated `localStorage` keys via `StorageService`:
- `archiscale_recent_commands`: JSON array of up to 10 command IDs (deduplicated, newest first).
- `archiscale_favorite_commands`: JSON array of up to 10 pinned command IDs.
- **Isolated Storage**: Completely separate from `archiscale_calculation_history` and `archi_theme`.
- **Corrupted Storage Recovery**: Wrapped in try/catch blocks; returns clean empty fallback arrays if storage contains invalid JSON.

---

## 5. Extension API

New tools can register commands at runtime via the `CommandRegistry` module:

```javascript
import { CommandRegistry } from './src/services/commands.js';

CommandRegistry.register({
  id: 'my-custom-tool',
  title: 'Custom Truss Calculator',
  description: 'Calculate span-to-depth ratios and load paths',
  category: 'Structural',
  icon: '🏗️',
  keywords: ['truss', 'structural', 'span', 'load'],
  shortcut: null,
  actionType: 'navigation',
  available: true,
  action: () => {
    // Custom tool logic
  }
});
```
