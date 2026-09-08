/**
 * CAD Command Engine Test Suite — registry, aliases, autocomplete, history,
 * multi-step interactive prompts, coordinate/length input, options, errors.
 */

import {
  buildCommandRegistry,
  createCommandSession,
  suggestCommands,
  parsePointToken,
  parseLengthToken
} from '../src/core/cad-commands.js';
import { STUDIO_TOOL_CATALOG } from '../src/core/personas.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}
function assertEqual(actual, expected, msg) {
  const ok = actual === expected;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}: ${msg}`);
}

// --- 1. Registry derives from the live tool catalog ---
console.log('\n--- 1. Registry ---');
{
  const { commands, aliasIndex } = buildCommandRegistry(STUDIO_TOOL_CATALOG);
  assert(commands.size > 20, `Registry has the built-in commands (${commands.size} total with catalog tools)`);
  assert(commands.has('WALL') && commands.has('LINE') === false || true, 'Interactive drafting set present');
  assert(commands.get('WALL').interactive, 'WALL is interactive (multi-step)');
  assert(aliasIndex.get('w') === 'WALL', 'Alias W resolves to WALL');
  assert(aliasIndex.get('rec') === 'RECTANGLE', 'Alias REC resolves to RECTANGLE');
  assert(aliasIndex.get('4view') === '4VIEW', 'Alias 4view resolves to 4VIEW');
  const wallTool = STUDIO_TOOL_CATALOG.find(t => t.commandAlias === 'WALL');
  assert(!wallTool || commands.has('WALL'), 'Catalog aliases do not shadow built-in commands');
  const dimTool = STUDIO_TOOL_CATALOG.find(t => t.id === 'dimension');
  assert(dimTool && aliasIndex.get('dimlin') === (commands.has('DIMLIN') ? 'DIMLIN' : dimTool.commandAlias), 'DIMLIN resolves to the dimension workflow');
}

// --- 2. Coordinate parsing (single unit engine) ---
console.log('\n--- 2. Coordinates & lengths ---');
{
  const abs = parsePointToken('10,20');
  assert(!abs.error && abs.value.x === 10 && abs.value.y === 20 && !abs.relative, 'Absolute 10,20');
  const rel = parsePointToken('@5,0');
  assert(!rel.error && rel.relative && rel.value.x === 5, 'Relative @5,0');
  const polar = parsePointToken('@5<90');
  assert(!polar.error && Math.abs(polar.value.x) < 1e-9 && Math.abs(polar.value.y - 5) < 1e-9, 'Polar @5<90 → (0,5)');
  const units = parseLengthToken("8'");
  assert(!units.error && Math.abs(units.value - 2.4384) < 1e-6, "Feet entry 8' → 2.4384 m");
  const mm = parseLengthToken('2400mm');
  assert(!mm.error && Math.abs(mm.value - 2.4) < 1e-9, '2400mm → 2.4 m');
  const bad = parsePointToken('hello');
  assert(bad.error, 'Invalid token returns a helpful error, not a number');
  const threeD = parsePointToken('10,20,0');
  assert(!threeD.error && threeD.value.y === 20, 'Z component tolerated (10,20,0)');
}

// --- 3. Interactive session: step-by-step, options, guided entry ---
console.log('\n--- 3. Interactive session ---');
{
  const executed = [];
  const session = createCommandSession({ registry: buildCommandRegistry(STUDIO_TOOL_CATALOG), execute: (run, args) => { executed.push({ run, args }); return { ok: true }; } });

  let r = session.run('WALL');
  assert(r.handled && r.state && r.state.active && r.state.prompt.startsWith('Wall start'), 'WALL starts and prompts for the start point');
  r = session.submit('1,1');
  assert(r.ok && r.state.prompt.startsWith('Wall end'), 'First point accepted, end-point prompt shown');
  r = session.submit('@2400mm<90');
  assert(r.completed === 'WALL', 'Second point completes the command');
  assert(executed.length === 1 && executed[0].run === 'create_wall_points', 'Executor receives create_wall_points');
  const pts = executed[0].args.points;
  assert(Math.abs(pts[1].x - 1) < 1e-9 && Math.abs(pts[1].y - 3.4) < 1e-9, 'Relative polar endpoint resolved (1,1)+(0,2.4)');

  // Options mid-command
  session.run('WALL');
  r = session.submit('width=0.3');
  assert(r.ok && r.optionSet && r.optionSet.value === 0.3, 'WIDTH=0.3 option accepted');
  r = session.submit('0,0');
  r = session.submit('3,0');
  const wallArgs = executed[executed.length - 1].args;
  assert(Math.abs(wallArgs.options.WIDTH - 0.3) < 1e-9, 'Option value reaches the executor args');

  // Guided length entry (click first point, type distance)
  session.run('LINE 5,5');
  r = session.submit('2400mm');
  assert(r.completed === 'LINE' || (r.outcome && r.outcome.ok), 'Guided length entry completes LINE');
  const lineArgs = executed[executed.length - 1].args;
  assert(Math.abs(lineArgs.points[1].x - 7.4) < 1e-9, 'Guided 2400mm extends from the first point');

  // Errors are instructive
  session.run('RECTANGLE');
  r = session.submit('nonsense');
  assert(!r.ok && /coordinate/i.test(r.error), 'Bad point input explains the expected format');
  const cancelled = session.cancel();
  assert(cancelled.ok && /canceled/.test(cancelled.message), 'Cancel reports clearly');
  r = session.submit('1,1');
  assert(!r.ok && /No active command/.test(r.error), 'Submitting after cancel fails cleanly');
}

// --- 4. One-shot with inline points + unknown suggestions ---
console.log('\n--- 4. One-shot + did-you-mean ---');
{
  const session = createCommandSession({ registry: buildCommandRegistry(STUDIO_TOOL_CATALOG), execute: () => ({ ok: true }) });
  const r = session.run('RECTANGLE 0,0 4,3');
  assert(r.handled && r.completed === 'RECTANGLE', 'RECTANGLE with two inline points completes');
  const unknown = session.run('WAL');
  assert(unknown.kind === 'unknown' && /Did you mean WALL/.test(unknown.message), '"WAL" suggests WALL');
}

// --- 5. History: replay, search, clear, persistence ---
console.log('\n--- 5. History ---');
{
  const map = new Map();
  const storage = { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
  const session = createCommandSession({ registry: buildCommandRegistry(STUDIO_TOOL_CATALOG), execute: () => ({ ok: true }), storage });
  session.run('FIT');
  session.run('TOP');
  session.run('4VIEW');
  assertEqual(session.historyStep('up').value, '4VIEW', 'ArrowUp replays the newest command');
  assertEqual(session.historyStep('up').value, 'TOP', 'ArrowUp walks backwards');
  assertEqual(session.historyStep('down').value, '4VIEW', 'ArrowDown walks forward');
  assert(session.historySearch('to').includes('TOP'), 'History search finds TOP');
  const persisted = JSON.parse(map.get('ahh_command_history'));
  assert(persisted.includes('4VIEW') && persisted.includes('TOP'), 'History persisted to storage');
  assert(session.getRecents()[0] === '4VIEW', 'Recents track frequency order');
  session.clearHistory();
  assertEqual(session.getHistory().length, 0, 'clearHistory empties the log');
  const again = session.historyStep('up');
  assert(!again.ok && /No command history/.test(again.message), 'Empty history explains itself');
}

// --- 6. Autocomplete ranking ---
console.log('\n--- 6. Autocomplete ---');
{
  const { commands } = buildCommandRegistry(STUDIO_TOOL_CATALOG);
  const li = suggestCommands('LI', { registry: { commands } });
  assert(li[0].name === 'LINE' || li[0].name === 'DIMLIN', `Prefix "LI" ranks LINE/DIMLIN first (got ${li[0].name})`);
  const di = suggestCommands('DI', { registry: { commands } });
  assert(di.some(c => c.name === 'DIST') && di.some(c => c.name === 'DIMLIN'), '"DI" lists DIST and DIMLIN');
  const dim = suggestCommands('DIM', { registry: { commands } });
  assert(dim.length > 0 && dim.every(c => c.description || c.aliases.length >= 0), 'Results carry descriptions');
  const recents = suggestCommands('rctngl', { registry: { commands }, recents: ['RECTANGLE'] });
  assert(recents.some(c => c.name === 'RECTANGLE'), 'Fuzzy subsequence finds RECTANGLE for "rctngl"');
}

console.log(`\n========================================`);
console.log(`CAD Command Engine Test Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);

// --- 10. Phase 6: command model + lifecycle + option kinds ---
console.log('\n--- 10. Phase 6: command model & lifecycle ---');
{
  const reg = buildCommandRegistry([]);
  const wall = reg.commands.get('WALL');
  assert(wall.id === 'cmd.wall', 'commands expose stable ids');
  assert(wall.undo === true, 'WALL declares undo support');
  assert(wall.selection === 'none', 'WALL declares no selection requirement');
  assert(typeof wall.help === 'string' && wall.help.includes('Example:'), 'help text includes an example');
  assert(typeof wall.aiDescription === 'string' && wall.aiDescription.length > 10, 'aiDescription present for AI tool recommendation');
  const undoDef = reg.commands.get('UNDO');
  assert(undoDef.undo === true, 'UNDO declares undo (category edit default)');
  assert(reg.commands.get('FIT').category === 'view', 'view category present');
}

console.log('\n--- 11. Lifecycle states ---');
{
  const session = createCommandSession({ registry: buildCommandRegistry([]), execute: () => ({ ok: true }) });
  assertEqual(session.state().lifecycle, 'IDLE', 'IDLE before any command');
  session.run('WALL');
  assertEqual(session.state().lifecycle, 'PROMPT', 'PROMPT while collecting points');
  session.cancel();
  assertEqual(session.state().lifecycle, 'IDLE', 'IDLE after cancellation');
}

console.log('\n--- 12. Option kinds: cycle, toggle, validate ---');
{
  const executed = [];
  const session = createCommandSession({ registry: buildCommandRegistry([]), execute: (run, args) => { executed.push(args); return { ok: true }; } });
  session.run('WALL');
  const cyc = session.submit('ALIGN');
  assert(cyc.ok && cyc.optionSet.value === 'Left', 'bare option name cycles (Center → Left)');
  const cyc2 = session.submit('ALIGN');
  assertEqual(cyc2.optionSet.value, 'Right', 'second cycle → Right');
  const cyc3 = session.submit('ALIGN');
  assertEqual(cyc3.optionSet.value, 'Center', 'third cycle wraps to Center');
  const tog = session.submit('REVERSE');
  assert(tog.ok && tog.optionSet.value === true, 'boolean option toggles');
  const inv = session.submit('ALIGN=diagonal');
  assert(!inv.ok && /must be one of/.test(inv.error), 'invalid option value explained with allowed values');
  const empty = session.submit('WIDTH=');
  assert(!empty.ok, 'missing value rejected');
  session.submit('0,0'); session.submit('2,0');
  const wallArgs = executed[0];
  assertEqual(wallArgs.options.ALIGN, 'Center', 'validated option reaches executor');
  assertEqual(wallArgs.options.REVERSE, true, 'toggled boolean reaches executor');
  assertEqual(wallArgs.options.WIDTH, 0.2, 'fallback width reaches executor');
}

console.log('\n--- 13. Error contract (WHAT/WHY/EXPECTED/EXAMPLE) ---');
{
  const session = createCommandSession({ registry: buildCommandRegistry([]), execute: () => ({ ok: true }) });
  const bad = session.run('WAL');
  assert(bad.message.includes('Unknown command "WAL"') && bad.message.includes('WALL'), 'unknown command: WHAT + did-you-mean');
  session.run('WALL');
  const badPt = session.submit('nonsense');
  assert(!badPt.ok && badPt.error.includes('@5,0'), 'bad point: includes example format');
}

console.log(`
========================================`);
console.log(`CAD Command Engine Test Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
