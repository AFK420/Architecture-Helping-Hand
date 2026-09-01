/**
 * Architecture Helping Hand - Parser Unit & Regression Tests
 */

import { parseInput, parseFraction } from '../src/core/parser.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
    failed++;
  }
}

function approxEqual(a, b, epsilon = 0.000001) {
  return Math.abs(a - b) < epsilon;
}

console.log('🧪 Running tests/parser.test.js...');

// 1. Basic Decimals and Integers
{
  const p1 = parseInput('12.5');
  assert(p1.isValid && approxEqual(p1.value, 12.5), 'Parse decimal string "12.5"', p1);

  const p2 = parseInput(250);
  assert(p2.isValid && p2.value === 250, 'Parse numeric 250', p2);

  const p3 = parseInput('0');
  assert(p3.isValid && p3.value === 0, 'Parse zero string "0"', p3);
}

// 2. Fractional Parsing
{
  const p1 = parseInput('3 1/2');
  assert(p1.isValid && approxEqual(p1.value, 3.5), 'Parse fraction "3 1/2" = 3.5', p1);

  const p2 = parseInput('5/8');
  assert(p2.isValid && approxEqual(p2.value, 0.625), 'Parse fraction "5/8" = 0.625', p2);

  const p3 = parseInput('1/4');
  assert(p3.isValid && approxEqual(p3.value, 0.25), 'Parse fraction "1/4" = 0.25', p3);
}

// 3. Feet & Inches Architectural Parsing
{
  const p1 = parseInput('12\' 6"');
  assert(p1.isValid && approxEqual(p1.value, 150), 'Parse "12\' 6"" = 150 inches', p1);

  const p2 = parseInput('12\'-6 1/2"');
  assert(p2.isValid && approxEqual(p2.value, 150.5), 'Parse "12\'-6 1/2"" = 150.5 inches', p2);

  const p3 = parseInput('8\'');
  assert(p3.isValid && approxEqual(p3.value, 96), 'Parse "8\'" = 96 inches', p3);

  const p4 = parseInput('6 1/2"');
  assert(p4.isValid && approxEqual(p4.value, 6.5), 'Parse "6 1/2"" = 6.5 inches', p4);
}

// 4. Attached Units Extraction
{
  const p1 = parseInput('15.5cm');
  assert(p1.isValid && approxEqual(p1.value, 15.5) && p1.detectedUnit === 'cm', 'Parse "15.5cm" extracts value 15.5 and unit "cm"', p1);

  const p2 = parseInput('2.4m');
  assert(p2.isValid && approxEqual(p2.value, 2.4) && p2.detectedUnit === 'm', 'Parse "2.4m" extracts value 2.4 and unit "m"', p2);

  const p3 = parseInput('100mm');
  assert(p3.isValid && approxEqual(p3.value, 100) && p3.detectedUnit === 'mm', 'Parse "100mm" extracts value 100 and unit "mm"', p3);
}

// 5. Malformed Inputs, Division by Zero & Negative Dimensions
{
  const p1 = parseInput('abc');
  assert(!p1.isValid, 'Non-numeric string "abc" is flagged invalid', p1);

  const p2 = parseInput('');
  assert(!p2.isValid, 'Empty string is flagged invalid', p2);

  const p3 = parseInput(null);
  assert(!p3.isValid, 'Null input is flagged invalid', p3);

  const p4 = parseInput('3/0');
  assert(!p4.isValid, 'Division by zero fraction "3/0" is flagged invalid', p4);

  const p5 = parseInput('-15', { allowNegative: false });
  assert(!p5.isValid, 'Negative dimension "-15" is rejected when allowNegative=false', p5);

  const p6 = parseInput('-15', { allowNegative: true });
  assert(p6.isValid && p6.value === -15, 'Negative dimension "-15" is accepted when allowNegative=true', p6);
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
