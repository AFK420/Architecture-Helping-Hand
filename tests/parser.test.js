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

// 1. Valid Decimals, Integers and Whitespace
{
  const p1 = parseInput('12');
  assert(p1.isValid && p1.value === 12, 'Parse integer "12"', p1);

  const p2 = parseInput('12.5');
  assert(p2.isValid && approxEqual(p2.value, 12.5), 'Parse decimal string "12.5"', p2);

  const p3 = parseInput(250);
  assert(p3.isValid && p3.value === 250, 'Parse numeric 250', p3);

  const p4 = parseInput('0');
  assert(p4.isValid && p4.value === 0, 'Parse zero string "0"', p4);

  const p5 = parseInput('  17.5  ');
  assert(p5.isValid && approxEqual(p5.value, 17.5), 'Parse string with leading/trailing whitespace "  17.5  "', p5);
}

// 2. Valid Fractional Parsing
{
  const p1 = parseInput('3 1/2');
  assert(p1.isValid && approxEqual(p1.value, 3.5), 'Parse fraction "3 1/2" = 3.5', p1);

  const p2 = parseInput('5/8');
  assert(p2.isValid && approxEqual(p2.value, 0.625), 'Parse fraction "5/8" = 0.625', p2);

  const p3 = parseInput('1/4');
  assert(p3.isValid && approxEqual(p3.value, 0.25), 'Parse fraction "1/4" = 0.25', p3);

  const p4 = parseInput('15 3/16');
  assert(p4.isValid && approxEqual(p4.value, 15.1875), 'Parse fraction "15 3/16" = 15.1875', p4);
}

// 3. Valid Feet & Inches Architectural Parsing
{
  const p1 = parseInput('12\'');
  assert(p1.isValid && approxEqual(p1.value, 144), 'Parse "12\'" = 144 inches', p1);

  const p2 = parseInput('12\' 6"');
  assert(p2.isValid && approxEqual(p2.value, 150), 'Parse "12\' 6"" = 150 inches', p2);

  const p3 = parseInput('12\'-6"');
  assert(p3.isValid && approxEqual(p3.value, 150), 'Parse "12\'-6"" = 150 inches', p3);

  const p4 = parseInput('12\'-6 1/2"');
  assert(p4.isValid && approxEqual(p4.value, 150.5), 'Parse "12\'-6 1/2"" = 150.5 inches', p4);

  const p5 = parseInput('8\'');
  assert(p5.isValid && approxEqual(p5.value, 96), 'Parse "8\'" = 96 inches', p5);

  const p6 = parseInput('6 1/2"');
  assert(p6.isValid && approxEqual(p6.value, 6.5), 'Parse "6 1/2"" = 6.5 inches', p6);

  const p7 = parseInput('5/8"');
  assert(p7.isValid && approxEqual(p7.value, 0.625), 'Parse "5/8"" = 0.625 inches', p7);

  const p8 = parseInput('1/4"');
  assert(p8.isValid && approxEqual(p8.value, 0.25), 'Parse "1/4"" = 0.25 inches', p8);
}

// 4. Valid Attached Units Extraction
{
  const p1 = parseInput('12cm');
  assert(p1.isValid && approxEqual(p1.value, 12) && p1.detectedUnit === 'cm', 'Parse "12cm" extracts value 12 and unit "cm"', p1);

  const p2 = parseInput('2.5m');
  assert(p2.isValid && approxEqual(p2.value, 2.5) && p2.detectedUnit === 'm', 'Parse "2.5m" extracts value 2.5 and unit "m"', p2);

  const p3 = parseInput('100mm');
  assert(p3.isValid && approxEqual(p3.value, 100) && p3.detectedUnit === 'mm', 'Parse "100mm" extracts value 100 and unit "mm"', p3);

  const p4 = parseInput('12in');
  assert(p4.isValid && approxEqual(p4.value, 12) && p4.detectedUnit === 'in', 'Parse "12in" extracts value 12 and unit "in"', p4);

  const p5 = parseInput('6ft');
  assert(p5.isValid && approxEqual(p5.value, 6) && p5.detectedUnit === 'ft', 'Parse "6ft" extracts value 6 and unit "ft"', p5);
}

// 5. Invalid Inputs, Garbage, Division by Zero, Multiple Slashes, and Unknown Units
{
  const p1 = parseInput('abc');
  assert(!p1.isValid, 'Non-numeric string "abc" is flagged invalid', p1);

  const p2 = parseInput('12abc');
  assert(!p2.isValid, 'Trailing letters "12abc" is flagged invalid', p2);

  const p3 = parseInput('15.5foobar');
  assert(!p3.isValid, 'Unknown unit suffix "15.5foobar" is flagged invalid', p3);

  const p4 = parseInput('');
  assert(!p4.isValid, 'Empty string is flagged invalid', p4);

  const p5 = parseInput('   ');
  assert(!p5.isValid, 'Whitespace-only string is flagged invalid', p5);

  const p6 = parseInput(null);
  assert(!p6.isValid, 'Null input is flagged invalid', p6);

  const p7 = parseInput(undefined);
  assert(!p7.isValid, 'Undefined input is flagged invalid', p7);

  const p8 = parseInput(NaN);
  assert(!p8.isValid, 'NaN numeric input is flagged invalid', p8);

  const p9 = parseInput(Infinity);
  assert(!p9.isValid, 'Infinity numeric input is flagged invalid', p9);

  const p10 = parseInput('3/0');
  assert(!p10.isValid, 'Division by zero fraction "3/0" is flagged invalid', p10);

  const p11 = parseInput('1/0');
  assert(!p11.isValid, 'Division by zero fraction "1/0" is flagged invalid', p11);

  const p12 = parseInput('1/2/3');
  assert(!p12.isValid, 'Multiple slashes "1/2/3" is flagged invalid', p12);

  const p13 = parseInput('/5');
  assert(!p13.isValid, 'Missing numerator "/5" is flagged invalid', p13);

  const p14 = parseInput('3/');
  assert(!p14.isValid, 'Missing denominator "3/" is flagged invalid', p14);

  const p15 = parseInput('-15', { allowNegative: false });
  assert(!p15.isValid, 'Negative dimension "-15" is rejected when allowNegative=false', p15);

  const p16 = parseInput('-15', { allowNegative: true });
  assert(p16.isValid && p16.value === -15, 'Negative dimension "-15" is accepted when allowNegative=true', p16);
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
