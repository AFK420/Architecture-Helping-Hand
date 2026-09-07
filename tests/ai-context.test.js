/**
 * AI Context Bridge Test Suite — selection evidence serialization and
 * deterministic suggestion engine. Pins the contract that the AI answers
 * about the EXACT selected entities with verified numbers.
 */

import { serializeDrawingContext, serializeSelection, serializeToolCapabilities } from '../src/core/ai-bridge.js';
import { suggestForEntity, suggestForDocument } from '../src/core/suggestions.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

const WALL = { kind: 'wall', id: 'w-031', name: 'Wall W-031', x1: 0, y1: 0, x2: 4.2, y2: 0, thickness: 0.2, layerId: 'A-WALL' };
const DIM = { kind: 'dimension', id: 'd-1', name: 'Dim 4.2', p1: { x: 0, y: 0 }, p2: { x: 4.2, y: 0 }, unit: 'm' };
const ROOM = { kind: 'room', id: 'r-1', name: 'Bedroom', x: 0, y: 0, width: 3.4, depth: 3.1 };
const BED = { kind: 'furniture', id: 'f-1', name: 'Double Bed', x: 0.5, y: 0.5, width: 1.6, depth: 2.0, catalogId: 'bed_double' };
const ENTITIES = [WALL, DIM, ROOM, BED];

console.log('\n--- serializeSelection ---');
{
  assert(serializeSelection(ENTITIES, null).length === 0, 'No selection → empty packets (no context sent)');
  assert(serializeSelection(ENTITIES, new Set()).length === 0, 'Empty selection set → empty packets');
  assert(serializeSelection(ENTITIES, new Set(['ghost-id'])).length === 0, 'Unknown ids are skipped');

  const wall = serializeSelection(ENTITIES, new Set(['w-031']))[0];
  assert(wall && wall.length === 4.2 && wall.thickness === 0.2, 'Wall packet carries length + thickness');
  assert(Array.isArray(wall.dimensions) && wall.dimensions[0]?.value === 4.2, 'Wall packet finds its touching dimension');
  assert(wall.p1 && wall.p2 && wall.angleDegrees === 0, 'Wall packet carries endpoints + angle');

  const room = serializeSelection(ENTITIES, new Set(['r-1']))[0];
  assert(room.area === 10.54 && room.perimeter === 13, 'Room packet carries area/perimeter');
  assert(room.furniture?.some(f => f.name === 'Double Bed'), 'Room packet lists contained furniture');

  const dim = serializeSelection(ENTITIES, new Set(['d-1']))[0];
  assert(dim.measuredLength === 4.2 && dim.matchesGeometry === true, 'Dimension packet verifies against matching wall');
  const fakeDim = serializeSelection([{ kind: 'dimension', id: 'd-2', name: 'Wrong', p1: { x: 0, y: 0 }, p2: { x: 3.7, y: 0 } }], new Set(['d-2']))[0];
  assert(fakeDim.matchesGeometry === false, 'Dimension not matching any edge reports NO MATCH');

  const multi = serializeSelection(ENTITIES, new Set(['w-031', 'r-1']));
  assert(multi.length === 2, 'Multi-selection produces one packet per entity');
}

console.log('\n--- serializeDrawingContext with selection ---');
{
  const state = {
    plan: {
      activeDocId: 'doc-1',
      documents: [{ id: 'doc-1', name: 'Ground Floor', type: '2d_plan', entities: ENTITIES }],
      selectedIds: new Set(['w-031']),
      tool: 'select'
    },
    activePersona: 'studio'
  };
  const ctx = serializeDrawingContext(state);
  assert(ctx.selectedCount === 1 && Array.isArray(ctx.selection) && ctx.selection[0].id === 'w-031', 'Context now carries the full selection packet (previously count-only)');
  assert(ctx.availableTools && ctx.availableTools.count > 20, `Context exposes the real tool catalog for recommendations (${ctx.availableTools.count} tools)`);
  const ctxNone = serializeDrawingContext({ plan: { documents: [{ id: 'd', entities: ENTITIES }], selectedIds: new Set() } });
  assert(ctxNone.selection.length === 0, 'Document context without selection sends no entity packets');
}

console.log('\n--- Deterministic suggestions ---');
{
  // Dimension that matches vs does not match
  const ok = suggestForEntity(DIM, ENTITIES);
  assert(ok.some(s => s.severity === 'informational' && /verified/i.test(s.problem)), 'Matching dimension yields a verification note');
  const bad = { kind: 'dimension', id: 'd-x', name: 'Wrong', p1: { x: 0, y: 0 }, p2: { x: 3.7, y: 0 } };
  const warn = suggestForEntity(bad, ENTITIES);
  assert(warn.some(s => s.severity === 'medium' && /does not match/i.test(s.problem)), 'Non-matching dimension is flagged with evidence');

  // Undimensioned wall
  const bareWall = suggestForEntity({ kind: 'wall', id: 'w-2', name: 'W2', x1: 0, y1: 0, x2: 2, y2: 0, thickness: 0.2 }, []);
  assert(bareWall.some(s => /no dimension/i.test(s.problem)), 'Undimensioned wall flagged');

  // Steep ramp
  const ramp = suggestForEntity({ kind: 'ramp', id: 'rp', name: 'Ramp', slopePercent: 12, slopeRatio: 8.3 }, []);
  assert(ramp[0].severity === 'high' && /1:12/.test(ramp[0].problem), 'Steep ramp flagged against 1:12');

  // Unbounded room toolId must exist in the real catalog (no ghost tools)
  const findings = [...ok, ...warn, ...bareWall, ...ramp].filter(f => f.toolId);
  const catalogIds = new Set(serializeToolCapabilities().tools.map(t => t.id));
  const ghosts = findings.filter(f => !catalogIds.has(f.toolId));
  assert(ghosts.length === 0, `Suggested tools exist in the real catalog (ghosts: ${ghosts.map(g => g.toolId).join(',') || 'none'})`);

  // Document-level
  const r1 = { kind: 'room', id: 'r-1', name: 'A', x: 0, y: 0, width: 4, depth: 4 };
  const r2 = { kind: 'room', id: 'r-2', name: 'B', x: 2, y: 2, width: 4, depth: 4 };
  const docFindings = suggestForDocument([r1, r2]);
  assert(docFindings.some(f => /overlap/i.test(f.problem)), 'Overlapping rooms detected with area evidence');
  assert(docFindings.every(f => ['critical', 'high', 'medium', 'low', 'informational'].includes(f.severity)), 'All severities are from the fixed scale');
}

console.log(`\n========================================`);
console.log(`AI Context Test Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
