/**
 * Architecture Helping Hand - Command Registry Unit Test Suite
 * Tests the Global Architect Command Center, Search Engine, and Persistence
 */

import {
  CommandRegistry,
  RECENT_COMMANDS_KEY,
  FAVORITE_COMMANDS_KEY
} from '../src/services/commands.js';
import { StorageService } from '../src/services/storage.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  total++;
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message} (Expected ${expected}, got ${actual})`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- 1. Command Registry Schema & Initialization ---');
CommandRegistry.initDefaultCommands();
const allCmds = CommandRegistry.getAllCommands();

assert(allCmds.length >= 19, `Default registry contains ${allCmds.length} commands (expected >= 19)`);

// Check unique IDs
const ids = new Set();
for (const cmd of allCmds) {
  assert(!ids.has(cmd.id), `Command ID "${cmd.id}" is unique`);
  ids.add(cmd.id);
  assert(typeof cmd.title === 'string' && cmd.title.length > 0, `Command ${cmd.id} has a non-empty title`);
  assert(typeof cmd.category === 'string' && cmd.category.length > 0, `Command ${cmd.id} has a valid category`);
  assert(typeof cmd.description === 'string', `Command ${cmd.id} has a valid description string`);
  assert(Array.isArray(cmd.keywords) && cmd.keywords.length > 0, `Command ${cmd.id} has keyword tags`);
  assert(typeof cmd.available === 'boolean', `Command ${cmd.id} has boolean availability`);
}

console.log('\n--- 2. Command Availability & Categories ---');
const availableCmds = CommandRegistry.getAvailableCommands();
const upcomingCmds = allCmds.filter(c => !c.available);

assert(availableCmds.length >= 12, `Available commands count is ${availableCmds.length} (>= 12)`);
assert(upcomingCmds.length >= 1, `Upcoming tool placeholders count is ${upcomingCmds.length} (>= 1)`);

for (const up of upcomingCmds) {
  assertEqual(up.category, 'Upcoming Tool', `Upcoming tool ${up.id} has 'Upcoming Tool' category`);
  assert(up.badge !== null, `Upcoming tool ${up.id} has a visual badge`);
}

console.log('\n--- 3. Multi-Token Search Engine ---');
// 3.1 Empty Query
const emptySearch = CommandRegistry.searchCommands('');
assertEqual(emptySearch.total, allCmds.length, 'Empty search returns all registered commands');

// 3.2 Title Search
const scaleSearch = CommandRegistry.searchCommands('Converter');
assert(scaleSearch.results.length > 0, 'Found results for query "Converter"');
assert(scaleSearch.results.some(c => c.id === 'nav-converter'), 'Results include Scale Converter');

// 3.3 Keyword Search
const adaSearch = CommandRegistry.searchCommands('ada');
assert(adaSearch.results.some(c => c.id === 'nav-furniture' || c.id === 'future-ramp-calc'), 'Found tools for keyword "ada"');

// 3.4 Multi-token search (across title and keywords)
const multiToken = CommandRegistry.searchCommands('scale sheet');
assert(multiToken.results.some(c => c.id === 'nav-rescale'), 'Multi-token search matches Rescaler ("scale sheet")');

// 3.5 No match
const noMatch = CommandRegistry.searchCommands('xyzqwertyunknown123');
assertEqual(noMatch.total, 0, 'Non-matching query returns 0 results');
assertEqual(noMatch.results.length, 0, 'Non-matching query returns empty results array');

console.log('\n--- 4. Recent Commands Persistence & Deduplication ---');
CommandRegistry.clearRecentCommands();
assertEqual(CommandRegistry.getRecentCommands().length, 0, 'Recent commands list is empty initially');

CommandRegistry.addRecentCommand('nav-converter');
CommandRegistry.addRecentCommand('nav-rescale');
CommandRegistry.addRecentCommand('nav-converter'); // Deduplicate and move to top

const recents = CommandRegistry.getRecentCommands();
assertEqual(recents.length, 2, 'Recent commands deduplicated (length 2)');
assertEqual(recents[0].id, 'nav-converter', 'Most recently used is at index 0');
assertEqual(recents[1].id, 'nav-rescale', 'Previous command is at index 1');

// Test max 10 limit
for (let i = 0; i < 15; i++) {
  const cmd = allCmds[i % allCmds.length];
  CommandRegistry.addRecentCommand(cmd.id);
}
assert(CommandRegistry.getRecentCommands().length <= 10, 'Recent commands capped at max 10');

// Test corrupted storage resilience
StorageService.setItem(RECENT_COMMANDS_KEY, '{invalid-json-data');
const safeRecents = CommandRegistry.getRecentCommands();
assert(Array.isArray(safeRecents) && safeRecents.length === 0, 'Handles corrupted recent storage safely');

console.log('\n--- 5. Favorites Management ---');
StorageService.removeItem(FAVORITE_COMMANDS_KEY);
assertEqual(CommandRegistry.getFavoriteCommands().length, 0, 'Favorites list is empty initially');

const isFav1 = CommandRegistry.toggleFavorite('nav-converter');
assertEqual(isFav1, true, 'Toggling favorite on adds to favorites');
assert(CommandRegistry.isFavorite('nav-converter'), 'isFavorite returns true');
assertEqual(CommandRegistry.getFavoriteCommands().length, 1, 'Favorites count is 1');

const isFav2 = CommandRegistry.toggleFavorite('nav-converter');
assertEqual(isFav2, false, 'Toggling favorite off removes from favorites');
assert(!CommandRegistry.isFavorite('nav-converter'), 'isFavorite returns false');
assertEqual(CommandRegistry.getFavoriteCommands().length, 0, 'Favorites count is 0');

// Test corrupted favorites storage resilience
StorageService.setItem(FAVORITE_COMMANDS_KEY, 'invalid');
assert(Array.isArray(CommandRegistry.getFavoriteCommands()), 'Handles corrupted favorites storage gracefully');

console.log('\n--- 6. Dynamic Registration & Validation ---');
const custom = CommandRegistry.register({
  id: 'custom-cad-plugin',
  title: 'Custom CAD Plugin',
  description: 'Custom integration command',
  category: 'Utility',
  keywords: ['plugin', 'custom', 'cad'],
  available: true
});

assertEqual(custom.id, 'custom-cad-plugin', 'Registered custom command');
assert(CommandRegistry.getCommand('custom-cad-plugin') !== null, 'Found custom command in registry');

const unregistered = CommandRegistry.unregister('custom-cad-plugin');
assertEqual(unregistered, true, 'Successfully unregistered custom command');
assert(CommandRegistry.getCommand('custom-cad-plugin') === null, 'Custom command is removed');

console.log(`\n🎉 COMMAND REGISTRY TESTS PASSED (${passed}/${total} assertions)\n`);
console.log(`Summary: ${passed} passed, ${total - passed} failed.\n`);
