/**
 * Architecture Helping Hand - Formatter Unit & Regression Tests
 */

import { formatNumber, formatFeetInches } from '../src/core/formatter.js';

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

console.log('🧪 Running tests/formatter.test.js...');

// 1. Decimal Precision & Epsilon Stabilization
{
  assert(formatNumber(12.3456, 2) === '12.35', 'Format 12.3456 with 2 decimals = "12.35"', formatNumber(12.3456, 2));
  assert(formatNumber(17.49999999999997, 2) === '17.5', 'Epsilon stabilizes 17.49999999999997 to "17.5"', formatNumber(17.49999999999997, 2));
  assert(formatNumber(5.000, 3) === '5', 'Omits trailing redundant zeroes ("5")', formatNumber(5.000, 3));
  assert(formatNumber(0) === '0', 'Format zero as "0"', formatNumber(0));
}

// 2. Scientific Notation Thresholds
{
  const small = 0.00000456;
  assert(formatNumber(small).includes('e'), 'Small number formatted in scientific notation', formatNumber(small));

  const large = 2500000000;
  assert(formatNumber(large).includes('e'), 'Extremely large number formatted in scientific notation', formatNumber(large));
}

// 3. Feet & Inches Architectural Notation
{
  assert(formatFeetInches(150) === '12\'-6"', '150 inches = 12\'-6"', formatFeetInches(150));
  assert(formatFeetInches(6.5) === '6 1/2"', '6.5 inches = 6 1/2"', formatFeetInches(6.5));
  assert(formatFeetInches(0.75) === '3/4"', '0.75 inches = 3/4"', formatFeetInches(0.75));
  assert(formatFeetInches(96) === '8\'-0"', '96 inches = 8\'-0"', formatFeetInches(96));
  assert(formatFeetInches(0) === '0"', '0 inches = 0"', formatFeetInches(0));
  assert(formatFeetInches(-30) === '-2\'-6"', '-30 inches = -2\'-6"', formatFeetInches(-30));
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
