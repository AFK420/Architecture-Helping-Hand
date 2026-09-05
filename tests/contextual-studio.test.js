/**
 * Architecture Helping Hand - Unified Studio & Interaction Regression Test Suite
 * Milestone 7: Tests for plan-centric workstation, direct manipulation entities,
 * universal scratchpad, and natural language command parsing.
 */

import {
  createStairEntity,
  createRampEntity,
  createRoom,
  createFurnitureEntity
} from '../src/core/entities.js';
import { planToExportGeometry, generatePlanSVG } from '../src/core/plan-canvas.js';
import { buildDXF } from '../src/core/export/export-model.js';
import { createProject, validateProject, normalizeProject } from '../src/core/project.js';
import { parseNaturalLanguageCommand } from '../src/services/commands.js';
import { checkFurnitureFit, checkClearance } from '../src/core/space-planning.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    passed++;
    console.log(`  ? PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ? FAIL: ${message} (Received: ${JSON.stringify(received)})`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ? PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ? FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

console.log('--- 1. Stair & Ramp Entity Model & Export Geometry ---');
{
  const stair = createStairEntity({
    x: 2.0,
    y: 3.0,
    width: 1.1,
    run: 3.5,
    riserCount: 15,
    totalRise: 2.7,
    going: 0.25,
    riser: 0.18,
    name: 'Main Stair Flight'
  });

  assertEqual(stair.kind, 'stair', 'Stair entity kind is "stair"');
  assertEqual(stair.x, 2.0, 'Stair entity preserves x coordinate');
  assertEqual(stair.y, 3.0, 'Stair entity preserves y coordinate');
  assertEqual(stair.width, 1.1, 'Stair entity preserves width');
  assertEqual(stair.run, 3.5, 'Stair entity preserves run');
  assertEqual(stair.riserCount, 15, 'Stair entity preserves riser count');
  assert(stair.going > 0, 'Stair going is positive', stair.going);
  assert(stair.riser > 0, 'Stair riser is positive', stair.riser);

  const ramp = createRampEntity({
    x: 5.0,
    y: 1.0,
    width: 1.2,
    run: 14.4,
    rise: 1.2,
    name: 'Access Ramp 1:12'
  });

  assertEqual(ramp.kind, 'ramp', 'Ramp entity kind is "ramp"');
  assertEqual(ramp.run, 14.4, 'Ramp run is 14.4m');
  assertEqual(ramp.rise, 1.2, 'Ramp rise is 1.2m');
  assertEqual(ramp.slopeRatio, 12, 'Ramp slope ratio 1:12 is computed correctly');
  assert(Math.abs(ramp.slopePercent - 8.333) < 0.01, 'Ramp slope percent ~8.33% is computed correctly', ramp.slopePercent);

  // SVG & DXF Export containing stair and ramp
  const entities = [stair, ramp];
  const geo = planToExportGeometry(entities);
  assertEqual(geo.polygons.length, 2, 'Export geometry produces 2 polygons for stair and ramp');
  assertEqual(geo.texts.length, 2, 'Export geometry produces 2 text annotations');

  const svg = generatePlanSVG(geo, { pixelsPerMeter: 50 });
  assert(svg.includes('Main Stair Flight'), 'Plan SVG export contains stair label', svg.slice(0, 200));
  assert(svg.includes('Access Ramp 1:12'), 'Plan SVG export contains ramp label', svg.slice(0, 200));
  assert(svg.includes('1:12.0'), 'Plan SVG export contains ramp slope annotation', svg.slice(0, 200));

  const dxfEntities = geo.polygons.map(p => ({ type: 'polyline', closed: true, layer: 'A-FLOR-STRS', points: p.points }));
  const dxf = buildDXF(dxfEntities, { scale: 1000 });
  assert(dxf.includes('POLYLINE'), 'Plan DXF export contains POLYLINE entity');
  assert(dxf.includes('A-FLOR-STRS'), 'Plan DXF export contains A-FLOR-STRS layer');
}

console.log('--- 2. Universal Scratchpad Project Document Integration ---');
{
  const project = createProject({ name: 'Studio Test Project' });
  assert(Array.isArray(project.scratchpad), 'Project document initializes with scratchpad array');

  project.scratchpad.push({
    id: 'scratch-1',
    value: '2400 mm',
    label: 'Living room width',
    unit: 'mm',
    source: 'Scale Converter',
    timestamp: new Date().toISOString()
  });

  project.scratchpad.push({
    id: 'scratch-2',
    value: '2.7m rise / 3.5m run',
    label: 'Main Stair 15R',
    unit: 'm',
    source: 'Stairs',
    timestamp: new Date().toISOString()
  });

  const validation = validateProject(project);
  assert(validation.ok, 'Project with scratchpad items passes schema validation', validation.errors);

  const normalized = normalizeProject(project);
  assertEqual(normalized.scratchpad.length, 2, 'Normalized project preserves scratchpad entries');
  assertEqual(normalized.scratchpad[0].label, 'Living room width', 'Preserves first scratchpad item label');
  assertEqual(normalized.scratchpad[1].source, 'Stairs', 'Preserves second scratchpad item source');
}

console.log('--- 3. Natural Language Command Bar Parsing ---');
{
  // Test 3a: Scale command
  const cmdScale1 = parseNaturalLanguageCommand('scale 4.2m at 1:50');
  assert(cmdScale1 !== null, 'Parses "scale 4.2m at 1:50"');
  assertEqual(cmdScale1.type, 'scale', 'Command type is "scale"');
  assertEqual(cmdScale1.drawingFormatted, '84 mm', 'Calculates 4.2m at 1:50 = 84 mm');

  const cmdScale2 = parseNaturalLanguageCommand('scale 2400mm 1:20');
  assert(cmdScale2 !== null, 'Parses "scale 2400mm 1:20"');
  assertEqual(cmdScale2.drawingFormatted, '120 mm', 'Calculates 2400mm at 1:20 = 120 mm');

  // Test 3b: Stair command
  const cmdStair = parseNaturalLanguageCommand('stair rise 2.7m');
  assert(cmdStair !== null, 'Parses "stair rise 2.7m"');
  assertEqual(cmdStair.type, 'stair', 'Command type is "stair"');
  assert(cmdStair.riserCount >= 14 && cmdStair.riserCount <= 17, 'Calculates realistic riser count', cmdStair.riserCount);
  assert(cmdStair.totalRiseMeters === 2.7, 'Preserves total rise meters');

  // Test 3c: Ramp command
  const cmdRamp = parseNaturalLanguageCommand('ramp rise 1.2m at 1:12');
  assert(cmdRamp !== null, 'Parses "ramp rise 1.2m at 1:12"');
  assertEqual(cmdRamp.type, 'ramp', 'Command type is "ramp"');
  assertEqual(cmdRamp.ratio, 12, 'Target ratio is 12');
  assert(Math.abs(cmdRamp.runMeters - 14.4) < 0.001, 'Required run is 14.4m', cmdRamp.runMeters);

  // Test 3d: Place furniture command
  const cmdPlace = parseNaturalLanguageCommand('place king bed');
  assert(cmdPlace !== null, 'Parses "place king bed"');
  assertEqual(cmdPlace.type, 'place', 'Command type is "place"');
  assert(cmdPlace.furniture.name.toLowerCase().includes('king'), 'Matches King Bed from catalog', cmdPlace.furniture.name);

  // Test 3e: Unit conversion command
  const cmdConv = parseNaturalLanguageCommand('convert 12ft to m');
  assert(cmdConv !== null, 'Parses "convert 12ft to m"');
  assertEqual(cmdConv.type, 'convert', 'Command type is "convert"');
  assert(Math.abs(cmdConv.convertedValue - 3.6576) < 0.001, 'Converts 12ft to 3.658m', cmdConv.convertedValue);

  // Test 3f: Zero arbitrary code execution / invalid commands safely rejected
  const evil1 = parseNaturalLanguageCommand('alert("hacked")');
  assertEqual(evil1, null, 'Rejects arbitrary code input');

  const evil2 = parseNaturalLanguageCommand('eval(1+1)');
  assertEqual(evil2, null, 'Rejects eval string');

  const empty = parseNaturalLanguageCommand('');
  assertEqual(empty, null, 'Rejects empty command string');

  const nonsense = parseNaturalLanguageCommand('completely unrelated query');
  assertEqual(nonsense, null, 'Rejects non-architectural query');
}

console.log('--- 4. Contextual Space Planning & Clearance Verification ---');
{
  const room = createRoom({ name: 'Bedroom', x: 0, y: 0, width: 4.0, depth: 5.0 });
  const bed = createFurnitureEntity({
    name: 'Queen Bed',
    x: 1.0,
    y: 1.0,
    width: 1.6,
    depth: 2.1,
    clearance: 0.7
  });

  const fit = checkFurnitureFit(bed, room);
  assertEqual(fit.verdict, 'fits', 'Queen bed fits inside 4m x 5m bedroom');

  const clearance = checkClearance(bed, room, 0.6);
  assert(typeof clearance.satisfied === 'boolean', 'CheckClearance produces boolean satisfied status');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
