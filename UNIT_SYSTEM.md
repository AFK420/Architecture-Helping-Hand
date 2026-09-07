# Unit System

**Single canonical unit engine:** `src/core/units.js`. The mathematics engine,
command line, parser, and every calculator share these exact tables — there is
exactly one conversion source in the application.

## Canonical internal units

| Dimension | Canonical | Derived on demand |
|---|---|---|
| length | **meters (m)** | mm, cm, dm, km, in, ft, yd, mi, ft_in (display) |
| area | **square meters (m²)** | mm², cm², km², ha, sq in, sq ft, sq yd, acre |
| volume | **cubic meters (m³)** | mm³, cm³, liters, cu in, cu ft, cu yd |
| angle | **degrees (°)** for display; radians internally in trig | — |
| scalar | **dimensionless** (ratios, counts, percentages) | — |

Conversion factors are exact physical constants (e.g. `ft = 0.3048 m`,
`sq_ft = 0.09290304 m²`, `acre = 4046.8564224 m²`) — no approximations.

## Conversion

```js
convertUnit(value, fromKey, toKey)   // same-dimension only; throws on mismatch
requireUnit(key, expectedDimension)  // loud validation with dimension check
```

## Precision rules (explicit)

1. **Calculation precision:** IEEE-754 double; canonical units chosen so
   architectural magnitudes stay well inside the exact-integer range after
   scaling (mm values < 2⁵³). No epsilon games inside arithmetic.
2. **Comparison tolerance:** equality/comparisons in the expression engine use
   `1e-9` on canonical values — `2 m = 2000 mm` is true.
3. **Display precision:** a separate `precision` parameter (default 3
   decimals) applied **only** in formatters (`formatNumber`,
   `formatFeetInches`, expression result formatter). Never round early; never
   persist rounded values (Phase 2 stripped stored rounded copies for exactly
   this reason).
4. **Fractions:** computed as exact rationals at parse time (`1/2" = 0.5 in`
   exact); displayed as architectural fractions only at presentation.

## Mixed-unit rules

Any combination is valid **within a dimension**: `2m + 400mm`, `8' + 30cm`,
`4 m² + 200 sq_ft`. Cross-dimension arithmetic follows dimensional analysis
(see `EXPRESSION_GRAMMAR.md`); cross-dimension comparison is rejected.

## Percent

Percent is a **scalar presentation concept** (25% ≡ 0.25) — `x * 0.25` or
`x / 4` is the engine form. A dedicated `%` postfix was deliberately not
added to the expression grammar to keep `%` = modulo unambiguous; percentage
workflows live in the Percentage studio tool and scale commands.
