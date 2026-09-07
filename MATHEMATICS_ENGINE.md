# Mathematics Engine

**Implementation:** `src/core/dimension-expression.js` (extended in Phase 3 —
this is THE math engine; there is no duplicate arithmetic system).
Consumers: Dimension Expression studio tool, CAD command line
(`cad-commands.parseLengthToken` / coordinates), AI facts tooling.

## Architecture

Tokenizer → Parser → AST → Dimensional evaluator → Formatter. **No `eval`,**
no `new Function`, no regex-chain parsing for expressions. Hard limits:
1000 chars, 200 tokens, 50 nesting depth.

## Number types

| Type | Syntax | Notes |
|---|---|---|
| integer | `2400` | bare numbers take the command's default unit |
| decimal | `2.4` | |
| negative | `-3m`, `2m - 5m` | unary minus, negative results preserved |
| zero | `0` | safe in all operators except `/` and `%` by zero |
| scientific | `1e3mm`, `2.5e-1m` | exponent only consumed when followed by digit/sign |
| fractions | `1/4"`, `6 1/2"`, `3 1/2` | architectural inch fractions + plain fractions |
| feet/inches | `7' 6"`, `2'-6"`, `8'`, `6"` | full architectural notation incl. hyphen separator |
| mixed units | `2m + 400mm` | any combination; converted to canonical meters |
| area/volume | `4m2`, `2.5m²`, `120sq_ft`, `2.5m3`, `30m³`, `2ha`, `5L` | first-class dimensions |

## Operators

| Precedence (high→low) | Operators | Dimensional semantics |
|---|---|---|
| 1 | unary `+ -` | keeps operand dimension |
| 2 | `^` (right-assoc) | scalar^scalar = scalar; length^2 = area; length^3 = volume; others rejected with explanation |
| 3 | `* /` | length*length = area; area*length = volume; area/length = length; volume/area = length; x/scalar and scalar*x keep the dimension; same/same = scalar ratio |
| 4 | `+ -` | same dimension only (length±length, area±area, volume±volume); length±bare-scalar interprets the scalar in the default unit |
| 5 | `= != < > <= >=` | same dimension required → boolean |

All invalid combinations throw `INCOMPATIBLE_DIMENSIONS` with a message that
states WHAT was combined, WHY it is invalid, and WHAT the valid forms are
(e.g. `Cannot multiply length by area — supported: length*length = area,
area*length = volume, x*scalar keeps x.`).

## Functions

`min(...)`, `max(...)` — arguments must share one dimension; the result keeps
it (and the winning unit). `abs()`, `round()`, `ceil()`, `floor()` — keep the
argument dimension. `sqrt()` — area→length (`sqrt(16 m²) = 4 m`) and
scalar→scalar; `sqrt(length)` is rejected with an explanation. Only functions
with well-defined architectural semantics are exposed.

## Canonical units & precision

Canonical internal representation: **meters / m² / m³** (conversion factors
from `units.js`, exact by definition). Calculation precision = IEEE-754 double
with `1e-9` epsilon for equality/comparison; **no rounding before the
presentation boundary**. Display precision is a separate, explicit parameter
(`precision`, default 3 decimals) applied only in the formatter.

## Error contract

Every failure carries a stable `code` (`MISSING_OPERAND`,
`UNBALANCED_PARENTHESES`, `INCOMPATIBLE_DIMENSIONS`, `DIVISION_BY_ZERO`,
`UNEXPECTED_CHARACTER`, …), the character position, and a message with
WHAT / WHY / EXPECTED / EXAMPLE:

- `Unknown command "WAL". Did you mean WALL?` (command layer)
- `"abc" is not a valid length — try 2400mm, 2.4m, 8', or an expression like 2m+400mm.`
- `Cannot add or subtract length and area — both operands must measure the same kind of quantity (e.g. 2 m + 400 mm, or 4 m2 + 2 m2).`
- `The exponent of "^" must be a plain number — received area. E.g. 2 m ^ 2 = 4 m2.`
- `sqrt(length) is not defined — sqrt works on areas (sqrt(16 m2) = 4 m) or plain numbers.`

## Integration

`cad-commands.parseLengthToken` accepts full expressions (`@2m+400mm<0` as a
WALL endpoint), routing operator-bearing inputs through this engine and
falling back to `parser.parseInput` for single values. Area/volume results in
a length context produce an honest error rather than a nonsense number.

## Tests

`tests/math-engine.test.js` — 66 assertions across: spec expressions,
dimensional analysis, `%`/`^`/comparisons/precedence, functions,
negative/zero/large/small, malformed input, precision, conversion, fractions,
angles-adjacent units. `tests/dimension-expression.test.js` (70+) guards the
original contracts (one legacy expectation updated: `length*length` now
produces area per the Phase 3 spec instead of erroring).
