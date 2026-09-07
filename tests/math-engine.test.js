/**
 * Mathematics Engine Test Suite — Phase 3 contract for the extended
 * dimension-expression engine: grammar, dimensional analysis, units,
 * precision, functions, comparisons, error quality.
 */

import {
  evaluateExpressionSafe,
  isExpressionLike,
  tokenizeExpression,
  parseExpression,
  EXPRESSION_ERROR_CODES
} from '../src/core/dimension-expression.js';
import { parseInput } from '../src/core/parser.js';
import { convertUnit } from '../src/core/units.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}
function close(expr, expected, delta, msg, opts = { defaultUnit: 'm', displayUnit: 'm' }) {
  const r = evaluateExpressionSafe(expr, opts);
  const ok = r.isValid && Math.abs(r.value - expected) <= delta;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${r.isValid ? r.value + ' ' + r.formatted : r.error.code})`}: ${msg}`);
}
function errorsWith(expr, code, msg, opts = { defaultUnit: 'm' }) {
  const r = evaluateExpressionSafe(expr, opts);
  const ok = !r.isValid && r.error.code === code;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${r.isValid ? r.formatted : r.error.code + ' — ' + r.error.message.slice(0, 60)})`}: ${msg}`);
}

console.log('\n--- 1. Spec expressions (lengths, mixed units) ---');
{
  close('2400mm', 2.4, 1e-9, '2400mm = 2.4 m');
  close('2.4m', 2.4, 1e-9, '2.4m = 2.4 m');
  close('2m + 400mm', 2.4, 1e-9, '2m + 400mm = 2.4 m');
  close('2400mm + 900mm', 3.3, 1e-9, '2400mm + 900mm = 3.3 m');
  close('2.4m - 350mm', 2.05, 1e-9, '2.4m - 350mm = 2.05 m');
  close('2.4m / 2', 1.2, 1e-9, '2.4m / 2 = 1.2 m');
  close('2.4m * 3', 7.2, 1e-9, '2.4m * 3 = 7.2 m');
  close('(2.4m + 1.2m) / 2', 1.8, 1e-9, '(2.4m + 1.2m) / 2 = 1.8 m');
  close("7' 6\"", 2.286, 0.001, "7' 6\" = 2.286 m");
  close("2'-6\"", 0.762, 0.001, "2'-6\" = 0.762 m");
  close("7' + 6\"", 2.286, 0.001, "7' + 6\" = 2.286 m (cross-unit addition)");
  close('1/4"', 0.00635, 0.0001, '1/4" = 6.35 mm');
  close('1e3mm', 1, 1e-9, '1e3mm = 1 m (scientific notation)');
  close('2.5e-1m', 0.25, 1e-9, '2.5e-1m = 0.25 m');
}

console.log('\n--- 2. Dimensional analysis ---');
{
  const area = evaluateExpressionSafe('2m * 2m', { defaultUnit: 'm', displayUnit: 'm2' });
  assert(area.isValid && area.dimension === 'area' && Math.abs(area.value - 4) < 1e-9, 'length * length = area (2m * 2m = 4 m²)');
  const vol = evaluateExpressionSafe('3m2 * 2m', { defaultUnit: 'm', displayUnit: 'm3' });
  assert(vol.isValid && vol.dimension === 'volume' && Math.abs(vol.value - 6) < 1e-9, 'area * length = volume (3 m² * 2 m = 6 m³)');
  const ratio = evaluateExpressionSafe('4m / 2m', { defaultUnit: 'm' });
  assert(ratio.isValid && ratio.dimension === 'scalar' && Math.abs(ratio.value - 2) < 1e-9, 'length / length = dimensionless ratio');
  const strip = evaluateExpressionSafe('20m2 / 5m', { defaultUnit: 'm' });
  assert(strip.isValid && Math.abs(strip.value - 4) < 1e-9, 'area / length = length (strip width)');
  const sec = evaluateExpressionSafe('30m3 / 5m2', { defaultUnit: 'm' });
  assert(sec.isValid && Math.abs(sec.value - 6) < 1e-9, 'volume / area = length (section depth)');
  errorsWith('2m + 3m2', EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS, 'length + area rejected with dimension error');
  errorsWith('2m = 3m2', EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS, 'cannot compare length with area');
  errorsWith('2m ^ 4', EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS, 'm ^ 4 is not an architectural unit (explained)');
}

console.log('\n--- 3. Operators: %, ^, comparisons, precedence ---');
{
  close('5 % 2', 1, 1e-9, '5 % 2 = 1');
  close('2.4m % 0.6m', 0, 1e-9, '2.4m % 0.6m = 0 (even spacing check)');
  close('2 ^ 3', 8, 1e-9, '2 ^ 3 = 8');
  close('2m ^ 2', 4, 1e-9, '2m ^ 2 = 4 m² (area)');
  close('2m ^ 3', 8, 1e-9, '2m ^ 3 = 8 m³ (volume)');
  close('(1 + 1) ^ 3', 8, 1e-9, 'parenthesized exponent base');
  // comparisons
  const cmp = (expr) => evaluateExpressionSafe(expr, { defaultUnit: 'm' });
  assert(cmp('2m = 2000mm').value === 1, '2m = 2000mm → true');
  assert(cmp('2m != 2000mm').value === 0, '2m != 2000mm → false');
  assert(cmp('2m > 1.5m').value === 1, '2m > 1.5m → true');
  assert(cmp('500mm <= 0.5m').value === 1, '500mm <= 0.5m → true');
  assert(cmp('2m < 1m').value === 0, '2m < 1m → false');
  assert(cmp('2m >= 2m').value === 1, '2m >= 2m → true (epsilon equality)');
  errorsWith('2m = 3m2', EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS, 'comparing length with area is explained');
}

console.log('\n--- 4. Functions ---');
{
  const min = evaluateExpressionSafe('min(2.4m, 1.8m)', { defaultUnit: 'm' });
  assert(min.isValid && Math.abs(min.value - 1.8) < 1e-9, 'min(2.4m, 1.8m) = 1.8 m');
  const max = evaluateExpressionSafe('max(2.4m, 1.8m)', { defaultUnit: 'm' });
  assert(max.isValid && Math.abs(max.value - 2.4) < 1e-9, 'max(2.4m, 1.8m) = 2.4 m');
  close('abs(0.5m - 2m)', 1.5, 1e-9, 'abs of a negative difference');
  close('sqrt(16m2)', 4, 1e-9, 'sqrt(16 m²) = 4 m (area → length)');
  close('sqrt(9)', 3, 1e-9, 'sqrt(9) = 3 (scalar)');
  close('round(2.4m + 350mm)', 2.75 + 0.25, 1e-9, 'round(2.75m) = 3 m');
  close('ceil(2.05m)', 3, 1e-9, 'ceil(2.05 m) = 3 m');
  close('floor(2.95m)', 2, 1e-9, 'floor(2.95 m) = 2 m');
  errorsWith('sqrt(4m)', EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS, 'sqrt of a length is rejected with explanation');
  errorsWith('min(2m, 3m2)', EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS, 'min across dimensions rejected');
  errorsWith('max()', EXPRESSION_ERROR_CODES.MISSING_OPERAND, 'malformed call missing parentheses explained');
}

console.log('\n--- 5. Negative, zero, large, small ---');
{
  close('-3m', -3, 1e-9, 'unary minus');
  close('2m - 5m', -3, 1e-9, 'negative result preserved');
  close('0mm + 0m', 0, 1e-9, 'zero');
  close('100000m + 1m', 100001, 1e-9, 'large values');
  close('0.001mm', 0.000001, 1e-12, 'small values');
  errorsWith('5m / 0', EXPRESSION_ERROR_CODES.DIVISION_BY_ZERO, 'division by zero explained');
  errorsWith('5m % 0m', EXPRESSION_ERROR_CODES.DIVISION_BY_ZERO, 'modulo by zero explained');
}

console.log('\n--- 6. Grammar / malformed input ---');
{
  assert(isExpressionLike('2m + 400mm') === true, 'isExpressionLike: addition');
  assert(isExpressionLike('250 × 8') === true, 'isExpressionLike: unicode ×');
  errorsWith('2m +', EXPRESSION_ERROR_CODES.MISSING_OPERAND, 'trailing operator explained');
  errorsWith('(2m + 400mm', EXPRESSION_ERROR_CODES.UNBALANCED_PARENTHESES, 'unbalanced parenthesis explained');
  errorsWith('2m + + 3m', EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR, 'consecutive operators explained');
  errorsWith('2m + 4zz', EXPRESSION_ERROR_CODES.UNEXPECTED_CHARACTER, 'unknown unit suffix explained');
  errorsWith('', EXPRESSION_ERROR_CODES.EMPTY_EXPRESSION, 'empty expression explained');
  const malformed = evaluateExpressionSafe('2m +** 3', { defaultUnit: 'm' });
  assert(!malformed.isValid && malformed.error.message.length > 10, 'malformed input produces an explanatory message');
}

console.log('\n--- 7. Precision & conversion integration ---');
{
  close('0.1m + 0.2m', 0.3, 1e-9, '0.1 + 0.2 m stays within 1e-9 of 0.3 (calculation precision; display rounds)');
  close('1in', 0.0254, 1e-12, 'inch → m exact factor');
  assert(Math.abs(convertUnit(1, 'ft', 'mm') - 304.8) < 1e-9, 'convertUnit ft→mm exact');
  assert(Math.abs(convertUnit(1, 'sq_ft', 'm2') - 0.09290304) < 1e-12, 'convertUnit sq_ft→m2 exact');
  const p = parseInput("12'6 1/2\"", { allowNegative: true });
  assert(p.isValid && Math.abs(p.value - 150.5) < 1e-6, 'parser: 12\'6 1/2" = 150.5 in (shared unit engine)');
}

console.log(`\n========================================`);
console.log(`Mathematics Engine Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
