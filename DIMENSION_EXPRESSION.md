# Architecture Helping Hand — Dimension Expression Engine

> **Phase 2.5: Daily Architect Toolkit — Part 3: Dimension Expression Engine**  
> Deterministic Mixed-Unit Architectural Math Engine, Operator Precedence, Dimensional Semantics & Scaled Drafting Output

---

## 1. Overview & Purpose

Architects and draftspersons frequently need to compute composite dimensions directly from plan measurements across varying units and notations (e.g. `2400 + 900 + 1200`, `5.4m - 1200mm`, `(2.4m + 900mm) / 3`, `250mm * 8`, `7' 6" + 2' 6"`).

The **Dimension Expression Engine** provides a pure, zero-dependency mathematical evaluation pipeline that evaluates dimensional expressions with:
- **Strict Dimensional Semantics**: Lengths, scalars, ratios, and counts operate according to physical units.
- **Zero Insecure Code Execution**: Strictly written with a deterministic tokenizer and recursive-descent AST parser (never uses `eval()` or `new Function()`).
- **Mixed Unit Normalization**: Mixed metric and imperial units normalize to canonical meters ($m$) during computation without loss of intermediate precision.
- **Full Architectural Notation Support**: Handles feet-and-inches (`7' 6"`, `12'-6 1/2"`), standalone inch fractions (`3 1/2"`, `5/8"`), metric units (`mm`, `cm`, `m`), and bare numbers based on the active default unit.
- **Immediate Scaled Drawing Output**: Computes the exact paper/drafting length for any scale ratio (e.g. `1:50`, `1:100`, `1:20`).
- **Seamless Workspace & Journal Integration**: Direct insertion into the **Dimension Workspace** schedule with semantic role control (`REF`, `SEG`, `ALW`) and instant logging to the **Calculation Journal**.
- **Global Command Palette Live Preview**: Instant live expression detection and evaluated math preview inside <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd>.

---

## 2. Mathematical Pipeline & AST Architecture

```mermaid
flowchart TD
    Raw["User Expression\n(e.g. (2.4m + 900mm) / 3 or 2400 + 900)"] --> Tokenizer["Deterministic Tokenizer\n(tokenizeExpression)"]
    Tokenizer --> Tokens["Token Stream\n[LPAREN, DIMENSION(2.4m), OPERATOR(+), DIMENSION(900mm), RPAREN, OPERATOR(/), NUMBER(3)]"]
    Tokens --> Parser["Recursive Descent Parser\n(Expression -> Addition -> Multiplication -> Unary -> Primary)"]
    Parser --> AST["Abstract Syntax Tree (AST)\n(BinaryOp: /, Left: Grouping(2.4m + 0.9m), Right: Scalar(3))"]
    AST --> Evaluator["Dimensional Evaluator\n(evaluateASTNode)"]
    Evaluator --> Result["Evaluated Quantity\n{ value: 1.1, dimension: 'length', canonicalMeters: 1.1 }"]
    Result --> Formatter["Unified Formatter\n(formatExpressionResult)"]
    Formatter --> UI["Dimension Expression Faceplate (Mode 8)\n• Real: 1.1 m\n• Drawing @ 1:50: 22 mm\n• Equivalents: 110 cm, 1,100 mm, 3'-7 5/16\""]
    Formatter --> Workspace["Add to Dimension Workspace\n(Role: REF / SEG / ALW)"]
    Formatter --> Journal["Calculation Journal Logging\n(State Snapshot Restoration)"]
```

---

## 3. Dimensional Semantics & Invariants

The expression engine enforces physical dimensional rules across linear dimensions and dimensionless scalars:

| Expression Type | Example | Evaluation Rule | Result Dimension |
| :--- | :--- | :--- | :--- |
| **Length $\pm$ Length** | `2.4m + 900mm` | Sum/difference in canonical meters ($2.4 + 0.9 = 3.3\text{ m}$) | `length` |
| **Length $\times$ Scalar** | `250mm * 8` | Scale length by count ($0.25\text{ m} \times 8 = 2.0\text{ m}$) | `length` |
| **Scalar $\times$ Length** | `8 * 250mm` | Scale length by count ($8 \times 0.25\text{ m} = 2.0\text{ m}$) | `length` |
| **Length $\div$ Scalar** | `2400mm / 3` | Divide length into equal segments ($2.4\text{ m} \div 3 = 0.8\text{ m}$) | `length` |
| **Length $\div$ Length** | `2400mm / 800mm` | Ratio of two lengths yields dimensionless count ($2.4\text{ m} \div 0.8\text{ m} = 3$) | `scalar` (dimensionless) |
| **Bare Numbers** | `2400 + 900` | Numbers without units assume active default unit (`mm` $\rightarrow 3,300\text{ mm}$) | `length` |
| **Parentheses Grouping** | `(1200 + 600) * 2` | Evaluates sub-expression first ($1800 \times 2 = 3,600\text{ mm}$) | `length` |
| **Negative Results** | `1200mm - 1500mm` | Preserves valid mathematical sign ($-300\text{ mm}$) | `length` |
| **Length $\times$ Length** | `1200mm * 500mm` | Rejected with `INCOMPATIBLE_DIMENSIONS` (Area calculations belong in Area & Volume tool) | Error |
| **Scalar $\div$ Length** | `10 / 500mm` | Rejected with `INCOMPATIBLE_DIMENSIONS` | Error |
| **Division by Zero** | `2400mm / 0` | Rejected with `DIVISION_BY_ZERO` | Error |

---

## 4. Supported Architectural Syntax

### A. Metric Notations
- Millimeters: `2400mm`, `900 mm`, `1200` (when default unit is `mm`)
- Centimeters: `150cm`, `25 cm`
- Meters: `2.4m`, `5.4 m`, `0.75m`

### B. Imperial & US Customary Notations
- Feet & Inches: `7' 6"`, `12'-6 1/2"`, `8'`, `6"`
- Standalone Inch Fractions: `3 1/2"`, `5/8"`, `1/16"`
- Suffixes: `8ft`, `6in`, `10yd`

### C. Operator Aliases
- Addition: `+`
- Subtraction: `-`, `−` (Unicode minus)
- Multiplication: `*`, `×` (Unicode cross)
- Division: `/`, `÷` (Unicode obelus)
- Grouping: `( )`

---

## 5. Structured Error Codes

The expression engine returns structured, actionable error codes:

| Error Code | Meaning | User Feedback Message |
| :--- | :--- | :--- |
| `EMPTY_EXPRESSION` | Input string contains no tokens | "Enter a mathematical dimension expression" |
| `UNEXPECTED_OPERATOR` | Consecutive or misplaced operators (e.g. `2400 + * 900`) | "Unexpected operator. Expected a measurement or number." |
| `UNBALANCED_PARENTHESES` | Missing closing or opening parenthesis | "Missing closing parenthesis \")\"" |
| `UNEXPECTED_CHARACTER` | Unknown unit suffix or illegal character | "Unknown unit suffix or unexpected character" |
| `DIVISION_BY_ZERO` | Divisor magnitude $< 10^{-15}$ | "Division by zero is undefined" |
| `INCOMPATIBLE_DIMENSIONS` | Dimensional mismatch (e.g. length $\times$ length) | "Multiplying two lengths produces an area (m²); this linear expression engine calculates lengths and scalar counts." |
| `MAX_DEPTH_EXCEEDED` | Exceeded nesting limit ($> 50$) | "Exceeded maximum nesting depth" |
| `MAX_TOKENS_EXCEEDED` | Exceeded maximum token count ($> 200$) | "Expression contains too many tokens" |

---

## 6. User Experience & Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| <kbd>8</kbd> | Global | Switch to **Dimension Expression Calculator** (Mode 8) |
| <kbd>Enter ↵</kbd> | Expression Input | Evaluate expression and add to Recent History |
| <kbd>Shift+Enter ⇧↵</kbd> | Expression Input / Form | Evaluate expression and immediately **Add to Workspace** |
| <kbd>Esc</kbd> | Expression Input | Clear current expression input |
| <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd> | Global | Open Command Palette (type any math expression for instant live preview) |

---

## 7. Verification & Automated Test Coverage

The Dimension Expression Engine is verified by automated test suites:
- **`tests/dimension-expression.test.js`**: 79 unit assertions verifying tokenization, recursive-descent parsing, operator precedence, parentheses, mixed units, fractions, scalar counts, dimensionless scalar results, scale calculations, zero division, and syntax errors.
- **`tests/ui-contracts.test.js`**: Verified DOM integrity for Mode 8 elements, run buttons, and command palette bindings.
- **`npm test`**: Verified across all 12 test suites.
