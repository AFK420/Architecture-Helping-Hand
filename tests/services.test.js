/**
 * Architecture Helping Hand - Services Unit Tests (Storage, History, Audio)
 */

import { StorageService } from '../src/services/storage.js';
import { HistoryService, HISTORY_STORAGE_KEY } from '../src/services/history.js';
import { AudioService } from '../src/services/audio.js';

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

console.log('🧪 Running tests/services.test.js...');

// 1. StorageService Tests
{
  StorageService.setItem('test_key', 'test_value');
  assert(StorageService.getItem('test_key') === 'test_value', 'StorageService writes and reads keys');

  StorageService.removeItem('test_key');
  assert(StorageService.getItem('test_key') === null, 'StorageService removes keys');

  StorageService.setItem('test_k1', 'v1');
  StorageService.clear();
  assert(StorageService.getItem('test_k1') === null, 'StorageService clear wipes storage');
}

// 2. HistoryService Standard Operations
{
  HistoryService.clear();
  assert(HistoryService.getHistory().length === 0, 'HistoryService starts empty after clear');

  const entry = HistoryService.addEntry({
    mode: 'Scale Converter',
    scaleRatio: 50,
    scaleStr: '1:50',
    inputStr: '10 cm',
    outputStr: '5.0 m',
    notes: 'Test conversion'
  });

  assert(entry && entry.id && entry.id.startsWith('hist_'), 'addEntry returns an entry with a generated ID');
  assert(HistoryService.getHistory().length === 1, 'History has 1 entry');

  // CSV Export
  const csv = HistoryService.exportCSV();
  assert(csv && csv.includes('Timestamp') && csv.includes('1:50') && csv.includes('5.0 m'), 'exportCSV generates valid CSV string');

  // Markdown Export
  const md = HistoryService.exportMarkdown();
  assert(md && md.includes('# Architecture Helping Hand') && md.includes('| 1:50 |'), 'exportMarkdown generates valid markdown table');

  // Remove Entry
  HistoryService.removeEntry(entry.id);
  assert(HistoryService.getHistory().length === 0, 'removeEntry removes specified entry by ID');
}

// 3. HistoryService Corrupted Storage Resilience
{
  StorageService.setItem(HISTORY_STORAGE_KEY, 'corrupted JSON string {');
  const reloaded = HistoryService.reload();
  assert(Array.isArray(reloaded) && reloaded.length === 0, 'HistoryService gracefully recovers from corrupted JSON');

  StorageService.setItem(HISTORY_STORAGE_KEY, '12345');
  const reloaded2 = HistoryService.reload();
  assert(Array.isArray(reloaded2) && reloaded2.length === 0, 'HistoryService gracefully recovers from non-array JSON');

  HistoryService.clear();
}

// 4. AudioService Safety Tests
{
  assert(typeof AudioService.isEnabled() === 'boolean', 'AudioService isEnabled returns boolean');

  AudioService.setEnabled(false);
  assert(AudioService.isEnabled() === false, 'AudioService can be disabled');

  const newState = AudioService.toggleSound();
  assert(newState === true && AudioService.isEnabled() === true, 'AudioService toggleSound toggles state');

  // Verify calling audio synth methods in Node.js does not throw
  let synthThrew = false;
  try {
    AudioService.playTick();
    AudioService.playKeyClick();
    AudioService.playSwapSound();
    AudioService.playCopySuccess();
  } catch (e) {
    synthThrew = true;
  }
  assert(!synthThrew, 'AudioService methods execute safely without errors in non-browser environment');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
