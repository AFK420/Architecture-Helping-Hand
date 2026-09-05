/**
 * Architecture Helping Hand - Building Codes Test Suite
 * Tests Jordanian (JNBC), Saudi (SBC), Dubai (DBC), Egyptian (EBC),
 * Gulf (GBC), and International (IBC/ADA, UK) code compliance evaluations.
 */

import {
  BUILDING_CODES,
  DEFAULT_BUILDING_CODE_ID,
  getBuildingCode,
  listBuildingCodes,
  inspectStairCompliance,
  inspectRampCompliance,
  inspectSlopeCompliance
} from '../src/core/building-codes.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

console.log('🧪 Running tests/building-codes.test.js...');

// --- 1. Code Registry & Metadata ---
console.log('\n--- 1. Code Registry & Metadata ---');
const codes = listBuildingCodes();
assert(codes.length >= 7, 'All 7 building codes are registered', codes.length);
assert(BUILDING_CODES.jnbc !== undefined, 'Jordanian National Building Code (JNBC) is registered');
assert(BUILDING_CODES.sbc !== undefined, 'Saudi Building Code (SBC) is registered');
assert(BUILDING_CODES.dbc !== undefined, 'Dubai Building Code (DBC) is registered');
assert(BUILDING_CODES.ebc !== undefined, 'Egyptian Building Code (EBC) is registered');
assert(BUILDING_CODES.gbc !== undefined, 'Gulf Unified Building Code (GBC) is registered');
assertEqual(BUILDING_CODES.jnbc.flag, '🇯🇴', 'Jordan flag is correctly set');
assertEqual(BUILDING_CODES.sbc.flag, '🇸🇦', 'Saudi flag is correctly set');
assertEqual(BUILDING_CODES.dbc.flag, '🇦🇪', 'UAE flag is correctly set');

const fallbackCode = getBuildingCode('unknown_code');
assertEqual(fallbackCode.id, DEFAULT_BUILDING_CODE_ID, 'Fallback resolves to default code (jnbc)');

// --- 2. Jordanian National Building Code (JNBC) Stair Evaluation ---
console.log('\n--- 2. Jordanian National Building Code (JNBC) Stair Evaluation ---');
// Compliant stair: 16 risers, rise 160 mm, tread 280 mm, 2R+T = 600 mm
const compliantStair = {
  risers: { count: 16 },
  geometry: {
    riserHeightMeters: 0.160,
    treadDepthMeters: 0.280,
    blondelMeters: 0.600
  }
};
const jnbcStairRes = inspectStairCompliance(compliantStair, 'jnbc');
assertEqual(jnbcStairRes.overallStatus, 'pass', 'Compliant stair achieves overall PASS under Jordan JNBC');
assert(jnbcStairRes.checks.every(c => c.status === 'pass'), 'All individual checks pass under JNBC');

// Stair exceeding Jordan max 16 risers per flight without landing
const longStair = {
  risers: { count: 18 },
  geometry: {
    riserHeightMeters: 0.160,
    treadDepthMeters: 0.280,
    blondelMeters: 0.600
  }
};
const jnbcLongRes = inspectStairCompliance(longStair, 'jnbc');
assertEqual(jnbcLongRes.overallStatus, 'warn', '18 risers triggers WARN under Jordan JNBC (max 16 risers per flight)');
const flightCheck = jnbcLongRes.checks.find(c => c.key === 'flightCount');
assertEqual(flightCheck.status, 'warn', 'Flight count check flags mandatory landing required');

// Stair violating max riser (> 175 mm under JNBC)
const steepStair = {
  risers: { count: 14 },
  geometry: {
    riserHeightMeters: 0.185, // 185 mm > 175 mm
    treadDepthMeters: 0.280,
    blondelMeters: 0.650
  }
};
const jnbcSteepRes = inspectStairCompliance(steepStair, 'jnbc');
assertEqual(jnbcSteepRes.overallStatus, 'fail', '185 mm riser triggers FAIL under Jordan JNBC (max 175 mm)');
const riserCheck = jnbcSteepRes.checks.find(c => c.key === 'riser');
assertEqual(riserCheck.status, 'fail', 'Riser height check reports fail');

// --- 3. Jordanian National Building Code (JNBC) Ramp Evaluation ---
console.log('\n--- 3. Jordanian National Building Code (JNBC) Ramp Evaluation ---');
// Compliant ramp: rise 0.50m, run 8.0m (slope 6.25% / 1:16)
const compliantRamp = {
  geometry: {
    slopePercent: 6.25,
    ratio: 16,
    riseMeters: 0.50,
    runMeters: 8.0
  }
};
const jnbcRampRes = inspectRampCompliance(compliantRamp, 'jnbc');
assertEqual(jnbcRampRes.overallStatus, 'pass', '1:16 ramp achieves PASS under Jordan JNBC');

// Ramp exceeding 750 mm rise without landing (e.g. 1.0 m rise)
const tallRamp = {
  geometry: {
    slopePercent: 8.33,
    ratio: 12,
    riseMeters: 1.0, // 1000 mm > 750 mm limit
    runMeters: 12.0
  }
};
const jnbcTallRampRes = inspectRampCompliance(tallRamp, 'jnbc');
assertEqual(jnbcTallRampRes.overallStatus, 'warn', 'Rise > 750 mm triggers landing requirement under JNBC');
assert(jnbcTallRampRes.landingsNeeded >= 1, 'Calculates at least 1 landing needed', jnbcTallRampRes.landingsNeeded);

// Ramp violating max 1:12 slope (> 8.33%)
const steepRamp = {
  geometry: {
    slopePercent: 10.0,
    ratio: 10,
    riseMeters: 0.40,
    runMeters: 4.0
  }
};
const jnbcSteepRampRes = inspectRampCompliance(steepRamp, 'jnbc');
assertEqual(jnbcSteepRampRes.overallStatus, 'fail', 'Slope 10% (1:10) triggers FAIL under Jordan JNBC (max 8.33%)');

// --- 4. Saudi Building Code (SBC) Evaluation ---
console.log('\n--- 4. Saudi Building Code (SBC) Evaluation ---');
// 178 mm riser is compliant under SBC (max 180 mm)
const sbcStair = {
  risers: { count: 16 },
  geometry: {
    riserHeightMeters: 0.178,
    treadDepthMeters: 0.280,
    blondelMeters: 0.636
  }
};
const sbcRes = inspectStairCompliance(sbcStair, 'sbc');
assertEqual(sbcRes.overallStatus, 'pass', '178 mm riser passes under Saudi SBC (max 180 mm)');

// --- 5. Dubai Building Code (DBC) Evaluation ---
console.log('\n--- 5. Dubai Building Code (DBC) Evaluation ---');
const dbcUaeRamp = {
  geometry: {
    slopePercent: 6.25,
    ratio: 16,
    riseMeters: 0.34,
    runMeters: 5.5 // <= 6.0m limit for DBC
  }
};
const dbcRampRes = inspectRampCompliance(dbcUaeRamp, 'dbc');
assertEqual(dbcRampRes.overallStatus, 'pass', 'Ramp under 6m passes under Dubai DBC');
const landingSpec = dbcRampRes.checks.find(c => c.key === 'landingSpecs');
assert(landingSpec.value.includes('1800'), 'DBC recommends 1800 mm turning landing', landingSpec.value);

// --- 6. Slope Compliance Inspection ---
console.log('\n--- 6. Slope Compliance Inspection ---');
const walkSlope = { geometry: { percent: 3.5 } };
const pedRes = inspectSlopeCompliance(walkSlope, 'jnbc');
assertEqual(pedRes.overallStatus, 'pass', 'Slope 3.5% passes as accessible pedestrian walkway under JNBC');

const steepSlope = { geometry: { percent: 7.0 } };
const steepSlopeRes = inspectSlopeCompliance(steepSlope, 'jnbc');
assertEqual(steepSlopeRes.overallStatus, 'warn', 'Slope 7% triggers ramp classification notice under JNBC');

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
