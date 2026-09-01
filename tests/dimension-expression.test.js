/**
 * Automated Test Suite for Dimension Expression Engine
 * Phase 2.5: Daily Architect Toolkit — Part 3: Dimension Expression Engine
 */

import {
  tokenizeExpression,
  parseExpression,
  evaluateExpression,
  evaluateExpressionSafe,
  isExpressionLike,
  EXPRESSION_ERROR_CODES
} from '../src/core/dimension-expression.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertCloseTo(actual, expected, maxDelta = 0.0001, message = '') {
  const delta = Math.abs(actual - expected);
  assert(delta <= maxDelta, `${message} (Expected approx ${expected}, got ${actual})`);
}

function assertThrows(fn, expectedErrorCode, message) {
  try {
    fn();
    console.error(`  ❌ FAIL: Expected error ${expectedErrorCode} but nothing was thrown - ${message}`);
    failed++;
  } catch (err) {
    if (expectedErrorCode && err.code !== expectedErrorCode) {
      console.error(`  ❌ FAIL: Expected error code ${expectedErrorCode} but got ${err.code} - ${message}`);
      failed++;
    } else {
      console.log(`  ✅ PASS: Threw expected error [${err.code || 'Error'}] - ${message}`);
      passed++;
    }
  }
}

console.log('🧪 Running tests/dimension-expression.test.js...\n');

// ---------------------------------------------------------------------------
// 1. isExpressionLike Detection
// ---------------------------------------------------------------------------
console.log('--- 1. Expression-Like Detection ---');
assert(isExpressionLike('2400 + 900') === true, 'Detects basic addition "+ "');
assert(isExpressionLike('2.4m - 1200mm') === true, 'Detects subtraction with units');
assert(isExpressionLike('250 * 8') === true, 'Detects multiplication "*"');
assert(isExpressionLike('2400 / 3') === true, 'Detects division "/"');
assert(isExpressionLike('250 × 8') === true, 'Detects unicode multiplication "×"');
assert(isExpressionLike('2400 ÷ 3') === true, 'Detects unicode division "÷"');
assert(isExpressionLike('(1200 + 600)') === true, 'Detects parentheses');
assert(isExpressionLike('2400mm') === false, 'Plain single dimension is not an expression');
assert(isExpressionLike("12'-6\"") === false, 'Feet-inches with hyphen is not an expression');
assert(isExpressionLike('') === false, 'Empty string is not an expression');

// ---------------------------------------------------------------------------
// 2. Tokenizer
// ---------------------------------------------------------------------------
console.log('\n--- 2. Tokenizer ---');
{
  const tokens = tokenizeExpression('2400mm + 900mm * 2');
  assert(tokens.length === 6, 'Token count is 6 (including EOF)');
  assert(tokens[0].type === 'DIMENSION' && tokens[0].detectedUnit === 'mm', 'Token 0 is DIMENSION mm');
  assert(tokens[1].type === 'OPERATOR' && tokens[1].value === '+', 'Token 1 is OPERATOR +');
  assert(tokens[2].type === 'DIMENSION' && tokens[2].detectedUnit === 'mm', 'Token 2 is DIMENSION mm');
  assert(tokens[3].type === 'OPERATOR' && tokens[3].value === '*', 'Token 3 is OPERATOR *');
  assert(tokens[4].type === 'NUMBER' && tokens[4].value === 2, 'Token 4 is NUMBER 2');
  assert(tokens[5].type === 'EOF', 'Token 5 is EOF');
}

{
  const tokens = tokenizeExpression("7' 6\" + 2.4m - 3 1/2\"");
  assert(tokens[0].type === 'DIMENSION' && tokens[0].detectedUnit === 'in', "Recognized feet-inches 7' 6\"");
  assert(tokens[2].type === 'DIMENSION' && tokens[2].detectedUnit === 'm', 'Recognized metric 2.4m');
  assert(tokens[4].type === 'DIMENSION' && tokens[4].detectedUnit === 'in', 'Recognized inch fraction 3 1/2"');
}

{
  const tokens = tokenizeExpression('1200 × 4 ÷ 2 − 100');
  assert(tokens[1].value === '*', 'Normalized × to *');
  assert(tokens[3].value === '/', 'Normalized ÷ to /');
  assert(tokens[5].value === '-', 'Normalized − to -');
}

assertThrows(
  () => tokenizeExpression('2400xyz + 100'),
  EXPRESSION_ERROR_CODES.UNEXPECTED_CHARACTER,
  'Rejects unknown unit suffix "xyz"'
);

assertThrows(
  () => tokenizeExpression(''),
  EXPRESSION_ERROR_CODES.EMPTY_EXPRESSION,
  'Rejects empty expression string'
);

// ---------------------------------------------------------------------------
// 3. Parser & Precedence
// ---------------------------------------------------------------------------
console.log('\n--- 3. Parser & Precedence ---');
{
  const ast = parseExpression('1200 + 600 * 2');
  assert(ast.type === 'BINARY_OP' && ast.operator === '+', 'Top node is addition');
  assert(ast.left.type === 'LITERAL_NUMBER' && ast.left.value === 1200, 'Left operand is 1200');
  assert(ast.right.type === 'BINARY_OP' && ast.right.operator === '*', 'Right operand is multiplication (precedence enforced)');
}

{
  const ast = parseExpression('(1200 + 600) * 2');
  assert(ast.type === 'BINARY_OP' && ast.operator === '*', 'Top node is multiplication due to parentheses');
  assert(ast.left.type === 'GROUPING', 'Left child is GROUPING');
}

assertThrows(
  () => parseExpression('1200 + * 600'),
  EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
  'Rejects consecutive operators "1200 + * 600"'
);

assertThrows(
  () => parseExpression('(1200 + 600'),
  EXPRESSION_ERROR_CODES.UNBALANCED_PARENTHESES,
  'Rejects missing closing parenthesis "(1200 + 600"'
);

assertThrows(
  () => parseExpression('1200 + 600)'),
  EXPRESSION_ERROR_CODES.UNEXPECTED_TOKEN,
  'Rejects unexpected closing parenthesis "1200 + 600)"'
);

// ---------------------------------------------------------------------------
// 4. Basic Evaluation & Standard Precedence
// ---------------------------------------------------------------------------
console.log('\n--- 4. Basic Evaluation & Standard Precedence ---');
{
  const res = evaluateExpression('2400 + 900', { defaultUnit: 'mm', displayUnit: 'mm' });
  assertCloseTo(res.value, 3.3, 0.0001, '2400 + 900 evaluates to 3.3 meters');
  assert(res.formatted === '3,300 mm', 'Formatted result is "3,300 mm"');
}

{
  const res = evaluateExpression('2400 - 900', { defaultUnit: 'mm', displayUnit: 'mm' });
  assertCloseTo(res.value, 1.5, 0.0001, '2400 - 900 evaluates to 1.5 meters');
  assert(res.formatted === '1,500 mm', 'Formatted result is "1,500 mm"');
}

{
  // 1200 + 600 * 2 = 2400 (not 3600)
  const res = evaluateExpression('1200 + 600 * 2', { defaultUnit: 'mm', displayUnit: 'mm' });
  assertCloseTo(res.value, 2.4, 0.0001, '1200 + 600 * 2 evaluates to 2.4 meters');
  assert(res.formatted === '2,400 mm', 'Formatted result is "2,400 mm" (standard precedence)');
}

{
  // (1200 + 600) * 2 = 3600
  const res = evaluateExpression('(1200 + 600) * 2', { defaultUnit: 'mm', displayUnit: 'mm' });
  assertCloseTo(res.value, 3.6, 0.0001, '(1200 + 600) * 2 evaluates to 3.6 meters');
  assert(res.formatted === '3,600 mm', 'Formatted result is "3,600 mm" with parentheses');
}

// ---------------------------------------------------------------------------
// 5. Mixed Units
// ---------------------------------------------------------------------------
console.log('\n--- 5. Mixed Units ---');
{
  const res = evaluateExpression('2.4m + 900mm', { displayUnit: 'm' });
  assertCloseTo(res.value, 3.3, 0.0001, '2.4m + 900mm evaluates to 3.3 m');
  assert(res.formatted === '3.3 m', 'Formatted is "3.3 m"');
}

{
  const res = evaluateExpression('1m + 25cm + 300mm', { displayUnit: 'm' });
  assertCloseTo(res.value, 1.55, 0.0001, '1m + 25cm + 300mm evaluates to 1.55 m');
  assert(res.formatted === '1.55 m', 'Formatted is "1.55 m"');
}

{
  const res = evaluateExpression('8ft + 6in', { displayUnit: 'ft' });
  assertCloseTo(res.value, 8.5 * 0.3048, 0.0001, '8ft + 6in evaluates to 8.5 ft');
}

{
  const res = evaluateExpression('5.4m - 1200mm', { displayUnit: 'm' });
  assertCloseTo(res.value, 4.2, 0.0001, '5.4m - 1200mm evaluates to 4.2 m');
  assert(res.formatted === '4.2 m', 'Formatted is "4.2 m"');
}

// ---------------------------------------------------------------------------
// 6. Architectural Feet-Inches & Fractions
// ---------------------------------------------------------------------------
console.log('\n--- 6. Architectural Feet-Inches & Fractions ---');
{
  const res = evaluateExpression("7' 6\" + 2' 6\"", { displayUnit: 'ft' });
  assertCloseTo(res.value, 10 * 0.3048, 0.0001, "7' 6\" + 2' 6\" evaluates to 10 ft");
}

{
  const res = evaluateExpression('3 1/2" + 1/2"', { displayUnit: 'in' });
  assertCloseTo(res.value, 4 * 0.0254, 0.0001, '3 1/2" + 1/2" evaluates to 4 in');
}

{
  const res = evaluateExpression("2m + 2' 6\"", { displayUnit: 'm' });
  assertCloseTo(res.value, 2 + (2.5 * 0.3048), 0.0001, "2m + 2' 6\" evaluates accurately");
}

// ---------------------------------------------------------------------------
// 7. Dimensional Semantics (Scalar vs Length)
// ---------------------------------------------------------------------------
console.log('\n--- 7. Dimensional Semantics ---');
{
  // length * scalar -> length
  const res = evaluateExpression('250mm * 8', { displayUnit: 'mm' });
  assert(res.dimension === 'length', '250mm * 8 produces length dimension');
  assert(res.formatted === '2,000 mm', '250mm * 8 = 2,000 mm');
}

{
  // scalar * length -> length
  const res = evaluateExpression('8 * 250mm', { displayUnit: 'mm' });
  assert(res.dimension === 'length', '8 * 250mm produces length dimension');
  assert(res.formatted === '2,000 mm', '8 * 250mm = 2,000 mm');
}

{
  // length / scalar -> length
  const res = evaluateExpression('2400mm / 3', { displayUnit: 'mm' });
  assert(res.dimension === 'length', '2400mm / 3 produces length dimension');
  assert(res.formatted === '800 mm', '2400mm / 3 = 800 mm');
}

{
  // length / length -> dimensionless scalar
  const res = evaluateExpression('2400mm / 800mm');
  assert(res.dimension === 'scalar', '2400mm / 800mm produces dimensionless scalar');
  assertCloseTo(res.value, 3, 0.0001, '2400mm / 800mm = 3 (dimensionless)');
  assert(res.formatted === '3', 'Formatted scalar is "3" without units');
}

{
  // (2.4m + 900mm) / 3
  const res = evaluateExpression('(2.4m + 900mm) / 3', { displayUnit: 'm' });
  assertCloseTo(res.value, 1.1, 0.0001, '(2.4m + 900mm) / 3 evaluates to 1.1 m');
}

assertThrows(
  () => evaluateExpression('1200mm * 500mm'),
  EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
  'Rejects multiplying two lengths (area producing)'
);

assertThrows(
  () => evaluateExpression('10 / 500mm'),
  EXPRESSION_ERROR_CODES.INCOMPATIBLE_DIMENSIONS,
  'Rejects dividing scalar by length'
);

// ---------------------------------------------------------------------------
// 8. Negative and Precision Invariants
// ---------------------------------------------------------------------------
console.log('\n--- 8. Negative and Precision Invariants ---');
{
  const res = evaluateExpression('1200mm - 1500mm', { displayUnit: 'mm' });
  assert(res.isNegative === true, '1200mm - 1500mm is marked negative');
  assertCloseTo(res.value, -0.3, 0.0001, 'Canonical value is -0.3 meters');
  assert(res.formatted === '-300 mm', 'Formatted is "-300 mm"');
}

{
  // Full float precision without premature rounding: 1000mm / 3
  const res = evaluateExpression('1000mm / 3', { displayUnit: 'm', precision: 6 });
  assertCloseTo(res.value, 1 / 3, 1e-12, '1000mm / 3 preserves unrounded 0.3333333333333333 meters');
}

// ---------------------------------------------------------------------------
// 9. Drawing Scale Integration
// ---------------------------------------------------------------------------
console.log('\n--- 9. Drawing Scale Integration ---');
{
  // 4500mm at 1:50 -> 90mm
  const res = evaluateExpression('2400mm + 900mm + 1200mm', { displayUnit: 'mm', scaleRatio: 50 });
  assert(res.formatted === '4,500 mm', 'Real result is 4,500 mm');
  assert(res.scaleRatio === 50, 'Scale ratio is 50');
  assertCloseTo(res.drawingMeters, 4.5 / 50, 0.0001, 'Drawing meters is 0.09 m');
  assert(res.drawingFormatted === '90 mm', 'Drawing formatted is "90 mm" @ 1:50');
}

{
  // 4500mm at 1:100 -> 45mm
  const res = evaluateExpression('2400mm + 900mm + 1200mm', { displayUnit: 'mm', scaleRatio: 100 });
  assert(res.drawingFormatted === '45 mm', 'Drawing formatted is "45 mm" @ 1:100');
}

// ---------------------------------------------------------------------------
// 10. Error Handling & Safety Limits
// ---------------------------------------------------------------------------
console.log('\n--- 10. Error Handling & Safety Limits ---');
assertThrows(
  () => evaluateExpression('2400mm / 0'),
  EXPRESSION_ERROR_CODES.DIVISION_BY_ZERO,
  'Catches division by zero'
);

assertThrows(
  () => evaluateExpression('2400 + + 900'),
  EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
  'Catches consecutive plus operators'
);

assertThrows(
  () => evaluateExpression('2400 * / 900'),
  EXPRESSION_ERROR_CODES.UNEXPECTED_OPERATOR,
  'Catches consecutive multiply-divide operators'
);

{
  const safeRes = evaluateExpressionSafe('2400 / 0');
  assert(safeRes.isValid === false, 'evaluateExpressionSafe returns isValid=false on error');
  assert(safeRes.error.code === EXPRESSION_ERROR_CODES.DIVISION_BY_ZERO, 'Returns structured error code');
}

{
  const safeRes = evaluateExpressionSafe('2400mm + 600mm');
  assert(safeRes.isValid === true, 'evaluateExpressionSafe returns isValid=true on valid math');
  assert(safeRes.formatted === '3,000 mm', 'Returns valid formatted result');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=================================================================`);
console.log(`Summary: ${passed} passed, ${failed} failed.`);
console.log(`=================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
